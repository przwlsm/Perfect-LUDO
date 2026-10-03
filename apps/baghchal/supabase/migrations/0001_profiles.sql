-- Player profiles. Apply first.
--
-- Security model: the app ships the public anon key, so the database is the
-- access boundary. A player can read their own row and nothing else, and no
-- client can write a row directly: the only writes go through the two
-- functions below, which touch only the columns a player may change. Coins
-- and ratings therefore change only in server code, never from a device.

create or replace function public.require_uid() returns uuid
language plpgsql stable as $$
declare v uuid;
begin
  v := (select auth.uid());
  if v is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  return v;
end $$;

create table if not exists public.profiles (
  uid             uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  display_name    text check (char_length(display_name) <= 20),
  rating_tiger    integer not null default 1200,
  rating_goat     integer not null default 1200,
  coins           integer not null default 100 check (coins >= 0),
  games_played    integer not null default 0 check (games_played >= 0),
  games_won       integer not null default 0 check (games_won >= 0),
  equipped_board  text not null default 'classic_wood',
  equipped_pieces text not null default 'brass_classic',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint wins_not_above_games check (games_won <= games_played)
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select
  to authenticated using ((select auth.uid()) = uid);
-- No insert, update or delete policy: writes go through the functions below.

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.profile_json(p public.profiles) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', p.uid,
    'username', p.username,
    'displayName', p.display_name,
    'ratingTiger', p.rating_tiger,
    'ratingGoat', p.rating_goat,
    'coins', p.coins,
    'gamesPlayed', p.games_played,
    'gamesWon', p.games_won,
    'equippedBoard', p.equipped_board,
    'equippedPieces', p.equipped_pieces
  );
$$;
revoke all on function public.profile_json(public.profiles) from public, anon, authenticated;

-- The caller's profile, created on first call with a random username.
create or replace function public.ensure_profile() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_row public.profiles;
  v_name text;
begin
  select * into v_row from public.profiles where uid = v_uid;
  if not found then
    loop
      v_name := 'player_' || substr(md5(gen_random_uuid()::text), 1, 6);
      exit when not exists (select 1 from public.profiles where username = v_name);
    end loop;
    insert into public.profiles (uid, username) values (v_uid, v_name)
    on conflict (uid) do nothing;
    select * into v_row from public.profiles where uid = v_uid;
  end if;
  return public.profile_json(v_row);
end $$;
revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- The columns a player may change about themselves, and only those.
create or replace function public.update_profile(
  p_display_name text default null,
  p_equipped_board text default null,
  p_equipped_pieces text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_row public.profiles;
begin
  update public.profiles
     set display_name    = coalesce(nullif(trim(p_display_name), ''), display_name),
         equipped_board  = coalesce(nullif(trim(p_equipped_board), ''), equipped_board),
         equipped_pieces = coalesce(nullif(trim(p_equipped_pieces), ''), equipped_pieces)
   where uid = v_uid
   returning * into v_row;
  if not found then raise exception 'No profile yet.' using errcode = 'P0002'; end if;
  return public.profile_json(v_row);
end $$;
revoke all on function public.update_profile(text, text, text) from public, anon;
grant execute on function public.update_profile(text, text, text) to authenticated;
