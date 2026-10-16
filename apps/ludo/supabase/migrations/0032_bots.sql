-- 0032: computer players at online tables. Apply after 0031.
--
-- Quick play used to wait until enough real players were searching. Now,
-- after `bot_wait_seconds` on a FREE table, the empty seats are filled by
-- computer players: thirty accounts with names and countries of their own,
-- which the server plays. Real players still meet real players first; a
-- bot only steps in when nobody else arrived in time.
--
-- The rules for bot tables:
--   * free tables only (no stake is ever paid to or won from a bot);
--   * the human's coins and XP are the normal free-table rewards, but the
--     match counts for no tournament or league points;
--   * a bot's turn is played by the server (`play_bot_turn`), poked by any
--     human at the table once it is the bot's turn, so no scheduler is needed;
--   * bots never appear in player search, and nobody can sign in as one.

alter table public.profiles add column if not exists is_bot boolean not null default false;
alter table public.profiles add column if not exists country text;
do $$ begin
  alter table public.profiles add constraint profiles_country_format
    check (country is null or country ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
create index if not exists profiles_bot on public.profiles (is_bot) where is_bot;

/** How long a free-table search waits for real players before bots fill the seats. */
create or replace function public.bot_wait_seconds() returns int
language sql immutable set search_path = public, pg_temp as $$ select 60 $$;

-- ---------------------------------------------------------------------------
-- The thirty computer players. Fixed ids, so re-running this is harmless.
-- Nobody can ever sign in as one: no password, and banned forever.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_real_auth boolean := exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users' and column_name = 'aud'
  );
