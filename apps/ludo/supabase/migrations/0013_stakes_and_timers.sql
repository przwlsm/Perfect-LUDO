-- 0013: entry stakes with prize pools, and server-enforced turn timers.
-- Apply after 0012.
--
-- Stakes: a quick-play or invite-link table can cost 100, 500 or 2,000 coins
-- to sit at. Each seat pays when the match is created (never earlier, so a
-- table that breaks up in the lobby costs nothing). The winner collects 90%
-- of the pool; the rest leaves the economy. If someone walks out, the players
-- who stayed split the whole pool, the walker's stake included.
--
-- Timers: every roll and every move has a deadline. When it passes, anyone
-- else at the table can claim it and the server plays that turn itself (the
-- first legal move). Three missed turns in a row count as walking out.

-- ---------------------------------------------------------------------------
-- Stakes
-- ---------------------------------------------------------------------------

create or replace function public.valid_stake(p_stake int) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_stake in (0, 100, 500, 2000);
$$;

alter table public.matchmaking_queue add column if not exists stake int not null default 0;
alter table public.lobbies add column if not exists stake int not null default 0;
alter table public.matches add column if not exists stake int not null default 0;
alter table public.matches add column if not exists pool int not null default 0;

do $$ begin
  alter table public.matchmaking_queue add constraint matchmaking_queue_stake_valid check (public.valid_stake(stake));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lobbies add constraint lobbies_stake_valid check (public.valid_stake(stake));
exception when duplicate_object then null; end $$;

-- What each seat actually paid in: the settlement reads it back.
create table if not exists public.match_stakes (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  amount   int  not null check (amount >= 0),
  primary key (match_id, user_id)
);
alter table public.match_stakes enable row level security;
revoke all on public.match_stakes from public, anon, authenticated;

-- The winner's share of a pool.
create or replace function public.stake_prize(p_pool int) returns int
language sql immutable set search_path = public, pg_temp as $$
  select floor(coalesce(p_pool, 0) * 0.9)::int;
$$;

-- Refuses a seat at a staked table to guests and to anyone short of coins.
create or replace function public.require_stake(p_uid uuid, p_stake int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_coins int;
begin
  if not public.valid_stake(coalesce(p_stake, -1)) then
    raise exception 'That table stake is not available.' using errcode = '22023';
  end if;
  if p_stake = 0 then return; end if;
  if public.is_guest_session() then
    raise exception 'Create an account to play for coins.' using errcode = '42501';
  end if;
  select coins into v_coins from public.profiles where uid = p_uid;
  if coalesce(v_coins, 0) < p_stake then
    raise exception 'You need % coins to sit at this table.', p_stake using errcode = '22023';
  end if;
end $$;
revoke all on function public.require_stake(uuid, int) from public, anon, authenticated;

create or replace function public.quick_match_ticket(p_ticket public.matchmaking_queue)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'status', case when p_ticket.lobby_id is null then 'WAITING' else 'MATCHED' end,
    'lobbyId', p_ticket.lobby_id,
    'playerCount', p_ticket.player_count,
    'stake', p_ticket.stake,
    'waiting', (select count(*) from public.matchmaking_queue q
                 where q.player_count = p_ticket.player_count and q.stake = p_ticket.stake
                   and q.lobby_id is null
                   and q.last_seen > now() - interval '45 seconds'),
    'serverNow', now()
  );
$$;
revoke all on function public.quick_match_ticket(public.matchmaking_queue) from public, anon, authenticated;

drop function if exists public.join_quick_match(int);
create or replace function public.join_quick_match(p_player_count int default 2, p_stake int default 0)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_ticket public.matchmaking_queue;
  v_party uuid[];
  v_member uuid;
  v_timeout int;
  v_countdown int;
  v_challenge uuid;
  v_lobby uuid;
  v_seat int := 0;
