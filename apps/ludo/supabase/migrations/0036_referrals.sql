-- 0036: invite rewards. Apply after 0035.
--
-- A new member can name the friend who invited them by User ID. The first
-- time that member finishes an online game, both get the invite bonus in
-- coins. Guests cannot link (no account), computer players cannot be
-- named, and the link is allowed only while the member is still new
-- (fewer than 20 games), so it stays a welcome gift, not a farm.

create table if not exists public.referrals (
  invitee    uuid primary key references auth.users (id) on delete cascade,
  inviter    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  paid_at    timestamptz,
  check (invitee <> inviter)
);
create index if not exists referrals_inviter on public.referrals (inviter);
alter table public.referrals enable row level security;
revoke all on public.referrals from public, anon, authenticated;

/** Coins each side gets when the invited friend finishes their first online game. */
create or replace function public.referral_reward() returns int
language sql immutable set search_path = public, pg_temp as $$ select 2000 $$;

/** Games played after which a member can no longer name an inviter. */
create or replace function public.referral_window_games() returns int
language sql immutable set search_path = public, pg_temp as $$ select 20 $$;

create or replace function public.referral_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'reward', public.referral_reward(),
    'inviter', (
      select jsonb_build_object('username', ip.username, 'publicId', ip.public_id, 'paid', r.paid_at is not null)
        from public.referrals r join public.profiles ip on ip.uid = r.inviter
       where r.invitee = p_uid),
    'canEnter', not p.is_guest and p.games_played < public.referral_window_games()
                and not exists (select 1 from public.referrals r where r.invitee = p_uid),
    'invited', (select count(*) from public.referrals r where r.inviter = p_uid and r.paid_at is not null),
    'pending', (select count(*) from public.referrals r where r.inviter = p_uid and r.paid_at is null)
  )
  from public.profiles p where p.uid = p_uid;
$$;
revoke all on function public.referral_json(uuid) from public, anon, authenticated;

create or replace function public.get_referral() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select public.referral_json(public.require_uid());
$$;
revoke execute on function public.get_referral() from public, anon;
grant execute on function public.get_referral() to authenticated;

/** Names the friend who invited me, by their 8-digit User ID. */
create or replace function public.set_referrer(p_public_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_inviter public.profiles;
  v_me public.profiles;
begin
  if p_public_id is null or p_public_id !~ '^[1-9][0-9]{7}$' then
    raise exception 'That is not a User ID.' using errcode = '22023';
  end if;
  select * into v_me from public.profiles where uid = v_uid;
  if v_me.is_guest then
    raise exception 'Create an account first.' using errcode = '42501';
  end if;
  if exists (select 1 from public.referrals where invitee = v_uid) then
    raise exception 'You have already named a friend.' using errcode = '22023';
  end if;
  if v_me.games_played >= public.referral_window_games() then
    raise exception 'Invites can only be linked by new players.' using errcode = '22023';
  end if;
  select * into v_inviter from public.profiles where public_id = p_public_id and not is_guest and not is_bot;
  if not found then
    raise exception 'No player has that User ID.' using errcode = 'P0002';
  end if;
  if v_inviter.uid = v_uid then
    raise exception 'That is your own User ID.' using errcode = '22023';
  end if;
  insert into public.referrals (invitee, inviter) values (v_uid, v_inviter.uid);
  return public.referral_json(v_uid);
end $$;
revoke execute on function public.set_referrer(text) from public, anon;
grant execute on function public.set_referrer(text) to authenticated;

/** The invited friend's first online result pays both sides, once. */
create or replace function public.referral_on_reward() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.referrals;
begin
  if new.match_id not like 'online:%' then return new; end if;
  select * into r from public.referrals where invitee = new.uid and paid_at is null for update;
  if not found then return new; end if;
  update public.referrals set paid_at = now() where invitee = new.uid;
  update public.profiles set coins = coins + public.referral_reward()
   where uid in (r.invitee, r.inviter) and not is_bot and not is_guest;
  return new;
end $$;
drop trigger if exists referral_on_reward on public.profile_rewards;
create trigger referral_on_reward after insert on public.profile_rewards
  for each row execute function public.referral_on_reward();
