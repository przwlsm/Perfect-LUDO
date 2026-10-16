-- 0034: the Collection Room. Apply after 0033.
--
-- Achievements with four tiers (bronze, silver, gold, platinum), thrones won
-- at the cups (0035), and a showcase other players can see. Progress is
-- counted by triggers on the tables the game already writes, so every path
-- that records a result, a gift, a friendship, a spin or a purchase counts
-- without the game code knowing about achievements; the two award functions
-- that carry per-match stats (sixes, captures, coins home) are the only
-- ones re-created here. Mirrors ACHIEVEMENTS in src/domain/collection.

alter table public.profiles add column if not exists collection_public boolean not null default true;
alter table public.profiles add column if not exists showcase text[] not null default '{}';

create table if not exists public.achievements (
  id         text primary key check (id ~ '^[a-z-]{3,24}$'),
  event      text not null,
  -- 'sum' counts events; 'max' keeps the highest value reported.
  mode       text not null check (mode in ('sum', 'max')),
  thresholds int[] not null check (array_length(thresholds, 1) = 4)
);
alter table public.achievements enable row level security;
revoke all on public.achievements from public, anon, authenticated;

insert into public.achievements (id, event, mode, thresholds) values
  ('first-blood',      'captures',      'sum', '{1,25,100,500}'),
  ('six-appeal',       'sixes',         'sum', '{10,100,500,2000}'),
  ('homecoming',       'home',          'sum', '{4,40,200,1000}'),
  ('veteran',          'games',         'sum', '{10,100,500,2000}'),
  ('champion',         'win_online',    'sum', '{1,25,100,500}'),
  ('bot-buster',       'win_bot',       'sum', '{5,50,200,1000}'),
  ('hot-streak',       'best_streak',   'max', '{3,5,10,20}'),
  ('full-house',       'full_house',    'sum', '{1,5,25,100}'),
  ('speed-demon',      'speed',         'sum', '{1,10,50,200}'),
  ('hunter',           'hunter',        'sum', '{1,10,50,200}'),
  ('team-player',      'team',          'sum', '{1,10,50,200}'),
  ('high-roller',      'high_roller',   'sum', '{1,10,50,200}'),
  ('marathon',         'daily_games',   'max', '{5,10,20,40}'),
  ('crowd-favourite',  'gift_received', 'sum', '{1,25,100,500}'),
  ('generous-heart',   'gift_sent',     'sum', '{1,10,50,250}'),
  ('social-butterfly', 'friends',       'max', '{1,5,25,100}'),
  ('lucky-star',       'spins',         'sum', '{1,30,150,600}'),
  ('daily-devotion',   'daily_gift',    'sum', '{7,30,100,365}'),
  ('rising-star',      'level',         'max', '{5,10,20,30}'),
  ('diamond-hands',    'division',      'max', '{2,3,4,5}'),
  ('podium-regular',   'podium',        'sum', '{1,5,20,50}'),
  ('collector',        'items',         'max', '{3,10,25,60}'),
  ('throne-collector', 'thrones',       'max', '{1,3,5,8}'),
  ('kingmaker',        'cups_won',      'sum', '{1,10,50,200}')
on conflict (id) do update set event = excluded.event, mode = excluded.mode, thresholds = excluded.thresholds;

create table if not exists public.achievement_progress (
  uid      uuid not null references auth.users (id) on delete cascade,
  id       text not null references public.achievements (id),
  progress int  not null default 0 check (progress >= 0),
  primary key (uid, id)
);
alter table public.achievement_progress enable row level security;
revoke all on public.achievement_progress from public, anon, authenticated;

create table if not exists public.achievement_unlocks (
  uid         uuid not null references auth.users (id) on delete cascade,
  id          text not null references public.achievements (id),
  tier        int  not null check (tier between 1 and 4),
  unlocked_at timestamptz not null default now(),
  seen        boolean not null default false,
  primary key (uid, id, tier)
);
create index if not exists achievement_unlocks_unseen on public.achievement_unlocks (uid) where not seen;
alter table public.achievement_unlocks enable row level security;
revoke all on public.achievement_unlocks from public, anon, authenticated;

