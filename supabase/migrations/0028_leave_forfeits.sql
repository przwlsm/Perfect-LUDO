-- 0028: leaving a match forfeits it — and only it. Apply after 0027.
--
-- Before: anyone leaving ended the whole match, so at a table of three or
-- four the players who stayed lost their game. Now:
--   * 3+ players still in (and not 2 v 2): the leaver is out — no prize, no
--     stake back, turns skipped — and the others play on to a real finish.
--   * otherwise (a table of two, the last rival, or 2 v 2): the match ends as
--     a walk-over, and the players who stayed WIN it: the winner's +100 and a
--     win on their record, on top of the pot they already split. Short games
--     (under 40 moves) still pay no game reward, so leaving cannot be farmed.
-- A player who is out (by leaving or by lifelines) always places last.

-- Placement, now with out seats ranked below everyone still playing.
drop function if exists public.match_placement(jsonb, int, int);
create or replace function public.match_placement(
  p_state jsonb, p_seat int, p_winner int, p_out int[] default '{}'
) returns int language plpgsql immutable set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_state -> 'players');
  fin int;
  better int := 0;
  my_home int;
  my_total int;
  my_out boolean := p_seat = any(coalesce(p_out, '{}'));
  h int;
  t int;
  i int;
begin
  if p_seat = p_winner then return 1; end if;
  fin := (case when n > 4 then n * 13 else 52 end) + 5;
  select count(*) filter (where (pc ->> 'progress')::int = fin),
         coalesce(sum((pc ->> 'progress')::int), 0)
    into my_home, my_total
    from jsonb_array_elements(p_state -> 'players' -> p_seat -> 'pieces') pc;
  for i in 0..n - 1 loop
    continue when i = p_seat;
    if i = p_winner then
      better := better + 1;
      continue;
    end if;
    -- An out seat never beats one still in; a still-in seat always beats me if I am out.
    if i = any(coalesce(p_out, '{}')) and not my_out then continue; end if;
    if my_out and not (i = any(coalesce(p_out, '{}'))) then
      better := better + 1;
      continue;
    end if;
    select count(*) filter (where (pc ->> 'progress')::int = fin),
           coalesce(sum((pc ->> 'progress')::int), 0)
      into h, t
      from jsonb_array_elements(p_state -> 'players' -> i -> 'pieces') pc;
    if h > my_home or (h = my_home and (t > my_total or (t = my_total and i < p_seat))) then
      better := better + 1;
    end if;
  end loop;
  return better + 1;
end $$;

create or replace function public.abandon_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  m public.matches;
  v_seat int;
  v_others int;
  base jsonb;
  next_state jsonb;
begin
  if not public.is_match_member(p_match_id) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  select * into m from public.matches where id = p_match_id for update;
  if m.status <> 'IN_PROGRESS' then return public.match_snapshot(p_match_id); end if;
  select seat_index into v_seat from public.match_players where match_id = p_match_id and user_id = v_uid;
  if exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_uid and is_out) then
    return public.match_snapshot(p_match_id);
  end if;
  select count(*) into v_others from public.match_players
   where match_id = p_match_id and not is_out and user_id <> v_uid;

  if not m.teams and v_others >= 2 then
    -- A bigger table plays on without the leaver.
    update public.match_players set is_out = true where match_id = p_match_id and user_id = v_uid;
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Player left',
           public.display_of(v_uid) || ' left the table. The game goes on.', m.lobby_id
      from public.match_players mp
     where mp.match_id = p_match_id and mp.user_id <> v_uid;
    -- Only touch the board when it was the leaver's turn: bumping the version
    -- mid-turn would make the player who is moving resubmit.
    if m.turn_seat = v_seat then
      base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant, m.teams));
      next_state := public.skip_out_seats(
        p_match_id,
        base || jsonb_build_object('currentPlayerIndex', (v_seat + 1) % m.player_count,
                                   'consecutiveSixes', 0, 'lastRoll', null)
      );
      update public.matches set state = next_state, version = version + 1, last_roll = null,
        turn_seat = (next_state ->> 'currentPlayerIndex')::int,
        turn_deadline = now() + make_interval(secs => public.turn_seconds())
       where id = p_match_id;
    end if;
    return public.match_snapshot(p_match_id);
  end if;

  -- A walk-over: the players who stayed take the match.
  update public.matches set status = 'ABANDONED', finished_at = now(), version = version + 1,
         abandoned_by = v_uid, turn_deadline = null
   where id = p_match_id and status = 'IN_PROGRESS';
  insert into public.notifications (user_id, type, title, message, related_lobby_id)
  select mp.user_id, 'CHALLENGE_CANCELLED', 'You win!',
         public.display_of(v_uid) || ' left the game.', m.lobby_id
    from public.match_players mp
   where mp.match_id = p_match_id and mp.user_id <> v_uid;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.abandon_match(uuid) from public, anon;
