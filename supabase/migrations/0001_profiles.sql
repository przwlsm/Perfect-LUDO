-- Player account progress: coins, stats and win streak, synced across a
-- player's devices.
--
-- Security model: the app ships the public anon key, so the database is the
-- access boundary. Row Level Security is what stops one player reading or
-- editing another's row -- never client-side checks.
--
-- Scope note: the device is the source of truth while playing (the game runs
-- fully offline), so this table is a last-write-wins snapshot. A player can
-- therefore edit their own coins. That is acceptable for cosmetic currency
-- and affects nobody else. If coins ever gain real-world value, or a
-- leaderboard ranks players against each other, moves must become
-- server-authoritative before then.

create table if not exists public.profiles (
  uid          uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 20),
  coins        integer not null default 1000 check (coins >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  games_won    integer not null default 0 check (games_won >= 0),
  streak       integer not null default 0 check (streak >= 0),
  best_streak  integer not null default 0 check (best_streak >= 0),
  updated_at   timestamptz not null default now(),

  -- Cheap integrity rails: these should be impossible, so let the database
  -- reject them rather than let a bad client quietly persist nonsense.
  constraint wins_not_above_games   check (games_won   <= games_played),
  constraint streak_not_above_wins  check (streak      <= games_won),
  constraint best_streak_is_highest check (best_streak >= streak and best_streak <= games_won)
);

alter table public.profiles enable row level security;

-- Deny by default. Each policy below opens exactly one door, for your own row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using ((select auth.uid()) = uid);

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = uid);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using ((select auth.uid()) = uid)
  with check ((select auth.uid()) = uid);

-- No delete policy: an account's history disappears only with the account
-- itself, via the cascade on auth.users above.

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();
