-- Guest sessions, public user IDs, username availability and quick play.
-- Apply after 0005. Requires "Allow anonymous sign-ins" to be enabled under
-- Authentication > Sign In / Providers for guest mode to work.
--
-- Guests are Supabase anonymous users. Their JWT carries is_anonymous=true,
-- and auth.users.is_anonymous mirrors it. Everything a guest may do is
-- decided here, server-side; the client only hides what would be refused.
-- A guest who signs up keeps the same uid, so their match rows follow them.

-- ---------------------------------------------------------------------------
-- Public user ID and guest flag
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists public_id text;
alter table public.profiles add column if not exists is_guest boolean not null default false;

do $$ begin
  alter table public.profiles add constraint profiles_public_id_format
    check (public_id is null or public_id ~ '^[1-9][0-9]{7}$');
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_public_id_key on public.profiles (public_id);
create index if not exists profiles_guest on public.profiles (is_guest) where is_guest;

-- Eight digits, never reused, unrelated to the auth uuid or to sign-up order.
create or replace function public.new_public_id() returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v text;
begin
  loop
    v := (10000000 + (('x' || substr(gen_random_uuid()::text, 1, 8))::bit(32)::bigint % 90000000))::text;
    exit when not exists (select 1 from public.profiles p where p.public_id = v);
  end loop;
  return v;
end $$;
revoke all on function public.new_public_id() from public, anon, authenticated;

-- One row at a time so each id is checked against the ones issued before it.
do $$
declare r record;
begin
  for r in select uid from public.profiles where public_id is null and not is_guest loop
    update public.profiles set public_id = public.new_public_id() where uid = r.uid;
  end loop;
end $$;

create or replace function public.identity_json(p public.profiles) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', p.uid, 'username', p.username, 'displayName', p.display_name,
    'avatar', p.avatar, 'publicId', p.public_id, 'isGuest', p.is_guest
  );
$$;

-- ---------------------------------------------------------------------------
-- Guest gate
-- ---------------------------------------------------------------------------

