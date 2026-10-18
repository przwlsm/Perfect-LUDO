-- 0042: cups with friends only in the first five halls.
--
-- A cup with friends lets the players choose who sits at the table, and the
-- winner takes the whole pot. In the top halls (King's Court, Emperor's
-- Palace, Hall of Legends: entries of 75,000 coins and up) that makes it
-- too easy to pass large sums between accounts by agreeing who wins. Those
-- halls stay open to the public draw only.
--
-- The rule lives on the hall (cups.friends_allowed) and is enforced by
-- triggers, so it holds whichever function or client opens or joins a
-- bracket. A private cup already waiting in one of these halls can no
-- longer take new players; its host can still cancel it, which refunds
-- everyone as before. Safe to re-run.

alter table public.cups add column if not exists friends_allowed boolean not null default true;
update public.cups set friends_allowed = (sort <= 5);

/** Refuses a private bracket in a hall that does not allow cups with friends. */
create or replace function public.cup_private_hall_check() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.is_private and not coalesce(
    (select c.friends_allowed from public.cups c where c.id = new.cup_id), false
  ) then
    raise exception 'Cups with friends are open in the first five halls only.' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.cup_private_hall_check() from public, anon, authenticated;

drop trigger if exists cup_brackets_private_hall on public.cup_brackets;
create trigger cup_brackets_private_hall
  before insert or update of is_private, cup_id on public.cup_brackets
  for each row execute function public.cup_private_hall_check();

/** Refuses a new seat at a private bracket in such a hall (one opened before this rule). */
create or replace function public.cup_private_entry_check() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from public.cup_brackets b join public.cups c on c.id = b.cup_id
     where b.id = new.bracket_id and b.is_private and not c.friends_allowed
  ) then
    raise exception 'Cups with friends are open in the first five halls only.' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.cup_private_entry_check() from public, anon, authenticated;

drop trigger if exists cup_entries_private_hall on public.cup_entries;
create trigger cup_entries_private_hall
  before insert on public.cup_entries
  for each row execute function public.cup_private_entry_check();