begin
  if v_count not between 2 and 4 then
    raise exception 'Quick play seats 2 to 4 players.' using errcode = '22023';
  end if;
  perform public.require_stake(v_uid, v_stake);

  perform public.expire_stale_challenges();

  delete from public.matchmaking_queue
   where (lobby_id is null and last_seen < now() - interval '45 seconds')
      or (lobby_id is not null and last_seen < now() - interval '10 minutes');

  insert into public.matchmaking_queue (user_id, player_count, stake)
  values (v_uid, v_count, v_stake)
  on conflict (user_id) do update
    set last_seen = now(),
        player_count = excluded.player_count,
        stake = excluded.stake,
        -- Switching table size or stake means a fresh place in that queue.
        joined_at = case when matchmaking_queue.player_count = excluded.player_count
                          and matchmaking_queue.stake = excluded.stake
                         then matchmaking_queue.joined_at else now() end;

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid for update;
  if v_ticket.lobby_id is not null then
    return public.quick_match_ticket(v_ticket);
  end if;

  -- Seat the longest-waiting players at this size and stake who can still
  -- pay. Rows locked by a concurrent matcher are skipped, so two calls can
  -- never seat the same player twice.
  select coalesce(array_agg(t.user_id order by t.joined_at), '{}') into v_party
  from (
    select q.user_id, q.joined_at from public.matchmaking_queue q
     where q.player_count = v_count and q.stake = v_stake and q.lobby_id is null
       and q.last_seen > now() - interval '45 seconds'
       and (v_stake = 0 or exists (
         select 1 from public.profiles p where p.uid = q.user_id and p.coins >= v_stake))
     order by q.joined_at
     limit v_count
     for update of q skip locked
  ) t;

  if coalesce(array_length(v_party, 1), 0) < v_count then
    return public.quick_match_ticket(v_ticket);
  end if;

  select challenge_timeout_seconds, countdown_seconds into v_timeout, v_countdown
    from public.social_settings where id;

  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_party[1], v_count, 'IN_LOBBY', 'QUICK', now() + make_interval(secs => v_timeout))
  returning id into v_challenge;

  insert into public.lobbies (challenge_id, host_id, max_players, stake)
  values (v_challenge, v_party[1], v_count, v_stake)
  returning id into v_lobby;

  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  foreach v_member in array v_party loop
    insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
    values (v_challenge, v_member, 'ACCEPTED', now(), now());
    insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
    values (v_lobby, v_member, 'JOINED', true, v_seat, now());
    v_seat := v_seat + 1;
  end loop;

  update public.matchmaking_queue set lobby_id = v_lobby, last_seen = now()
   where user_id = any(v_party);

  perform public.refresh_lobby_state(v_lobby);
  update public.lobbies set start_at = now() + make_interval(secs => greatest(v_countdown, 5))
   where id = v_lobby and status = 'COUNTDOWN';

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid;
  return public.quick_match_ticket(v_ticket);
end $$;
revoke execute on function public.join_quick_match(int, int) from public, anon;
grant execute on function public.join_quick_match(int, int) to authenticated;

drop function if exists public.create_link_room(int);
create or replace function public.create_link_room(p_player_count int default 2, p_stake int default 0)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_challenge uuid;
  v_lobby uuid;
  v_code text;
begin
  if v_count not between 2 and 4 then
    raise exception 'A private game seats 2 to 4 players.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  perform public.require_stake(v_uid, v_stake);
  perform public.expire_stale_challenges();
  perform public.expire_stale_link_rooms();

  -- One open link room per host: a new one replaces the old.
  update public.lobbies l set status = 'CANCELLED', start_at = null
    from public.challenges c
   where c.id = l.challenge_id and c.kind = 'LINK' and l.host_id = v_uid
     and l.status in ('WAITING', 'COUNTDOWN');
  update public.challenges set status = 'CANCELLED'
   where kind = 'LINK' and creator_id = v_uid and status = 'IN_LOBBY';

  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_uid, v_count, 'IN_LOBBY', 'LINK', now() + interval '30 minutes')
  returning id into v_challenge;

  v_code := public.new_invite_code();
  insert into public.lobbies (challenge_id, host_id, max_players, invite_code, stake)
  values (v_challenge, v_uid, v_count, v_code, v_stake)
  returning id into v_lobby;
  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_uid, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_uid, 'JOINED', true, 0, now());

  return jsonb_build_object('lobbyId', v_lobby, 'code', v_code);
