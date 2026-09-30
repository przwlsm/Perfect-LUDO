-- 0017: team parties for 2 v 2. Apply after 0016.
--
-- Choosing your partner: in a 2 v 2 invite room the host and the first
-- friend to join sit opposite each other, as partners (seats 0 and 2); the
-- next two take seats 1 and 3. While the room is waiting, anyone can move to
-- an empty seat (move_lobby_seat) to change sides.
--
-- Team up, then find opponents: once the host's pair is seated, the host can
-- open the room to 2 v 2 quick play (seek_opponents). Strangers searching for
-- 2 v 2 at the same stake and mode fill the other side; if another pair is
-- already searching the same way, the two pairs are put together at the older
-- table and the newer room points its players there (moved_to).

alter table public.lobbies add column if not exists seeking boolean not null default false;
alter table public.lobbies add column if not exists moved_to uuid references public.lobbies (id) on delete set null;

-- First seat in `p_order` nobody is sitting in.
create or replace function public.free_seat(p_lobby_id uuid, p_order int[]) returns int
language sql stable set search_path = public, pg_temp as $$
  select s from unnest(p_order) with ordinality as t(s, o)
   where not exists (
     select 1 from public.lobby_players lp
      where lp.lobby_id = p_lobby_id and lp.seat_index = t.s and lp.status = 'JOINED'
   )
   order by t.o limit 1;
$$;
revoke all on function public.free_seat(uuid, int[]) from public, anon, authenticated;

