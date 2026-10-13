-- 0035: the Royal Road cups. Apply after 0034.
--
-- Eight halls, each a four-player knockout: two semi-finals and a final,
-- played as ordinary two-seat online matches. Entry is paid in coins when a
-- player sits down; the winner collects three entries and the runner-up gets
-- theirs back; the winner's throne goes to the Collection Room (0034).
-- Seats left empty after a minute are taken by computer players, and a
-- bracket with computer players in it pays coins at most three times a day.
-- Mirrors CUPS in src/domain/collection/thrones.ts.

create table if not exists public.cups (
  id        text primary key check (id ~ '^[a-z-]{3,24}$'),
  sort      int  not null unique,
  entry     int  not null check (entry >= 0),
  prize     int  not null check (prize >= 0),
  runner_up int  not null check (runner_up >= 0),
  variant   text not null
);
alter table public.cups enable row level security;
revoke all on public.cups from public, anon, authenticated;

insert into public.cups (id, sort, entry, prize, runner_up, variant) values
  ('village',  1, 0,      300,     100,    'quick1'),
  ('merchant', 2, 250,    750,     250,    'quick1'),
  ('knight',   3, 1000,   3000,    1000,   'quick1'),
  ('baron',    4, 5000,   15000,   5000,   'quick2'),
  ('duke',     5, 25000,  75000,   25000,  'quick2'),
  ('king',     6, 75000,  225000,  75000,  'quick2'),
  ('emperor',  7, 200000, 600000,  200000, 'classic'),
  ('legends',  8, 500000, 1500000, 500000, 'classic')
on conflict (id) do update set sort = excluded.sort, entry = excluded.entry, prize = excluded.prize,
  runner_up = excluded.runner_up, variant = excluded.variant;

create table if not exists public.cup_brackets (
  id            uuid primary key default gen_random_uuid(),
  cup_id        text not null references public.cups (id),
  status        text not null default 'WAITING' check (status in ('WAITING', 'PLAYING', 'FINISHED', 'CANCELLED')),
  has_bots      boolean not null default false,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  winner_uid    uuid references auth.users (id) on delete set null,
  runner_up_uid uuid references auth.users (id) on delete set null,
  -- False when the winner's daily computer-bracket allowance was used up.
  prize_paid    boolean not null default false
);
create index if not exists cup_brackets_open on public.cup_brackets (cup_id, created_at) where status = 'WAITING';
alter table public.cup_brackets enable row level security;
revoke all on public.cup_brackets from public, anon, authenticated;

create table if not exists public.cup_entries (
  bracket_id uuid not null references public.cup_brackets (id) on delete cascade,
  uid        uuid not null references auth.users (id) on delete cascade,
  seat       int  not null check (seat between 0 and 3),
  paid       int  not null default 0 check (paid >= 0),
  joined_at  timestamptz not null default now(),
  primary key (bracket_id, uid),
  unique (bracket_id, seat)
);
create index if not exists cup_entries_user on public.cup_entries (uid);
alter table public.cup_entries enable row level security;
revoke all on public.cup_entries from public, anon, authenticated;

create table if not exists public.cup_rounds (
  bracket_id uuid not null references public.cup_brackets (id) on delete cascade,
  round      int  not null check (round in (1, 2)),
  slot       int  not null check (slot in (0, 1)),
  a_uid      uuid not null references auth.users (id) on delete cascade,
  b_uid      uuid not null references auth.users (id) on delete cascade,
  lobby_id   uuid references public.lobbies (id) on delete set null,
  winner_uid uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  primary key (bracket_id, round, slot)
);
alter table public.cup_rounds enable row level security;
revoke all on public.cup_rounds from public, anon, authenticated;

alter table public.lobbies add column if not exists cup_bracket_id uuid references public.cup_brackets (id) on delete set null;
create index if not exists lobbies_cup on public.lobbies (cup_bracket_id) where cup_bracket_id is not null;

/** Coins a bracket with computer players pays out, at most this many times a day. */
create or replace function public.cup_bot_prize_cap() returns int
language sql immutable set search_path = public, pg_temp as $$ select 3 $$;

