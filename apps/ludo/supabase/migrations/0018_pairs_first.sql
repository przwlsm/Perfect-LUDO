-- 0018: friends' teams meet friends' teams first. Apply after 0017.
--
-- Two ways to play 2 v 2 online:
--   Random 2 v 2 - four strangers from the 2 v 2 quick-play queue.
--   Team up      - two friends in a room search together (seek_opponents).
-- A searching pair is matched with another searching pair straight away.
-- Strangers from the random queue may only fill a pair's open side once the
-- pair has searched for 20 seconds without finding another pair, so teams of
-- friends play teams of friends whenever there are any, and nobody waits
-- forever when there are not.

alter table public.lobbies add column if not exists seeking_since timestamptz;

create or replace function public.pair_wait_seconds() returns int
language sql immutable set search_path = public, pg_temp as $$ select 20 $$;


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
    update public.lobbies set seeking = false, seeking_since = null where id = p_lobby_id;
    return public.lobby_snapshot(p_lobby_id);
  end if;

  -- Your side is complete (seats 0 and 2) and the other side is empty.
  if (select count(*) from public.lobby_players
       where lobby_id = p_lobby_id and status = 'JOINED' and seat_index in (0, 2)) <> 2
     or exists (select 1 from public.lobby_players
       where lobby_id = p_lobby_id and status = 'JOINED' and seat_index in (1, 3)) then
    raise exception 'Seat your partner opposite you first, with the other side empty.' using errcode = '22023';
  end if;
  update public.lobbies set seeking = true, seeking_since = now() where id = p_lobby_id;

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

  -- No other pair yet: keep searching. Strangers may fill the other side
  -- after pair_wait_seconds (see join_quick_match).
  return public.lobby_snapshot(p_lobby_id);
end $$;
revoke execute on function public.seek_opponents(uuid, boolean) from public, anon;
grant execute on function public.seek_opponents(uuid, boolean) to authenticated;

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
       -- A pair gets first chance to meet another pair.
       and l.seeking_since < now() - make_interval(secs => public.pair_wait_seconds())
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
      'movedTo', l.moved_to,
      'seekingSince', l.seeking_since
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




