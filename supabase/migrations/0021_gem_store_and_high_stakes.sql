-- 0021: the gem store and the high tables. Apply after 0020.
--
-- Legendary looks now cost gems instead of coins, making gems the treasure
-- currency the store is built around. Two high-stake tables (10,000 and
-- 50,000) join the ladder behind level gates, and private link rooms are
-- capped at 2,000 so they cannot be used to funnel big sums between
-- accounts. Mirrors src/domain/cosmetics/catalog.ts and Stakes.ts.

-- ---------------------------------------------------------------------------
-- Gem-priced legendaries
-- ---------------------------------------------------------------------------

alter table public.store_items
  add column if not exists currency text not null default 'coins'
  check (currency in ('coins', 'gems'));

update public.store_items s set price = v.price, currency = 'gems'
from (values
  ('royal', 480), ('cosmic', 480), ('obsidian', 600), ('midnight', 240),
  ('royal-pack', 600), ('cosmic-pack', 600), ('obsidian-pack', 750)
) as v(id, price)
where s.id = v.id;

-- Charges the item's own currency; everything else is unchanged from 0007.
create or replace function public.purchase_item(p_item_id text, p_expected_price integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_item public.store_items;
  v_balance integer;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then
    raise exception 'This item is not in the store.' using errcode = 'P0002';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_items where uid = v_uid and item_id = p_item_id) then
    return public.wallet_json(v_uid);
  end if;
  if p_expected_price is distinct from v_item.price then
    raise exception 'The price of this item has changed. Please reopen the store.' using errcode = '22023';
  end if;
  select case when v_item.currency = 'gems' then gems else coins end
    into v_balance from public.profiles where uid = v_uid;
  if v_balance < v_item.price then
    if v_item.currency = 'gems' then
      raise exception 'Not enough gems. Missions, the season pass and rewarded ads earn them.' using errcode = 'P0001';
    end if;
    raise exception 'Not enough coins. Finish matches or claim your daily gift.' using errcode = 'P0001';
  end if;
  if v_item.currency = 'gems' then
    update public.profiles set gems = gems - v_item.price where uid = v_uid;
  else
    update public.profiles set coins = coins - v_item.price where uid = v_uid;
  end if;
  insert into public.profile_items (uid, item_id)
    select v_uid, x from unnest(array[p_item_id, v_item.board, v_item.dice]) as x
    where x is not null
  on conflict do nothing;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.purchase_item(text, integer) from public, anon;
grant execute on function public.purchase_item(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The high tables: 10,000 and 50,000, gated by level
-- ---------------------------------------------------------------------------

create or replace function public.valid_stake(p_stake int) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_stake in (0, 100, 500, 2000, 10000, 50000);
$$;

-- Which level a seat at `p_stake` needs. Mirrors stakeMinLevel in Stakes.ts.
create or replace function public.stake_min_level(p_stake int) returns int
language sql immutable set search_path = public, pg_temp as $$
  select case when p_stake >= 50000 then 20 when p_stake >= 10000 then 10 else 1 end;
$$;

create or replace function public.require_stake(p_uid uuid, p_stake int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_coins int;
  v_xp int;
  v_need int;
begin
  if not public.valid_stake(coalesce(p_stake, -1)) then
    raise exception 'That table stake is not available.' using errcode = '22023';
  end if;
  if p_stake = 0 then return; end if;
  if public.is_guest_session() then
    raise exception 'Create an account to play for coins.' using errcode = '42501';
  end if;
  select coins, xp into v_coins, v_xp from public.profiles where uid = p_uid;
  v_need := public.stake_min_level(p_stake);
  if v_need > 1 and (public.level_info(coalesce(v_xp, 0)) ->> 'level')::int < v_need then
    raise exception 'Reach level % to sit at this table.', v_need using errcode = '42501';
  end if;
  if coalesce(v_coins, 0) < p_stake then
    raise exception 'You need % coins to sit at this table.', p_stake using errcode = '22023';
  end if;
end $$;
revoke all on function public.require_stake(uuid, int) from public, anon, authenticated;

-- Same room creation as 0016, plus the private-table cap.
create or replace function public.create_link_room(p_player_count int default 2, p_stake int default 0, p_variant text default 'classic', p_teams boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_count int := coalesce(p_player_count, 2);
  v_stake int := coalesce(p_stake, 0);
  v_variant text := coalesce(p_variant, 'classic');
  v_teams boolean := coalesce(p_teams, false);
  v_challenge uuid;
  v_lobby uuid;
  v_code text;
begin
  if v_count not between 2 and 4 then
    raise exception 'A private game seats 2 to 4 players.' using errcode = '22023';
  end if;
  -- Private rooms pick their opponents, so the big tables stay in public
  -- matchmaking where coins cannot be funnelled between chosen accounts.
  if v_stake > 2000 then
    raise exception 'Private rooms play up to 2,000 coin stakes.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  perform public.require_stake(v_uid, v_stake);
  perform public.require_variant(v_variant);
  perform public.require_teams(v_teams, v_count);
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
  insert into public.lobbies (challenge_id, host_id, max_players, invite_code, stake, variant, teams)
  values (v_challenge, v_uid, v_count, v_code, v_stake, v_variant, v_teams)
  returning id into v_lobby;
  update public.challenges set lobby_id = v_lobby where id = v_challenge;

  insert into public.challenge_participants (challenge_id, user_id, invitation_status, responded_at, joined_at)
  values (v_challenge, v_uid, 'ACCEPTED', now(), now());
  insert into public.lobby_players (lobby_id, user_id, status, is_ready, seat_index, joined_at)
  values (v_lobby, v_uid, 'JOINED', true, 0, now());

  return jsonb_build_object('lobbyId', v_lobby, 'code', v_code);
end $$;
revoke execute on function public.create_link_room(int, int, text, boolean) from public, anon;
grant execute on function public.create_link_room(int, int, text, boolean) to authenticated;