-- ---------------------------------------------------------------------------
-- Reading a bracket
-- ---------------------------------------------------------------------------

create or replace function public.cup_bracket_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'id', b.id,
    'cup', b.cup_id,
    'status', b.status,
    'hasBots', b.has_bots,
    'createdAt', b.created_at,
    'startedAt', b.started_at,
    'finishedAt', b.finished_at,
    'fillAt', b.created_at + make_interval(secs => public.bot_wait_seconds()),
    'winner', b.winner_uid,
    'runnerUp', b.runner_up_uid,
    'prizePaid', b.prize_paid,
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
revoke all on function public.cup_bracket_json(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Running a bracket
-- ---------------------------------------------------------------------------

/** A two-seat table for one round, like a quick-play table; the human (if any) hosts. */
create or replace function public.cup_make_lobby(p_bracket uuid, p_variant text, p_a uuid, p_b uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_timeout int;
  v_challenge uuid;
  v_lobby uuid;
  v_host uuid := p_a;
  v_guest uuid := p_b;
begin
  if exists (select 1 from public.profiles where uid = p_a and is_bot)
     and not exists (select 1 from public.profiles where uid = p_b and is_bot) then
    v_host := p_b; v_guest := p_a;
  end if;
  select challenge_timeout_seconds into v_timeout from public.social_settings where id;
  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_host, 2, 'IN_LOBBY', 'QUICK', now() + make_interval(secs => v_timeout))
  returning id into v_challenge;
  insert into public.lobbies (challenge_id, host_id, max_players, stake, variant, teams, cup_bracket_id)
  values (v_challenge, v_host, 2, 0, p_variant, false, p_bracket)
  returning id into v_lobby;
  update public.challenges set lobby_id = v_lobby where id = v_challenge;
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_host, 'ACCEPTED', now(), now()), (v_challenge, v_guest, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_host, 'JOINED', true, 0, now()), (v_lobby, v_guest, 'JOINED', true, 1, now());
  perform public.refresh_lobby_state(v_lobby);
  -- A little longer than quick play: the players are coming from the bracket screen.
  update public.lobbies set start_at = now() + interval '12 seconds' where id = v_lobby and status = 'COUNTDOWN';
  return v_lobby;
end $$;
revoke all on function public.cup_make_lobby(uuid, text, uuid, uuid) from public, anon, authenticated;

/**
 * Settles one round from its table: a finished match names the winner, a
 * walk-out or a cancelled table loses it for the one who left, and a table
 * nobody has touched for five minutes past its clock is lost by the absent
 * player. Two computer players decide it on the spot.
 */
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

  if coalesce(v_a_bot, false) and coalesce(v_b_bot, false) then
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
      -- Nobody is at this table any more: the absent player loses it.
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
revoke all on function public.cup_resolve_round(uuid, int, int) from public, anon, authenticated;

