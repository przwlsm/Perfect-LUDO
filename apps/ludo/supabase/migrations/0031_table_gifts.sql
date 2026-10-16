-- 0031: table gifts. Apply after 0030.
--
-- A player at an online table sends an animated gift (a rose, a punch) at
-- another seat for gems. The server charges the sender here and records the
-- gift; the client then announces it on the match's reaction channel so every
-- phone plays the animation. Nothing is credited to the receiver: a gift is
-- a moment, not a transfer, so gems can never be moved between accounts.
-- Prices mirror TABLE_GIFTS in src/domain/social/tableGifts.ts.

create table if not exists public.table_gifts (
  id    text primary key check (id ~ '^[a-z]{1,16}$'),
  gems  int not null check (gems > 0)
);
alter table public.table_gifts enable row level security;
revoke all on public.table_gifts from public, anon, authenticated;
-- Readable by signed-in players (the catalogue, nothing personal).
drop policy if exists table_gifts_read on public.table_gifts;
create policy table_gifts_read on public.table_gifts for select to authenticated using (true);
grant select on public.table_gifts to authenticated;

insert into public.table_gifts (id, gems) values
  ('rose', 5), ('punch', 5), ('laugh', 3), ('crown', 15)
on conflict (id) do update set gems = excluded.gems;

-- Every gift sent, for the ledger and for abuse checks (rate limit below).
create table if not exists public.table_gift_log (
  id        bigint generated always as identity primary key,
  match_id  uuid not null references public.matches (id) on delete cascade,
  from_uid  uuid not null references auth.users (id) on delete cascade,
  to_uid    uuid not null references auth.users (id) on delete cascade,
  gift      text not null references public.table_gifts (id),
  gems      int  not null,
  sent_at   timestamptz not null default now()
);
create index if not exists table_gift_log_sender on public.table_gift_log (from_uid, sent_at desc);
alter table public.table_gift_log enable row level security;
revoke all on public.table_gift_log from public, anon, authenticated;

create or replace function public.send_table_gift(
  p_match_id uuid, p_to_seat int, p_gift text, p_expected_gems int
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_gift public.table_gifts;
  v_my_seat int;
  v_to_uid uuid;
  v_status public.match_status;
begin
  select * into v_gift from public.table_gifts where id = p_gift;
  if not found then
    raise exception 'There is no such gift.' using errcode = 'P0002';
  end if;
  if p_expected_gems is distinct from v_gift.gems then
    raise exception 'The price of this gift has changed. Please try again.' using errcode = '22023';
  end if;
  v_uid := public.lock_wallet();

  select status into v_status from public.matches where id = p_match_id;
  if not found then
    raise exception 'That table is gone.' using errcode = 'P0002';
  end if;
  if v_status <> 'IN_PROGRESS' then
    raise exception 'That game is over.' using errcode = 'P0001';
  end if;
  select seat_index into v_my_seat from public.match_players
    where match_id = p_match_id and user_id = v_uid;
  if v_my_seat is null then
    raise exception 'You are not at that table.' using errcode = '42501';
  end if;
  if p_to_seat = v_my_seat then
    raise exception 'Send gifts to the other players.' using errcode = '22023';
  end if;
  select user_id into v_to_uid from public.match_players
    where match_id = p_match_id and seat_index = p_to_seat;
  if v_to_uid is null then
    raise exception 'There is nobody in that seat.' using errcode = 'P0002';
  end if;
  -- At most one gift every 3 seconds per sender: enough for fun, not for spam.
  if exists (
    select 1 from public.table_gift_log
     where from_uid = v_uid and sent_at > now() - interval '3 seconds'
  ) then
    raise exception 'One gift at a time! Try again in a moment.' using errcode = 'P0001';
  end if;
  if (select gems from public.profiles where uid = v_uid) < v_gift.gems then
    raise exception 'Not enough gems for that gift. Missions and the season pass earn them.' using errcode = 'P0001';
  end if;

  update public.profiles set gems = gems - v_gift.gems where uid = v_uid;
  insert into public.table_gift_log (match_id, from_uid, to_uid, gift, gems)
  values (p_match_id, v_uid, v_to_uid, v_gift.id, v_gift.gems);
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.send_table_gift(uuid, int, text, int) from public, anon;
grant execute on function public.send_table_gift(uuid, int, text, int) to authenticated;
