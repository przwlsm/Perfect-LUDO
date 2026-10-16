-- 0039: festive boards. Apply after 0038.
--
-- Five festival boards beside the Diwali one from 0025: Holi, Onam, Pongal,
-- Eid and Christmas, each with its signature dice and pack, sold for coins
-- all year. The live effects (colour splashes, flowers, kolam, lanterns,
-- snow) are drawn by the app. Mirrors src/domain/cosmetics/catalog.ts.

insert into public.store_items (id, kind, price, currency) values
  ('holi',      'board', 5000, 'coins'),
  ('onam',      'board', 5000, 'coins'),
  ('pongal',    'board', 5000, 'coins'),
  ('eid',       'board', 5000, 'coins'),
  ('christmas', 'board', 5000, 'coins'),
  ('holi-dice',      'dice', 1200, 'coins'),
  ('onam-dice',      'dice', 1200, 'coins'),
  ('pongal-dice',    'dice', 1200, 'coins'),
  ('eid-dice',       'dice', 1200, 'coins'),
  ('christmas-dice', 'dice', 1200, 'coins')
on conflict (id) do update set kind = excluded.kind, price = excluded.price, currency = excluded.currency;

insert into public.store_items (id, kind, price, currency, board, dice) values
  ('holi-pack',      'pack', 6250, 'coins', 'holi',      'holi-dice'),
  ('onam-pack',      'pack', 6250, 'coins', 'onam',      'onam-dice'),
  ('pongal-pack',    'pack', 6250, 'coins', 'pongal',    'pongal-dice'),
  ('eid-pack',       'pack', 6250, 'coins', 'eid',       'eid-dice'),
  ('christmas-pack', 'pack', 6250, 'coins', 'christmas', 'christmas-dice')
on conflict (id) do update set kind = excluded.kind, price = excluded.price, currency = excluded.currency,
  board = excluded.board, dice = excluded.dice;
