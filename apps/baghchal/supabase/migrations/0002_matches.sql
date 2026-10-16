-- Online matches between two players. Apply after 0001.
--
-- Trust model: the server owns the rules. A client never writes a board; it
-- sends a move, and submit_move checks the turn, the version it was based
-- on and the move's legality against the bc_* rules below, which are a
-- twin of packages/baghchal-engine. scripts/check-online-rules.mjs runs this
-- SQL against the TypeScript engine before every release so the two can
-- never drift. The result (five captures, trapped tigers, repetition and
-- no-progress draws) is decided here too, and so are the clock and
-- resignations. Nothing a tampered client sends can forge any of it.

do $$ begin
  create type public.match_status as enum ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.side as enum ('tiger', 'goat');
exception when duplicate_object then null; end $$;

create table if not exists public.matches (
  id                  uuid primary key default gen_random_uuid(),
  -- Six characters from an alphabet with no look-alikes; the only key to a waiting game.
  code                text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  status              public.match_status not null default 'WAITING',
  host_id             uuid not null references auth.users (id) on delete cascade,
  tiger_id            uuid references auth.users (id) on delete set null,
  goat_id             uuid references auth.users (id) on delete set null,
  -- The position, stored as the engine's GameState does: 25 cells top-left to bottom-right.
  board               text not null default 'T...T...............T...T' check (board ~ '^[TG.]{25}$'),
  turn                public.side not null default 'goat',
  goats_in_hand       int not null default 20 check (goats_in_hand between 0 and 20),
  goats_captured      int not null default 0 check (goats_captured between 0 and 5),
  plies               int not null default 0 check (plies >= 0),
  -- Position keys since the last placement or capture: the repetition and no-progress rules.
  quiet_positions     text[] not null default '{}',
  -- Null while the game goes on. The rules' result, or a timeout or resignation.
  result              jsonb,
  -- Bumped on every accepted write; a write states the version it was based on.
  version             int not null default 0,
  turn_seconds        int not null default 45 check (turn_seconds between 15 and 300),
  turn_deadline       timestamptz,
  last_submit_user    uuid,
  last_submit_version int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  finished_at         timestamptz,
  constraint seats_differ check (tiger_id is null or goat_id is null or tiger_id <> goat_id)
);
create index if not exists matches_tiger on public.matches (tiger_id);
create index if not exists matches_goat on public.matches (goat_id);

-- One row per half-move: replays, disputes, and the retry check in submit_move.
create table if not exists public.match_moves (
  match_id   uuid not null references public.matches (id) on delete cascade,
  ply        int not null check (ply >= 1),
  side       public.side not null,
  move       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, ply)
);

alter table public.matches enable row level security;
alter table public.match_moves enable row level security;
revoke all on public.matches, public.match_moves from public, anon, authenticated;
grant select on public.matches, public.match_moves to authenticated;

create or replace function public.bc_side_of(m public.matches, p_uid uuid) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case when p_uid is null then null
              when m.tiger_id = p_uid then 'tiger'
              when m.goat_id = p_uid then 'goat' end;
$$;
revoke all on function public.bc_side_of(public.matches, uuid) from public, anon, authenticated;

create or replace function public.is_match_member(p_match_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (select auth.uid()) in (m.host_id, m.tiger_id, m.goat_id)
  );
$$;
-- Called by the policies below as the querying user, so players must be able to run it.
revoke all on function public.is_match_member(uuid) from public, anon;
grant execute on function public.is_match_member(uuid) to authenticated;

drop policy if exists "read own matches" on public.matches;
create policy "read own matches" on public.matches for select
  to authenticated using (public.is_match_member(id));
drop policy if exists "read own match moves" on public.match_moves;
create policy "read own match moves" on public.match_moves for select
  to authenticated using (public.is_match_member(match_id));
-- No insert, update or delete policy on either table: the functions below are the only writers.

do $$ begin
  execute 'alter publication supabase_realtime add table public.matches';