-- Thrones: one row per cup won at least once, with the count. Filled by the
-- cups (0035); the room shows every cup's throne, lit or dim, from here.
create table if not exists public.throne_wins (
  uid    uuid not null references auth.users (id) on delete cascade,
  cup_id text not null check (cup_id ~ '^[a-z-]{3,24}$'),
  count  int  not null default 1 check (count >= 1),
  won_at timestamptz not null default now(),
  primary key (uid, cup_id)
);
alter table public.throne_wins enable row level security;
revoke all on public.throne_wins from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Counting
-- ---------------------------------------------------------------------------

/** Records progress for every achievement on `p_event` and unlocks tiers crossed. */
create or replace function public.achievement_track(p_uid uuid, p_event text, p_amount int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.achievements;
  v_now int;
  v_tier int;
begin
  if p_uid is null or p_amount is null then return; end if;
  if exists (select 1 from public.profiles where uid = p_uid and is_bot) then return; end if;
  for a in select * from public.achievements where event = p_event loop
    if a.mode = 'sum' then
      if p_amount <= 0 then continue; end if;
      insert into public.achievement_progress (uid, id, progress) values (p_uid, a.id, p_amount)
      on conflict (uid, id) do update set progress = achievement_progress.progress + excluded.progress
      returning progress into v_now;
    else
      insert into public.achievement_progress (uid, id, progress) values (p_uid, a.id, greatest(p_amount, 0))
      on conflict (uid, id) do update set progress = greatest(achievement_progress.progress, excluded.progress)
      returning progress into v_now;
    end if;
    for v_tier in 1 .. 4 loop
      if v_now >= a.thresholds[v_tier] then
        insert into public.achievement_unlocks (uid, id, tier) values (p_uid, a.id, v_tier)
        on conflict do nothing;
      end if;
    end loop;
  end loop;
end $$;
revoke all on function public.achievement_track(uuid, text, int) from public, anon, authenticated;

-- A recorded result: games, wins and the table's particulars.
create or replace function public.achievements_on_reward() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m public.matches;
  v_today int;
begin
  if new.match_id = 'vault:once' then return new; end if;
  if new.match_id like 'online:%' then
    select * into m from public.matches where id = substr(new.match_id, 8)::uuid;
    if not found then return new; end if;
    perform public.achievement_track(new.uid, 'games', 1);
    if new.won then
      perform public.achievement_track(new.uid, 'win_online', 1);
      if m.player_count >= 6 then perform public.achievement_track(new.uid, 'full_house', 1); end if;
      if m.variant = 'quick1' then perform public.achievement_track(new.uid, 'speed', 1); end if;
      if m.variant = 'kill' then perform public.achievement_track(new.uid, 'hunter', 1); end if;
      if m.teams then perform public.achievement_track(new.uid, 'team', 1); end if;
      if coalesce(m.stake, 0) > 0 then perform public.achievement_track(new.uid, 'high_roller', 1); end if;
    end if;
  else
    perform public.achievement_track(new.uid, 'games', 1);
    if new.won then perform public.achievement_track(new.uid, 'win_bot', 1); end if;
  end if;
  select count(*) into v_today from public.profile_rewards
   where uid = new.uid and match_id <> 'vault:once' and created_at >= date_trunc('day', now());
  perform public.achievement_track(new.uid, 'daily_games', v_today);
  return new;
end $$;
drop trigger if exists achievements_on_reward on public.profile_rewards;
create trigger achievements_on_reward after insert on public.profile_rewards
  for each row execute function public.achievements_on_reward();

create or replace function public.achievements_on_gift() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.from_uid, 'gift_sent', 1);
  perform public.achievement_track(new.to_uid, 'gift_received', 1);
  return new;
end $$;
drop trigger if exists achievements_on_gift on public.table_gift_log;
create trigger achievements_on_gift after insert on public.table_gift_log
  for each row execute function public.achievements_on_gift();

create or replace function public.achievements_on_friend() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.user_id, 'friends',
    (select count(*)::int from public.friendships where user_id = new.user_id));
  return new;
end $$;
drop trigger if exists achievements_on_friend on public.friendships;
create trigger achievements_on_friend after insert on public.friendships
  for each row execute function public.achievements_on_friend();

create or replace function public.achievements_on_spin() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.uid, 'spins', new.spins - coalesce(old.spins, 0));
  return new;
end $$;
drop trigger if exists achievements_on_spin on public.daily_spins;
create trigger achievements_on_spin after insert or update of spins on public.daily_spins
  for each row execute function public.achievements_on_spin();