begin
  for r in
    select * from (values
      ('b0000000-0000-4000-8000-000000000001'::uuid, 'aarav_k',  'Aarav',  '🧢', 'IN'),
      ('b0000000-0000-4000-8000-000000000002'::uuid, 'bruno_r',  'Bruno',  '⚽', 'BR'),
      ('b0000000-0000-4000-8000-000000000003'::uuid, 'fatima_a', 'Fatima', '🌙', 'AE'),
      ('b0000000-0000-4000-8000-000000000004'::uuid, 'kenji_t',  'Kenji',  '🍣', 'JP'),
      ('b0000000-0000-4000-8000-000000000005'::uuid, 'lucia_m',  'Lucía',  '💃', 'ES'),
      ('b0000000-0000-4000-8000-000000000006'::uuid, 'amara_o',  'Amara',  '🦁', 'NG'),
      ('b0000000-0000-4000-8000-000000000007'::uuid, 'liam_w',   'Liam',   '☕', 'GB'),
      ('b0000000-0000-4000-8000-000000000008'::uuid, 'mei_l',    'Mei',    '🐼', 'CN'),
      ('b0000000-0000-4000-8000-000000000009'::uuid, 'carlos_g', 'Carlos', '🌮', 'MX'),
      ('b0000000-0000-4000-8000-000000000010'::uuid, 'zara_h',   'Zara',   '🌺', 'PK'),
      ('b0000000-0000-4000-8000-000000000011'::uuid, 'layla_s', 'Layla', '🌷', 'SA'),
      ('b0000000-0000-4000-8000-000000000012'::uuid, 'maryam_e', 'Maryam', '🕌', 'EG'),
      ('b0000000-0000-4000-8000-000000000013'::uuid, 'noor_j', 'Noor', '✨', 'JO'),
      ('b0000000-0000-4000-8000-000000000014'::uuid, 'hana_m', 'Hana', '🍊', 'MA'),
      ('b0000000-0000-4000-8000-000000000015'::uuid, 'dalia_b', 'Dalia', '🌊', 'LB'),
      ('b0000000-0000-4000-8000-000000000016'::uuid, 'salma_t', 'Salma', '🫒', 'TN'),
      ('b0000000-0000-4000-8000-000000000017'::uuid, 'aisha_k', 'Aisha', '🌙', 'KW'),
      ('b0000000-0000-4000-8000-000000000018'::uuid, 'reem_q', 'Reem', '🐪', 'QA'),
      ('b0000000-0000-4000-8000-000000000019'::uuid, 'omar_i', 'Omar', '🎯', 'IQ'),
      ('b0000000-0000-4000-8000-000000000020'::uuid, 'elif_y', 'Elif', '☕', 'TR'),
      ('b0000000-0000-4000-8000-000000000021'::uuid, 'jiwoo_p', 'Ji-woo', '🎀', 'KR'),
      ('b0000000-0000-4000-8000-000000000022'::uuid, 'nicha_s', 'Nicha', '🌸', 'TH'),
      ('b0000000-0000-4000-8000-000000000023'::uuid, 'putri_w', 'Putri', '🌴', 'ID'),
      ('b0000000-0000-4000-8000-000000000024'::uuid, 'linh_n', 'Linh', '🎋', 'VN'),
      ('b0000000-0000-4000-8000-000000000025'::uuid, 'chloe_d', 'Chloé', '🥐', 'FR'),
      ('b0000000-0000-4000-8000-000000000026'::uuid, 'lena_k', 'Lena', '🎻', 'DE'),
      ('b0000000-0000-4000-8000-000000000027'::uuid, 'giulia_r', 'Giulia', '🍝', 'IT'),
      ('b0000000-0000-4000-8000-000000000028'::uuid, 'wanjiru_k', 'Wanjiru', '🦒', 'KE'),
      ('b0000000-0000-4000-8000-000000000029'::uuid, 'mateo_c', 'Mateo', '🏄', 'PH'),
      ('b0000000-0000-4000-8000-000000000030'::uuid, 'nusrat_b', 'Nusrat', '🌼', 'BD')
    ) as b(uid, username, display_name, avatar, country)
  loop
    insert into auth.users (id, email, is_anonymous)
    values (r.uid, r.username || '@bots.ludorumble.app', false)
    on conflict (id) do nothing;
    if v_real_auth then
      -- The columns GoTrue expects on a real Supabase project (absent from
      -- the test harness). Empty strings, not nulls, keep the dashboard happy.
      execute $q$
        update auth.users set
          instance_id = '00000000-0000-0000-0000-000000000000',
          aud = 'authenticated', role = 'authenticated',
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
          raw_user_meta_data = '{"bot":true}'::jsonb,
          confirmation_token = '', recovery_token = '', email_change_token_new = '',
          email_change = '', email_change_token_current = '', phone_change = '',
          phone_change_token = '', reauthentication_token = '',
          banned_until = 'infinity', updated_at = now()
        where id = $1
      $q$ using r.uid;
    end if;
    insert into public.profiles (uid, username, display_name, avatar, is_guest, is_bot, country, public_id, coins)
    values (r.uid, r.username, r.display_name, r.avatar, false, true, r.country, public.new_public_id(), 0)
    on conflict (uid) do update set
      username = excluded.username, display_name = excluded.display_name,
      avatar = excluded.avatar, is_bot = true, country = excluded.country;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- How a bot plays: every legal move is scored and the best one taken.
-- Scored from the mover's side (partner included in 2 v 2): own progress
-- counts up, rivals' counts down (so a capture is worth the distance the
-- victim loses), with extra for leaving the yard, reaching home and winning.
-- A pinch of randomness keeps two bots from mirroring each other.
-- ---------------------------------------------------------------------------
create or replace function public.bot_choose(p_base jsonb, p_die int) returns jsonb
language plpgsql volatile set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_base -> 'players');
  turn int := (p_base ->> 'currentPlayerIndex')::int;
  teams boolean := coalesce((p_base ->> 'teams')::boolean, false) and n = 4;
  track int := case when n > 4 then n * 13 else 52 end;
  finish int := track + 5;
  s jsonb; best jsonb; best_score numeric; score numeric;
  i int; j int; before_p int; after_p int; sign int;
begin
  for s in select * from public.ludo_successors(p_base, p_die) loop
    score := random() * 2;
    if s ->> 'status' = 'FINISHED' then score := score + 1000; end if;
    for i in 0 .. n - 1 loop
      sign := case when i = turn or (teams and i = (turn + 2) % 4) then 1 else -1 end;
      for j in 0 .. jsonb_array_length(p_base -> 'players' -> i -> 'pieces') - 1 loop
        before_p := (p_base -> 'players' -> i -> 'pieces' -> j ->> 'progress')::int;
        after_p := (s -> 'players' -> i -> 'pieces' -> j ->> 'progress')::int;
        if after_p <> before_p then
          score := score + sign * (after_p - before_p);
          if sign = 1 and before_p = 0 and after_p > 0 then score := score + 15; end if;
          if sign = 1 and after_p = finish then score := score + 25; end if;
          if sign = -1 and after_p = 0 and before_p > 0 then score := score + 40; end if;
        end if;
      end loop;
    end loop;
    if best_score is null or score > best_score then
      best := s; best_score := score;
    end if;
  end loop;
  return best;
