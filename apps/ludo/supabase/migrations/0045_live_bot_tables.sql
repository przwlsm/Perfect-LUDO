-- 0045: live tables between computer players in the Royal Road, and watching.
--
-- Until now a cup round between two computer players was decided by a coin
-- flip the moment it was seated, so brackets filled in at once and looked
-- empty. Now such a round gets a real table, started at once, which the
-- server plays move by move at a human pace: a roll a second or two after
-- the last move, and the move a second or so after the roll. A Quick 2 game
-- takes a few minutes, like a game between people.
--
-- Nothing runs in the background: the table moves on whenever anyone reads
-- the bracket (the bracket screen does every few seconds) or watches it.
-- Steps are scheduled from the previous step, not from the read, so a table
-- nobody looked at catches up on the next read, exactly as if it had played.
--
-- Watching: anyone with a seat in a cup may follow any table of that cup,
-- people's and computer players', read-only (watch_cup_table).
--
-- The average game length (0041) now leaves out tables of two computer
-- players, so it keeps measuring people. Safe to re-run.

alter table public.matches add column if not exists bot_next_at timestamptz;

/** The match snapshot without the "is a player" filter, for watchers. Internal. */
create or replace function public.match_snapshot_any(p_match_id uuid)
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
  where m.id = p_match_id;
$$;
revoke all on function public.match_snapshot_any(uuid) from public, anon, authenticated;

/** As before, for the players at the table; watchers go through watch_cup_table. */
create or replace function public.match_snapshot(p_match_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.is_match_member(p_match_id) then public.match_snapshot_any(p_match_id) end;
$$;
grant execute on function public.match_snapshot(uuid) to authenticated;

/**
 * One step for the computer player on turn: a roll, or the move after it.
 * The same rules as play_bot_turn (0032) without a caller, for tables no
 * person sits at. Returns false when there is nothing to play. Internal.
 */
create or replace function public.bot_step(p_match_id uuid) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m public.matches;
  bot uuid;
  base jsonb;
  next_state jsonb;
  next_seat int;
  winner int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.status <> 'IN_PROGRESS' then return false; end if;
  select mp.user_id into bot
    from public.match_players mp join public.profiles p on p.uid = mp.user_id
   where mp.match_id = p_match_id and mp.seat_index = m.turn_seat and p.is_bot;
  if bot is null then return false; end if;

  if m.last_roll is null then
    update public.matches
       set last_roll = public.secure_die(), version = version + 1,
           turn_deadline = now() + make_interval(secs => public.turn_seconds())
     where id = p_match_id;
    return true;
  end if;

  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant, m.teams));
  next_state := public.bot_choose(base, m.last_roll);
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  next_state := public.skip_out_seats(p_match_id, next_state);
  if winner is null then next_seat := (next_state ->> 'currentPlayerIndex')::int; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  return true;
end $$;
revoke all on function public.bot_step(uuid) from public, anon, authenticated;

/**
 * Plays every step that is due at a table of computer players, at a human
 * pace: the roll 1.6 to 3.2 s after the last move, the move 0.9 to 1.8 s
 * after the roll. Each step is timed from the one before it, so a table read
 * late catches up as if it had been playing all along. Capped per read so a
 * single read stays quick. Internal.
 */