exception when duplicate_object or undefined_object then null; end $$;

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- The rules, on the engine's GameState as JSON:
--   {"board": ["T", ".", ...25], "turn": "goat"|"tiger", "goatsInHand": 20,
--    "goatsCaptured": 0, "plies": 0, "quietPositions": [...], "result": null}
-- Keep parity with packages/baghchal-engine/src/rules.ts.
-- ---------------------------------------------------------------------------

-- The points one line segment from p. Diagonals only where row + column is even.
create or replace function public.bc_neighbours(p int) returns int[]
language plpgsql immutable set search_path = public, pg_temp as $$
declare r int := p / 5; c int := p % 5; found int[] := '{}'; dr int; dc int; nr int; nc int;
begin
  for dr in -1..1 loop
    for dc in -1..1 loop
      continue when dr = 0 and dc = 0;
      continue when dr <> 0 and dc <> 0 and (r + c) % 2 <> 0;
      nr := r + dr; nc := c + dc;
      if nr between 0 and 4 and nc between 0 and 4 then found := found || (nr * 5 + nc); end if;
    end loop;
  end loop;
  return found;
end $$;

-- Where a tiger on p_from lands jumping the piece on p_over, or null.
create or replace function public.bc_jump_target(p_from int, p_over int) returns int
language plpgsql immutable set search_path = public, pg_temp as $$
declare r int; c int;
begin
  if not (p_over = any(public.bc_neighbours(p_from))) then return null; end if;
  r := p_over / 5 + (p_over / 5 - p_from / 5);
  c := p_over % 5 + (p_over % 5 - p_from % 5);
  if r between 0 and 4 and c between 0 and 4 then return r * 5 + c; end if;
  return null;
end $$;

create or replace function public.bc_opening() returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'board', to_jsonb(regexp_split_to_array('T...T...............T...T', '')),
    'turn', 'goat', 'goatsInHand', 20, 'goatsCaptured', 0, 'plies', 0,
    'quietPositions', '[]'::jsonb, 'result', null);
$$;

create or replace function public.bc_legal_moves(p_state jsonb) returns setof jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  board jsonb := p_state -> 'board';
  turn text := p_state ->> 'turn';
  in_hand int := (p_state ->> 'goatsInHand')::int;
  i int; n int; t int;
begin
  if jsonb_typeof(p_state -> 'result') = 'object' then return; end if;
  if jsonb_typeof(board) <> 'array' or jsonb_array_length(board) <> 25 then
    raise exception 'Bad board' using errcode = '22023';
  end if;
  if turn = 'goat' then
    if in_hand > 0 then
      for i in 0..24 loop
        if board ->> i = '.' then return next jsonb_build_object('kind', 'place', 'to', i); end if;
      end loop;
      return;
    end if;
    for i in 0..24 loop
      continue when board ->> i <> 'G';
      foreach n in array public.bc_neighbours(i) loop
        if board ->> n = '.' then return next jsonb_build_object('kind', 'move', 'from', i, 'to', n); end if;
      end loop;
    end loop;
    return;
  end if;
  for i in 0..24 loop
    continue when board ->> i <> 'T';
    foreach n in array public.bc_neighbours(i) loop
      if board ->> n = '.' then
        return next jsonb_build_object('kind', 'move', 'from', i, 'to', n);
      elsif board ->> n = 'G' then
        t := public.bc_jump_target(i, n);
        if t is not null and board ->> t = '.' then
          return next jsonb_build_object('kind', 'jump', 'from', i, 'over', n, 'to', t);
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- How the game stands for the side to move, or null while it goes on.
create or replace function public.bc_result(p_state jsonb) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare quiet jsonb := p_state -> 'quietPositions'; n int; latest text; repeats int;
begin
  if (p_state ->> 'goatsCaptured')::int >= 5 then
    return '{"kind":"win","winner":"tiger","reason":"captures"}'::jsonb;
  end if;
  n := jsonb_array_length(quiet);
  if n > 0 then
    latest := quiet ->> (n - 1);
    select count(*) into repeats from jsonb_array_elements_text(quiet) e where e = latest;
    if repeats >= 3 then return '{"kind":"draw","reason":"repetition"}'::jsonb; end if;
  end if;
  if n >= 60 then return '{"kind":"draw","reason":"no-progress"}'::jsonb; end if;
  if not exists (select 1 from public.bc_legal_moves(p_state || '{"result":null}'::jsonb)) then
    return case when p_state ->> 'turn' = 'tiger'
      then '{"kind":"win","winner":"goat","reason":"trapped"}'::jsonb
      else '{"kind":"win","winner":"tiger","reason":"no-moves"}'::jsonb end;
  end if;
  return null;
