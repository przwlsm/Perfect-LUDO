-- 0014: game variants. Apply after 0013.
--
-- Classic is the full game. Quick 1 / Quick 2 end as soon as a player has
-- 1 or 2 coins home. Kill & Go keeps a player's coins out of their home
-- path until that player has captured an opponent's coin. The rules live in
-- the board itself (goal / killToEnter / hunters), so ludo_successors keeps
-- validating every move exactly like src/domain/services/GameEngine.ts, and
-- scripts/check-online-rules.mjs compares the two for every variant.

create or replace function public.valid_variant(p_variant text) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_variant in ('classic', 'quick1', 'quick2', 'kill');
$$;

alter table public.matchmaking_queue add column if not exists variant text not null default 'classic';
alter table public.lobbies add column if not exists variant text not null default 'classic';
alter table public.matches add column if not exists variant text not null default 'classic';
do $$ begin
  alter table public.matchmaking_queue add constraint matchmaking_queue_variant_valid check (public.valid_variant(variant));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lobbies add constraint lobbies_variant_valid check (public.valid_variant(variant));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.matches add constraint matches_variant_valid check (public.valid_variant(variant));
exception when duplicate_object then null; end $$;

create or replace function public.require_variant(p_variant text) returns void
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if not public.valid_variant(coalesce(p_variant, '')) then
    raise exception 'That game mode is not available.' using errcode = '22023';
  end if;
end $$;
revoke all on function public.require_variant(text) from public, anon, authenticated;


drop function if exists public.ludo_opening(int);
create or replace function public.ludo_opening(p_count int, p_variant text default 'classic')
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE']; players jsonb := '[]'; pieces jsonb; c text; i int; j int;
begin
  if p_count is null or p_count not between 2 and 6 then raise exception 'Invalid player count'; end if;
  if p_count = 2 then colors := array['RED','YELLOW']; end if;
  for i in 1..p_count loop
    c := colors[i]; pieces := '[]';
    for j in 0..3 loop pieces := pieces || jsonb_build_array(jsonb_build_object('id',c || '-' || j,'color',c,'progress',0)); end loop;
    players := players || jsonb_build_array(jsonb_build_object('id',c,'color',c,'pieces',pieces));
  end loop;
  return jsonb_build_object('players',players,'currentPlayerIndex',0,'lastRoll',null,'consecutiveSixes',0,'status','IN_PROGRESS','winnerColor',null)
    || case coalesce(p_variant, 'classic')
         when 'quick1' then jsonb_build_object('goal', 1)
         when 'quick2' then jsonb_build_object('goal', 2)
         when 'kill' then jsonb_build_object('killToEnter', true, 'hunters', '[]'::jsonb)
         else '{}'::jsonb end;
end $$;


create or replace function public.ludo_successors(p_base jsonb, p_die int)
returns setof jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare
  colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE'];
  n int := jsonb_array_length(p_base->'players'); turn int := (p_base->>'currentPlayerIndex')::int;
  track int; finish int; sixes int; source int; target int; square int; other_progress int; other_square int;
  moving_color text; other_color text; entry_square int; i int; j int; k int; occupants int; captures int;
  blocked boolean; won boolean; found_move boolean := false; next_state jsonb; base jsonb;
  goal int; kill boolean; hunter boolean;