end $$;
revoke all on function public.bot_choose(jsonb, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Playing a bot's turn: the same two steps a person takes. The first poke
-- rolls (so everyone sees the die on the bot's panel); the next one moves.
-- Any human at the table may poke; `p_version` makes each poke count once,
-- so two players poking together play the turn only once.
-- ---------------------------------------------------------------------------
create or replace function public.play_bot_turn(p_match_id uuid, p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.require_uid();
  m public.matches;
  bot uuid;
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
  -- Already played by another poke, or the board moved on: nothing to do.
  if m.status <> 'IN_PROGRESS' or m.version is distinct from p_version then
    return public.match_snapshot(p_match_id);
  end if;
  select mp.user_id into bot
    from public.match_players mp join public.profiles p on p.uid = mp.user_id
   where mp.match_id = p_match_id and mp.seat_index = m.turn_seat and p.is_bot;
  if bot is null then
    raise exception 'It is not a computer player''s turn.' using errcode = '42501';
  end if;

  if m.last_roll is null then
    die := public.secure_die();
    update public.matches
       set last_roll = die, version = version + 1,
           turn_deadline = now() + make_interval(secs => public.turn_seconds())
     where id = p_match_id;
    return public.match_snapshot(p_match_id);
  end if;

  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant, m.teams));
  next_state := public.bot_choose(base, m.last_roll);
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  next_state := public.skip_out_seats(p_match_id, next_state);
  if winner is null then next_seat := (next_state ->> 'currentPlayerIndex')::int; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  update public.match_players set timeouts = 0 where match_id = p_match_id and user_id = bot;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.play_bot_turn(uuid, int) from public, anon;
grant execute on function public.play_bot_turn(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Quick play: as 0018, plus bots filling a free table after the wait.
-- ---------------------------------------------------------------------------
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
  v_bots uuid[];
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

  -- Nobody else came in time: on a free table, computer players take the
  -- empty seats. Bots not already at a live table are preferred.
  if coalesce(array_length(v_party, 1), 0) between 1 and v_count - 1
     and v_stake = 0
     and v_ticket.joined_at < now() - make_interval(secs => public.bot_wait_seconds()) then
    select coalesce(array_agg(b.uid), '{}') into v_bots
    from (
      select p.uid from public.profiles p
       where p.is_bot and not (p.uid = any(v_party))
       order by exists (
         select 1 from public.match_players mp join public.matches mm on mm.id = mp.match_id
          where mp.user_id = p.uid and mm.status = 'IN_PROGRESS'
       ), random()
       limit v_count - coalesce(array_length(v_party, 1), 0)
    ) b;
    v_party := v_party || v_bots;
  end if;

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

-- ---------------------------------------------------------------------------
-- Snapshots: who is a bot and where they are from; bots are always "online".
-- ---------------------------------------------------------------------------
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
      'variant', m.variant,
      'lifelines', public.lifelines(),
      'teams', m.teams
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
          'country', p.country,
          'isBot', p.is_bot,
          'presence', case when p.is_bot then 'ONLINE'::public.presence_status
                           else public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen) end,
          'lastSeen', case when p.is_bot then now() else pr.last_seen end,
          'missed', mp.missed,
          'out', mp.is_out
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
          'country', p.country,
          'isBot', p.is_bot,
          'seatIndex', lp.seat_index,
          'status', lp.status,
          'isReady', lp.is_ready,
          'isHost', lp.user_id = l.host_id,
          'joinedAt', lp.joined_at,
          'invitationStatus', cp.invitation_status,
          'presence', case when p.is_bot then 'ONLINE'::public.presence_status
                           else public.effective_presence(coalesce(pr.status, 'OFFLINE'), pr.last_seen) end,
          'lastSeen', case when p.is_bot then now() else pr.last_seen end
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

-- ---------------------------------------------------------------------------
-- Rewards: as 0028, except a table with a computer player at it scores no
-- tournament or league points (coins and XP are the normal free-table ones).
-- ---------------------------------------------------------------------------
create or replace function public.award_online_for(p_uid uuid, p_match_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches;
  v_seat int;
  v_key text := 'online:' || p_match_id::text;
  v_won boolean;
  v_counts boolean;
  v_walkover boolean;
  v_coins int := 0;
  v_xp int := 0;
  v_own int;
  v_keepers int;
  v_payout int := 0;
  v_walker_seat int;
  v_out int[];
  v_bots boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or v_match.status not in ('FINISHED', 'ABANDONED') then return; end if;
  select seat_index into v_seat from public.match_players where match_id = p_match_id and user_id = p_uid;
  if v_seat is null then return; end if;
  if exists (select 1 from public.profile_rewards where uid = p_uid and match_id = v_key) then return; end if;
  select seat_index into v_walker_seat from public.match_players
   where match_id = p_match_id and user_id = v_match.abandoned_by;
  if (v_match.status = 'ABANDONED' and v_match.abandoned_by = p_uid)
     or exists (select 1 from public.match_players where match_id = p_match_id and user_id = p_uid and is_out)
     -- In 2 v 2, a partner walking out loses the match for the pair.
     or coalesce(v_match.teams and v_match.status = 'ABANDONED' and v_walker_seat is not null
         and public.partner_seat(true, v_walker_seat) = v_seat, false) then
    -- Walking out forfeits the stake and the game.
    insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, 0, false);
    return;
  end if;

  v_counts := v_match.status = 'FINISHED' or v_match.version >= 40;
  -- Someone walked out and I stayed: the match is mine (when it counted).
  v_walkover := v_match.status = 'ABANDONED' and v_match.abandoned_by is not null;
  v_won := coalesce(v_match.status = 'FINISHED'
    and (v_match.winner_seat = v_seat or public.partner_seat(v_match.teams, v_match.winner_seat) = v_seat), false)
    or (v_walkover and v_counts);
  select amount into v_own from public.match_stakes where match_id = p_match_id and user_id = p_uid;
  if v_match.pool > 0 then
    if v_match.status = 'FINISHED' then
      -- Two winners in 2 v 2 share the prize.
      if v_won then v_payout := public.stake_prize(v_match.pool) / (case when v_match.teams then 2 else 1 end); end if;
    elsif v_match.abandoned_by is null and not exists (
      select 1 from public.match_players where match_id = p_match_id and is_out
    ) then
      -- Nobody walked out and nobody ran out: everyone gets their stake back.
      v_payout := coalesce(v_own, 0);
    else
      select count(*) into v_keepers from public.match_players
       where match_id = p_match_id and user_id is distinct from v_match.abandoned_by and not is_out
         and (not v_match.teams or v_walker_seat is null or seat_index <> public.partner_seat(true, v_walker_seat));
      v_payout := floor(v_match.pool::numeric / greatest(v_keepers, 1))::int;
    end if;
  end if;

  if v_counts then
    if v_match.status = 'FINISHED' then
      if v_match.teams or v_match.state is null then
        v_coins := case when v_won then 100 else 0 end;
      else
        select coalesce(array_agg(seat_index), '{}') into v_out
          from public.match_players where match_id = p_match_id and is_out;
        v_coins := public.placement_coins(
          public.match_placement(v_match.state, v_seat, v_match.winner_seat, v_out),
          v_match.player_count);
      end if;
    elsif v_walkover then
      v_coins := 100;
    end if;
    v_xp := case when v_won then 120 else 50 end;
  end if;

  update public.profiles
     set games_played = games_played + (case when v_counts then 1 else 0 end),
         games_won    = games_won + (case when v_won then 1 else 0 end),
         streak       = case when not v_counts then streak when v_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when v_won then streak + 1 else 0 end),
         coins        = coins + v_coins + v_payout
   where uid = p_uid;
  insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, v_coins + v_payout, v_won);
  if not v_counts then return; end if;
  perform public.grant_xp(p_uid, v_xp);
  perform public.bump_mission(p_uid, 'game', 1);
  perform public.bump_mission(p_uid, 'online', 1);
  if v_won then perform public.bump_mission(p_uid, 'win_online', 1); end if;
  -- Beating the computer is practice: it never climbs the weekly ladder.
  select exists (
    select 1 from public.match_players mp join public.profiles p on p.uid = mp.user_id
     where mp.match_id = p_match_id and p.is_bot
  ) into v_bots;
  if v_bots then return; end if;
  insert into public.tournament_scores (uid, week, points, wins, games)
  values (p_uid, public.current_week(), case when v_won then 3 else 1 end, case when v_won then 1 else 0 end, 1)
  on conflict (uid, week) do update set
    points = tournament_scores.points + excluded.points,
    wins = tournament_scores.wins + excluded.wins,
    games = tournament_scores.games + 1,
    updated_at = now();