create or replace function public.is_guest_session() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- Friends, challenges and usernames are account features. The message is
-- shown to the player as-is, so it says what to do rather than what failed.
create or replace function public.require_member_uid() returns uuid
language plpgsql stable as $$
declare v uuid := public.require_uid();
begin
  if public.is_guest_session() then
    raise exception 'Create an account to use this feature.' using errcode = '42501';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create or replace function public.ensure_social_identity(p_display_name text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_email text;
  v_guest boolean;
  v_wanted text;
  v_base text;
  v_candidate text;
  v_n int := 0;
  v_row public.profiles;
begin
  select u.email, coalesce(u.is_anonymous, false), u.raw_user_meta_data ->> 'username'
    into v_email, v_guest, v_wanted
    from auth.users u where u.id = v_uid;
  v_guest := coalesce(v_guest, false);

  insert into public.profiles (uid, display_name, is_guest)
  values (v_uid, nullif(trim(coalesce(p_display_name, '')), ''), v_guest)
  on conflict (uid) do nothing;

  insert into public.user_presence (uid) values (v_uid) on conflict (uid) do nothing;

  select * into v_row from public.profiles where uid = v_uid;

  -- A guest who just created an account keeps their uid and match history;
  -- the temporary handle is replaced by a real one below.
  if v_row.is_guest and not v_guest then
    update public.profiles set is_guest = false, username = null
     where uid = v_uid returning * into v_row;
  end if;

  if v_row.username is null then
    if v_guest then
      loop
        v_candidate := 'guest_' || lpad(
          ((('x' || substr(gen_random_uuid()::text, 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
        exit when not exists (select 1 from public.profiles p where p.username = v_candidate);
      end loop;
    else
      -- Preference order: the name chosen at sign-up, then the email local part.
      v_base := regexp_replace(lower(coalesce(v_wanted, '')), '[^a-z0-9_]', '', 'g');
      if char_length(v_base) < 3 or v_base like 'guest\_%' then
        v_base := regexp_replace(lower(split_part(coalesce(v_email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
      end if;
      if char_length(v_base) < 3 or v_base like 'guest\_%' then v_base := 'player'; end if;
      v_base := left(v_base, 12);
      v_candidate := v_base;
      while exists (select 1 from public.profiles p where p.username = v_candidate) loop
        v_n := v_n + 1;
        v_candidate := v_base || v_n::text;
      end loop;
    end if;
    update public.profiles set username = v_candidate where uid = v_uid returning * into v_row;
  end if;

  -- Guests get no permanent public ID; it is issued when the account is.
  if v_row.public_id is null and not v_guest then
    update public.profiles set public_id = public.new_public_id()
     where uid = v_uid returning * into v_row;
  end if;

  return public.identity_json(v_row);
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
    -- Guests may pick an avatar but keep their temporary handle.
    perform public.require_member_uid();
    if v_name !~ '^[a-z0-9_]{3,16}$' then
      raise exception 'Usernames use 3-16 letters, numbers or underscores.' using errcode = '22023';
    end if;
    if v_name like 'guest\_%' then
      raise exception 'Names starting with guest_ are reserved.' using errcode = '22023';
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
  return public.identity_json(v_row);
end $$;
grant execute on function public.update_social_identity(text, text) to authenticated;

-- Live feedback while typing a username. Usernames are public handles, so
-- confirming one exists reveals nothing that search does not already.
create or replace function public.check_username_available(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_name text := lower(trim(coalesce(p_username, '')));
  v_uid uuid := (select auth.uid());
begin
  if v_name !~ '^[a-z0-9_]{3,16}$' then
    return jsonb_build_object('available', false, 'reason', 'Use 3-16 letters, numbers or underscores.');
  end if;
  if v_name like 'guest\_%' then
    return jsonb_build_object('available', false, 'reason', 'Names starting with guest_ are reserved.');
  end if;
  if exists (select 1 from public.profiles p where p.username = v_name and (v_uid is null or p.uid <> v_uid)) then
    return jsonb_build_object('available', false, 'reason', 'That username is already taken.');
  end if;
  return jsonb_build_object('available', true, 'reason', null);
end $$;
grant execute on function public.check_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Discovery: public_id joins username as a search key. Guests are neither
-- searchable nor addable, and cannot search.
-- ---------------------------------------------------------------------------

drop function if exists public.search_users(text, int);
create function public.search_users(p_query text, p_limit int default 20)
returns table (
  id uuid, username text, display_name text, avatar text, public_id text,
  presence public.presence_status, last_seen timestamptz, relationship text
) language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select public.require_member_uid() as uid),
  q as (select lower(trim(coalesce(p_query, ''))) as term)
  select
    p.uid, p.username, p.display_name, p.avatar, p.public_id,
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
    and not p.is_guest
    and char_length(q.term) >= 2
    and (p.username like q.term || '%' or p.public_id = q.term or p.uid::text = q.term)
  order by (p.username = q.term or p.public_id = q.term) desc, p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
revoke execute on function public.search_users(text, int) from public, anon;
grant execute on function public.search_users(text, int) to authenticated;

drop function if exists public.list_friends();
create function public.list_friends()
returns table (
  id uuid, username text, display_name text, avatar text, public_id text,
  presence public.presence_status, last_seen timestamptz, friends_since timestamptz
) language sql stable security definer set search_path = public, pg_temp as $$
  select
    p.uid, p.username, p.display_name, p.avatar, p.public_id,
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
revoke execute on function public.list_friends() from public, anon;
grant execute on function public.list_friends() to authenticated;

drop function if exists public.list_friend_requests(text);
create function public.list_friend_requests(p_direction text default 'incoming')
returns table (
  id uuid, user_id uuid, username text, display_name text, avatar text, public_id text,
  presence public.presence_status, last_seen timestamptz, created_at timestamptz
) language sql stable security definer set search_path = public, pg_temp as $$
  select
    r.id,
    p.uid, p.username, p.display_name, p.avatar, p.public_id,
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
revoke execute on function public.list_friend_requests(text) from public, anon;
grant execute on function public.list_friend_requests(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Friendship: members only, on both ends
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
  v_reverse public.friend_requests;
  v_id uuid;
begin
  if p_target is null or p_target = v_uid then
    raise exception 'You cannot add yourself.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.uid = p_target and not p.is_guest) then
    raise exception 'That player could not be found.' using errcode = 'P0002';
  end if;
  if public.are_friends(v_uid, p_target) then
    raise exception 'You are already friends.' using errcode = '23505';
  end if;

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

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
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

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_member_uid();
begin
  update public.friend_requests
     set status = 'CANCELLED', responded_at = now()
   where id = p_request_id and sender_id = v_uid and status = 'PENDING';
  if not found then
    raise exception 'That request is no longer pending.' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_member_uid();
begin
  delete from public.friendships
   where (user_id = v_uid and friend_id = p_friend_id)
      or (user_id = p_friend_id and friend_id = v_uid);
  update public.friend_requests
     set status = 'CANCELLED', responded_at = now()
   where status = 'PENDING'
     and ((sender_id = v_uid and receiver_id = p_friend_id)
       or (sender_id = p_friend_id and receiver_id = v_uid));
end $$;

-- ---------------------------------------------------------------------------
-- Challenge kinds: friend challenges versus quick-play tables
-- ---------------------------------------------------------------------------

alter table public.challenges add column if not exists kind text not null default 'FRIENDS';
do $$ begin
  alter table public.challenges add constraint challenges_kind check (kind in ('FRIENDS', 'QUICK'));
exception when duplicate_object then null; end $$;

create or replace function public.create_challenge(p_friend_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
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

  -- A quick-play table someone walked away from must not block friend games.
  if exists (
    select 1 from public.challenges c
    where c.creator_id = v_uid and c.status in ('PENDING', 'IN_LOBBY') and c.kind = 'FRIENDS'
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

-- The snapshot names the kind so the client can route "back" sensibly.
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
      'kind', c.kind,
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

-- Strangers do not wait for someone who walked away: a quick-play table
-- breaks up when anyone leaves, and everyone else is sent back to the queue.
create or replace function public.leave_lobby(p_lobby_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_lobby public.lobbies;
  v_kind text;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found or v_lobby.status not in ('WAITING', 'COUNTDOWN') then return; end if;

  if v_uid = v_lobby.host_id then
    perform public.cancel_challenge(v_lobby.challenge_id);
    return;
  end if;

  update public.lobby_players
     set status = 'LEFT', is_ready = false, disconnected_at = now()
   where lobby_id = p_lobby_id and user_id = v_uid;

  select kind into v_kind from public.challenges where id = v_lobby.challenge_id;
  if v_kind = 'QUICK' then
    update public.challenges set status = 'CANCELLED' where id = v_lobby.challenge_id;
    update public.lobbies set status = 'CANCELLED', start_at = null where id = p_lobby_id;
    insert into public.notifications (user_id, type, title, message, related_challenge_id, related_lobby_id)
    select lp.user_id, 'CHALLENGE_CANCELLED', 'Match cancelled',
           public.display_of(v_uid) || ' left before the game started.', v_lobby.challenge_id, p_lobby_id
      from public.lobby_players lp
     where lp.lobby_id = p_lobby_id and lp.user_id <> v_uid;
    return;
  end if;

  perform public.notify(
    v_lobby.host_id, 'CHALLENGE_DECLINED', 'Player left',
    public.display_of(v_uid) || ' left the game.', v_lobby.challenge_id, p_lobby_id
  );
  perform public.refresh_lobby_state(p_lobby_id);
end $$;

-- Quick-play tables that never started are dropped after five minutes, so an
-- abandoned countdown cannot pin seats or notifications forever.
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

  if array_length(v_stale, 1) is not null then
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
  end if;

  select coalesce(array_agg(c.id), '{}') into v_stale
  from public.challenges c
  join public.lobbies l on l.id = c.lobby_id
  where c.kind = 'QUICK' and l.status in ('WAITING', 'COUNTDOWN')
    and l.created_at < now() - interval '5 minutes';

  if array_length(v_stale, 1) is not null then
    update public.lobbies set status = 'CANCELLED', start_at = null
     where challenge_id = any(v_stale);
    update public.challenges set status = 'CANCELLED' where id = any(v_stale);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Quick play
--
-- One ticket per player. The client re-sends join_quick_match every few
-- seconds as a heartbeat; a ticket that stops beating is dropped, so a
-- closed app never leaves a phantom opponent in the queue. Whoever's call
-- completes a table seats it, so no scheduler is needed.
-- ---------------------------------------------------------------------------

create table if not exists public.matchmaking_queue (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  player_count int  not null check (player_count between 2 and 4),
  joined_at    timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  lobby_id     uuid references public.lobbies (id) on delete set null
);
create index if not exists matchmaking_queue_open
  on public.matchmaking_queue (player_count, joined_at) where lobby_id is null;

alter table public.matchmaking_queue enable row level security;

drop policy if exists "read own ticket" on public.matchmaking_queue;
create policy "read own ticket" on public.matchmaking_queue for select
  to authenticated using (user_id = (select auth.uid()));

do $$
begin
  execute 'alter publication supabase_realtime add table public.matchmaking_queue';
exception
  when duplicate_object or undefined_object then null;
end $$;

create or replace function public.quick_match_ticket(p_ticket public.matchmaking_queue)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'status', case when p_ticket.lobby_id is null then 'WAITING' else 'MATCHED' end,
    'lobbyId', p_ticket.lobby_id,
    'playerCount', p_ticket.player_count,
    'waiting', (select count(*) from public.matchmaking_queue q
                 where q.player_count = p_ticket.player_count and q.lobby_id is null
                   and q.last_seen > now() - interval '45 seconds'),
    'serverNow', now()
  );
$$;
revoke all on function public.quick_match_ticket(public.matchmaking_queue) from public, anon, authenticated;

create or replace function public.join_quick_match(p_player_count int default 2)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_ticket public.matchmaking_queue;
  v_party uuid[];
  v_member uuid;
  v_timeout int;
  v_countdown int;
  v_challenge uuid;
  v_lobby uuid;
  v_seat int := 0;
begin
  if v_count not between 2 and 4 then
    raise exception 'Quick play seats 2 to 4 players.' using errcode = '22023';
  end if;

  perform public.expire_stale_challenges();

  delete from public.matchmaking_queue
   where (lobby_id is null and last_seen < now() - interval '45 seconds')
      or (lobby_id is not null and last_seen < now() - interval '10 minutes');

  insert into public.matchmaking_queue (user_id, player_count)
  values (v_uid, v_count)
  on conflict (user_id) do update
    set last_seen = now(),
        player_count = excluded.player_count,
        -- Switching table size means a fresh place in that queue.
        joined_at = case when matchmaking_queue.player_count = excluded.player_count
                         then matchmaking_queue.joined_at else now() end;

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid for update;
  if v_ticket.lobby_id is not null then
    return public.quick_match_ticket(v_ticket);
  end if;

  -- Seat the longest-waiting players. Rows locked by a concurrent matcher
  -- are skipped, so two calls can never seat the same player twice.
  select coalesce(array_agg(t.user_id order by t.joined_at), '{}') into v_party
  from (
    select q.user_id, q.joined_at from public.matchmaking_queue q
     where q.player_count = v_count and q.lobby_id is null
       and q.last_seen > now() - interval '45 seconds'
     order by q.joined_at
     limit v_count
     for update skip locked
  ) t;

  if coalesce(array_length(v_party, 1), 0) < v_count then
    return public.quick_match_ticket(v_ticket);
  end if;

  select challenge_timeout_seconds, countdown_seconds into v_timeout, v_countdown
    from public.social_settings where id;

  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_party[1], v_count, 'IN_LOBBY', 'QUICK', now() + make_interval(secs => v_timeout))
  returning id into v_challenge;

  insert into public.lobbies (challenge_id, host_id, max_players)
  values (v_challenge, v_party[1], v_count)
  returning id into v_lobby;

  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  foreach v_member in array v_party loop
    insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
    values (v_challenge, v_member, 'ACCEPTED', now(), now());
    insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
    values (v_lobby, v_member, 'JOINED', true, v_seat, now());
    v_seat := v_seat + 1;
  end loop;

  update public.matchmaking_queue set lobby_id = v_lobby, last_seen = now()
   where user_id = any(v_party);

  -- Starts the countdown and notifies every seat.
  perform public.refresh_lobby_state(v_lobby);
  -- The others learn about the table over the network, so the countdown is
  -- a little longer than a friend lobby's to let everyone arrive.
  update public.lobbies set start_at = now() + make_interval(secs => greatest(v_countdown, 5))
   where id = v_lobby and status = 'COUNTDOWN';

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid;
  return public.quick_match_ticket(v_ticket);
end $$;
revoke execute on function public.join_quick_match(int) from public, anon;
grant execute on function public.join_quick_match(int) to authenticated;

create or replace function public.leave_quick_match()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  delete from public.matchmaking_queue where user_id = v_uid;
end $$;
revoke execute on function public.leave_quick_match() from public, anon;
grant execute on function public.leave_quick_match() to authenticated;

-- ---------------------------------------------------------------------------
-- Guest retention
--
-- Supabase does not delete anonymous users on its own. Run this from the SQL
-- editor (or a pg_cron job) to drop guests idle for a month; their profile,
-- presence, tickets and match seats cascade with the auth row:
--
--   delete from auth.users
--    where is_anonymous is true and created_at < now() - interval '30 days';
-- ---------------------------------------------------------------------------