end $$;
revoke execute on function public.create_link_room(int, int) from public, anon;
grant execute on function public.create_link_room(int, int) to authenticated;

create or replace function public.join_link_room(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_lobby public.lobbies;
  v_joined int;
  v_seat int;
  v_auto boolean;
begin
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'That invite code does not look right. It is six letters and numbers.'
      using errcode = '22023';
  end if;
  perform public.expire_stale_challenges();
  perform public.expire_stale_link_rooms();

  select l.* into v_lobby from public.lobbies l
    join public.challenges c on c.id = l.challenge_id
   where l.invite_code = v_code and c.kind = 'LINK'
   for update of l;
  if not found then
    raise exception 'No game found for that code. Ask for a new link.' using errcode = 'P0002';
  end if;
  if v_lobby.status not in ('WAITING', 'COUNTDOWN') then
    raise exception 'That game has already started or was closed.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  perform public.require_stake(v_uid, v_lobby.stake);

  if exists (select 1 from public.lobby_players where lobby_id = v_lobby.id and user_id = v_uid) then
    select count(*) into v_joined from public.lobby_players
     where lobby_id = v_lobby.id and status = 'JOINED' and user_id <> v_uid;
    if v_joined >= v_lobby.max_players then
      raise exception 'That game is full.' using errcode = '22023';
    end if;
    update public.lobby_players
       set status = 'JOINED', disconnected_at = null, joined_at = coalesce(joined_at, now())
     where lobby_id = v_lobby.id and user_id = v_uid;
    perform public.refresh_lobby_state(v_lobby.id);
    return jsonb_build_object('lobbyId', v_lobby.id);
  end if;

  select count(*) into v_joined from public.lobby_players
   where lobby_id = v_lobby.id and status = 'JOINED';
  if v_joined >= v_lobby.max_players then
    raise exception 'That game is full.' using errcode = '22023';
  end if;

  select s into v_seat from generate_series(0, v_lobby.max_players - 1) s
   where not exists (
     select 1 from public.lobby_players lp
      where lp.lobby_id = v_lobby.id and lp.seat_index = s and lp.status = 'JOINED'
   )
   order by s limit 1;
  delete from public.lobby_players
   where lobby_id = v_lobby.id and seat_index = v_seat and status <> 'JOINED';

  select auto_ready into v_auto from public.social_settings where id;
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_lobby.challenge_id, v_uid, 'ACCEPTED', now(), now())
  on conflict do nothing;
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby.id, v_uid, 'JOINED', coalesce(v_auto, false), v_seat, now());

  perform public.notify(
    v_lobby.host_id, 'CHALLENGE_ACCEPTED', 'Player joined',
    public.display_of(v_uid) || ' joined your game.', v_lobby.challenge_id, v_lobby.id
  );
  perform public.refresh_lobby_state(v_lobby.id);
  return jsonb_build_object('lobbyId', v_lobby.id);
