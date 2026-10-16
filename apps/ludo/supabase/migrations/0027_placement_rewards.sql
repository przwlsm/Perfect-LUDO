-- 0027: placement rewards. Apply after 0026.
--
-- Free tables now pay by finishing place instead of a flat win/played
-- amount: 1st takes 100 coins, 2nd takes 50 at a table of three or more,
-- 3rd takes 20 at a table of four; everyone else — last place, quitters,
-- players out of lifelines — takes nothing. Beating the computer still pays
-- 50; merely finishing no longer pays coins (XP, missions and tournament
-- points are untouched, so every game still moves progression).
-- Mirrors REWARDS / placementCoins in src/domain/entities/Wallet.ts.

-- Where a seat finished, from the final board: the winner first, then most
-- coins home, then total progress, then seat order — the same order the
-- app's podium shows (standings() in src/domain/entities/Variant.ts).
create or replace function public.match_placement(p_state jsonb, p_seat int, p_winner int)
returns int language plpgsql immutable set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_state -> 'players');
  fin int;
  better int := 0;
  my_home int;
  my_total int;
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

create or replace function public.placement_coins(p_rank int, p_players int)
returns int language sql immutable set search_path = public, pg_temp as $$
  select case
    when p_rank = 1 then 100
    when p_rank = 2 and p_players >= 3 then 50
    when p_rank = 3 and p_players >= 4 then 20
    else 0
  end;
$$;

-- Same as 0016, with the flat 250/60 replaced by placement pay.
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
  v_walker_seat int;
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

  v_won := coalesce(v_match.status = 'FINISHED'
    and (v_match.winner_seat = v_seat or public.partner_seat(v_match.teams, v_match.winner_seat) = v_seat), false);
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

  v_counts := v_match.status = 'FINISHED' or v_match.version >= 40;
  if v_counts then
    if v_match.status = 'FINISHED' then
      if v_match.teams or v_match.state is null then
        v_coins := case when v_won then 100 else 0 end;
      else
        v_coins := public.placement_coins(
          public.match_placement(v_match.state, v_seat, v_match.winner_seat),
          v_match.player_count);
      end if;
    end if;
    -- An abandoned-but-counted table pays the pool settlement, no prize.
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

-- Bot games: a win still pays 50; finishing pays XP only.
create or replace function public.award_match(
  p_match_id text,
  p_won boolean,
  p_eligible boolean,
  p_sixes int default 0,
  p_captures int default 0,
  p_home int default 0
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_reward int := 0;
  v_paid_today int;
begin
  if p_match_id is null or char_length(p_match_id) not between 1 and 64 or p_match_id like 'online:%' then
    raise exception 'Invalid match id.' using errcode = '22023';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_rewards where uid = v_uid and match_id = p_match_id) then
    return public.wallet_json(v_uid);
  end if;
  select count(*) into v_paid_today from public.profile_rewards
   where uid = v_uid and coins > 0 and match_id not like 'online:%'
     and created_at >= (public.utc_today())::timestamp at time zone 'utc';
  if coalesce(p_eligible, false) and coalesce(p_won, false) and v_paid_today < 25 then
    v_reward := 50;
  end if;
  update public.profiles
     set games_played = games_played + 1,
         games_won    = games_won + (case when p_won then 1 else 0 end),
         streak       = case when p_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when p_won then streak + 1 else 0 end),
         coins        = coins + v_reward
   where uid = v_uid;
  insert into public.profile_rewards (uid, match_id, coins, won)
    values (v_uid, p_match_id, v_reward, coalesce(p_won, false));
  perform public.grant_xp(v_uid, case when coalesce(p_eligible, false)
                                      then (case when p_won then 40 else 15 end) else 10 end);
  perform public.bump_mission(v_uid, 'game', 1);
  if p_won and coalesce(p_eligible, false) then perform public.bump_mission(v_uid, 'win_bot', 1); end if;
  -- Per-match counts come from the client; bounded so one game cannot finish a mission alone.
  perform public.bump_mission(v_uid, 'six', least(greatest(coalesce(p_sixes, 0), 0), 8));
  perform public.bump_mission(v_uid, 'capture', least(greatest(coalesce(p_captures, 0), 0), 6));
  perform public.bump_mission(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.award_match(text, boolean, boolean, int, int, int) from public, anon;
grant execute on function public.award_match(text, boolean, boolean, int, int, int) to authenticated;
