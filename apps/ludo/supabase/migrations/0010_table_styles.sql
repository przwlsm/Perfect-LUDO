-- Table styles: a fourth store category that changes how the 5-6 player
-- round table draws its homes. Apply after 0009.
--
-- `triangle-homes` is the free default everyone has; `round-homes` keeps the
-- original round yards available to buy. Mirrors src/domain/cosmetics/catalog.ts
-- (`npm run test:online` fails if the two disagree).

-- The kind check from 0007 was declared inline, so look it up by what it
-- checks rather than guessing its generated name; safe to re-run.
do $$
declare v_conname text;
begin
  select con.conname into v_conname
    from pg_constraint con
    where con.conrelid = 'public.store_items'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
      and pg_get_constraintdef(con.oid) not ilike '%board is not null%';
  if v_conname is not null then
    execute format('alter table public.store_items drop constraint %I', v_conname);
  end if;
end $$;

alter table public.store_items
  add constraint store_items_kind_check check (kind in ('board', 'dice', 'pack', 'style'));

insert into public.store_items (id, kind, price) values
  ('triangle-homes', 'style', 0),
  ('round-homes', 'style', 200)
on conflict (id) do update set kind = excluded.kind, price = excluded.price;