end $$;
revoke execute on function public.join_link_room(text) from public, anon;
grant execute on function public.join_link_room(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Turn timers
-- ---------------------------------------------------------------------------

alter table public.matches add column if not exists turn_deadline timestamptz;
alter table public.match_players add column if not exists timeouts int not null default 0;

-- Seconds a player has for each roll and each move.
create or replace function public.turn_seconds() returns int
language sql immutable set search_path = public, pg_temp as $$ select 20 $$;

-- An unbiased die from PostgreSQL's cryptographically random UUID source.
create or replace function public.secure_die() returns int
language plpgsql volatile set search_path = public, pg_temp as $$
declare v int;
begin
  loop
    v := get_byte(uuid_send(gen_random_uuid()), 0);
    exit when v < 252;
  end loop;
  return v % 6 + 1;
end $$;
revoke all on function public.secure_die() from public, anon, authenticated;

-- Match creation now also takes the stakes and starts the first turn's clock.
create or replace function public.create_match_for_lobby(p_lobby_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_lobby public.lobbies;
  v_player uuid;
  v_coins int;
  v_amount int;
  v_pool int := 0;
begin
  select id into v_id from public.matches where lobby_id = p_lobby_id;
  if v_id is not null then return v_id; end if;

  select * into v_lobby from public.lobbies where id = p_lobby_id;
  if not found then return null; end if;

  insert into public.matches (lobby_id, player_count, stake, turn_deadline)
  values (p_lobby_id, v_lobby.max_players, v_lobby.stake,
          -- A little longer for the first turn, while everyone's board loads.
          now() + make_interval(secs => public.turn_seconds() + 10))
  on conflict (lobby_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.matches where lobby_id = p_lobby_id;
    return v_id;
  end if;

  insert into public.match_players (match_id, user_id, seat_index)
  select v_id, lp.user_id, lp.seat_index
    from public.lobby_players lp
   where lp.lobby_id = p_lobby_id and lp.status = 'JOINED'
  on conflict do nothing;

  if v_lobby.stake > 0 then
    -- Everyone was checked on the way in; someone who spent their coins
    -- during the countdown pays what they have left, and plays for the
    -- smaller pool that makes.
    for v_player in
      select mp.user_id from public.match_players mp where mp.match_id = v_id order by mp.seat_index
    loop
      select coins into v_coins from public.profiles where uid = v_player for update;
      v_amount := least(v_lobby.stake, greatest(coalesce(v_coins, 0), 0));
      update public.profiles set coins = coins - v_amount where uid = v_player;
      insert into public.match_stakes (match_id, user_id, amount) values (v_id, v_player, v_amount);
      v_pool := v_pool + v_amount;
    end loop;
    update public.matches set pool = v_pool where id = v_id;
  end if;

  return v_id;
end $$;
revoke execute on function public.create_match_for_lobby(uuid) from public, anon, authenticated;

-- Same as 0005, plus the move clock: a roll restarts it for the move, and
-- acting yourself clears your missed-turn count.
create or replace function public.roll_match_dice(p_match_id uuid, p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); m public.matches; seat int; die int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  select seat_index into seat from public.match_players where match_id = p_match_id and user_id = uid;
  if seat is null or seat <> m.turn_seat then raise exception 'It is not your turn.' using errcode = '42501'; end if;
  if m.status <> 'IN_PROGRESS' then raise exception 'That match has finished.' using errcode = '22023'; end if;
  if m.last_roll is not null and m.version = p_version + 1 then return public.match_snapshot(p_match_id); end if;
  if p_version is distinct from m.version then raise exception 'The board has changed. Refresh and try again.' using errcode = '22023'; end if;
  if m.last_roll is not null then raise exception 'You have already rolled. Move a coin.' using errcode = '22023'; end if;
  die := public.secure_die();
  update public.matches
     set last_roll = die, version = version + 1,
         turn_deadline = now() + make_interval(secs => public.turn_seconds())
   where id = p_match_id;
  update public.match_players set timeouts = 0 where match_id = p_match_id and user_id = uid;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.roll_match_dice(uuid, int) from public, anon;
grant execute on function public.roll_match_dice(uuid, int) to authenticated;

create or replace function public.submit_match_turn(p_match_id uuid, p_version int, p_state jsonb, p_winner_seat int default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); m public.matches; seat int; base jsonb; next_seat int; winner int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  select seat_index into seat from public.match_players where match_id = p_match_id and user_id = uid;
  if seat is null then raise exception 'You are not in that match.' using errcode = '42501'; end if;
  if m.last_submit_user = uid and m.last_submit_version = p_version and m.version = p_version + 1 and m.state = p_state then
    return public.match_snapshot(p_match_id);
  end if;
  if m.status <> 'IN_PROGRESS' then raise exception 'That match has finished.' using errcode = '22023'; end if;
  if seat <> m.turn_seat then raise exception 'It is not your turn.' using errcode = '42501'; end if;
  if p_version is distinct from m.version then raise exception 'The board has changed. Refresh and try again.' using errcode = '22023'; end if;
  if m.last_roll is null then raise exception 'Roll the dice before moving.' using errcode = '22023'; end if;
  base := coalesce(m.state, public.ludo_opening(m.player_count));
  if not exists (select 1 from public.ludo_successors(base, m.last_roll) expected where expected = p_state) then
    raise exception 'That move is not legal for the current roll.' using errcode = '22023';
  end if;
  next_seat := (p_state ->> 'currentPlayerIndex')::int;
  if p_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  if p_winner_seat is distinct from winner then raise exception 'The result does not match the board.' using errcode = '22023'; end if;
  update public.matches set state = p_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end,
    last_submit_version = p_version, last_submit_user = uid
   where id = p_match_id;
  update public.match_players set timeouts = 0 where match_id = p_match_id and user_id = uid;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.submit_match_turn(uuid, int, jsonb, int) from public, anon;
grant execute on function public.submit_match_turn(uuid, int, jsonb, int) to authenticated;

-- Anyone at the table can call this once the turn's clock has run out; the
-- server then rolls (if needed) and plays the first legal move for the
-- idle seat. `p_version` pins the claim to the board the caller saw, so two
-- players claiming at once play the turn only once.
create or replace function public.claim_turn_timeout(p_match_id uuid, p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.require_uid();
  m public.matches;
  idle uuid;
  misses int;
  die int;
  base jsonb;
  next_state jsonb;
  next_seat int;
  winner int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = uid) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  -- Already handled, not due yet, or the board moved on: nothing to do.
  if m.status <> 'IN_PROGRESS' or m.version is distinct from p_version
     or m.turn_deadline is null or now() < m.turn_deadline then
    return public.match_snapshot(p_match_id);
  end if;

  select user_id into idle from public.match_players where match_id = p_match_id and seat_index = m.turn_seat;
  update public.match_players set timeouts = timeouts + 1
   where match_id = p_match_id and user_id = idle
  returning timeouts into misses;

  if misses >= 3 then
    update public.matches
       set status = 'ABANDONED', finished_at = now(), version = version + 1,
           abandoned_by = idle, turn_deadline = null
     where id = p_match_id;
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Game ended',
           public.display_of(idle) || ' stopped playing.', m.lobby_id
      from public.match_players mp
     where mp.match_id = p_match_id and mp.user_id <> idle;
    return public.match_snapshot(p_match_id);
  end if;

  die := coalesce(m.last_roll, public.secure_die());
  base := coalesce(m.state, public.ludo_opening(m.player_count));
  select s into next_state from public.ludo_successors(base, die) s limit 1;
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.claim_turn_timeout(uuid, int) from public, anon;
grant execute on function public.claim_turn_timeout(uuid, int) to authenticated;

create or replace function public.abandon_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); changed int;
begin
  if not public.is_match_member(p_match_id) then raise exception 'You are not in that match.' using errcode = '42501'; end if;
  update public.matches set status = 'ABANDONED', finished_at = now(), version = version + 1,
         abandoned_by = uid, turn_deadline = null
   where id = p_match_id and status = 'IN_PROGRESS';
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Game ended', public.display_of(uid) || ' left the game.', m.lobby_id
      from public.match_players mp join public.matches m on m.id = mp.match_id
     where mp.match_id = p_match_id and mp.user_id <> uid;
  end if;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.abandon_match(uuid) from public, anon;
grant execute on function public.abandon_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Settlement and snapshots
-- ---------------------------------------------------------------------------

-- Same rewards as 0012, plus the stake payout. An abandoned match only counts
-- as a game (coins, XP, missions, tournament points) once it was properly
-- under way, so walking out of a fresh table cannot farm rewards; stakes are
-- always settled.
create or replace function public.award_online_for(p_uid uuid, p_match_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches;
  v_seat int;
  v_key text := 'online:' || p_match_id::text;
  v_won boolean;
  v_counts boolean;
  v_coins int := 0;
  v_xp int := 0;
  v_own int;
  v_keepers int;
  v_payout int := 0;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or v_match.status not in ('FINISHED', 'ABANDONED') then return; end if;
  select seat_index into v_seat from public.match_players where match_id = p_match_id and user_id = p_uid;
  if v_seat is null then return; end if;
  if exists (select 1 from public.profile_rewards where uid = p_uid and match_id = v_key) then return; end if;
  if v_match.status = 'ABANDONED' and v_match.abandoned_by = p_uid then
    -- Walking out forfeits the stake and the game.
    insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, 0, false);
    return;
  end if;

  v_won := v_match.status = 'FINISHED' and v_match.winner_seat = v_seat;
  select amount into v_own from public.match_stakes where match_id = p_match_id and user_id = p_uid;
  if v_match.pool > 0 then
    if v_match.status = 'FINISHED' then
      if v_won then v_payout := public.stake_prize(v_match.pool); end if;
    elsif v_match.abandoned_by is null then
      v_payout := coalesce(v_own, 0);
    else
      select count(*) into v_keepers from public.match_players
       where match_id = p_match_id and user_id is distinct from v_match.abandoned_by;
      v_payout := floor(v_match.pool::numeric / greatest(v_keepers, 1))::int;
    end if;
  end if;

  v_counts := v_match.status = 'FINISHED' or v_match.version >= 40;
  if v_counts then
    v_coins := case when v_won then 250 else 60 end;
    v_xp := case when v_won then 120 else 50 end;
  end if;

  update public.profiles
     set games_played = games_played + (case when v_counts then 1 else 0 end),
         games_won    = games_won + (case when v_won then 1 else 0 end),
         streak       = case when not v_counts then streak when v_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when v_won then streak + 1 else 0 end),
         coins        = coins + v_coins + v_payout
   where uid = p_uid;
  insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, v_coins + v_payout, v_won);
  if not v_counts then return; end if;
  perform public.grant_xp(p_uid, v_xp);
  perform public.bump_mission(p_uid, 'game', 1);
  perform public.bump_mission(p_uid, 'online', 1);
  if v_won then perform public.bump_mission(p_uid, 'win_online', 1); end if;
  insert into public.tournament_scores (uid, week, points, wins, games)
  values (p_uid, public.current_week(), case when v_won then 3 else 1 end, case when v_won then 1 else 0 end, 1)
  on conflict (uid, week) do update set
    points = tournament_scores.points + excluded.points,
    wins = tournament_scores.wins + excluded.wins,
    games = tournament_scores.games + 1,
    updated_at = now();
end $$;
revoke all on function public.award_online_for(uuid, uuid) from public, anon, authenticated;

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
      'turnDeadline', m.turn_deadline
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
          'presence', public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
          'lastSeen', pr.last_seen
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
      'stake', l.stake
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
          'seatIndex', lp.seat_index,
          'status', lp.status,
          'isReady', lp.is_ready,
          'isHost', lp.user_id = l.host_id,
          'joinedAt', lp.joined_at,
          'invitationStatus', cp.invitation_status,
          'presence', public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
          'lastSeen', pr.last_seen
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