/** Pays the winner and runner-up, lights the throne, and closes the bracket. */
create or replace function public.cup_settle(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.cup_brackets;
  c public.cups;
  f public.cup_rounds;
  v_runner uuid;
  v_paid_today int := 0;
  v_pay boolean := true;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'PLAYING' then return; end if;
  select * into f from public.cup_rounds where bracket_id = p_bracket and round = 2;
  if not found or f.winner_uid is null then return; end if;
  select * into c from public.cups where id = b.cup_id;
  v_runner := case when f.winner_uid = f.a_uid then f.b_uid else f.a_uid end;

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

  if not exists (select 1 from public.profiles where uid = f.winner_uid and is_bot) then
    insert into public.throne_wins (uid, cup_id, count) values (f.winner_uid, b.cup_id, 1)
    on conflict (uid, cup_id) do update set count = throne_wins.count + 1, won_at = now();
  end if;

  update public.cup_brackets
     set status = 'FINISHED', finished_at = now(), winner_uid = f.winner_uid,
         runner_up_uid = v_runner, prize_paid = v_pay
   where id = p_bracket;
end $$;
revoke all on function public.cup_settle(uuid) from public, anon, authenticated;

/** Moves a playing bracket along: tables for the rounds, then the final, then the prizes. */
create or replace function public.cup_advance(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.cup_brackets;
  w1 uuid;
  w2 uuid;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'PLAYING' then return; end if;
  perform public.cup_resolve_round(p_bracket, 1, 0);
  perform public.cup_resolve_round(p_bracket, 1, 1);
  select winner_uid into w1 from public.cup_rounds where bracket_id = p_bracket and round = 1 and slot = 0;
  select winner_uid into w2 from public.cup_rounds where bracket_id = p_bracket and round = 1 and slot = 1;
  if w1 is null or w2 is null then return; end if;
  if not exists (select 1 from public.cup_rounds where bracket_id = p_bracket and round = 2) then
    insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid) values (p_bracket, 2, 0, w1, w2);
  end if;
  perform public.cup_resolve_round(p_bracket, 2, 0);
  perform public.cup_settle(p_bracket);
end $$;
revoke all on function public.cup_advance(uuid) from public, anon, authenticated;

/** Four seats taken: shuffle them into two semi-finals and start. */
create or replace function public.cup_start(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order uuid[];
begin
  select coalesce(array_agg(uid order by random()), '{}') into v_order from public.cup_entries where bracket_id = p_bracket;
  if coalesce(array_length(v_order, 1), 0) <> 4 then return; end if;
  update public.cup_brackets set status = 'PLAYING', started_at = now() where id = p_bracket and status = 'WAITING';
  insert into public.cup_rounds (bracket_id, round, slot, a_uid, b_uid)
  values (p_bracket, 1, 0, v_order[1], v_order[2]), (p_bracket, 1, 1, v_order[3], v_order[4])
  on conflict do nothing;
  perform public.cup_advance(p_bracket);
end $$;
revoke all on function public.cup_start(uuid) from public, anon, authenticated;

/** After the wait, computer players take the empty seats and the cup starts. */
create or replace function public.cup_fill_bots(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_seat int;
  v_bot uuid;
  v_need int;
begin
  select 4 - count(*) into v_need from public.cup_entries where bracket_id = p_bracket;
  if v_need <= 0 then return; end if;
  for v_bot in
    select p.uid from public.profiles p
     where p.is_bot and not exists (select 1 from public.cup_entries e where e.bracket_id = p_bracket and e.uid = p.uid)
     order by exists (
       select 1 from public.match_players mp join public.matches mm on mm.id = mp.match_id
        where mp.user_id = p.uid and mm.status = 'IN_PROGRESS'
     ), random()
     limit v_need
  loop
    select coalesce(min(s), 0) into v_seat from generate_series(0, 3) s
     where not exists (select 1 from public.cup_entries e where e.bracket_id = p_bracket and e.seat = s);
    insert into public.cup_entries (bracket_id, uid, seat, paid) values (p_bracket, v_bot, v_seat, 0);
  end loop;
  update public.cup_brackets set has_bots = true where id = p_bracket;
  perform public.cup_start(p_bracket);
end $$;
revoke all on function public.cup_fill_bots(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The player's side
-- ---------------------------------------------------------------------------

/** Pays the entry and takes a seat in the oldest open bracket of the cup (or a new one). */
create or replace function public.join_cup(p_cup_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  c public.cups;
  v_bracket uuid;
  v_seat int;
  v_coins int;
  v_active uuid;
begin
  select * into c from public.cups where id = p_cup_id;
  if not found then
    raise exception 'There is no such cup.' using errcode = '22023';
  end if;
  select e.bracket_id into v_active from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
   where e.uid = v_uid and b.status in ('WAITING', 'PLAYING') limit 1;
  if v_active is not null then
    return public.cup_bracket_json(v_active);
  end if;
  select coins into v_coins from public.profiles where uid = v_uid;
  if v_coins < c.entry then
    raise exception 'You need % coins to enter this cup.', c.entry using errcode = 'P0001';
  end if;

  select b.id into v_bracket from public.cup_brackets b
   where b.cup_id = c.id and b.status = 'WAITING'
     and (select count(*) from public.cup_entries e where e.bracket_id = b.id) < 4
   order by b.created_at
   limit 1
   for update of b skip locked;
  if v_bracket is null then
    insert into public.cup_brackets (cup_id) values (c.id) returning id into v_bracket;
  end if;

  select coalesce(min(s), 0) into v_seat from generate_series(0, 3) s
   where not exists (select 1 from public.cup_entries e where e.bracket_id = v_bracket and e.seat = s);
  update public.profiles set coins = coins - c.entry where uid = v_uid;
  insert into public.cup_entries (bracket_id, uid, seat, paid) values (v_bracket, v_uid, v_seat, c.entry);

  if (select count(*) from public.cup_entries where bracket_id = v_bracket) = 4 then
    perform public.cup_start(v_bracket);
  end if;
  return public.cup_bracket_json(v_bracket);
end $$;
revoke execute on function public.join_cup(text) from public, anon;
grant execute on function public.join_cup(text) to authenticated;

/** Leaves a bracket that has not started, with the entry refunded. */
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
  update public.profiles set coins = coins + e.paid where uid = v_uid;
  delete from public.cup_entries where bracket_id = p_bracket and uid = v_uid;
  if not exists (select 1 from public.cup_entries where bracket_id = p_bracket) then
    delete from public.cup_brackets where id = p_bracket;
  end if;
end $$;
revoke execute on function public.leave_cup(uuid) from public, anon;
grant execute on function public.leave_cup(uuid) to authenticated;

/**
 * The bracket as it stands. Reading it is also what moves it: the wait ends
 * with computer players, finished tables decide their rounds, the final is
 * seated and the prizes are paid.
 */
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
    if b.created_at < now() - make_interval(secs => public.bot_wait_seconds())
       and exists (select 1 from public.cup_entries where bracket_id = p_bracket) then
      perform public.cup_fill_bots(p_bracket);
    end if;
  elsif b.status = 'PLAYING' then
    perform public.cup_advance(p_bracket);
  end if;
  return public.cup_bracket_json(p_bracket);
end $$;
revoke execute on function public.get_cup_bracket(uuid) from public, anon;
grant execute on function public.get_cup_bracket(uuid) to authenticated;

/** The halls, with how many are waiting at each, my thrones, and the bracket I am in. */
create or replace function public.get_cups() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_active uuid;
  v_paid_today int;
begin
  select e.bracket_id into v_active from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
   where e.uid = v_uid and b.status in ('WAITING', 'PLAYING') limit 1;
  select count(*) into v_paid_today from public.cup_brackets
   where winner_uid = v_uid and has_bots and prize_paid
     and finished_at >= (public.utc_today())::timestamp at time zone 'utc';
  return jsonb_build_object(
    'serverNow', now(),
    'activeBracket', v_active,
    'botPaidToday', v_paid_today,
    'botPrizeCap', public.cup_bot_prize_cap(),
    'waitSeconds', public.bot_wait_seconds(),
    'cups', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', c.id, 'entry', c.entry, 'prize', c.prize, 'runnerUp', c.runner_up, 'variant', c.variant,
          'waiting', (select count(*) from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
                       where b.cup_id = c.id and b.status = 'WAITING'),
          'won', coalesce((select t.count from public.throne_wins t where t.uid = v_uid and t.cup_id = c.id), 0)
        ) order by c.sort)
        from public.cups c), '[]'::jsonb)
  );
end $$;
revoke execute on function public.get_cups() from public, anon;
grant execute on function public.get_cups() to authenticated;

/** My open bracket, if any, so a table can send me back to it. */
create or replace function public.my_cup_bracket() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select e.bracket_id from public.cup_entries e join public.cup_brackets b on b.id = e.bracket_id
   where e.uid = (select auth.uid()) and b.status in ('WAITING', 'PLAYING') limit 1;
$$;
revoke execute on function public.my_cup_bracket() from public, anon;
grant execute on function public.my_cup_bracket() to authenticated;

-- ---------------------------------------------------------------------------
-- Snapshots, as 0032 plus the bracket a cup table belongs to.
-- ---------------------------------------------------------------------------
create or replace function public.match_snapshot(p_match_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'mySeat', (
      select mp.seat_index from public.match_players mp
      where mp.match_id = m.id and mp.user_id = (select auth.uid())
    ),
    'match', jsonb_build_object(
      'id', m.id,
      'lobbyId', m.lobby_id,
      'playerCount', m.player_count,
      'status', m.status,
      'state', m.state,
      'version', m.version,
      'turnSeat', m.turn_seat,
      'lastRoll', m.last_roll,
      'winnerSeat', m.winner_seat,
      'stake', m.stake,
      'pool', m.pool,
      'prize', public.stake_prize(m.pool),
      'turnDeadline', m.turn_deadline,
      'variant', m.variant,
      'lifelines', public.lifelines(),
      'teams', m.teams,
      'cupBracketId', (select l.cup_bracket_id from public.lobbies l where l.id = m.lobby_id)
    ),
    'players', coalesce((
      select jsonb_agg(entry order by entry ->> 'seatIndex')
      from (
        select jsonb_build_object(
          'userId', mp.user_id,
          'seatIndex', mp.seat_index,
          'username', p.username,
          'displayName', p.display_name,
          'avatar', p.avatar,
          'country', p.country,
          'isBot', p.is_bot,
          'presence', case when p.is_bot then 'ONLINE'::public.presence_status
                           else public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen) end,
          'lastSeen', case when p.is_bot then now() else pr.last_seen end,
          'missed', mp.missed,
          'out', mp.is_out
        ) as entry
        from public.match_players mp
        join public.profiles p on p.uid = mp.user_id
        left join public.user_presence pr on pr.uid = mp.user_id
        where mp.match_id = m.id
      ) rows
    ), '[]'::jsonb)
  )
  from public.matches m
  where m.id = p_match_id and public.is_match_member(m.id);
