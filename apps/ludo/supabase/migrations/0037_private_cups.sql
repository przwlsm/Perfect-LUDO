-- 0037: cups with friends. Apply after 0036.
--
-- A member opens a private bracket in any hall and shares a six-letter
-- code; two to four friends sit down and the host starts it. No computer
-- players ever join. The winner takes the whole pot (every entry paid);
-- the throne is awarded only when a full table of four played, so two
-- friends cannot farm thrones for free. Public brackets never seat a
-- private code and private brackets never count as "waiting" in the halls.

alter table public.cup_brackets add column if not exists is_private boolean not null default false;
alter table public.cup_brackets add column if not exists host_uid uuid references auth.users (id) on delete set null;
alter table public.cup_brackets add column if not exists invite_code text;
do $$ begin
  alter table public.cup_brackets add constraint cup_brackets_code_format
    check (invite_code is null or invite_code ~ '^[A-HJ-NP-Z2-9]{6}$');
exception when duplicate_object then null; end $$;
create unique index if not exists cup_brackets_code_key on public.cup_brackets (invite_code) where invite_code is not null;

create or replace function public.new_cup_code() returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.cup_brackets where invite_code = v_code);
  end loop;
  return v_code;
end $$;
revoke all on function public.new_cup_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reading: as 0035 plus the private fields.
-- ---------------------------------------------------------------------------
create or replace function public.cup_bracket_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'id', b.id,
    'cup', b.cup_id,
    'status', b.status,
    'hasBots', b.has_bots,
    'private', b.is_private,
    'host', b.host_uid,
    'inviteCode', b.invite_code,
    'createdAt', b.created_at,
    'startedAt', b.started_at,
    'finishedAt', b.finished_at,
    'fillAt', b.created_at + make_interval(secs => public.bot_wait_seconds()),
    'winner', b.winner_uid,
    'runnerUp', b.runner_up_uid,
    'prizePaid', b.prize_paid,
    'pot', coalesce((select sum(e.paid) from public.cup_entries e where e.bracket_id = b.id), 0),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
          'userId', e.uid, 'seat', e.seat, 'paid', e.paid,
          'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar,
          'country', p.country, 'isBot', p.is_bot
        ) order by e.seat)
        from public.cup_entries e join public.profiles p on p.uid = e.uid
       where e.bracket_id = b.id), '[]'::jsonb),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
          'round', r.round, 'slot', r.slot, 'a', r.a_uid, 'b', r.b_uid,
          'lobbyId', r.lobby_id, 'winner', r.winner_uid, 'decidedAt', r.decided_at,
          'matchStatus', (select m.status from public.matches m where m.lobby_id = r.lobby_id)
        ) order by r.round, r.slot)
        from public.cup_rounds r where r.bracket_id = b.id), '[]'::jsonb)
  )
  from public.cup_brackets b where b.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Running: a bye (a player drawn against nobody) and tables of two or three.
