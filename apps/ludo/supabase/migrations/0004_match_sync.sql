-- Shared board state for a private online match.
--
-- Trust model, stated plainly so it is a decision and not an accident:
--
--   * The DICE are server-issued. roll_match_dice is the only way a roll can
--     get a value, so no client can forge one however much it is tampered with.
--   * The TURN is server-enforced. Only the account seated at the current
--     turn_seat may write, and every write carries the version it was based
--     on, so two players cannot both move.
--   * The RULES are not re-checked here. Doing that would mean porting the
--     Ludo engine into PL/pgSQL and maintaining the same rules in two
--     languages, where they would drift. A player could therefore hand-craft
--     an illegal move against their own friends in their own private game.
--     They still cannot forge a die or move out of turn.
--
-- That trade is right for private games between friends. Ranked play, public
-- matchmaking or anything with real value must validate moves server-side
-- first; when that happens, only submit_match_turn changes, not the client.

do $$ begin
  create type public.match_status as enum ('IN_PROGRESS', 'FINISHED', 'ABANDONED');
exception when duplicate_object then null; end $$;

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  lobby_id     uuid not null unique references public.lobbies (id) on delete cascade,
  player_count int  not null check (player_count between 2 and 6),
  status       public.match_status not null default 'IN_PROGRESS',
  -- The domain GameState. Null until somebody moves: every client derives the
  -- identical opening position from the seat count, so there is nothing worth
  -- storing until the board actually differs from it.
  state        jsonb,
  -- Optimistic concurrency. A write states the version it was based on, so a
  -- stale client is told to refresh rather than silently overwriting a move.
  version      int  not null default 0,
  turn_seat    int  not null default 0,
  -- Server-issued. Null means the player at turn_seat still has to roll.
  last_roll    int  check (last_roll between 1 and 6),
  winner_seat  int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table if not exists public.match_players (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Copied from the lobby, so seating is settled before the first roll and
  -- never depends on who loaded the board first.
  seat_index int  not null,
  primary key (match_id, user_id),
  unique (match_id, seat_index)
);
create index if not exists match_players_user on public.match_players (user_id);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create or replace function public.is_match_member(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.match_players mp
    where mp.match_id = p_match_id and mp.user_id = (select auth.uid())
  );
$$;

drop policy if exists "read own matches" on public.matches;
create policy "read own matches" on public.matches for select
  to authenticated using (public.is_match_member(id));

drop policy if exists "read own match players" on public.match_players;
create policy "read own match players" on public.match_players for select
  to authenticated using (public.is_match_member(match_id));