end $$;

-- The game after p_move, with its result decided. Raises if the move is not legal now.
create or replace function public.bc_next(p_state jsonb, p_move jsonb) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  board jsonb := p_state -> 'board';
  turn text := p_state ->> 'turn';
  kind text := p_move ->> 'kind';
  in_hand int := (p_state ->> 'goatsInHand')::int;
  captured int := (p_state ->> 'goatsCaptured')::int;
  next_turn text; mover text; key text; quiet jsonb; next_state jsonb;
begin
  if not exists (select 1 from public.bc_legal_moves(p_state) m where m = p_move) then
    raise exception 'That move is not legal.' using errcode = '22023';
  end if;
  mover := case when turn = 'goat' then 'G' else 'T' end;
  if kind = 'place' then
    board := jsonb_set(board, array[p_move ->> 'to'], '"G"');
    in_hand := in_hand - 1;
  elsif kind = 'move' then
    board := jsonb_set(board, array[p_move ->> 'to'], to_jsonb(mover));
    board := jsonb_set(board, array[p_move ->> 'from'], '"."');
  else
    board := jsonb_set(board, array[p_move ->> 'to'], '"T"');
    board := jsonb_set(board, array[p_move ->> 'from'], '"."');
    board := jsonb_set(board, array[p_move ->> 'over'], '"."');
    captured := captured + 1;
  end if;
  next_turn := case when turn = 'goat' then 'tiger' else 'goat' end;
  -- Placements and captures can never be undone, so the run restarts after them.
  if kind = 'move' then
    select string_agg(e, '' order by ord) into key
      from jsonb_array_elements_text(board) with ordinality as x(e, ord);
    key := key || case when next_turn = 'goat' then 'g' else 't' end;
    quiet := (p_state -> 'quietPositions') || to_jsonb(key);
  else
    quiet := '[]'::jsonb;
  end if;
  next_state := jsonb_build_object(
    'board', board, 'turn', next_turn, 'goatsInHand', in_hand, 'goatsCaptured', captured,
    'plies', (p_state ->> 'plies')::int + 1, 'quietPositions', quiet, 'result', null);
  return jsonb_set(next_state, '{result}', coalesce(public.bc_result(next_state), 'null'::jsonb));
end $$;

revoke all on function
  public.bc_neighbours(int), public.bc_jump_target(int, int), public.bc_opening(),
  public.bc_legal_moves(jsonb), public.bc_result(jsonb), public.bc_next(jsonb, jsonb)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rows to and from the engine's state
-- ---------------------------------------------------------------------------

create or replace function public.bc_state_of(m public.matches) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'board', to_jsonb(regexp_split_to_array(m.board, '')),
    'turn', m.turn, 'goatsInHand', m.goats_in_hand, 'goatsCaptured', m.goats_captured,
    'plies', m.plies, 'quietPositions', to_jsonb(m.quiet_positions), 'result', m.result);
$$;
revoke all on function public.bc_state_of(public.matches) from public, anon, authenticated;