-- ---------------------------------------------------------------------------
create or replace function public.cup_resolve_round(p_bracket uuid, p_round int, p_slot int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.cup_rounds;
  b public.cup_brackets;
  l public.lobbies;
  m public.matches;
  v_a_bot boolean;
  v_b_bot boolean;
  v_loser uuid;
  v_winner uuid;
  v_turn uuid;
begin
  select * into r from public.cup_rounds where bracket_id = p_bracket and round = p_round and slot = p_slot for update;
  if not found or r.winner_uid is not null then return; end if;
  select * into b from public.cup_brackets where id = p_bracket;
  select is_bot into v_a_bot from public.profiles where uid = r.a_uid;
  select is_bot into v_b_bot from public.profiles where uid = r.b_uid;

  if r.a_uid = r.b_uid then
    -- A bye: three friends, one of them waits for the final.
    v_winner := r.a_uid;
  elsif coalesce(v_a_bot, false) and coalesce(v_b_bot, false) then
    v_winner := case when random() < 0.5 then r.a_uid else r.b_uid end;
  elsif r.lobby_id is null then
    update public.cup_rounds set lobby_id = public.cup_make_lobby(p_bracket, (select variant from public.cups where id = b.cup_id), r.a_uid, r.b_uid)
     where bracket_id = p_bracket and round = p_round and slot = p_slot;
    return;
  else
    select * into l from public.lobbies where id = r.lobby_id;
    select * into m from public.matches where lobby_id = r.lobby_id;
    if m.id is not null and m.status = 'FINISHED' then
      select user_id into v_winner from public.match_players where match_id = m.id and seat_index = m.winner_seat;
    elsif m.id is not null and m.status = 'ABANDONED' then
      v_loser := m.abandoned_by;
      if v_loser is null then
        select user_id into v_loser from public.match_players where match_id = m.id and is_out limit 1;
      end if;
      v_winner := case when v_loser = r.a_uid then r.b_uid when v_loser = r.b_uid then r.a_uid
                       else (case when random() < 0.5 then r.a_uid else r.b_uid end) end;
    elsif m.id is not null and m.status = 'IN_PROGRESS'
          and m.turn_deadline is not null and m.turn_deadline < now() - interval '5 minutes' then
      select user_id into v_turn from public.match_players where match_id = m.id and seat_index = m.turn_seat;
      if exists (select 1 from public.profiles where uid = v_turn and is_bot) then
        v_loser := case when coalesce(v_a_bot, false) then r.b_uid else r.a_uid end;
      else
        v_loser := v_turn;
      end if;
      v_winner := case when v_loser = r.a_uid then r.b_uid else r.a_uid end;
      update public.matches set status = 'ABANDONED', abandoned_by = v_loser, finished_at = now(), turn_deadline = null
       where id = m.id;
    elsif m.id is null and l.status = 'CANCELLED' then
      select user_id into v_loser from public.lobby_players where lobby_id = l.id and status = 'LEFT' limit 1;
      if v_loser is null then v_loser := l.host_id; end if;
      v_winner := case when v_loser = r.a_uid then r.b_uid else r.a_uid end;
    else
      return;
    end if;
  end if;

  if v_winner is not null then
    update public.cup_rounds set winner_uid = v_winner, decided_at = now()
     where bracket_id = p_bracket and round = p_round and slot = p_slot;
  end if;
end $$;

create or replace function public.cup_settle(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.cup_brackets;
  c public.cups;
  f public.cup_rounds;
  v_runner uuid;
  v_paid_today int := 0;
  v_pay boolean := true;
  v_pot int;
  v_seats int;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'PLAYING' then return; end if;
  select * into f from public.cup_rounds where bracket_id = p_bracket and round = 2;
  if not found or f.winner_uid is null then return; end if;
  select * into c from public.cups where id = b.cup_id;
  v_runner := case when f.winner_uid = f.a_uid then f.b_uid else f.a_uid end;
  select count(*), coalesce(sum(paid), 0) into v_seats, v_pot from public.cup_entries where bracket_id = p_bracket;

  if b.is_private then
    -- Friends: the winner takes everything that was paid in.
    update public.profiles set coins = coins + v_pot where uid = f.winner_uid and not is_bot;
  else
    if b.has_bots then
      select count(*) into v_paid_today from public.cup_brackets
       where winner_uid = f.winner_uid and has_bots and prize_paid
         and finished_at >= (public.utc_today())::timestamp at time zone 'utc';
      v_pay := v_paid_today < public.cup_bot_prize_cap();
    end if;
    if v_pay then
      update public.profiles set coins = coins + c.prize where uid = f.winner_uid and not is_bot;
    end if;
    update public.profiles set coins = coins + c.runner_up where uid = v_runner and not is_bot;
  end if;

  -- The throne needs a full table, so two friends cannot farm one.
  if v_seats = 4 and not exists (select 1 from public.profiles where uid = f.winner_uid and is_bot) then
    insert into public.throne_wins (uid, cup_id, count) values (f.winner_uid, b.cup_id, 1)
    on conflict (uid, cup_id) do update set count = throne_wins.count + 1, won_at = now();
  end if;

  update public.cup_brackets
     set status = 'FINISHED', finished_at = now(), winner_uid = f.winner_uid,
         runner_up_uid = v_runner, prize_paid = v_pay
   where id = p_bracket;
end $$;

create or replace function public.cup_advance(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.cup_brackets;
  w1 uuid;
  w2 uuid;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'PLAYING' then return; end if;
  if exists (select 1 from public.cup_rounds where bracket_id = p_bracket and round = 1) then
    perform public.cup_resolve_round(p_bracket, 1, 0);
    perform public.cup_resolve_round(p_bracket, 1, 1);
    select winner_uid into w1 from public.cup_rounds where bracket_id = p_bracket and round = 1 and slot = 0;
    select winner_uid into w2 from public.cup_rounds where bracket_id = p_bracket and round = 1 and slot = 1;
    if w1 is null or w2 is null then return; end if;
    if not exists (select 1 from public.cup_rounds where bracket_id = p_bracket and round = 2) then
      insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid) values (p_bracket, 2, 0, w1, w2);
    end if;
  end if;
  perform public.cup_resolve_round(p_bracket, 2, 0);
  perform public.cup_settle(p_bracket);
end $$;

/** Two friends play a final; three get a semi-final and a bye; four get the full tree. */
create or replace function public.cup_start(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order uuid[];
  v_n int;
begin
  select coalesce(array_agg(uid order by random()), '{}') into v_order from public.cup_entries where bracket_id = p_bracket;
  v_n := coalesce(array_length(v_order, 1), 0);
  if v_n not between 2 and 4 then return; end if;
  update public.cup_brackets set status = 'PLAYING', started_at = now() where id = p_bracket and status = 'WAITING';
  if v_n = 4 then
    insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid)
    values (p_bracket, 1, 0, v_order[1], v_order[2]), (p_bracket, 1, 1, v_order[3], v_order[4])
    on conflict do nothing;
  elsif v_n = 3 then
    insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid)
    values (p_bracket, 1, 0, v_order[1], v_order[2]), (p_bracket, 1, 1, v_order[3], v_order[3])
    on conflict do nothing;
  else
    insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid)
    values (p_bracket, 2, 0, v_order[1], v_order[2])
    on conflict do nothing;
  end if;
  perform public.cup_advance(p_bracket);