end $$;
revoke all on function public.award_online_for(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player search: as 0006, and computer players are never found.
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
    and not p.is_bot
    and char_length(q.term) >= 2
    and (p.username like q.term || '%' or p.public_id = q.term or p.uid::text = q.term)
  order by (p.username = q.term or p.public_id = q.term) desc, p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
revoke execute on function public.search_users(text, int) from public, anon;
grant execute on function public.search_users(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Turn clock: as 0016, except an expired turn that belongs to a computer
-- player is played for it rather than costing it a lifeline. Without this a
-- two-seat table against a bot could end as a "walk-over" after five
-- expiries, as if the bot had left.
-- ---------------------------------------------------------------------------
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
  -- A computer player never loses a lifeline: its turn is simply played
  -- (the same two steps play_bot_turn takes), and the table goes on.
  if exists (select 1 from public.profiles p where p.uid = idle and p.is_bot) then
    return public.play_bot_turn(p_match_id, p_version);
  end if;
  -- A lifeline gone. They do not come back.
  update public.match_players set missed = missed + 1, timeouts = timeouts + 1
   where match_id = p_match_id and user_id = idle
  returning missed into misses;

  if misses >= public.lifelines() and not m.teams and (
    select count(*) from public.match_players
     where match_id = p_match_id and not is_out and user_id <> idle
  ) >= 2 then
    -- Out of lifelines at a bigger table: out of the game, which goes on.
    update public.match_players set is_out = true where match_id = p_match_id and user_id = idle;
    insert into public.notifications (user_id, type, title, message, related_lobby_id)
    select mp.user_id, 'CHALLENGE_CANCELLED', 'Player out',
           public.display_of(idle) || ' ran out of lifelines.', m.lobby_id
      from public.match_players mp
     where mp.match_id = p_match_id and mp.user_id <> idle;
    base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant, m.teams));
    next_state := public.skip_out_seats(
      p_match_id,
      base || jsonb_build_object('currentPlayerIndex', (m.turn_seat + 1) % m.player_count,
                                 'consecutiveSixes', 0, 'lastRoll', null)
    );
    update public.matches set state = next_state, version = version + 1, last_roll = null,
      turn_seat = (next_state ->> 'currentPlayerIndex')::int,
      turn_deadline = now() + make_interval(secs => public.turn_seconds())
     where id = p_match_id;
    return public.match_snapshot(p_match_id);
  end if;

  if misses >= public.lifelines() then
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
  base := coalesce(m.state, public.ludo_opening(m.player_count, m.variant, m.teams));
  select s into next_state from public.ludo_successors(base, die) s limit 1;
  next_seat := (next_state ->> 'currentPlayerIndex')::int;
  if next_state ->> 'status' = 'FINISHED' then winner := next_seat; end if;
  next_state := public.skip_out_seats(p_match_id, next_state);
  if winner is null then next_seat := (next_state ->> 'currentPlayerIndex')::int; end if;
  update public.matches set state = next_state, version = version + 1, turn_seat = next_seat, last_roll = null,
    status = case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat = winner, finished_at = case when winner is null then null else now() end,
    turn_deadline = case when winner is null then now() + make_interval(secs => public.turn_seconds()) end
   where id = p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.claim_turn_timeout(uuid, int) from public, anon;
grant execute on function public.claim_turn_timeout(uuid, int) to authenticated;
