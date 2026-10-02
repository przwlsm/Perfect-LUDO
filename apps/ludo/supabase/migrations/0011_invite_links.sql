-- Private games by invite link. Apply after 0010.
--
-- A host opens a room for 2-4 players and gets a six-character code; anyone
-- signed in (members and guests alike) who has the code or the link takes
-- the next free seat. Everything after that -- ready-up, countdown, the
-- authoritative match -- is the same room machinery friend challenges and
-- quick play already use. The code is the only key: it is random, short
-- lived (the room expires after 30 minutes of waiting), and only readable
-- by people already seated in the room.

do $$ begin
  alter table public.challenges drop constraint if exists challenges_kind;
  alter table public.challenges add constraint challenges_kind
    check (kind in ('FRIENDS', 'QUICK', 'LINK'));
end $$;

alter table public.lobbies add column if not exists invite_code text;
do $$ begin
  alter table public.lobbies add constraint lobbies_invite_code_format
    check (invite_code is null or invite_code ~ '^[A-HJ-NP-Z2-9]{6}$');
exception when duplicate_object then null; end $$;
create unique index if not exists lobbies_invite_code_key on public.lobbies (invite_code)
  where invite_code is not null;

-- Six characters from a 32-symbol alphabet with no look-alikes (no 0/O,
-- 1/I): easy to read aloud, about a billion combinations.
create or replace function public.new_invite_code() returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.lobbies where invite_code = v_code);
  end loop;
  return v_code;
end $$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

-- Link rooms that nobody filled within 30 minutes close on their own.
create or replace function public.expire_stale_link_rooms()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stale uuid[];
begin
  select coalesce(array_agg(c.id), '{}') into v_stale
  from public.challenges c
  join public.lobbies l on l.id = c.lobby_id
  where c.kind = 'LINK' and l.status in ('WAITING', 'COUNTDOWN') and c.expires_at < now();
  if array_length(v_stale, 1) is not null then
    update public.lobbies set status = 'CANCELLED', start_at = null where challenge_id = any(v_stale);
    update public.challenges set status = 'EXPIRED' where id = any(v_stale);
  end if;
end $$;
revoke all on function public.expire_stale_link_rooms() from public, anon, authenticated;

create or replace function public.create_link_room(p_player_count int default 2)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_challenge uuid;
  v_lobby uuid;
  v_code text;
begin
  if v_count not between 2 and 4 then
    raise exception 'A private game seats 2 to 4 players.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  perform public.expire_stale_challenges();
  perform public.expire_stale_link_rooms();

  -- One open link room per host: a new one replaces the old.
  update public.lobbies l set status = 'CANCELLED', start_at = null
    from public.challenges c
   where c.id = l.challenge_id and c.kind = 'LINK' and l.host_id = v_uid
     and l.status in ('WAITING', 'COUNTDOWN');
  update public.challenges set status = 'CANCELLED'
   where kind = 'LINK' and creator_id = v_uid and status = 'IN_LOBBY';

  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_uid, v_count, 'IN_LOBBY', 'LINK', now() + interval '30 minutes')
  returning id into v_challenge;

  v_code := public.new_invite_code();
  insert into public.lobbies (challenge_id, host_id, max_players, invite_code)
  values (v_challenge, v_uid, v_count, v_code)
  returning id into v_lobby;
  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_uid, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_uid, 'JOINED', true, 0, now());

  return jsonb_build_object('lobbyId', v_lobby, 'code', v_code);
end $$;
revoke execute on function public.create_link_room(int) from public, anon;
grant execute on function public.create_link_room(int) to authenticated;

create or replace function public.join_link_room(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_lobby public.lobbies;
  v_joined int;
  v_seat int;
  v_auto boolean;
begin
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'That invite code does not look right. It is six letters and numbers.'
      using errcode = '22023';
  end if;
  perform public.expire_stale_challenges();
  perform public.expire_stale_link_rooms();

  select l.* into v_lobby from public.lobbies l
    join public.challenges c on c.id = l.challenge_id
   where l.invite_code = v_code and c.kind = 'LINK'
   for update of l;
  if not found then
    raise exception 'No game found for that code. Ask for a new link.' using errcode = 'P0002';
  end if;
  if v_lobby.status not in ('WAITING', 'COUNTDOWN') then
    raise exception 'That game has already started or was closed.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;

  -- Already seated (or coming back after leaving): just take the seat again.
  if exists (select 1 from public.lobby_players where lobby_id = v_lobby.id and user_id = v_uid) then
    select count(*) into v_joined from public.lobby_players
     where lobby_id = v_lobby.id and status = 'JOINED' and user_id <> v_uid;
    if v_joined >= v_lobby.max_players then
      raise exception 'That game is full.' using errcode = '22023';
    end if;
    update public.lobby_players
       set status = 'JOINED', disconnected_at = null, joined_at = coalesce(joined_at, now())
     where lobby_id = v_lobby.id and user_id = v_uid;
    perform public.refresh_lobby_state(v_lobby.id);
    return jsonb_build_object('lobbyId', v_lobby.id);
  end if;

  select count(*) into v_joined from public.lobby_players
   where lobby_id = v_lobby.id and status = 'JOINED';
  if v_joined >= v_lobby.max_players then
    raise exception 'That game is full.' using errcode = '22023';
  end if;

  -- A seat nobody is in; a seat whose player left is free again.
  select s into v_seat from generate_series(0, v_lobby.max_players - 1) s
   where not exists (
     select 1 from public.lobby_players lp
      where lp.lobby_id = v_lobby.id and lp.seat_index = s and lp.status = 'JOINED'
   )
   order by s limit 1;
  delete from public.lobby_players
   where lobby_id = v_lobby.id and seat_index = v_seat and status <> 'JOINED';

  select auto_ready into v_auto from public.social_settings where id;
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_lobby.challenge_id, v_uid, 'ACCEPTED', now(), now())
  on conflict do nothing;
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby.id, v_uid, 'JOINED', coalesce(v_auto, false), v_seat, now());

  perform public.notify(
    v_lobby.host_id, 'CHALLENGE_ACCEPTED', 'Player joined',
    public.display_of(v_uid) || ' joined your game.', v_lobby.challenge_id, v_lobby.id
  );
  perform public.refresh_lobby_state(v_lobby.id);
  return jsonb_build_object('lobbyId', v_lobby.id);
end $$;
revoke execute on function public.join_link_room(text) from public, anon;
grant execute on function public.join_link_room(text) to authenticated;


-- The snapshot now carries the invite code, for the host to share again.
-- Only room members can read a snapshot at all (is_lobby_member below).
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
      'createdAt', l.created_at,
      'inviteCode', l.invite_code
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