begin
  if p_die is null or p_die not between 1 and 6 or n not between 2 and 6
     or turn not between 0 and n-1 or p_base->>'status' <> 'IN_PROGRESS'
     or p_base->'lastRoll' is distinct from 'null'::jsonb then raise exception 'Invalid board or roll'; end if;
  track := case when n > 4 then n*13 else 52 end; finish := track+5;
  goal := coalesce((p_base->>'goal')::int, 4);
  kill := coalesce((p_base->>'killToEnter')::boolean, false);
  sixes := case when p_die=6 then (p_base->>'consecutiveSixes')::int+1 else 0 end;
  base := jsonb_set(p_base,'{consecutiveSixes}',to_jsonb(sixes));
  moving_color := p_base->'players'->turn->>'color';
  entry_square := (array_position(colors,moving_color)-1)*13;
  hunter := coalesce(p_base->'hunters', '[]'::jsonb) ? moving_color;
  if sixes < 3 then
    for i in 0..3 loop
      source := (p_base->'players'->turn->'pieces'->i->>'progress')::int;
      if source=finish or (source=0 and p_die<>6) then continue; end if;
      target := case when source=0 then 1 else source+p_die end;
      if target > finish then continue; end if;
      -- Kill & Go: the home path stays shut until this colour has captured.
      if kill and not hunter and target >= track then continue; end if;
      blocked := false; captures := 0;
      next_state := jsonb_set(base,array['players',turn::text,'pieces',i::text,'progress'],to_jsonb(target));
      if target < track then
        square := (entry_square+target-1)%track;
        for j in 0..n-1 loop
          if j=turn then continue; end if;
          other_color := p_base->'players'->j->>'color'; occupants := 0;
          for k in 0..3 loop
            other_progress := (p_base->'players'->j->'pieces'->k->>'progress')::int;
            if other_progress > 0 and other_progress < track then
              other_square := ((array_position(colors,other_color)-1)*13+other_progress-1)%track;
              if other_square=square then
                occupants := occupants+1;
                if square%13 not in (0,8) then
                  next_state := jsonb_set(next_state,array['players',j::text,'pieces',k::text,'progress'],'0');
                  captures := captures+1;
                end if;
              end if;
            end if;
          end loop;
          if occupants >= 2 then blocked := true; exit; end if;
        end loop;
      end if;
      if blocked then continue; end if;
      found_move := true;
      if kill and captures > 0 and not hunter then
        next_state := jsonb_set(next_state, '{hunters}', coalesce(p_base->'hunters', '[]'::jsonb) || to_jsonb(moving_color));
      end if;
      select count(*) filter (where (piece->>'progress')::int=finish) >= goal into won
        from jsonb_array_elements(next_state->'players'->turn->'pieces') piece;
      if won then
        next_state := next_state || jsonb_build_object('status','FINISHED','winnerColor',moving_color);
      elsif not (p_die=6 or captures>0 or target=finish) then
        next_state := next_state || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
      end if;
      return next next_state;
    end loop;
  end if;
  if not found_move then
    return next base || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
  end if;
end $$;


revoke all on function public.ludo_opening(int, text), public.ludo_successors(jsonb, int) from public, anon, authenticated;

create or replace function public.quick_match_ticket(p_ticket public.matchmaking_queue)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'status', case when p_ticket.lobby_id is null then 'WAITING' else 'MATCHED' end,
    'lobbyId', p_ticket.lobby_id,
    'playerCount', p_ticket.player_count,
    'stake', p_ticket.stake,
    'variant', p_ticket.variant,
    'waiting', (select count(*) from public.matchmaking_queue q
                 where q.player_count = p_ticket.player_count and q.stake = p_ticket.stake and q.variant = p_ticket.variant
                   and q.lobby_id is null
                   and q.last_seen > now() - interval '45 seconds'),
    'serverNow', now()
  );
$$;
revoke all on function public.quick_match_ticket(public.matchmaking_queue) from public, anon, authenticated;