end $$;

-- ---------------------------------------------------------------------------
-- The player's side
-- ---------------------------------------------------------------------------

/** Takes one seat for `p_uid` in `p_bracket`, paying the hall's entry. */
create or replace function public.cup_take_seat(p_bracket uuid, p_uid uuid, p_entry int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_seat int;
  v_coins int;
begin
  select coins into v_coins from public.profiles where uid = p_uid;
  if v_coins < p_entry then
    raise exception 'You need % coins to enter this cup.', p_entry using errcode = 'P0001';
  end if;
  select coalesce(min(s), 0) into v_seat from generate_series(0, 3) s
   where not exists (select 1 from public.cup_entries e where e.bracket_id = p_bracket and e.seat = s);
  update public.profiles set coins = coins - p_entry where uid = p_uid;
  insert into public.cup_entries (bracket_id, uid, seat, paid) values (p_bracket, p_uid, v_seat, p_entry);
end $$;
revoke all on function public.cup_take_seat(uuid, uuid, int) from public, anon, authenticated;

/** The bracket the caller is already in, if any. */
create or replace function public.cup_active_for(p_uid uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select e.bracket_id from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
   where e.uid = p_uid and b.status in ('WAITING', 'PLAYING') limit 1;
$$;
revoke all on function public.cup_active_for(uuid) from public, anon, authenticated;

create or replace function public.join_cup(p_cup_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  c public.cups;
  v_bracket uuid;
  v_active uuid;
begin
  select * into c from public.cups where id = p_cup_id;
  if not found then
    raise exception 'There is no such cup.' using errcode = '22023';
  end if;
  v_active := public.cup_active_for(v_uid);
  if v_active is not null then
    return public.cup_bracket_json(v_active);
  end if;
  select b.id into v_bracket from public.cup_brackets b
   where b.cup_id = c.id and b.status = 'WAITING' and not b.is_private
     and (select count(*) from public.cup_entries e where e.bracket_id = b.id) < 4
   order by b.created_at
   limit 1
   for update of b skip locked;
  if v_bracket is null then
    insert into public.cup_brackets (cup_id) values (c.id) returning id into v_bracket;
  end if;
  perform public.cup_take_seat(v_bracket, v_uid, c.entry);
  if (select count(*) from public.cup_entries where bracket_id = v_bracket) = 4 then
    perform public.cup_start(v_bracket);
  end if;
  return public.cup_bracket_json(v_bracket);
end $$;

/** Opens a private bracket in a hall and sits the host in seat 0. */
create or replace function public.create_private_cup(p_cup_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  c public.cups;
  v_bracket uuid;
  v_active uuid;
begin
  select * into c from public.cups where id = p_cup_id;
  if not found then
    raise exception 'There is no such cup.' using errcode = '22023';
  end if;
  v_active := public.cup_active_for(v_uid);
  if v_active is not null then
    raise exception 'Finish or leave your current cup first.' using errcode = '22023';
  end if;
  insert into public.cup_brackets (cup_id, is_private, host_uid, invite_code)
  values (c.id, true, v_uid, public.new_cup_code()) returning id into v_bracket;
  perform public.cup_take_seat(v_bracket, v_uid, c.entry);
  return public.cup_bracket_json(v_bracket);
end $$;
revoke execute on function public.create_private_cup(text) from public, anon;
grant execute on function public.create_private_cup(text) to authenticated;

/** Sits down at a friend's cup by its code. */
create or replace function public.join_cup_by_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  b public.cup_brackets;
  c public.cups;
  v_active uuid;
begin
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'That is not a cup code.' using errcode = '22023';
  end if;
  select * into b from public.cup_brackets where invite_code = v_code for update;
  if not found then
    raise exception 'No cup has that code.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.cup_entries where bracket_id = b.id and uid = v_uid) then
    return public.cup_bracket_json(b.id);
  end if;
  if b.status <> 'WAITING' then
    raise exception 'That cup has already started.' using errcode = '22023';
  end if;
  if (select count(*) from public.cup_entries where bracket_id = b.id) >= 4 then
    raise exception 'That cup is full.' using errcode = '22023';
  end if;
  v_active := public.cup_active_for(v_uid);
  if v_active is not null then
    raise exception 'Finish or leave your current cup first.' using errcode = '22023';
  end if;
  select * into c from public.cups where id = b.cup_id;
  perform public.cup_take_seat(b.id, v_uid, c.entry);
  if (select count(*) from public.cup_entries where bracket_id = b.id) = 4 then
    perform public.cup_start(b.id);
  end if;
  return public.cup_bracket_json(b.id);
end $$;
revoke execute on function public.join_cup_by_code(text) from public, anon;
grant execute on function public.join_cup_by_code(text) to authenticated;

/** The host starts a private cup once two to four friends are in. */
create or replace function public.start_private_cup(p_bracket uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  b public.cup_brackets;
  v_n int;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or not b.is_private or b.host_uid <> v_uid then
    raise exception 'Only the host can start this cup.' using errcode = '42501';
  end if;
  if b.status <> 'WAITING' then return public.cup_bracket_json(p_bracket); end if;
  select count(*) into v_n from public.cup_entries where bracket_id = p_bracket;
  if v_n < 2 then
    raise exception 'A cup needs at least two players.' using errcode = '22023';
  end if;
  perform public.cup_start(p_bracket);
  return public.cup_bracket_json(p_bracket);
end $$;
revoke execute on function public.start_private_cup(uuid) from public, anon;
grant execute on function public.start_private_cup(uuid) to authenticated;

/** Leaving before the start refunds the entry; the host leaving refunds everyone and closes the cup. */
create or replace function public.leave_cup(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  b public.cup_brackets;
  e public.cup_entries;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'WAITING' then return; end if;
  select * into e from public.cup_entries where bracket_id = p_bracket and uid = v_uid;
  if not found then return; end if;
  if b.is_private and b.host_uid = v_uid then
    update public.profiles p set coins = p.coins + x.paid
      from public.cup_entries x where x.bracket_id = p_bracket and x.uid = p.uid;
    delete from public.cup_brackets where id = p_bracket;
    return;
  end if;
  update public.profiles set coins = coins + e.paid where uid = v_uid;
  delete from public.cup_entries where bracket_id = p_bracket and uid = v_uid;
  if not exists (select 1 from public.cup_entries where bracket_id = p_bracket) then
    delete from public.cup_brackets where id = p_bracket;
  end if;
end $$;

/** As 0035, except a private cup never seats computer players. */
create or replace function public.get_cup_bracket(p_bracket uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  b public.cup_brackets;
begin
  select * into b from public.cup_brackets where id = p_bracket;
  if not found then
    raise exception 'That cup is over.' using errcode = 'P0002';
  end if;
  if b.status = 'WAITING' then
    if not b.is_private
       and b.created_at < now() - make_interval(secs => public.bot_wait_seconds())
       and exists (select 1 from public.cup_entries where bracket_id = p_bracket) then
      perform public.cup_fill_bots(p_bracket);
    end if;
  elsif b.status = 'PLAYING' then
    perform public.cup_advance(p_bracket);
  end if;
  return public.cup_bracket_json(p_bracket);
end $$;

/** As 0035, with private brackets left out of the "waiting" counts. */
create or replace function public.get_cups() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_paid_today int;
begin
  select count(*) into v_paid_today from public.cup_brackets
   where winner_uid = v_uid and has_bots and prize_paid
     and finished_at >= (public.utc_today())::timestamp at time zone 'utc';
  return jsonb_build_object(
    'serverNow', now(),
    'activeBracket', public.cup_active_for(v_uid),
    'botPaidToday', v_paid_today,
    'botPrizeCap', public.cup_bot_prize_cap(),
    'waitSeconds', public.bot_wait_seconds(),
    'cups', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', c.id, 'entry', c.entry, 'prize', c.prize, 'runnerUp', c.runner_up, 'variant', c.variant,
          'waiting', (select count(*) from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
                       where b.cup_id = c.id and b.status = 'WAITING' and not b.is_private),
          'won', coalesce((select t.count from public.throne_wins t where t.uid = v_uid and t.cup_id = c.id), 0)
        ) order by c.sort)
        from public.cups c), '[]'::jsonb)
  );
end $$;