-- Puts a player in a seat, ready, as if they had accepted an invitation.
create or replace function public.seat_player(p_lobby public.lobbies, p_uid uuid, p_seat int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.lobby_players
   where lobby_id = p_lobby.id and (seat_index = p_seat or user_id = p_uid) and status <> 'JOINED';
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (p_lobby.challenge_id, p_uid, 'ACCEPTED', now(), now())
  on conflict do nothing;
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (p_lobby.id, p_uid, 'JOINED', true, p_seat, now());
end $$;
revoke all on function public.seat_player(public.lobbies, uuid, int) from public, anon, authenticated;

-- Fills the open side of a seeking 2 v 2 room from the quick-play queue.
create or replace function public.fill_team_room(p_lobby_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_lobby public.lobbies;
  v_seat int;
  v_ticket record;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found or not v_lobby.seeking or v_lobby.status <> 'WAITING' then return; end if;
  for v_ticket in
    select q.user_id from public.matchmaking_queue q
     where q.teams and q.player_count = 4 and q.stake = v_lobby.stake and q.variant = v_lobby.variant
       and q.lobby_id is null and q.last_seen > now() - interval '45 seconds'
       and not exists (select 1 from public.lobby_players lp where lp.lobby_id = p_lobby_id and lp.user_id = q.user_id)
       and (v_lobby.stake = 0 or exists (
         select 1 from public.profiles p where p.uid = q.user_id and p.coins >= v_lobby.stake))
     order by q.joined_at
     for update of q skip locked
  loop
    v_seat := public.free_seat(p_lobby_id, array[1, 3]);
    exit when v_seat is null;
    perform public.seat_player(v_lobby, v_ticket.user_id, v_seat);
    update public.matchmaking_queue set lobby_id = p_lobby_id, last_seen = now() where user_id = v_ticket.user_id;
  end loop;
  if public.free_seat(p_lobby_id, array[1, 3]) is null then
    update public.lobbies set seeking = false where id = p_lobby_id;
  end if;
  perform public.refresh_lobby_state(p_lobby_id);
end $$;
revoke all on function public.fill_team_room(uuid) from public, anon, authenticated;

create or replace function public.move_lobby_seat(p_lobby_id uuid, p_seat int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_lobby public.lobbies;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then raise exception 'That game is no longer available.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.lobby_players where lobby_id = p_lobby_id and user_id = v_uid and status = 'JOINED') then
    raise exception 'You are not in that game.' using errcode = '42501';
  end if;
  if v_lobby.status <> 'WAITING' then raise exception 'Seats are fixed once the countdown starts.' using errcode = '22023'; end if;
  if v_lobby.seeking then raise exception 'Stop searching for opponents before changing seats.' using errcode = '22023'; end if;
  if p_seat is null or p_seat < 0 or p_seat >= v_lobby.max_players then
    raise exception 'That seat does not exist.' using errcode = '22023';
  end if;
  if exists (select 1 from public.lobby_players where lobby_id = p_lobby_id and seat_index = p_seat and status = 'JOINED') then
    raise exception 'Someone is already sitting there.' using errcode = '22023';
  end if;
  delete from public.lobby_players where lobby_id = p_lobby_id and seat_index = p_seat and status <> 'JOINED';
  update public.lobby_players set seat_index = p_seat where lobby_id = p_lobby_id and user_id = v_uid;
  return public.lobby_snapshot(p_lobby_id);
end $$;
revoke execute on function public.move_lobby_seat(uuid, int) from public, anon;
grant execute on function public.move_lobby_seat(uuid, int) to authenticated;

create or replace function public.seek_opponents(p_lobby_id uuid, p_on boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_lobby public.lobbies;
  v_kind text;
  v_other public.lobbies;
  v_mate uuid;
  v_seat int;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then raise exception 'That game is no longer available.' using errcode = 'P0002'; end if;
  if v_lobby.host_id <> v_uid then raise exception 'Only the host can search for opponents.' using errcode = '42501'; end if;
  select kind into v_kind from public.challenges where id = v_lobby.challenge_id;
  if not v_lobby.teams or v_kind <> 'LINK' then
    raise exception 'Only 2 v 2 invite rooms can search for opponents.' using errcode = '22023';
  end if;
  if v_lobby.status <> 'WAITING' then raise exception 'The game is already starting.' using errcode = '22023'; end if;

  if not coalesce(p_on, true) then
    update public.lobbies set seeking = false where id = p_lobby_id;
    return public.lobby_snapshot(p_lobby_id);
  end if;

  -- Your side is complete (seats 0 and 2) and the other side is empty.
  if (select count(*) from public.lobby_players
       where lobby_id = p_lobby_id and status = 'JOINED' and seat_index in (0, 2)) <> 2
     or exists (select 1 from public.lobby_players
       where lobby_id = p_lobby_id and status = 'JOINED' and seat_index in (1, 3)) then
    raise exception 'Seat your partner opposite you first, with the other side empty.' using errcode = '22023';
  end if;
  update public.lobbies set seeking = true where id = p_lobby_id;

  -- Another pair already searching the same way: play them, at their table.
  select l.* into v_other from public.lobbies l
    join public.challenges c on c.id = l.challenge_id
   where l.id <> p_lobby_id and l.seeking and l.status = 'WAITING' and l.teams and c.kind = 'LINK'
     and l.stake = v_lobby.stake and l.variant = v_lobby.variant
     and public.free_seat(l.id, array[1, 3]) = 1
     and public.free_seat(l.id, array[3]) = 3
   order by l.created_at
   limit 1
   for update of l skip locked;
  if found then
    for v_mate, v_seat in
      select lp.user_id, case lp.seat_index when 0 then 1 else 3 end
        from public.lobby_players lp
       where lp.lobby_id = p_lobby_id and lp.status = 'JOINED'
    loop
      perform public.require_stake(v_mate, v_other.stake);
      perform public.seat_player(v_other, v_mate, v_seat);
    end loop;
    update public.lobby_players set status = 'LEFT' where lobby_id = p_lobby_id and status = 'JOINED';
    update public.lobbies set seeking = false, status = 'CANCELLED', start_at = null, moved_to = v_other.id
     where id = p_lobby_id;
    update public.challenges set status = 'CANCELLED' where id = v_lobby.challenge_id;
    update public.lobbies set seeking = false where id = v_other.id;
    perform public.refresh_lobby_state(v_other.id);
    return public.lobby_snapshot(p_lobby_id);
  end if;

  -- Otherwise strangers searching for 2 v 2 fill the other side.
  perform public.fill_team_room(p_lobby_id);
  return public.lobby_snapshot(p_lobby_id);
end $$;
revoke execute on function public.seek_opponents(uuid, boolean) from public, anon;
grant execute on function public.seek_opponents(uuid, boolean) to authenticated;


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
  perform public.require_stake(v_uid, v_lobby.stake);

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

  -- In 2 v 2 the first friend sits opposite the host, as their partner.
  v_seat := public.free_seat(
    v_lobby.id,
    case when v_lobby.teams and v_lobby.max_players = 4 then array[0, 2, 1, 3]
         else array(select generate_series(0, v_lobby.max_players - 1)) end
  );
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

create or replace function public.join_quick_match(p_player_count int default 2, p_stake int default 0, p_variant text default 'classic', p_teams boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_variant text := coalesce(p_variant, 'classic');
  v_teams boolean := coalesce(p_teams, false);
  v_ticket public.matchmaking_queue;
  v_party uuid[];
  v_member uuid;
  v_timeout int;
  v_countdown int;
  v_challenge uuid;
  v_lobby uuid;
  v_seat int := 0;
  v_team_room public.lobbies;
begin
  if v_count not between 2 and 4 then
    raise exception 'Quick play seats 2 to 4 players.' using errcode = '22023';
  end if;
  perform public.require_stake(v_uid, v_stake);
  perform public.require_variant(v_variant);
  perform public.require_teams(v_teams, v_count);

  perform public.expire_stale_challenges();

  delete from public.matchmaking_queue
   where (lobby_id is null and last_seen < now() - interval '45 seconds')
      or (lobby_id is not null and last_seen < now() - interval '10 minutes');

  insert into public.matchmaking_queue (user_id, player_count, stake, variant, teams)
  values (v_uid, v_count, v_stake, v_variant, v_teams)
  on conflict (user_id) do update
    set last_seen = now(),
        player_count = excluded.player_count,
        stake = excluded.stake,
        variant = excluded.variant,
        teams = excluded.teams,
        -- Switching table size or stake means a fresh place in that queue.
        joined_at = case when matchmaking_queue.player_count = excluded.player_count
                          and matchmaking_queue.stake = excluded.stake
                          and matchmaking_queue.variant = excluded.variant
                          and matchmaking_queue.teams = excluded.teams
                         then matchmaking_queue.joined_at else now() end;

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid for update;
  if v_ticket.lobby_id is not null then
    return public.quick_match_ticket(v_ticket);
  end if;

  if v_teams and v_count = 4 then
    select l.* into v_team_room from public.lobbies l
      join public.challenges c on c.id = l.challenge_id
     where l.seeking and l.status = 'WAITING' and l.teams and c.kind = 'LINK'
       and l.stake = v_stake and l.variant = v_variant
       and public.free_seat(l.id, array[1, 3]) is not null
       and not exists (select 1 from public.lobby_players lp where lp.lobby_id = l.id and lp.user_id = v_uid)
     order by l.created_at
     limit 1
     for update of l skip locked;
    if found then
      perform public.seat_player(v_team_room, v_uid, public.free_seat(v_team_room.id, array[1, 3]));
      update public.matchmaking_queue set lobby_id = v_team_room.id, last_seen = now() where user_id = v_uid;
      if public.free_seat(v_team_room.id, array[1, 3]) is null then
        update public.lobbies set seeking = false where id = v_team_room.id;
      end if;
      perform public.refresh_lobby_state(v_team_room.id);
      select * into v_ticket from public.matchmaking_queue where user_id = v_uid;
      return public.quick_match_ticket(v_ticket);
    end if;
  end if;

  -- Seat the longest-waiting players at this size and stake who can still
  -- pay. Rows locked by a concurrent matcher are skipped, so two calls can
  -- never seat the same player twice.
  select coalesce(array_agg(t.user_id order by t.joined_at), '{}') into v_party
  from (
    select q.user_id, q.joined_at from public.matchmaking_queue q
     where q.player_count = v_count and q.stake = v_stake and q.variant = v_variant and q.teams = v_teams and q.lobby_id is null
       and q.last_seen > now() - interval '45 seconds'
       and (v_stake = 0 or exists (
         select 1 from public.profiles p where p.uid = q.user_id and p.coins >= v_stake))
     order by q.joined_at
     limit v_count
     for update of q skip locked
  ) t;

  if coalesce(array_length(v_party, 1), 0) < v_count then
    return public.quick_match_ticket(v_ticket);
  end if;

  select challenge_timeout_seconds, countdown_seconds into v_timeout, v_countdown
    from public.social_settings where id;

  insert into public.challenges (creator_id, player_count, status, kind, expires_at)
  values (v_party[1], v_count, 'IN_LOBBY', 'QUICK', now() + make_interval(secs => v_timeout))
  returning id into v_challenge;

  insert into public.lobbies (challenge_id, host_id, max_players, stake, variant, teams)
  values (v_challenge, v_party[1], v_count, v_stake, v_variant, v_teams)
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

  perform public.refresh_lobby_state(v_lobby);
  update public.lobbies set start_at = now() + make_interval(secs => greatest(v_countdown, 5))
   where id = v_lobby and status = 'COUNTDOWN';

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid;
  return public.quick_match_ticket(v_ticket);
end $$;
revoke execute on function public.join_quick_match(int, int, text, boolean) from public, anon;
grant execute on function public.join_quick_match(int, int, text, boolean) to authenticated;

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
      'inviteCode', l.invite_code,
      'stake', l.stake,
      'variant', l.variant,
      'teams', l.teams,
      'seeking', l.seeking,
      'movedTo', l.moved_to
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