do $$
declare t text;
begin
  foreach t in array array['matches', 'match_players'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object or undefined_object then null;
    end;
  end loop;
end $$;

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_profile_updated_at();

-- ---------------------------------------------------------------------------
-- Snapshot
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
      'winnerSeat', m.winner_seat
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

-- Clients navigate by lobby, so this is the entry point after the countdown.
create or replace function public.get_match(p_lobby_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_result jsonb;
begin
  perform public.require_uid();
  select id into v_id from public.matches where lobby_id = p_lobby_id;
  if v_id is null then
    raise exception 'That match has not started yet.' using errcode = 'P0002';
  end if;
  v_result := public.match_snapshot(v_id);
  if v_result is null then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  return v_result;
end $$;
grant execute on function public.get_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Creation, folded into the existing countdown handoff
-- ---------------------------------------------------------------------------

create or replace function public.create_match_for_lobby(p_lobby_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_lobby public.lobbies;
begin
  select id into v_id from public.matches where lobby_id = p_lobby_id;
  if v_id is not null then return v_id; end if;

  select * into v_lobby from public.lobbies where id = p_lobby_id;
  if not found then return null; end if;

  insert into public.matches (lobby_id, player_count)
  values (p_lobby_id, v_lobby.max_players)
  on conflict (lobby_id) do nothing
  returning id into v_id;

  -- Another player created it in the same instant; use theirs.
  if v_id is null then
    select id into v_id from public.matches where lobby_id = p_lobby_id;
    return v_id;
  end if;

  -- Seats come straight from the lobby, so the board matches what everyone
  -- watched fill up during the countdown.
  insert into public.match_players (match_id, user_id, seat_index)
  select v_id, lp.user_id, lp.seat_index
    from public.lobby_players lp
   where lp.lobby_id = p_lobby_id and lp.status = 'JOINED'
  on conflict do nothing;

  return v_id;
end $$;
revoke execute on function public.create_match_for_lobby(uuid) from public, anon, authenticated;

-- Same contract as before, plus creating the shared board on the way through.
create or replace function public.start_match(p_lobby_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lobby public.lobbies;
begin
  perform public.require_uid();
  if not public.is_lobby_member(p_lobby_id) then
    raise exception 'You are not in that game.' using errcode = '42501';
  end if;

  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'That game is no longer available.' using errcode = 'P0002';
  end if;

  if v_lobby.status = 'WAITING' then
    raise exception 'The game is still waiting for players.' using errcode = '22023';
  end if;

  if v_lobby.status = 'COUNTDOWN' then
    if v_lobby.start_at is null or now() < v_lobby.start_at then
      raise exception 'The countdown has not finished yet.' using errcode = '22023';
    end if;
    update public.lobbies set status = 'STARTED' where id = p_lobby_id;
    update public.challenges set status = 'STARTED', started_at = now()
     where id = v_lobby.challenge_id;
  end if;

  if v_lobby.status in ('COUNTDOWN', 'STARTED') then
    perform public.create_match_for_lobby(p_lobby_id);
  end if;

  return public.lobby_snapshot(p_lobby_id);
end $$;
grant execute on function public.start_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Playing
-- ---------------------------------------------------------------------------

create or replace function public.roll_match_dice(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_match public.matches;
  v_seat int;
  v_roll int;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'That match is no longer available.' using errcode = 'P0002';
  end if;
  if v_match.status <> 'IN_PROGRESS' then
    raise exception 'That match has finished.' using errcode = '22023';
  end if;

  select seat_index into v_seat from public.match_players
   where match_id = p_match_id and user_id = v_uid;
  if v_seat is null then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  if v_seat <> v_match.turn_seat then
    raise exception 'It is not your turn.' using errcode = '42501';
  end if;
  if v_match.last_roll is not null then
    raise exception 'You have already rolled. Move a coin.' using errcode = '22023';
  end if;

  -- Generated here, never accepted from a client: this is the one thing a
  -- tampered build must not be able to choose.
  v_roll := floor(random() * 6)::int + 1;

  update public.matches
     set last_roll = v_roll, version = version + 1
   where id = p_match_id;

  return public.match_snapshot(p_match_id);
end $$;
grant execute on function public.roll_match_dice(uuid) to authenticated;

-- The player whose turn it is submits the board that results from their move.
-- turn_seat is read back out of that board rather than trusted separately, so
-- the server's idea of whose turn it is can never drift from the state itself.
create or replace function public.submit_match_turn(
  p_match_id uuid,
  p_version int,
  p_state jsonb,
  p_winner_seat int default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_match public.matches;
  v_seat int;
  v_next int;
  v_finished boolean;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'That match is no longer available.' using errcode = 'P0002';
  end if;
  if v_match.status <> 'IN_PROGRESS' then
    raise exception 'That match has finished.' using errcode = '22023';
  end if;

  select seat_index into v_seat from public.match_players
   where match_id = p_match_id and user_id = v_uid;
  if v_seat is null then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  if v_seat <> v_match.turn_seat then
    raise exception 'It is not your turn.' using errcode = '42501';
  end if;
  if p_version <> v_match.version then
    -- Deliberately not SQLSTATE 40001: that is the transient serialization
    -- class, which PostgREST retries until the gateway times out. A stale
    -- write is not transient — the client has genuinely fallen behind and
    -- must re-read — so it has to fail immediately.
    raise exception 'The board has moved on. Catching up…' using errcode = '22023';
  end if;

  v_next := (p_state ->> 'currentPlayerIndex')::int;
  if v_next is null or v_next < 0 or v_next >= v_match.player_count then
    raise exception 'That board could not be read.' using errcode = '22023';
  end if;
  v_finished := (p_state ->> 'status') = 'FINISHED';

  update public.matches
     set state       = p_state,
         version     = version + 1,
         turn_seat   = v_next,
         -- Cleared on every submit: the next roll must come from the server.
         last_roll   = null,
         status      = case when v_finished then 'FINISHED' else status end,
         winner_seat = case when v_finished then p_winner_seat else winner_seat end,
         finished_at = case when v_finished then now() else finished_at end
   where id = p_match_id;

  return public.match_snapshot(p_match_id);
end $$;
grant execute on function public.submit_match_turn(uuid, int, jsonb, int) to authenticated;

-- An escape hatch for a player who walks away mid-game: anyone at the table
-- can end it, rather than the others being stuck on a turn that never comes.
create or replace function public.abandon_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  if not public.is_match_member(p_match_id) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;

  update public.matches
     set status = 'ABANDONED', finished_at = now(), version = version + 1
   where id = p_match_id and status = 'IN_PROGRESS';

  insert into public.notifications (user_id, type, title, message, related_lobby_id)
  select mp.user_id, 'CHALLENGE_CANCELLED', 'Game ended',
         public.display_of(v_uid) || ' left the game.', m.lobby_id
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
   where mp.match_id = p_match_id and mp.user_id <> v_uid;

  return public.match_snapshot(p_match_id);
end $$;
grant execute on function public.abandon_match(uuid) to authenticated;