drop function if exists public.join_quick_match(int, int);
create or replace function public.join_quick_match(p_player_count int default 2, p_stake int default 0, p_variant text default 'classic')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_variant text := coalesce(p_variant, 'classic');
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
  perform public.require_stake(v_uid, v_stake);
  perform public.require_variant(v_variant);

  perform public.expire_stale_challenges();

  delete from public.matchmaking_queue
   where (lobby_id is null and last_seen < now() - interval '45 seconds')
      or (lobby_id is not null and last_seen < now() - interval '10 minutes');

  insert into public.matchmaking_queue (user_id, player_count, stake, variant)
  values (v_uid, v_count, v_stake, v_variant)
  on conflict (user_id) do update
    set last_seen = now(),
        player_count = excluded.player_count,
        stake = excluded.stake,
        variant = excluded.variant,
        -- Switching table size or stake means a fresh place in that queue.
        joined_at = case when matchmaking_queue.player_count = excluded.player_count
                          and matchmaking_queue.stake = excluded.stake
                          and matchmaking_queue.variant = excluded.variant
                         then matchmaking_queue.joined_at else now() end;

  select * into v_ticket from public.matchmaking_queue where user_id = v_uid for update;
  if v_ticket.lobby_id is not null then
    return public.quick_match_ticket(v_ticket);
  end if;

  -- Seat the longest-waiting players at this size and stake who can still
  -- pay. Rows locked by a concurrent matcher are skipped, so two calls can
  -- never seat the same player twice.
  select coalesce(array_agg(t.user_id order by t.joined_at), '{}') into v_party
  from (
    select q.user_id, q.joined_at from public.matchmaking_queue q
     where q.player_count = v_count and q.stake = v_stake and q.variant = v_variant and q.lobby_id is null
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

  insert into public.lobbies (challenge_id, host_id, max_players, stake, variant)
  values (v_challenge, v_party[1], v_count, v_stake, v_variant)
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
revoke execute on function public.join_quick_match(int, int, text) from public, anon;
grant execute on function public.join_quick_match(int, int, text) to authenticated;

drop function if exists public.create_link_room(int, int);
create or replace function public.create_link_room(p_player_count int default 2, p_stake int default 0, p_variant text default 'classic')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_variant text := coalesce(p_variant, 'classic');
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
  perform public.require_stake(v_uid, v_stake);
  perform public.require_variant(v_variant);
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
  insert into public.lobbies (challenge_id, host_id, max_players, invite_code, stake, variant)
  values (v_challenge, v_uid, v_count, v_code, v_stake, v_variant)
  returning id into v_lobby;
  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_uid, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_uid, 'JOINED', true, 0, now());

  return jsonb_build_object('lobbyId', v_lobby, 'code', v_code);
end $$;
revoke execute on function public.create_link_room(int, int, text) from public, anon;
grant execute on function public.create_link_room(int, int, text) to authenticated;

create or replace function public.create_match_for_lobby(p_lobby_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_lobby public.lobbies;
  v_player uuid;
  v_coins int;
  v_amount int;
  v_pool int := 0;
begin
  select id into v_id from public.matches where lobby_id = p_lobby_id;
  if v_id is not null then return v_id; end if;

  select * into v_lobby from public.lobbies where id = p_lobby_id;
  if not found then return null; end if;

  insert into public.matches (lobby_id, player_count, stake, variant, turn_deadline)
  values (p_lobby_id, v_lobby.max_players, v_lobby.stake, v_lobby.variant,
          -- A little longer for the first turn, while everyone's board loads.
          now() + make_interval(secs => public.turn_seconds() + 10))
  on conflict (lobby_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.matches where lobby_id = p_lobby_id;
    return v_id;
  end if;

  insert into public.match_players (match_id, user_id, seat_index)
  select v_id, lp.user_id, lp.seat_index
    from public.lobby_players lp
   where lp.lobby_id = p_lobby_id and lp.status = 'JOINED'
  on conflict do nothing;

  if v_lobby.stake > 0 then
    -- Everyone was checked on the way in; someone who spent their coins
    -- during the countdown pays what they have left, and plays for the
    -- smaller pool that makes.
    for v_player in
      select mp.user_id from public.match_players mp where mp.match_id = v_id order by mp.seat_index
    loop
      select coins into v_coins from public.profiles where uid = v_player for update;
      v_amount := least(v_lobby.stake, greatest(coalesce(v_coins, 0), 0));
      update public.profiles set coins = coins - v_amount where uid = v_player;
      insert into public.match_stakes (match_id, user_id, amount) values (v_id, v_player, v_amount);
      v_pool := v_pool + v_amount;
    end loop;
    update public.matches set pool = v_pool where id = v_id;
  end if;

  return v_id;
end $$;
revoke execute on function public.create_match_for_lobby(uuid) from public, anon, authenticated;

create or replace function public.submit_match_turn(p_match_id uuid, p_version int, p_state jsonb, p_winner_seat int default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); m public.matches; seat int; base jsonb; next_seat int; winner int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  select seat_index into seat from public.match_players where match_id = p_match_id and user_id = uid;
  if seat is null then raise exception 'You are not in that match.' using errcode = '42501'; end if;
  if m.last_submit_user = uid and m.last_submit_version = p_version and m.version = p_version + 1 and m.state = p_state then
    return public.match_snapshot(p_match_id);
  end if;
  if m.status <> 'IN_PROGRESS' then raise exception 'That match has finished.' using errcode = '22023'; end if;
  if seat <> m.turn_seat then raise exception 'It is not your turn.' using errcode = '42501'; end if;
  if p_version is distinct from m.version then raise exception 'The board has changed. Refresh and try again.' using errcode = '22023'; end if;
  if m.last_roll is null then raise exception 'Roll the dice before moving.' using errcode = '22023'; end if;
  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant));
  if not exists (select 1 from public.ludo_successors(base, m.last_roll) expected where expected = p_state) then
    raise exception 'That move is not legal for the current roll.' using errcode = '22023';
  end if;
  next_seat := (p_state ->> 'currentPlayerIndex')::int;
  if p_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  if p_winner_seat is distinct from winner then raise exception 'The result does not match the board.' using errcode = '22023'; end if;
  update public.matches set state = p_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end,
    last_submit_version = p_version, last_submit_user = uid
   where id = p_match_id;
  update public.match_players set timeouts = 0 where match_id = p_match_id and user_id = uid;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.submit_match_turn(uuid, int, jsonb, int) from public, anon;