create or replace function public.bc_player(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('id', p.uid, 'username', p.username, 'displayName', p.display_name)
  from public.profiles p where p.uid = p_uid;
$$;
revoke all on function public.bc_player(uuid) from public, anon, authenticated;

-- Everything a client needs to show a match, from its own seat.
create or replace function public.match_snapshot(p_match_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'mySide', public.bc_side_of(m, (select auth.uid())),
    'match', jsonb_build_object(
      'id', m.id, 'code', m.code, 'status', m.status, 'hostId', m.host_id,
      'tigerId', m.tiger_id, 'goatId', m.goat_id,
      'state', public.bc_state_of(m), 'version', m.version,
      'turnSeconds', m.turn_seconds, 'turnDeadline', m.turn_deadline,
      'lastMove', (select mv.move from public.match_moves mv
                   where mv.match_id = m.id order by mv.ply desc limit 1)),
    'players', jsonb_build_object(
      'tiger', public.bc_player(m.tiger_id), 'goat', public.bc_player(m.goat_id)))
  from public.matches m where m.id = p_match_id;
$$;
revoke all on function public.match_snapshot(uuid) from public, anon, authenticated;

-- Six characters from a 32-symbol alphabet with no look-alikes (no 0/O, 1/I).
create or replace function public.new_match_code() returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text; v_bytes bytea; i int;
begin
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.matches where code = v_code);
  end loop;
  return v_code;
end $$;
revoke all on function public.new_match_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What clients may call
-- ---------------------------------------------------------------------------

-- Opens a game and takes p_side in it. Any earlier game of the caller's still waiting is closed.
create or replace function public.create_match(p_side text default 'goat', p_turn_seconds int default 45)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid(); v_id uuid;
begin
  if p_side not in ('tiger', 'goat') then
    raise exception 'Choose tigers or goats.' using errcode = '22023';
  end if;
  if coalesce(p_turn_seconds, 0) not between 15 and 300 then
    raise exception 'A turn lasts 15 seconds to 5 minutes.' using errcode = '22023';
  end if;
  perform public.ensure_profile();
  update public.matches set status = 'ABANDONED'
   where host_id = v_uid and status = 'WAITING';
  insert into public.matches (code, host_id, tiger_id, goat_id, turn_seconds)
  values (public.new_match_code(), v_uid,
          case when p_side = 'tiger' then v_uid end,
          case when p_side = 'goat' then v_uid end,
          p_turn_seconds)
  returning id into v_id;
  return public.match_snapshot(v_id);
end $$;
revoke all on function public.create_match(text, int) from public, anon;
grant execute on function public.create_match(text, int) to authenticated;

-- Takes the free seat in the waiting game with this code and starts the clock.
create or replace function public.join_match(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid(); m public.matches; v_code text := upper(trim(coalesce(p_code, '')));
begin
  select * into m from public.matches where code = v_code and status = 'WAITING' for update;
  if not found then raise exception 'No open game has that code.' using errcode = 'P0002'; end if;
  if m.host_id = v_uid then return public.match_snapshot(m.id); end if;
  if m.created_at < now() - interval '30 minutes' then
    update public.matches set status = 'ABANDONED' where id = m.id;
    raise exception 'That invitation has expired.' using errcode = '22023';
  end if;
  perform public.ensure_profile();
  update public.matches
     set tiger_id = coalesce(tiger_id, v_uid),
         goat_id = coalesce(goat_id, v_uid),
         status = 'ACTIVE',
         turn_deadline = now() + make_interval(secs => turn_seconds),
         version = version + 1
   where id = m.id;
  return public.match_snapshot(m.id);
end $$;
revoke all on function public.join_match(text) from public, anon;
grant execute on function public.join_match(text) to authenticated;

create or replace function public.get_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.matches m where m.id = p_match_id
                  and v_uid in (m.host_id, m.tiger_id, m.goat_id)) then
    raise exception 'That match is no longer available.' using errcode = 'P0002';
  end if;
  return public.match_snapshot(p_match_id);
end $$;
revoke all on function public.get_match(uuid) from public, anon;
grant execute on function public.get_match(uuid) to authenticated;