$$;
grant execute on function public.match_snapshot(uuid) to authenticated;

create or replace function public.lobby_snapshot(p_lobby_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'lobby', jsonb_build_object(
      'id', l.id,
      'challengeId', l.challenge_id,
      'hostId', l.host_id,
      'maxPlayers', l.max_players,
      'status', l.status,
      'startAt', l.start_at,
      'createdAt', l.created_at,
      'inviteCode', l.invite_code,
      'stake', l.stake,
      'variant', l.variant,
      'teams', l.teams,
      'seeking', l.seeking,
      'movedTo', l.moved_to,
      'seekingSince', l.seeking_since,
      'cupBracketId', l.cup_bracket_id
    ),
    'challenge', jsonb_build_object(
      'id', c.id,
      'creatorId', c.creator_id,
      'playerCount', c.player_count,
      'status', c.status,
      'kind', c.kind,
      'expiresAt', c.expires_at,
      'startedAt', c.started_at
    ),
    'players', coalesce((
      select jsonb_agg(entry order by entry ->> 'seatIndex')
      from (
        select jsonb_build_object(
          'userId', lp.user_id,
          'username', p.username,
          'displayName', p.display_name,
          'avatar', p.avatar,
          'country', p.country,
          'isBot', p.is_bot,
          'seatIndex', lp.seat_index,
          'status', lp.status,
          'isReady', lp.is_ready,
          'isHost', lp.user_id = l.host_id,
          'joinedAt', lp.joined_at,
          'invitationStatus', cp.invitation_status,
          'presence', case when p.is_bot then 'ONLINE'::public.presence_status
                           else public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen) end,
          'lastSeen', case when p.is_bot then now() else pr.last_seen end
        ) as entry
        from public.lobby_players lp
        join public.profiles p on p.uid = lp.user_id
        left join public.user_presence pr on pr.uid = lp.user_id
        left join public.challenge_participants cp
          on cp.challenge_id = l.challenge_id and cp.user_id = lp.user_id
        where lp.lobby_id = l.id
      ) rows
    ), '[]'::jsonb)
  )
  from public.lobbies l
  join public.challenges c on c.id = l.challenge_id
  where l.id = p_lobby_id and public.is_lobby_member(l.id);
$$;