create or replace function public.achievements_on_profile() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.best_streak is distinct from old.best_streak then
    perform public.achievement_track(new.uid, 'best_streak', new.best_streak);
  end if;
  if new.xp is distinct from old.xp then
    perform public.achievement_track(new.uid, 'level', (public.level_info(new.xp) ->> 'level')::int);
  end if;
  if new.last_gift is distinct from old.last_gift and new.last_gift is not null then
    perform public.achievement_track(new.uid, 'daily_gift', 1);
  end if;
  return new;
end $$;
drop trigger if exists achievements_on_profile on public.profiles;
create trigger achievements_on_profile after update of best_streak, xp, last_gift on public.profiles
  for each row execute function public.achievements_on_profile();

create or replace function public.achievements_on_league() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.uid, 'division', new.best_division);
  return new;
end $$;
drop trigger if exists achievements_on_league on public.league_state;
create trigger achievements_on_league after insert or update of best_division on public.league_state
  for each row execute function public.achievements_on_league();

create or replace function public.achievements_on_tournament_claim() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(public.tournament_rank(new.uid, new.week), 999) <= 10 then
    perform public.achievement_track(new.uid, 'podium', 1);
  end if;
  return new;
end $$;
drop trigger if exists achievements_on_tournament_claim on public.tournament_claims;
create trigger achievements_on_tournament_claim after insert on public.tournament_claims
  for each row execute function public.achievements_on_tournament_claim();

create or replace function public.achievements_on_item() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.uid, 'items',
    (select count(*)::int from public.profile_items where uid = new.uid));
  return new;
end $$;
drop trigger if exists achievements_on_item on public.profile_items;
create trigger achievements_on_item after insert on public.profile_items
  for each row execute function public.achievements_on_item();

create or replace function public.achievements_on_throne() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.achievement_track(new.uid, 'cups_won', new.count - coalesce(old.count, 0));
  perform public.achievement_track(new.uid, 'thrones',
    (select count(*)::int from public.throne_wins where uid = new.uid));
  return new;
end $$;
drop trigger if exists achievements_on_throne on public.throne_wins;
create trigger achievements_on_throne after insert or update of count on public.throne_wins
  for each row execute function public.achievements_on_throne();

-- ---------------------------------------------------------------------------
-- The room, for its owner and for visitors
-- ---------------------------------------------------------------------------

create or replace function public.collection_json(p_uid uuid, p_self boolean) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'userId', p.uid,
    'username', p.username,
    'displayName', p.display_name,
    'avatar', p.avatar,
    'country', p.country,
    'public', p.collection_public,
    'showcase', to_jsonb(p.showcase),
    'stats', jsonb_build_object(
      'games', p.games_played,
      'wins', p.games_won,
      'bestStreak', p.best_streak,
      'level', (public.level_info(p.xp) ->> 'level')::int,
      'cupsWon', coalesce((select sum(t.count) from public.throne_wins t where t.uid = p.uid), 0),
      'thrones', (select count(*) from public.throne_wins t where t.uid = p.uid)
    ),
    'thrones', coalesce((
      select jsonb_agg(jsonb_build_object('cup', t.cup_id, 'count', t.count, 'wonAt', t.won_at) order by t.won_at)
        from public.throne_wins t where t.uid = p.uid), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id,
          'progress', coalesce(pr.progress, 0),
          'tier', coalesce((select max(u.tier) from public.achievement_unlocks u where u.uid = p.uid and u.id = a.id), 0),
          'unlockedAt', (select max(u.unlocked_at) from public.achievement_unlocks u where u.uid = p.uid and u.id = a.id)
        ) order by a.id)
        from public.achievements a
        left join public.achievement_progress pr on pr.uid = p.uid and pr.id = a.id), '[]'::jsonb),
    'unseen', case when p_self then coalesce((
      select jsonb_agg(jsonb_build_object('id', u.id, 'tier', u.tier) order by u.unlocked_at)
        from public.achievement_unlocks u where u.uid = p.uid and not u.seen), '[]'::jsonb)
      else '[]'::jsonb end
  )
  from public.profiles p where p.uid = p_uid;
$$;
revoke all on function public.collection_json(uuid, boolean) from public, anon, authenticated;