grant execute on function public.abandon_match(uuid) to authenticated;

-- Same as 0027, plus the walk-over win and out seats placing last.
create or replace function public.award_online_for(p_uid uuid, p_match_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches;
  v_seat int;
  v_key text := 'online:' || p_match_id::text;
  v_won boolean;
  v_counts boolean;
  v_walkover boolean;
  v_coins int := 0;
  v_xp int := 0;
  v_own int;
  v_keepers int;
  v_payout int := 0;
  v_walker_seat int;
  v_out int[];
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or v_match.status not in ('FINISHED', 'ABANDONED') then return; end if;
  select seat_index into v_seat from public.match_players where match_id = p_match_id and user_id = p_uid;
  if v_seat is null then return; end if;
  if exists (select 1 from public.profile_rewards where uid = p_uid and match_id = v_key) then return; end if;
  select seat_index into v_walker_seat from public.match_players
   where match_id = p_match_id and user_id = v_match.abandoned_by;
  if (v_match.status = 'ABANDONED' and v_match.abandoned_by = p_uid)
     or exists (select 1 from public.match_players where match_id = p_match_id and user_id = p_uid and is_out)
     -- In 2 v 2, a partner walking out loses the match for the pair.
     or coalesce(v_match.teams and v_match.status = 'ABANDONED' and v_walker_seat is not null
         and public.partner_seat(true, v_walker_seat) = v_seat, false) then
    -- Walking out forfeits the stake and the game.
    insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, 0, false);
    return;
  end if;

  v_counts := v_match.status = 'FINISHED' or v_match.version >= 40;
  -- Someone walked out and I stayed: the match is mine (when it counted).
  v_walkover := v_match.status = 'ABANDONED' and v_match.abandoned_by is not null;
  v_won := coalesce(v_match.status = 'FINISHED'
    and (v_match.winner_seat = v_seat or public.partner_seat(v_match.teams, v_match.winner_seat) = v_seat), false)
    or (v_walkover and v_counts);
  select amount into v_own from public.match_stakes where match_id = p_match_id and user_id = p_uid;
  if v_match.pool > 0 then
    if v_match.status = 'FINISHED' then
      -- Two winners in 2 v 2 share the prize.
      if v_won then v_payout := public.stake_prize(v_match.pool) / (case when v_match.teams then 2 else 1 end); end if;
    elsif v_match.abandoned_by is null and not exists (
      select 1 from public.match_players where match_id = p_match_id and is_out
    ) then
      -- Nobody walked out and nobody ran out: everyone gets their stake back.
      v_payout := coalesce(v_own, 0);
    else
      select count(*) into v_keepers from public.match_players
       where match_id = p_match_id and user_id is distinct from v_match.abandoned_by and not is_out
         and (not v_match.teams or v_walker_seat is null or seat_index <> public.partner_seat(true, v_walker_seat));
      v_payout := floor(v_match.pool::numeric / greatest(v_keepers, 1))::int;
    end if;
  end if;

  if v_counts then
    if v_match.status = 'FINISHED' then
      if v_match.teams or v_match.state is null then
        v_coins := case when v_won then 100 else 0 end;
      else
        select coalesce(array_agg(seat_index), '{}') into v_out
          from public.match_players where match_id = p_match_id and is_out;
        v_coins := public.placement_coins(
          public.match_placement(v_match.state, v_seat, v_match.winner_seat, v_out),
          v_match.player_count);
      end if;
    elsif v_walkover then
      v_coins := 100;
    end if;
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