create or replace function public.bot_table_tick(p_match_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m public.matches;
  v_steps int := 0;
  v_due timestamptz;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.status <> 'IN_PROGRESS' then return; end if;
  if exists (select 1 from public.match_players mp left join public.profiles p on p.uid = mp.user_id
              where mp.match_id = p_match_id and not coalesce(p.is_bot, false)) then
    return; -- a person is at this table: their own app pokes the computer player
  end if;
  v_due := coalesce(m.bot_next_at, now());
  while v_due <= now() and v_steps < 400 loop
    select * into m from public.matches where id = p_match_id;
    exit when m.status <> 'IN_PROGRESS';
    exit when not public.bot_step(p_match_id);
    v_steps := v_steps + 1;
    -- After a roll comes the move; after a move, the next roll.
    v_due := v_due + case
      when (select last_roll from public.matches where id = p_match_id) is not null
        then make_interval(secs => 0.9 + random() * 0.9)
        else make_interval(secs => 1.6 + random() * 1.6)
      end;
  end loop;
  update public.matches set bot_next_at = v_due where id = p_match_id;
end $$;
revoke all on function public.bot_table_tick(uuid) from public, anon, authenticated;

/** A cup table for two computer players, started at once with its first roll due shortly. Internal. */
create or replace function public.cup_start_bot_table(p_bracket uuid, p_variant text, p_a uuid, p_b uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_lobby uuid := public.cup_make_lobby(p_bracket, p_variant, p_a, p_b);
  v_match uuid;
begin
  update public.lobbies set status = 'STARTED', start_at = now() where id = v_lobby;
  update public.challenges set status = 'STARTED', started_at = now()
   where id = (select challenge_id from public.lobbies where id = v_lobby);
  v_match := public.create_match_for_lobby(v_lobby);
  update public.matches set bot_next_at = now() + make_interval(secs => 2 + random() * 2) where id = v_match;
  return v_lobby;
end $$;
revoke all on function public.cup_start_bot_table(uuid, text, uuid, uuid) from public, anon, authenticated;

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
  elsif coalesce(v_a_bot, false) and coalesce(v_b_bot, false) and r.lobby_id is null then
    -- Two computer players: a real table, played out at a human pace.
    update public.cup_rounds set lobby_id = public.cup_start_bot_table(p_bracket, (select variant from public.cups where id = b.cup_id), r.a_uid, r.b_uid)
     where bracket_id = p_bracket and round = p_round and slot = p_slot;
    return;
  elsif r.lobby_id is null then
    update public.cup_rounds set lobby_id = public.cup_make_lobby(p_bracket, (select variant from public.cups where id = b.cup_id), r.a_uid, r.b_uid)
     where bracket_id = p_bracket and round = p_round and slot = p_slot;
    return;
  else
    select * into l from public.lobbies where id = r.lobby_id;
    select * into m from public.matches where lobby_id = r.lobby_id;
    if m.id is not null and coalesce(v_a_bot, false) and coalesce(v_b_bot, false) then
      -- Play whatever turns are due, then read the table as usual.
      perform public.bot_table_tick(m.id);
      select * into m from public.matches where id = m.id;
    end if;
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

/**
 * Follow one table of a cup, read-only: for anyone with a seat in that cup.
 * A table of computer players also plays whatever turns are due, so
 * watching keeps it moving.
 */
create or replace function public.watch_cup_table(p_lobby_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_bracket uuid;
  v_match uuid;
begin
  select cup_bracket_id into v_bracket from public.lobbies where id = p_lobby_id;
  if v_bracket is null then
    raise exception 'That table is not part of a cup.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.cup_entries where bracket_id = v_bracket and uid = v_uid) then
    raise exception 'Only players in this cup can watch its tables.' using errcode = '42501';
  end if;
  select id into v_match from public.matches where lobby_id = p_lobby_id;
  if v_match is null then
    raise exception 'That table has not started yet.' using errcode = 'P0002';
  end if;
  perform public.bot_table_tick(v_match);
  return public.match_snapshot_any(v_match);
end $$;
revoke execute on function public.watch_cup_table(uuid) from public, anon;
grant execute on function public.watch_cup_table(uuid) to authenticated;

create or replace function public.cup_game_length() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with recent as (
    select extract(epoch from (m.finished_at - m.created_at)) as secs
      from public.matches m
     where m.status = 'FINISHED'
       and m.variant = 'quick2'
       and m.player_count = 2
       and m.finished_at is not null
       and m.finished_at > now() - interval '30 days'
       -- Tables of two computer players run at our own pace: they would
       -- only measure that, so a game counts when a person sat at it.
       and exists (select 1 from public.match_players mp left join public.profiles p on p.uid = mp.user_id
                    where mp.match_id = m.id and not coalesce(p.is_bot, false))
     order by m.finished_at desc
     limit 500
  )
  select jsonb_build_object(
    'variant', 'quick2',
    'seconds', coalesce(round(avg(secs))::int, 0),
    'samples', count(*)::int
  )
    from recent
   -- Under a minute is a walk-over; over an hour is a table left open.
   where secs between 60 and 3600;
$$;
revoke execute on function public.cup_game_length() from public, anon;
grant execute on function public.cup_game_length() to authenticated;