/** Own room (null) or another player's; a private room shows only the name card. */
create or replace function public.get_collection(p_uid uuid default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_me uuid := public.require_uid();
  v_target uuid := coalesce(p_uid, v_me);
  v_public boolean;
begin
  select collection_public into v_public from public.profiles where uid = v_target;
  if not found then
    raise exception 'That player is no longer around.' using errcode = 'P0002';
  end if;
  if v_target <> v_me and not v_public then
    return (select jsonb_build_object(
      'userId', p.uid, 'username', p.username, 'displayName', p.display_name,
      'avatar', p.avatar, 'country', p.country, 'public', false,
      'showcase', '[]'::jsonb, 'stats', null, 'thrones', '[]'::jsonb,
      'achievements', '[]'::jsonb, 'unseen', '[]'::jsonb)
      from public.profiles p where p.uid = v_target);
  end if;
  return public.collection_json(v_target, v_target = v_me);
end $$;
revoke execute on function public.get_collection(uuid) from public, anon;
grant execute on function public.get_collection(uuid) to authenticated;

/** Up to three showcase items: 'ach:<id>' (unlocked) or 'throne:<cup>' (won). */
create or replace function public.set_showcase(p_items text[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_me uuid := public.require_uid();
  v_item text;
begin
  if coalesce(array_length(p_items, 1), 0) > 3 then
    raise exception 'The showcase holds three items.' using errcode = '22023';
  end if;
  foreach v_item in array coalesce(p_items, '{}') loop
    if v_item like 'ach:%' then
      if not exists (select 1 from public.achievement_unlocks where uid = v_me and id = substr(v_item, 5)) then
        raise exception 'Only unlocked achievements can be shown.' using errcode = '22023';
      end if;
    elsif v_item like 'throne:%' then
      if not exists (select 1 from public.throne_wins where uid = v_me and cup_id = substr(v_item, 8)) then
        raise exception 'Only thrones you have won can be shown.' using errcode = '22023';
      end if;
    else
      raise exception 'That is not a showcase item.' using errcode = '22023';
    end if;
  end loop;
  update public.profiles set showcase = coalesce(p_items, '{}') where uid = v_me;
  return public.collection_json(v_me, true);
end $$;
revoke execute on function public.set_showcase(text[]) from public, anon;
grant execute on function public.set_showcase(text[]) to authenticated;

create or replace function public.set_collection_public(p_public boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me uuid := public.require_uid();
begin
  update public.profiles set collection_public = coalesce(p_public, true) where uid = v_me;
  return public.collection_json(v_me, true);
end $$;
revoke execute on function public.set_collection_public(boolean) from public, anon;
grant execute on function public.set_collection_public(boolean) to authenticated;

create or replace function public.mark_unlocks_seen() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me uuid := public.require_uid();
begin
  update public.achievement_unlocks set seen = true where uid = v_me and not seen;
  return public.collection_json(v_me, true);
end $$;
revoke execute on function public.mark_unlocks_seen() from public, anon;
grant execute on function public.mark_unlocks_seen() to authenticated;

-- ---------------------------------------------------------------------------
-- The two award functions that carry per-match stats, as 0027 and 0012 plus
-- the achievement counts for sixes, captures and coins home.
-- ---------------------------------------------------------------------------
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
  perform public.achievement_track(v_uid, 'sixes', least(greatest(coalesce(p_sixes, 0), 0), 8));
  perform public.achievement_track(v_uid, 'captures', least(greatest(coalesce(p_captures, 0), 0), 6));
  perform public.achievement_track(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.award_match(text, boolean, boolean, int, int, int) from public, anon;
grant execute on function public.award_match(text, boolean, boolean, int, int, int) to authenticated;

create or replace function public.award_online_match(p_match_id uuid, p_sixes int default 0, p_captures int default 0, p_home int default 0)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_new boolean;
begin
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_uid) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  v_new := not exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'online:' || p_match_id::text);
  perform public.award_online_for(v_uid, p_match_id);
  if v_new and exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'online:' || p_match_id::text) then
    perform public.bump_mission(v_uid, 'six', least(greatest(coalesce(p_sixes, 0), 0), 8));
    perform public.bump_mission(v_uid, 'capture', least(greatest(coalesce(p_captures, 0), 0), 6));
    perform public.bump_mission(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
    perform public.achievement_track(v_uid, 'sixes', least(greatest(coalesce(p_sixes, 0), 0), 8));
    perform public.achievement_track(v_uid, 'captures', least(greatest(coalesce(p_captures, 0), 0), 6));
    perform public.achievement_track(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.award_online_match(uuid, int, int, int) from public, anon;
grant execute on function public.award_online_match(uuid, int, int, int) to authenticated;
