-- 0029: store-version policy. Apply after 0028.
--
-- Over-the-air updates only replace JavaScript. When a release needs new
-- native code, or a server change breaks what older clients send (as 0005
-- did for the roll RPC), players must be sent to the store. One row per
-- platform:
--   * min_version    -- installs below this are blocked until they update
--   * latest_version -- installs below this are offered (not forced) an update
--   * store_url      -- optional override; required for iOS (App Store id)
--   * message        -- optional note shown on the update screen
--
-- Edit rows in the Supabase table editor when publishing a store release.
-- The defaults (0.0.0) ask nothing of anyone.

create table if not exists public.app_versions (
  platform       text primary key check (platform in ('android', 'ios')),
  min_version    text not null default '0.0.0'
                 check (min_version ~ '^\d+(\.\d+){0,3}$'),
  latest_version text not null default '0.0.0'
                 check (latest_version ~ '^\d+(\.\d+){0,3}$'),
  store_url      text check (store_url is null or (store_url ~ '^https://' and char_length(store_url) <= 300)),
  message        text check (message is null or char_length(message) <= 300),
  updated_at     timestamptz not null default now()
);

alter table public.app_versions enable row level security;
-- No policies: clients read through get_app_version_policy only, and nobody
-- but the dashboard (service role) can change a row.

insert into public.app_versions (platform) values ('android'), ('ios')
  on conflict (platform) do nothing;

create or replace function public.touch_app_versions() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_versions_touch on public.app_versions;
create trigger app_versions_touch before update on public.app_versions
  for each row execute function public.touch_app_versions();

revoke all on function public.touch_app_versions() from public, anon, authenticated;

-- Callable by anyone, signed in or not: a player must learn their build is
-- too old before they can sign in with it.
create or replace function public.get_app_version_policy(p_platform text)
returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'min_version', min_version,
    'latest_version', latest_version,
    'store_url', store_url,
    'message', message
  )
  from public.app_versions
  where platform = p_platform
$$;

revoke all on function public.get_app_version_policy(text) from public;
grant execute on function public.get_app_version_policy(text) to anon, authenticated;
