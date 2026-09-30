-- 0022: leagues. Apply after 0021.
--
-- Five divisions — Bronze, Silver, Gold, Diamond, Legend — give every player
-- a rank to carry between weeks. The weekly tournament scores (3 points an
-- online win, 1 a finished match) double as league points: reach the
-- division's promotion line and next week starts one division up; fall under
-- its relegation line (or sit the week out) and it starts one down. Bronze
-- never relegates. Settlement is lazy: the first league read of a new week
-- settles the old one, exactly once, under the state row's lock.
--
-- Gems stay scarce: a promotion pays only the first time a division is
-- reached (best_division high-water, so bouncing cannot be farmed), and
-- Legend pays a small repeatable bonus for a strong week at the top.
-- Mirrors the LEAGUE_* constants in src/domain/entities/Progression.ts.

create table if not exists public.league_state (
  uid           uuid primary key references auth.users (id) on delete cascade,
  division      int not null default 1 check (division between 1 and 5),
  best_division int not null default 1 check (best_division between 1 and 5),
  -- The week this state was last settled for.
  week          date not null,
  updated_at    timestamptz not null default now()
);
alter table public.league_state enable row level security;
drop policy if exists "read own league" on public.league_state;
create policy "read own league" on public.league_state for select
  using ((select auth.uid()) = uid);

-- {promoteAt, demoteBelow} for a division; null where the ladder ends.
create or replace function public.league_rules(p_division int) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'promoteAt',   (array[15, 20, 25, 30, null])[p_division],
    'demoteBelow', (array[null, 5, 8, 10, 12])[p_division]
  );
$$;

-- Gems the first arrival in a division pays (index = division).
create or replace function public.league_promotion_gems(p_division int) returns int
language sql immutable set search_path = public, pg_temp as $$
  select (array[0, 15, 25, 40, 60])[p_division];
$$;

create or replace function public.get_league() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
  v_week date := public.current_week();
  v_state public.league_state;
  v_points int;
  v_rules jsonb;
  v_old int;
  v_new int;
  v_settled date;
  v_gems int := 0;
  v_result jsonb := null;
  v_mine public.tournament_scores;
begin
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  insert into public.league_state (uid, week) values (v_uid, v_week)
  on conflict (uid) do nothing;
  select * into v_state from public.league_state where uid = v_uid for update;

  if v_state.week < v_week then
    -- Settle the week the player was last in. Weeks skipped entirely in
    -- between count as one quiet week: at most one relegation per return.
    select coalesce(points, 0) into v_points from public.tournament_scores
     where uid = v_uid and week = v_state.week;
    v_points := coalesce(v_points, 0);
    v_settled := v_state.week;
    v_old := v_state.division;
    v_rules := public.league_rules(v_old);
    v_new := v_old;
    if (v_rules ->> 'promoteAt') is not null and v_points >= (v_rules ->> 'promoteAt')::int then
      v_new := v_old + 1;
    elsif (v_rules ->> 'demoteBelow') is not null and v_points < (v_rules ->> 'demoteBelow')::int then
      v_new := v_old - 1;
    end if;
    if v_new > v_state.best_division then
      v_gems := public.league_promotion_gems(v_new);
    elsif v_old = 5 and v_new = 5 and v_points >= 30 then
      -- A strong week at the top of the ladder.
      v_gems := 25;
    end if;
    if v_gems > 0 then
      update public.profiles set gems = gems + v_gems where uid = v_uid;
    end if;
    update public.league_state
       set division = v_new, best_division = greatest(best_division, v_new),
           week = v_week, updated_at = now()
     where uid = v_uid
     returning * into v_state;
    v_result := jsonb_build_object(
      'week', v_settled, 'points', v_points,
      'from', v_old, 'to', v_new, 'gems', v_gems
    );
  end if;

  select * into v_mine from public.tournament_scores where uid = v_uid and week = v_week;
  v_rules := public.league_rules(v_state.division);
  return jsonb_build_object(
    'division', v_state.division,
    'bestDivision', v_state.best_division,
    'week', v_week,
    'endsAt', (v_week + 7)::timestamp at time zone 'utc',
    'points', coalesce(v_mine.points, 0),
    'wins', coalesce(v_mine.wins, 0),
    'games', coalesce(v_mine.games, 0),
    'promoteAt', v_rules -> 'promoteAt',
    'demoteBelow', v_rules -> 'demoteBelow',
    'lastResult', v_result
  );
end $$;
revoke execute on function public.get_league() from public, anon;
grant execute on function public.get_league() to authenticated;