grant execute on function public.submit_match_turn(uuid, int, jsonb, int) to authenticated;

create or replace function public.claim_turn_timeout(p_match_id uuid, p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.require_uid();
  m public.matches;
  idle uuid;
  misses int;
  die int;
  base jsonb;
  next_state jsonb;
  next_seat int;
  winner int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = uid) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  -- Already handled, not due yet, or the board moved on: nothing to do.
  if m.status <> 'IN_PROGRESS' or m.version is distinct from p_version
     or m.turn_deadline is null or now() < m.turn_deadline then
    return public.match_snapshot(p_match_id);
  end if;

  select user_id into idle from public.match_players where match_id = p_match_id and seat_index = m.turn_seat;
  update public.match_players set timeouts = timeouts + 1
   where match_id = p_match_id and user_id = idle
  returning timeouts into misses;

  if misses >= 3 then
    update public.matches
       set status = 'ABANDONED', finished_at = now(), version = version + 1,
           abandoned_by = idle, turn_deadline = null
     where id = p_match_id;
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Game ended',
           public.display_of(idle) || ' stopped playing.', m.lobby_id
      from public.match_players mp
     where mp.match_id = p_match_id and mp.user_id <> idle;
    return public.match_snapshot(p_match_id);
  end if;

  die := coalesce(m.last_roll, public.secure_die());
  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant));
  select s into next_state from public.ludo_successors(base, die) s limit 1;
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.claim_turn_timeout(uuid, int) from public, anon;
grant execute on function public.claim_turn_timeout(uuid, int) to authenticated;

create or replace function public.match_snapshot(p_match_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'mySeat', (
      select mp.seat_index from public.match_players mp
      where mp.match_id = m.id and mp.user_id = (select auth.uid())
    ),
    'match', jsonb_build_object(
      'id', m.id,
      'lobbyId', m.lobby_id,
      'playerCount', m.player_count,
      'status', m.status,
      'state', m.state,
      'version', m.version,
      'turnSeat', m.turn_seat,
      'lastRoll', m.last_roll,
      'winnerSeat', m.winner_seat,
      'stake', m.stake,
      'pool', m.pool,
      'prize', public.stake_prize(m.pool),
      'turnDeadline', m.turn_deadline,
      'variant', m.variant
    ),
    'players', coalesce((
      select jsonb_agg(entry order by entry ->> 'seatIndex')
      from (
        select jsonb_build_object(
          'userId', mp.user_id,
          'seatIndex', mp.seat_index,
          'username', p.username,
          'displayName', p.display_name,
          'avatar', p.avatar,
          'presence', public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen),
          'lastSeen', pr.last_seen
        ) as entry
        from public.match_players mp
        join public.profiles p on p.uid = mp.user_id
        left join public.user_presence pr on pr.uid = mp.user_id
        where mp.match_id = m.id
      ) rows
    ), '[]'::jsonb)
  )
  from public.matches m
  where m.id = p_match_id and public.is_match_member(m.id);
$$;
grant execute on function public.match_snapshot(uuid) to authenticated;

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
      'variant', l.variant
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

