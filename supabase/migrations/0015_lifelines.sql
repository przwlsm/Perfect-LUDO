-- 0015: lifelines. Apply after 0014.
--
-- Every online player has 5 lifelines. Each turn the clock runs out on
-- costs one (they no longer come back for playing a turn in between).
-- On the fifth, the player is out: in a 2-player game the other player
-- wins by walk-over (the match ends as abandoned by the idle player, and the
-- player who stayed takes the pool). With 3 or 4 players the game carries
-- on without them: their turns are skipped, so a player who left can never
-- win, and they forfeit their stake. When only one player is left in, the
-- match ends the same way as a walk-over.

alter table public.match_players add column if not exists missed int not null default 0;
alter table public.match_players add column if not exists is_out boolean not null default false;

create or replace function public.lifelines() returns int
language sql immutable set search_path = public, pg_temp as $$ select 5 $$;

-- Passes the turn over every seat that is out, starting from the one the
-- board names. The board is only ever advanced, never otherwise changed.
create or replace function public.skip_out_seats(p_match_id uuid, p_state jsonb)
returns jsonb language plpgsql stable set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_state->'players');
  seat int := (p_state->>'currentPlayerIndex')::int;
  tries int := 0;
  state jsonb := p_state;
begin
  if p_state->>'status' <> 'IN_PROGRESS' then return p_state; end if;
  while tries < n and exists (
    select 1 from public.match_players
     where match_id = p_match_id and seat_index = seat and is_out
  ) loop
    seat := (seat + 1) % n;
    state := state || jsonb_build_object('currentPlayerIndex', seat, 'consecutiveSixes', 0, 'lastRoll', null);
    tries := tries + 1;
  end loop;
  return state;
end $$;
revoke all on function public.skip_out_seats(uuid, jsonb) from public, anon, authenticated;


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
  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant));
  if not exists (select 1 from public.ludo_successors(base, m.last_roll) expected where expected = p_state) then
    raise exception 'That move is not legal for the current roll.' using errcode = '22023';
  end if;
  next_seat := (p_state ->> 'currentPlayerIndex')::int;
  if p_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  if p_winner_seat is distinct from winner then raise exception 'The result does not match the board.' using errcode = '22023'; end if;
  -- Players who are out lose their turns.
  p_state := public.skip_out_seats(p_match_id, p_state);
  next_seat := case when winner is null then (p_state ->> 'currentPlayerIndex')::int else next_seat end;
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
  -- A lifeline gone. They do not come back.
  update public.match_players set missed = missed + 1, timeouts = timeouts + 1
   where match_id = p_match_id and user_id = idle
  returning missed into misses;

  if misses >= public.lifelines() and (
    select count(*) from public.match_players
     where match_id = p_match_id and not is_out and user_id <> idle
  ) >= 2 then
    -- Out of lifelines at a bigger table: out of the game, which goes on.
    update public.match_players set is_out = true where match_id = p_match_id and user_id = idle;
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Player out',
           public.display_of(idle) || ' ran out of lifelines.', m.lobby_id
      from public.match_players mp
     where mp.match_id = p_match_id and mp.user_id <> idle;
    base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant));
    next_state := public.skip_out_seats(
      p_match_id,
      base || jsonb_build_object('currentPlayerIndex', (m.turn_seat + 1) % m.player_count,
                                 'consecutiveSixes', 0, 'lastRoll', null)
    );
    update public.matches set state = next_state, version = version + 1, last_roll = null,
      turn_seat = (next_state ->> 'currentPlayerIndex')::int,
      turn_deadline = now() + make_interval(secs => public.turn_seconds())
     where id = p_match_id;
    return public.match_snapshot(p_match_id);
  end if;

  if misses >= public.lifelines() then
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
  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant));
  select s into next_state from public.ludo_successors(base, die) s limit 1;
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  next_state := public.skip_out_seats(p_match_id, next_state);
  if winner is null then next_seat := (next_state ->> 'currentPlayerIndex')::int; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.claim_turn_timeout(uuid, int) from public, anon;
grant execute on function public.claim_turn_timeout(uuid, int) to authenticated;

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
  if (v_match.status = 'ABANDONED' and v_match.abandoned_by = p_uid)
     or exists (select 1 from public.match_players where match_id = p_match_id and user_id = p_uid and is_out) then
    -- Walking out forfeits the stake and the game.
    insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, 0, false);
    return;
  end if;

  v_won := v_match.status = 'FINISHED' and v_match.winner_seat = v_seat;
  select amount into v_own from public.match_stakes where match_id = p_match_id and user_id = p_uid;
  if v_match.pool > 0 then
    if v_match.status = 'FINISHED' then
      if v_won then v_payout := public.stake_prize(v_match.pool); end if;
    elsif v_match.abandoned_by is null and not exists (
      select 1 from public.match_players where match_id = p_match_id and is_out
    ) then
      -- Nobody walked out and nobody ran out: everyone gets their stake back.
      v_payout := coalesce(v_own, 0);
    else
      select count(*) into v_keepers from public.match_players
       where match_id = p_match_id and user_id is distinct from v_match.abandoned_by and not is_out;
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
      'turnDeadline', m.turn_deadline,
      'variant', m.variant,
      'lifelines', public.lifelines()
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
          'lastSeen', pr.last_seen,
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
