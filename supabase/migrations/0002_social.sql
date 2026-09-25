-- Friends, presence, challenges, private lobbies and notifications.
--
-- Security model: the app ships the public anon key, so Postgres is the only
-- trust boundary. Two rules make that work here:
--
--   1. Not one table below has an insert/update/delete policy. Every mutation
--      goes through a `security definer` function that re-derives the caller
--      from auth.uid() and validates the transition. A client cannot write a
--      row directly, so it cannot invite itself into someone else's lobby,
--      accept an expired challenge, or force a game to start.
--   2. Select policies are scoped to the people actually involved. Realtime
--      applies those same policies per subscriber, so a client subscribed to
--      a table only ever receives the rows it was already allowed to read.
--
-- Presence is heartbeat-based rather than session-based: `last_seen` is
-- refreshed by the client and anything older than presence_timeout_seconds
-- reads as OFFLINE. A crashed app, a dead radio or a closed tab therefore
-- goes offline on its own, with no server-side watchdog to keep running.

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.presence_status as enum ('ONLINE', 'AWAY', 'OFFLINE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.friend_request_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.challenge_status as enum (
    'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'IN_LOBBY', 'STARTED', 'COMPLETED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lobby_status as enum ('WAITING', 'COUNTDOWN', 'STARTED', 'CANCELLED', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lobby_player_status as enum ('INVITED', 'JOINED', 'LEFT', 'DECLINED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED',
    'CHALLENGE_INVITE', 'CHALLENGE_ACCEPTED', 'CHALLENGE_DECLINED',
    'CHALLENGE_EXPIRED', 'CHALLENGE_CANCELLED', 'GAME_STARTED'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tunables
--
-- One row, read by the functions below. Timeouts live here rather than being
-- repeated across SQL and client code, so changing "how long before a
-- challenge expires" is an UPDATE, not a deploy.
-- ---------------------------------------------------------------------------

create table if not exists public.social_settings (
  id                       boolean primary key default true check (id),
  challenge_timeout_seconds int    not null default 90  check (challenge_timeout_seconds between 15 and 3600),
  countdown_seconds         int    not null default 3   check (countdown_seconds between 1 and 30),
  presence_timeout_seconds  int    not null default 75  check (presence_timeout_seconds between 30 and 600),
  -- false makes players press "Ready" before the countdown can begin.
  auto_ready                boolean not null default true
);
insert into public.social_settings (id) values (true) on conflict (id) do nothing;

alter table public.social_settings enable row level security;

drop policy if exists "read settings" on public.social_settings;
create policy "read settings" on public.social_settings for select
  to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Public identity
--
-- profiles already holds private progress (coins, stats) and stays readable
-- only by its owner. Discovery therefore never selects from it directly:
-- the functions below return a narrow public projection and nothing else.
-- Email addresses are never exposed.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar   text;

do $$ begin
  alter table public.profiles add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,16}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_avatar_length
    check (avatar is null or char_length(avatar) <= 8);
exception when duplicate_object then null; end $$;

-- Usernames are stored lowercase, so a plain unique index is enough and the
-- citext extension is not needed.
create unique index if not exists profiles_username_key on public.profiles (username);

create table if not exists public.user_presence (
  uid       uuid primary key references auth.users (id) on delete cascade,
  status    public.presence_status not null default 'OFFLINE',
  last_seen timestamptz not null default now()
);

alter table public.user_presence enable row level security;

-- ---------------------------------------------------------------------------
-- Friendship
-- ---------------------------------------------------------------------------

create table if not exists public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users (id) on delete cascade,
  receiver_id  uuid not null references auth.users (id) on delete cascade,
  status       public.friend_request_status not null default 'PENDING',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_request_not_self check (sender_id <> receiver_id)
);

-- At most one live request per ordered pair. The reverse direction is handled
-- in send_friend_request, which accepts an existing opposite request instead
-- of creating a second one.
create unique index if not exists friend_requests_one_pending
  on public.friend_requests (sender_id, receiver_id) where status = 'PENDING';
create index if not exists friend_requests_receiver on public.friend_requests (receiver_id, status);
create index if not exists friend_requests_sender   on public.friend_requests (sender_id, status);

alter table public.friend_requests enable row level security;

-- Stored in both directions: one row per person's view of the friendship.
-- That keeps "my friends" a single-column lookup and keeps the select policy
-- trivial, at the cost of writing two rows on accept.
create table if not exists public.friendships (
  user_id    uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendship_not_self check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

-- ---------------------------------------------------------------------------
-- Challenges and lobbies
-- ---------------------------------------------------------------------------

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references auth.users (id) on delete cascade,
  player_count int  not null check (player_count between 2 and 6),
  status       public.challenge_status not null default 'PENDING',
  lobby_id     uuid,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  started_at   timestamptz,
  completed_at timestamptz
);
create index if not exists challenges_creator on public.challenges (creator_id, status);

alter table public.challenges enable row level security;

create table if not exists public.challenge_participants (
  challenge_id      uuid not null references public.challenges (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  invitation_status public.invitation_status not null default 'PENDING',
  joined_at         timestamptz,
  responded_at      timestamptz,
  primary key (challenge_id, user_id)
);
create index if not exists challenge_participants_user
  on public.challenge_participants (user_id, invitation_status);

alter table public.challenge_participants enable row level security;

create table if not exists public.lobbies (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid unique references public.challenges (id) on delete cascade,
  host_id      uuid not null references auth.users (id) on delete cascade,
  max_players  int  not null check (max_players between 2 and 6),
  status       public.lobby_status not null default 'WAITING',
  created_at   timestamptz not null default now(),
  -- Server-authoritative game start. Clients render a countdown towards this
  -- instant and cannot begin before it, so every player transitions together
  -- regardless of how wrong their device clock is.
  start_at     timestamptz
);

alter table public.lobbies enable row level security;

create table if not exists public.lobby_players (
  lobby_id        uuid not null references public.lobbies (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  status          public.lobby_player_status not null default 'INVITED',
  is_ready        boolean not null default false,
  -- Fixed at invite time so the board seating never depends on join order.
  seat_index      int not null,
  joined_at       timestamptz,
  disconnected_at timestamptz,
  primary key (lobby_id, user_id),
  unique (lobby_id, seat_index)
);
create index if not exists lobby_players_user on public.lobby_players (user_id);

alter table public.lobby_players enable row level security;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  type                 public.notification_type not null,
  title                text not null,
  message              text not null,
  related_challenge_id uuid references public.challenges (id) on delete cascade,
  related_lobby_id     uuid references public.lobbies (id) on delete set null,
  is_read              boolean not null default false,
  created_at           timestamptz not null default now()
);
create index if not exists notifications_inbox on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- `security definer` so they run outside the caller's RLS. A policy on
-- lobby_players that selected from lobby_players directly would recurse;
-- routing through a definer function breaks that cycle.
-- ---------------------------------------------------------------------------

create or replace function public.is_lobby_member(p_lobby_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.lobby_players lp
    where lp.lobby_id = p_lobby_id and lp.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_challenge_member(p_challenge_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.challenges c
    where c.id = p_challenge_id and c.creator_id = (select auth.uid())
  ) or exists (
    select 1 from public.challenge_participants cp
    where cp.challenge_id = p_challenge_id and cp.user_id = (select auth.uid())
  );
$$;

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.friendships f where f.user_id = p_a and f.friend_id = p_b
  );
$$;

-- ---------------------------------------------------------------------------
-- Read policies
-- ---------------------------------------------------------------------------

drop policy if exists "read own or friend presence" on public.user_presence;
create policy "read own or friend presence" on public.user_presence for select
  to authenticated
  using (uid = (select auth.uid()) or public.are_friends((select auth.uid()), uid));

drop policy if exists "read own requests" on public.friend_requests;
create policy "read own requests" on public.friend_requests for select
  to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));

drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships" on public.friendships for select
  to authenticated using (user_id = (select auth.uid()));

drop policy if exists "read involved challenges" on public.challenges;
create policy "read involved challenges" on public.challenges for select
  to authenticated using (public.is_challenge_member(id));

drop policy if exists "read involved participants" on public.challenge_participants;
create policy "read involved participants" on public.challenge_participants for select
  to authenticated using (public.is_challenge_member(challenge_id));

drop policy if exists "read joined lobbies" on public.lobbies;
create policy "read joined lobbies" on public.lobbies for select
  to authenticated using (public.is_lobby_member(id));

drop policy if exists "read joined lobby players" on public.lobby_players;
create policy "read joined lobby players" on public.lobby_players for select
  to authenticated using (public.is_lobby_member(lobby_id));

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select
  to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'user_presence', 'friend_requests', 'friendships',
    'challenges', 'challenge_participants',
    'lobbies', 'lobby_players', 'notifications'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      -- Already published, or running against a plain Postgres that has no
      -- supabase_realtime publication. Neither should fail the migration.
      when duplicate_object or undefined_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Internal helpers (not reachable from a client)
-- ---------------------------------------------------------------------------

create or replace function public.effective_presence(
  p_status public.presence_status, p_last_seen timestamptz
) returns public.presence_status language sql stable as $$
  select case
    when p_last_seen is null then 'OFFLINE'::public.presence_status
    when p_last_seen < now() - make_interval(
      secs => (select s.presence_timeout_seconds from public.social_settings s where s.id)
    ) then 'OFFLINE'::public.presence_status
    else p_status
  end;