-- Plays p_move for the caller. Checks the seat, the turn, the version the
-- client saw and the move's legality; records the move; decides the result.
create or replace function public.submit_move(p_match_id uuid, p_version int, p_move jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  m public.matches;
  v_side text;
  v_next jsonb;
  v_result jsonb;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  v_side := public.bc_side_of(m, v_uid);
  if v_side is null then raise exception 'You are not in that match.' using errcode = '42501'; end if;
  -- A lost response can be retried without playing the move twice.
  if m.last_submit_user = v_uid and m.last_submit_version = p_version and m.version = p_version + 1
     and exists (select 1 from public.match_moves mv where mv.match_id = m.id and mv.ply = m.plies and mv.move = p_move) then
    return public.match_snapshot(p_match_id);
  end if;
  if m.status <> 'ACTIVE' then raise exception 'That match is not in play.' using errcode = '22023'; end if;
  if m.turn::text <> v_side then raise exception 'It is not your turn.' using errcode = '42501'; end if;
  if p_version is distinct from m.version then
    raise exception 'The board has changed. Refresh and try again.' using errcode = '22023';
  end if;
  v_next := public.bc_next(public.bc_state_of(m), p_move);
  v_result := nullif(v_next -> 'result', 'null'::jsonb);
  update public.matches set
    board = (select string_agg(e, '' order by ord)
             from jsonb_array_elements_text(v_next -> 'board') with ordinality as x(e, ord)),
    turn = (v_next ->> 'turn')::public.side,
    goats_in_hand = (v_next ->> 'goatsInHand')::int,
    goats_captured = (v_next ->> 'goatsCaptured')::int,
    plies = (v_next ->> 'plies')::int,
    quiet_positions = array(select jsonb_array_elements_text(v_next -> 'quietPositions')),
    result = v_result,
    version = version + 1,
    last_submit_user = v_uid,
    last_submit_version = p_version,
    status = case when v_result is null then status else 'FINISHED' end,
    finished_at = case when v_result is null then null else now() end,
    turn_deadline = case when v_result is null then now() + make_interval(secs => turn_seconds) end
  where id = p_match_id;
  insert into public.match_moves (match_id, ply, side, move) values (p_match_id, m.plies + 1, m.turn, p_move);
  return public.match_snapshot(p_match_id);
end $$;
revoke all on function public.submit_move(uuid, int, jsonb) from public, anon;
grant execute on function public.submit_move(uuid, int, jsonb) to authenticated;

-- Once the opponent's clock has run out, the waiting player claims the game.
create or replace function public.claim_timeout(p_match_id uuid, p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid(); m public.matches; v_side text;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  v_side := public.bc_side_of(m, v_uid);
  if v_side is null then raise exception 'You are not in that match.' using errcode = '42501'; end if;
  if m.status = 'FINISHED' and m.result ->> 'reason' = 'timeout' and m.version = p_version + 1 then
    return public.match_snapshot(p_match_id);
  end if;
  if m.status <> 'ACTIVE' then raise exception 'That match is not in play.' using errcode = '22023'; end if;
  if m.turn::text = v_side then raise exception 'It is your own move.' using errcode = '22023'; end if;
  if p_version is distinct from m.version then
    raise exception 'The board has changed. Refresh and try again.' using errcode = '22023';
  end if;
  if m.turn_deadline is null or m.turn_deadline > now() then
    raise exception 'The clock has not run out yet.' using errcode = '22023';
  end if;
  update public.matches set
    result = jsonb_build_object('kind', 'win', 'winner', v_side, 'reason', 'timeout'),
    status = 'FINISHED', finished_at = now(), turn_deadline = null, version = version + 1
  where id = p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke all on function public.claim_timeout(uuid, int) from public, anon;
grant execute on function public.claim_timeout(uuid, int) to authenticated;

-- Gives the game up: the opponent wins, or a waiting game is simply closed.
create or replace function public.resign_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid(); m public.matches; v_side text;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  v_side := public.bc_side_of(m, v_uid);
  if v_side is null and m.host_id <> v_uid then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  if m.status = 'WAITING' then
    update public.matches set status = 'ABANDONED', version = version + 1 where id = p_match_id;
  elsif m.status = 'ACTIVE' then
    update public.matches set
      result = jsonb_build_object('kind', 'win',
        'winner', case when v_side = 'tiger' then 'goat' else 'tiger' end, 'reason', 'resigned'),
      status = 'FINISHED', finished_at = now(), turn_deadline = null, version = version + 1
    where id = p_match_id;
  end if;
  return public.match_snapshot(p_match_id);
end $$;
revoke all on function public.resign_match(uuid) from public, anon;
grant execute on function public.resign_match(uuid) to authenticated;
