-- 0043: Royal Road winners also take gems.
--
-- Each hall pays its winner a handful of gems on top of the coin prize,
-- more the higher the hall: 1, 2, 3, 5, 8, 15, 25 and 50. Gems are meant to
-- be rare, so the low halls pay a token and the top hall a real prize. Gems follow the
-- coin prize's own rules, so they cannot be farmed:
--   * public cups only: a cup with friends pays its pot and no gems;
--   * only when the coin prize was paid, so brackets filled by computer
--     players share the same daily cap (cup_bot_prize_cap);
--   * never to a computer player.
-- They are paid by a trigger the moment a bracket finishes, so cup_settle
-- (0037) is left as it is, and a bracket can only finish once. Safe to re-run.

alter table public.cups add column if not exists gems int not null default 0 check (gems >= 0);
update public.cups c set gems = v.gems
  from (values ('village', 1), ('merchant', 2), ('knight', 3), ('baron', 5),
               ('duke', 8), ('king', 15), ('emperor', 25), ('legends', 50)) as v(id, gems)
 where c.id = v.id;

create or replace function public.cup_pay_gems() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'FINISHED' and old.status is distinct from 'FINISHED'
     and not new.is_private and new.prize_paid and new.winner_uid is not null then
    update public.profiles p
       set gems = p.gems + c.gems
      from public.cups c
     where c.id = new.cup_id and c.gems > 0
       and p.uid = new.winner_uid and not p.is_bot;
  end if;
  return new;
end $$;
revoke execute on function public.cup_pay_gems() from public, anon, authenticated;

drop trigger if exists cup_brackets_pay_gems on public.cup_brackets;
create trigger cup_brackets_pay_gems
  after update of status on public.cup_brackets
  for each row execute function public.cup_pay_gems();