$$;

-- Never returns null: notification messages are built by concatenation, and a
-- null here would make the whole message null and break the NOT NULL column.
create or replace function public.display_of(p_uid uuid)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select nullif(p.display_name, '') from public.profiles p where p.uid = p_uid),
    (select p.username from public.profiles p where p.uid = p_uid),
    'A player'
  );
$$;

create or replace function public.notify(
  p_user uuid, p_type public.notification_type, p_title text, p_message text,
  p_challenge uuid default null, p_lobby uuid default null
) returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (user_id, type, title, message, related_challenge_id, related_lobby_id)
  values (p_user, p_type, p_title, p_message, p_challenge, p_lobby);
$$;
revoke execute on function public.notify(uuid, public.notification_type, text, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.require_uid() returns uuid
language plpgsql stable as $$
declare v uuid;
begin
  v := (select auth.uid());
  if v is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- Idempotent: called by the client on every sign-in. Gives the account a
-- profile row, a presence row and a unique username derived from their email
-- local part, so a brand-new player is immediately discoverable by friends.
create or replace function public.ensure_social_identity(p_display_name text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_email text;
  v_base text;
  v_candidate text;
  v_n int := 0;
  v_row public.profiles;
begin
  insert into public.profiles (uid, display_name)
  values (v_uid, nullif(trim(coalesce(p_display_name, '')), ''))
  on conflict (uid) do nothing;

  insert into public.user_presence (uid) values (v_uid) on conflict (uid) do nothing;

  select * into v_row from public.profiles where uid = v_uid;

  if v_row.username is null then
    select u.email into v_email from auth.users u where u.id = v_uid;
    v_base := regexp_replace(lower(split_part(coalesce(v_email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
    if char_length(v_base) < 3 then v_base := 'player'; end if;
    v_base := left(v_base, 12);
    v_candidate := v_base;
    while exists (select 1 from public.profiles p where p.username = v_candidate) loop
      v_n := v_n + 1;
      v_candidate := v_base || v_n::text;
    end loop;
    update public.profiles set username = v_candidate where uid = v_uid
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'id', v_row.uid,
    'username', v_row.username,
    'displayName', v_row.display_name,
    'avatar', v_row.avatar
  );
end $$;
grant execute on function public.ensure_social_identity(text) to authenticated;

create or replace function public.update_social_identity(p_username text default null, p_avatar text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_name text := nullif(lower(trim(coalesce(p_username, ''))), '');
  v_row public.profiles;
begin
  if v_name is not null then
    if v_name !~ '^[a-z0-9_]{3,16}$' then
      raise exception 'Usernames use 3-16 letters, numbers or underscores.' using errcode = '22023';
    end if;
    if exists (select 1 from public.profiles p where p.username = v_name and p.uid <> v_uid) then
      raise exception 'That username is already taken.' using errcode = '23505';
    end if;
  end if;

  update public.profiles
     set username = coalesce(v_name, username),
         avatar   = coalesce(nullif(trim(coalesce(p_avatar, '')), ''), avatar)
   where uid = v_uid
  returning * into v_row;

  if v_row is null then raise exception 'Your profile is not set up yet.' using errcode = 'P0002'; end if;

  return jsonb_build_object(
    'id', v_row.uid, 'username', v_row.username,
    'displayName', v_row.display_name, 'avatar', v_row.avatar
  );
end $$;
grant execute on function public.update_social_identity(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Discovery
-- ---------------------------------------------------------------------------

-- Returns the public projection plus the caller's relationship to each hit,
-- so the UI can render the right action without a second round trip.
create or replace function public.search_users(p_query text, p_limit int default 20)
returns table (
  id uuid, username text, display_name text, avatar text,
  presence public.presence_status, last_seen timestamptz, relationship text
) language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select public.require_uid() as uid),
  q as (select lower(trim(coalesce(p_query, ''))) as term)
  select
    p.uid,
    p.username,
    p.display_name,
    p.avatar,
    public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
    pr.last_seen,
    case
      when p.uid = me.uid then 'SELF'
      when exists (select 1 from public.friendships f where f.user_id = me.uid and f.friend_id = p.uid) then 'FRIEND'
      when exists (select 1 from public.friend_requests r
                    where r.sender_id = me.uid and r.receiver_id = p.uid and r.status = 'PENDING') then 'REQUEST_SENT'
      when exists (select 1 from public.friend_requests r
                    where r.sender_id = p.uid and r.receiver_id = me.uid and r.status = 'PENDING') then 'REQUEST_RECEIVED'
      else 'NONE'
    end
  from public.profiles p
  cross join me
  cross join q
  left join public.user_presence pr on pr.uid = p.uid
  where p.username is not null
    and char_length(q.term) >= 2
    and (p.username like q.term || '%' or p.uid::text = q.term)
  order by (p.username = q.term) desc, p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
grant execute on function public.search_users(text, int) to authenticated;

create or replace function public.list_friends()
returns table (
  id uuid, username text, display_name text, avatar text,
  presence public.presence_status, last_seen timestamptz, friends_since timestamptz
) language sql stable security definer set search_path = public, pg_temp as $$
  select
    p.uid, p.username, p.display_name, p.avatar,
    public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
    pr.last_seen,
    f.created_at
  from public.friendships f
  join public.profiles p on p.uid = f.friend_id
  left join public.user_presence pr on pr.uid = f.friend_id
  where f.user_id = public.require_uid()
  order by
    (public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen) = 'OFFLINE'),
    coalesce(nullif(p.display_name, ''), p.username);
$$;
grant execute on function public.list_friends() to authenticated;

create or replace function public.list_friend_requests(p_direction text default 'incoming')
returns table (
  id uuid, user_id uuid, username text, display_name text, avatar text,
  presence public.presence_status, last_seen timestamptz, created_at timestamptz
) language sql stable security definer set search_path = public, pg_temp as $$
  select
    r.id,
    p.uid, p.username, p.display_name, p.avatar,
    public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
    pr.last_seen,
    r.created_at
  from public.friend_requests r
  join public.profiles p
    on p.uid = case when p_direction = 'sent' then r.receiver_id else r.sender_id end
  left join public.user_presence pr on pr.uid = p.uid
  where r.status = 'PENDING'
    and case when p_direction = 'sent'
             then r.sender_id = public.require_uid()
             else r.receiver_id = public.require_uid() end
  order by r.created_at desc;
$$;
grant execute on function public.list_friend_requests(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Friend request lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_reverse public.friend_requests;
  v_id uuid;
begin
  if p_target is null or p_target = v_uid then
    raise exception 'You cannot add yourself.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.uid = p_target) then
    raise exception 'That player could not be found.' using errcode = 'P0002';
  end if;
  if public.are_friends(v_uid, p_target) then
    raise exception 'You are already friends.' using errcode = '23505';
  end if;

  -- They asked first: treat this as the handshake completing rather than
  -- stacking a second pending request nobody needs to answer.
  select * into v_reverse from public.friend_requests
   where sender_id = p_target and receiver_id = v_uid and status = 'PENDING'
   limit 1;
  if found then
    return public.respond_friend_request(v_reverse.id, true);
  end if;

  insert into public.friend_requests (sender_id, receiver_id)
  values (v_uid, p_target)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'You already sent this player a request.' using errcode = '23505';
  end if;

  perform public.notify(
    p_target, 'FRIEND_REQUEST', 'New friend request',
    public.display_of(v_uid) || ' sent you a friend request.'
  );
  return jsonb_build_object('id', v_id, 'status', 'PENDING');
end $$;
grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_req public.friend_requests;
begin
  select * into v_req from public.friend_requests where id = p_request_id for update;
  if not found or v_req.receiver_id <> v_uid then
    raise exception 'That request is no longer available.' using errcode = 'P0002';
  end if;
  if v_req.status <> 'PENDING' then
    raise exception 'That request has already been answered.' using errcode = '22023';
  end if;

  update public.friend_requests
     set status = case when p_accept then 'ACCEPTED' else 'DECLINED' end::public.friend_request_status,
         responded_at = now()
   where id = p_request_id;

  if p_accept then
    insert into public.friendships (user_id, friend_id)
    values (v_req.sender_id, v_req.receiver_id), (v_req.receiver_id, v_req.sender_id)
    on conflict do nothing;

    perform public.notify(
      v_req.sender_id, 'FRIEND_REQUEST_ACCEPTED', 'Friend request accepted',
      public.display_of(v_uid) || ' accepted your friend request.'
    );
  end if;

  return jsonb_build_object('id', p_request_id, 'status', case when p_accept then 'ACCEPTED' else 'DECLINED' end);
end $$;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  update public.friend_requests
     set status = 'CANCELLED', responded_at = now()
   where id = p_request_id and sender_id = v_uid and status = 'PENDING';
  if not found then
    raise exception 'That request is no longer pending.' using errcode = 'P0002';
  end if;
end $$;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

create or replace function public.remove_friend(p_friend_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  delete from public.friendships
   where (user_id = v_uid and friend_id = p_friend_id)
      or (user_id = p_friend_id and friend_id = v_uid);
  -- Clear the history too, so either side can send a fresh request later.
  update public.friend_requests
     set status = 'CANCELLED', responded_at = now()
   where status = 'PENDING'
     and ((sender_id = v_uid and receiver_id = p_friend_id)
       or (sender_id = p_friend_id and receiver_id = v_uid));
end $$;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Presence
-- ---------------------------------------------------------------------------

create or replace function public.touch_presence(p_status public.presence_status default 'ONLINE')
returns timestamptz language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid(); v_now timestamptz := now();
begin
  insert into public.user_presence (uid, status, last_seen)
  values (v_uid, coalesce(p_status, 'ONLINE'), v_now)
  on conflict (uid) do update set status = excluded.status, last_seen = excluded.last_seen;
  return v_now;
end $$;
grant execute on function public.touch_presence(public.presence_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Challenge lifecycle
-- ---------------------------------------------------------------------------

-- Lazy expiry. Called at the top of every challenge read/write instead of
-- relying on a scheduler, so the rule holds even on a project with no cron
-- extension enabled. A pg_cron job calling this can be added later purely as
-- an optimisation; correctness does not depend on it.
create or replace function public.expire_stale_challenges()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stale uuid[];
begin
  select coalesce(array_agg(c.id), '{}') into v_stale
  from public.challenges c
  where c.status in ('PENDING', 'IN_LOBBY')
    and c.expires_at < now()
    and exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = c.id and cp.invitation_status = 'PENDING'
    );

  if array_length(v_stale, 1) is null then return; end if;

  insert into public.notifications (user_id, type, title, message, related_challenge_id)
  select c.creator_id, 'CHALLENGE_EXPIRED', 'Invitation expired',
         public.display_of(cp.user_id) || '''s game invitation expired.', c.id
    from public.challenges c
    join public.challenge_participants cp on cp.challenge_id = c.id
   where c.id = any(v_stale) and cp.invitation_status = 'PENDING';

  update public.challenge_participants
     set invitation_status = 'EXPIRED', responded_at = now()
   where challenge_id = any(v_stale) and invitation_status = 'PENDING';

  update public.lobbies set status = 'CANCELLED'
   where challenge_id = any(v_stale) and status in ('WAITING', 'COUNTDOWN');

  update public.challenges set status = 'EXPIRED' where id = any(v_stale);
end $$;
revoke execute on function public.expire_stale_challenges() from public, anon;
grant execute on function public.expire_stale_challenges() to authenticated;

-- Re-derives whether the lobby should be counting down. Called after every
-- join/leave/ready change. The countdown target is written here, server-side,
-- which is what stops a client from starting a game early.
create or replace function public.refresh_lobby_state(p_lobby_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_lobby public.lobbies;
  v_joined int;
  v_ready int;
  v_seconds int;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found or v_lobby.status not in ('WAITING', 'COUNTDOWN') then return; end if;

  select count(*) filter (where status = 'JOINED'),
         count(*) filter (where status = 'JOINED' and is_ready)
    into v_joined, v_ready
    from public.lobby_players where lobby_id = p_lobby_id;

  if v_joined = v_lobby.max_players and v_ready = v_lobby.max_players then
    if v_lobby.status <> 'COUNTDOWN' then
      select countdown_seconds into v_seconds from public.social_settings where id;
      update public.lobbies
         set status = 'COUNTDOWN', start_at = now() + make_interval(secs => v_seconds)
       where id = p_lobby_id;

      insert into public.notifications (user_id, type, title, message, related_challenge_id, related_lobby_id)
      select lp.user_id, 'GAME_STARTED', 'Game starting',
             'All players joined. The game is starting!', v_lobby.challenge_id, p_lobby_id
        from public.lobby_players lp
       where lp.lobby_id = p_lobby_id and lp.status = 'JOINED';
    end if;
  elsif v_lobby.status = 'COUNTDOWN' then
    -- Somebody left or un-readied during the countdown: stand down.
    update public.lobbies set status = 'WAITING', start_at = null where id = p_lobby_id;
  end if;
end $$;
revoke execute on function public.refresh_lobby_state(uuid) from public, anon, authenticated;

create or replace function public.lobby_snapshot(p_lobby_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'lobby', jsonb_build_object(
      'id', l.id,
      'challengeId', l.challenge_id,
      'hostId', l.host_id,
      'maxPlayers', l.max_players,
      'status', l.status,
      'startAt', l.start_at,
      'createdAt', l.created_at
    ),
    'challenge', jsonb_build_object(
      'id', c.id,
      'creatorId', c.creator_id,
      'playerCount', c.player_count,
      'status', c.status,
      'expiresAt', c.expires_at,
      'startedAt', c.started_at
    ),
    'players', coalesce((
      select jsonb_agg(entry order by entry ->> 'seatIndex')
      from (
        select jsonb_build_object(
          'userId', lp.user_id,
          'username', p.username,
          'displayName', p.display_name,
          'avatar', p.avatar,
          'seatIndex', lp.seat_index,
          'status', lp.status,
          'isReady', lp.is_ready,
          'isHost', lp.user_id = l.host_id,
          'joinedAt', lp.joined_at,
          'invitationStatus', cp.invitation_status,
          -- Derived, never stored: a joined player whose heartbeat has gone
          -- quiet is shown as disconnected and recovers on its own when the
          -- heartbeat resumes. No watchdog process required. `lastSeen` ships
          -- alongside so the client can keep applying the rule between reads.
          'presence', public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
          'lastSeen', pr.last_seen
        ) as entry
        from public.lobby_players lp
        join public.profiles p on p.uid = lp.user_id
        left join public.user_presence pr on pr.uid = lp.user_id
        left join public.challenge_participants cp
          on cp.challenge_id = l.challenge_id and cp.user_id = lp.user_id
        where lp.lobby_id = l.id
      ) rows
    ), '[]'::jsonb)
  )
  from public.lobbies l
  join public.challenges c on c.id = l.challenge_id
  where l.id = p_lobby_id and public.is_lobby_member(l.id);
$$;
grant execute on function public.lobby_snapshot(uuid) to authenticated;

create or replace function public.get_lobby(p_lobby_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_result jsonb;
begin
  perform public.require_uid();
  perform public.expire_stale_challenges();
  v_result := public.lobby_snapshot(p_lobby_id);
  if v_result is null then
    raise exception 'That game is no longer available.' using errcode = 'P0002';
  end if;
  return v_result;
end $$;
grant execute on function public.get_lobby(uuid) to authenticated;

create or replace function public.create_challenge(p_friend_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_ids uuid[];
  v_count int;
  v_timeout int;
  v_auto boolean;
  v_challenge uuid;
  v_lobby uuid;
  v_friend uuid;
  v_seat int := 1;
begin
  perform public.expire_stale_challenges();

  select array_agg(distinct x) into v_ids from unnest(coalesce(p_friend_ids, '{}')) as x;
  v_ids := coalesce(v_ids, '{}');

  if v_uid = any(v_ids) then
    raise exception 'You are already in the game.' using errcode = '22023';
  end if;
  if array_length(v_ids, 1) is null or array_length(v_ids, 1) not between 1 and 2 then
    raise exception 'Pick one friend for a 2-player game, or two for a 3-player game.' using errcode = '22023';
  end if;

  foreach v_friend in array v_ids loop
    if not public.are_friends(v_uid, v_friend) then
      raise exception 'You can only challenge your friends.' using errcode = '42501';
    end if;
  end loop;

  if exists (
    select 1 from public.challenges c
    where c.creator_id = v_uid and c.status in ('PENDING', 'IN_LOBBY')
  ) then
    raise exception 'You already have a game waiting. Finish or cancel it first.' using errcode = '23505';
  end if;

  v_count := array_length(v_ids, 1) + 1;
  select challenge_timeout_seconds, auto_ready into v_timeout, v_auto
    from public.social_settings where id;

  insert into public.challenges (creator_id, player_count, expires_at)
  values (v_uid, v_count, now() + make_interval(secs => v_timeout))
  returning id into v_challenge;

  insert into public.lobbies (challenge_id, host_id, max_players)
  values (v_challenge, v_uid, v_count)
  returning id into v_lobby;

  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  -- The creator counts as one player and is in from the start.
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_uid, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_uid, 'JOINED', v_auto, 0, now());

  foreach v_friend in array v_ids loop
    insert into public.challenge_participants (challenge_id, user_id)
    values (v_challenge, v_friend);
    insert into public.lobby_players (lobby_id, user_id, seat_index)
    values (v_lobby, v_friend, v_seat);
    v_seat := v_seat + 1;

    perform public.notify(
      v_friend, 'CHALLENGE_INVITE', 'Game challenge',
      public.display_of(v_uid) || ' invited you to a ' || v_count || '-player game.',
      v_challenge, v_lobby
    );
  end loop;

  return jsonb_build_object('challengeId', v_challenge, 'lobbyId', v_lobby);
end $$;
grant execute on function public.create_challenge(uuid[]) to authenticated;

create or replace function public.respond_challenge(p_challenge_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_challenge public.challenges;
  v_participant public.challenge_participants;
begin
  perform public.expire_stale_challenges();

  select * into v_challenge from public.challenges where id = p_challenge_id for update;
  if not found then
    raise exception 'That game is no longer available.' using errcode = 'P0002';
  end if;
  if v_challenge.status not in ('PENDING', 'IN_LOBBY') then
    raise exception 'That invitation is no longer open.' using errcode = '22023';
  end if;

  select * into v_participant from public.challenge_participants
   where challenge_id = p_challenge_id and user_id = v_uid for update;
  if not found then
    raise exception 'You were not invited to that game.' using errcode = '42501';
  end if;
  if v_participant.invitation_status not in ('PENDING', 'ACCEPTED') then
    raise exception 'You already answered that invitation.' using errcode = '22023';
  end if;

  if p_accept then
    update public.challenge_participants
       set invitation_status = 'ACCEPTED', responded_at = coalesce(responded_at, now())
     where challenge_id = p_challenge_id and user_id = v_uid;
    return jsonb_build_object('lobbyId', v_challenge.lobby_id, 'status', 'ACCEPTED');
  end if;

  update public.challenge_participants
     set invitation_status = 'DECLINED', responded_at = now()
   where challenge_id = p_challenge_id and user_id = v_uid;
  update public.lobby_players set status = 'DECLINED'
   where lobby_id = v_challenge.lobby_id and user_id = v_uid;

  -- The creator chose a player count and Ludo seats are fixed at the start,
  -- so a decline makes this particular game unplayable. Cancel it outright
  -- rather than quietly starting a smaller game nobody agreed to.
  update public.challenges set status = 'CANCELLED' where id = p_challenge_id;
  update public.lobbies set status = 'CANCELLED', start_at = null
   where id = v_challenge.lobby_id;

  insert into public.notifications (user_id, type, title, message, related_challenge_id, related_lobby_id)
  select cp.user_id, 'CHALLENGE_DECLINED', 'Invitation declined',
         public.display_of(v_uid) || ' declined the game invitation.',
         p_challenge_id, v_challenge.lobby_id
    from public.challenge_participants cp
   where cp.challenge_id = p_challenge_id and cp.user_id <> v_uid;

  return jsonb_build_object('lobbyId', v_challenge.lobby_id, 'status', 'DECLINED');
end $$;
grant execute on function public.respond_challenge(uuid, boolean) to authenticated;

create or replace function public.cancel_challenge(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_challenge public.challenges;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id for update;
  if not found or v_challenge.creator_id <> v_uid then
    raise exception 'Only the host can cancel this game.' using errcode = '42501';
  end if;
  if v_challenge.status in ('STARTED', 'COMPLETED') then
    raise exception 'That game has already started.' using errcode = '22023';
  end if;

  update public.challenges set status = 'CANCELLED' where id = p_challenge_id;
  update public.lobbies set status = 'CANCELLED', start_at = null where id = v_challenge.lobby_id;
  update public.challenge_participants
     set invitation_status = 'CANCELLED', responded_at = now()
   where challenge_id = p_challenge_id and invitation_status = 'PENDING';

  insert into public.notifications (user_id, type, title, message, related_challenge_id, related_lobby_id)
  select cp.user_id, 'CHALLENGE_CANCELLED', 'Game cancelled',
         public.display_of(v_uid) || ' cancelled the game.', p_challenge_id, v_challenge.lobby_id
    from public.challenge_participants cp
   where cp.challenge_id = p_challenge_id and cp.user_id <> v_uid;
end $$;
grant execute on function public.cancel_challenge(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lobby
-- ---------------------------------------------------------------------------

create or replace function public.join_lobby(p_lobby_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_lobby public.lobbies;
  v_player public.lobby_players;
  v_auto boolean;
begin
  perform public.expire_stale_challenges();

  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'That game is no longer available.' using errcode = 'P0002';
  end if;
  if v_lobby.status not in ('WAITING', 'COUNTDOWN') then
    raise exception 'That game is no longer accepting players.' using errcode = '22023';
  end if;

  -- Only people who were invited have a row here, which is what makes the
  -- lobby private: knowing the id is not enough to get in.
  select * into v_player from public.lobby_players
   where lobby_id = p_lobby_id and user_id = v_uid for update;
  if not found then
    raise exception 'This is a private game you were not invited to.' using errcode = '42501';
  end if;
  if v_player.status = 'DECLINED' then
    raise exception 'You already declined this game.' using errcode = '22023';
  end if;

  if v_player.status <> 'JOINED' then
    select auto_ready into v_auto from public.social_settings where id;
    update public.lobby_players
       set status = 'JOINED', is_ready = v_auto,
           joined_at = coalesce(joined_at, now()), disconnected_at = null
     where lobby_id = p_lobby_id and user_id = v_uid;

    update public.challenge_participants
       set invitation_status = 'ACCEPTED',
           responded_at = coalesce(responded_at, now()),
           joined_at = coalesce(joined_at, now())
     where challenge_id = v_lobby.challenge_id and user_id = v_uid;

    update public.challenges set status = 'IN_LOBBY'
     where id = v_lobby.challenge_id and status = 'PENDING';

    if v_uid <> v_lobby.host_id then
      perform public.notify(
        v_lobby.host_id, 'CHALLENGE_ACCEPTED', 'Player joined',
        public.display_of(v_uid) || ' joined your game.', v_lobby.challenge_id, p_lobby_id
      );
    end if;
  end if;

  perform public.refresh_lobby_state(p_lobby_id);
  return public.lobby_snapshot(p_lobby_id);
end $$;
grant execute on function public.join_lobby(uuid) to authenticated;

create or replace function public.set_lobby_ready(p_lobby_id uuid, p_ready boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  update public.lobby_players set is_ready = coalesce(p_ready, false)
   where lobby_id = p_lobby_id and user_id = v_uid and status = 'JOINED';
  if not found then
    raise exception 'Join the game before readying up.' using errcode = '22023';
  end if;
  perform public.refresh_lobby_state(p_lobby_id);
  return public.lobby_snapshot(p_lobby_id);
end $$;
grant execute on function public.set_lobby_ready(uuid, boolean) to authenticated;

create or replace function public.leave_lobby(p_lobby_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_lobby public.lobbies;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found or v_lobby.status not in ('WAITING', 'COUNTDOWN') then return; end if;

  -- The host leaving ends the game rather than handing off: they are the one
  -- who chose the players, and the remaining invitees never agreed to a
  -- lobby run by somebody else.
  if v_uid = v_lobby.host_id then
    perform public.cancel_challenge(v_lobby.challenge_id);
    return;
  end if;

  update public.lobby_players
     set status = 'LEFT', is_ready = false, disconnected_at = now()
   where lobby_id = p_lobby_id and user_id = v_uid;

  perform public.notify(
    v_lobby.host_id, 'CHALLENGE_DECLINED', 'Player left',
    public.display_of(v_uid) || ' left the game.', v_lobby.challenge_id, p_lobby_id
  );
  perform public.refresh_lobby_state(p_lobby_id);
end $$;
grant execute on function public.leave_lobby(uuid) to authenticated;

-- Flips the lobby to STARTED once the server-side countdown has elapsed.
-- Any player may call it and the first call wins; a client that calls early
-- is rejected, which is what keeps the start time authoritative.
create or replace function public.start_match(p_lobby_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lobby public.lobbies;
begin
  perform public.require_uid();
  if not public.is_lobby_member(p_lobby_id) then
    raise exception 'You are not in that game.' using errcode = '42501';
  end if;

  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'That game is no longer available.' using errcode = 'P0002';
  end if;

  if v_lobby.status = 'WAITING' then
    raise exception 'The game is still waiting for players.' using errcode = '22023';
  end if;

  if v_lobby.status = 'COUNTDOWN' then
    if v_lobby.start_at is null or now() < v_lobby.start_at then
      raise exception 'The countdown has not finished yet.' using errcode = '22023';
    end if;
    update public.lobbies set status = 'STARTED' where id = p_lobby_id;
    update public.challenges set status = 'STARTED', started_at = now()
     where id = v_lobby.challenge_id;
  end if;

  return public.lobby_snapshot(p_lobby_id);
end $$;
grant execute on function public.start_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  update public.notifications set is_read = true
   where user_id = v_uid and is_read = false
     and (p_ids is null or id = any(p_ids));
end $$;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
