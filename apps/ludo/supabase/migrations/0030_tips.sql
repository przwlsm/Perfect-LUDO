-- "Buy me a coffee": voluntary tips through the store's own billing.
--
-- A tip is a consumable product that grants nothing in the game. grant_iap
-- already handles it: the verified order is recorded in iap_receipts (so a
-- replay is ignored) and, with no coins, gems or special kind, the wallet is
-- left untouched. The same ids must exist as consumable in-app products in
-- Play Console (and App Store Connect): ludo.tip.coffee, ludo.tip.big,
-- ludo.tip.feast, and the "gift more" tiers ludo.tip.lunch, ludo.tip.dinner,
-- ludo.tip.party, ludo.tip.patron. Store billing has no free amount, so the
-- ladder stands in for one. Mirrors TIP_PRODUCTS in src/domain/entities/Iap.ts.

alter table public.iap_products drop constraint if exists iap_products_kind_check;
alter table public.iap_products
  add constraint iap_products_kind_check
  check (kind in ('gems', 'coins', 'starter', 'pass', 'piggy', 'club', 'tip'));

insert into public.iap_products (id, kind, gems, coins) values
  ('ludo.tip.coffee', 'tip', 0, 0),
  ('ludo.tip.big', 'tip', 0, 0),
  ('ludo.tip.feast', 'tip', 0, 0),
  ('ludo.tip.lunch', 'tip', 0, 0),
  ('ludo.tip.dinner', 'tip', 0, 0),
  ('ludo.tip.party', 'tip', 0, 0),
  ('ludo.tip.patron', 'tip', 0, 0)
on conflict (id) do update set kind = excluded.kind, gems = excluded.gems, coins = excluded.coins;
