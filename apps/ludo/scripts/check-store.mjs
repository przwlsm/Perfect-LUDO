import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

// Exercises the account wallet (migration 0007) against a real Supabase
// project, as an ordinary signed-in player using the same public anon key the
// app ships. Run it after applying the migration:
//
//   LUDO_TEST_EMAILS=a@x.com,b@x.com,c@x.com LUDO_TEST_PASSWORD=secret \
//     node scripts/check-store.mjs
//
// Only the first address is used. The account keeps whatever it buys here
// (items are permanent, coins are spent), so the script only ever buys free
// items and verifies the paid paths through refusals and idempotent replays.
// Guest checks are skipped when anonymous sign-ins are disabled.

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = (process.env.LUDO_TEST_EMAIL ?? process.env.LUDO_TEST_EMAILS ?? '').split(',')[0]?.trim();
const PASSWORD = process.env.LUDO_TEST_PASSWORD;
if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.error('Set EXPO_PUBLIC_SUPABASE_* in .env and LUDO_TEST_EMAILS / LUDO_TEST_PASSWORD.');
  process.exit(1);
}

let pass = 0;
let fail = 0;
let skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' -- ' + detail : ''}`);
};
const skipped = (name, why) => {
  skip++;
  console.log(`SKIP  ${name} -- ${why}`);
};

const newClient = () =>
  createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const rpc = async (client, fn, args = {}) => {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
};
const expectFail = async (name, client, fn, args, pattern) => {
  try {
    await rpc(client, fn, args);
    ok(name, false, 'succeeded unexpectedly');
  } catch (e) {
    ok(name, pattern.test(e.message), `${e.code ?? ''} ${e.message}`);
  }
};

// The app's catalog, compiled from source so the comparison is against what
// the client will actually charge for.
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  fs.readFileSync(path.resolve('src/domain/cosmetics/catalog.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const catalogModule = { exports: {} };
new Function('module', 'exports', 'require', compiled)(catalogModule, catalogModule.exports, require);
const CATALOG = catalogModule.exports.COSMETICS;

// --- signed-out --------------------------------------------------------------
const anon = newClient();
await expectFail('signed-out client cannot read a wallet', anon, 'get_wallet', {}, /./);
const anonItems = await anon.from('profile_items').select('item_id');
ok('signed-out client sees no inventory rows', (anonItems.data?.length ?? 0) === 0);

// --- member ------------------------------------------------------------------
const me = newClient();
const signedIn = await me.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (signedIn.error) {
  console.error(`Could not sign in ${EMAIL}: ${signedIn.error.message}`);
  process.exit(1);
}
const uid = signedIn.data.user.id;
console.log(`Signed in as ${EMAIL}\n`);

const catalogRows =
  (await me.from('store_items').select('id, kind, price, currency, board, dice')).data ?? [];
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const expected = CATALOG.map((c) => ({
  id: c.id,
  kind: c.kind,
  price: c.price,
  currency: c.currency ?? 'coins',
  board: c.contents?.board ?? null,
  dice: c.contents?.dice ?? null,
})).sort(byId);
const actual = catalogRows.map((r) => ({ ...r })).sort(byId);
ok(
  'server catalog matches src/domain/cosmetics/catalog.ts',
  JSON.stringify(actual) === JSON.stringify(expected),
  `${actual.length} rows on the server, ${expected.length} in the app`,
);

const wallet = await rpc(me, 'get_wallet');
ok(
  'wallet loads with sane numbers',
  Number.isInteger(wallet.coins) && wallet.coins >= 0 && Array.isArray(wallet.owned),
  `coins=${wallet.coins} owned=${wallet.owned.length}`,
);

const forged = await me.from('profiles').update({ coins: 999999 }).eq('uid', uid).select('coins');
ok(
  'own coins cannot be edited directly',
  Boolean(forged.error) || (forged.data?.length ?? 0) === 0,
  forged.error ? `${forged.error.code} ${forged.error.message}` : 'update went through',
);
const smuggled = await me.from('profile_items').insert({ uid, item_id: 'obsidian-pack' });
ok('inventory cannot be inserted directly', Boolean(smuggled.error), smuggled.error?.code);
ok(
  'wallet is unchanged after the forgery attempts',
  (await rpc(me, 'get_wallet')).coins === wallet.coins,
);

await expectFail('unknown item is refused', me, 'purchase_item', { p_item_id: 'nope', p_expected_price: 0 }, /not in the store/i);
await expectFail(
  'stale price is refused',
  me,
  'purchase_item',
  { p_item_id: 'royal', p_expected_price: 1 },
  /price.*changed/i,
);
const free = await rpc(me, 'purchase_item', { p_item_id: 'classic-pack', p_expected_price: 0 });
ok('a free pack unlocks its contents', ['classic-pack', 'classic', 'classic-dice'].every((id) => free.owned.includes(id)));
ok('a free unlock costs nothing', free.coins === wallet.coins);
const again = await rpc(me, 'purchase_item', { p_item_id: 'classic-pack', p_expected_price: 0 });
ok('buying an owned item again is a no-op', again.coins === free.coins && again.owned.length === free.owned.length);

const unaffordable = CATALOG.filter(
  (c) =>
    c.price > ((c.currency ?? 'coins') === 'gems' ? (wallet.gems ?? 0) : wallet.coins) &&
    !wallet.owned.includes(c.id),
);
if (unaffordable.length)
  await expectFail(
    'cannot spend more than the balance',
    me,
    'purchase_item',
    { p_item_id: unaffordable[0].id, p_expected_price: unaffordable[0].price },
    /Not enough (coins|gems)/i,
  );
else skipped('cannot spend more than the balance', `balance ${wallet.coins} covers every item`);

// Day 1..7 of the streak calendar; mirrors GIFT_CYCLE_COINS in Wallet.ts.
const GIFT_CYCLE = [100, 150, 200, 300, 400, 500, 750];
try {
  const gifted = await rpc(me, 'claim_daily_gift');
  const day = ((Math.max(gifted.giftStreak ?? 1, 1) - 1) % 7) + 1;
  ok(
    `daily gift pays the calendar (day ${day})`,
    gifted.coins === free.coins + GIFT_CYCLE[day - 1],
    `${free.coins} -> ${gifted.coins}`,
  );
} catch (e) {
  ok('daily gift refused only because it was already claimed today', /claimed/i.test(e.message), e.message);
}
await expectFail('daily gift cannot be claimed twice', me, 'claim_daily_gift', {}, /claimed/i);

const before = await rpc(me, 'get_wallet');
const matchId = `check-${randomUUID()}`;
const paid = await rpc(me, 'award_match', { p_match_id: matchId, p_won: true, p_eligible: true });
// 50 coins for a bot win; the 40 XP it grants may also cross a level, which pays 100 + 20·level.
const levelOf = (w) => (typeof w.level === 'object' ? w.level?.level : w.level) ?? 1;
const levelBonus = levelOf(paid) > levelOf(before) ? 100 + 20 * levelOf(paid) : 0;
ok('a won match pays 50 (plus any level-up) and counts once', paid.coins === before.coins + 50 + levelBonus && paid.games === before.games + 1);
const replay = await rpc(me, 'award_match', { p_match_id: matchId, p_won: true, p_eligible: true });
ok('replaying the same match pays nothing more', replay.coins === paid.coins && replay.games === paid.games);
const unpaid = await rpc(me, 'award_match', { p_match_id: `check-${randomUUID()}`, p_won: false, p_eligible: false });
ok('an ineligible match counts but does not pay', unpaid.coins === paid.coins && unpaid.games === paid.games + 1);
await expectFail('an oversized match id is refused', me, 'award_match', { p_match_id: 'x'.repeat(65), p_won: true, p_eligible: true }, /Invalid match id/i);

// --- guest -------------------------------------------------------------------
const ghost = newClient();
const anonymous = await ghost.auth.signInAnonymously();
if (anonymous.error) {
  skipped('guest cannot use the wallet', `anonymous sign-ins disabled (${anonymous.error.message})`);
} else {
  await expectFail('guest cannot read a wallet', ghost, 'get_wallet', {}, /Create an account/i);
  await expectFail('guest cannot buy', ghost, 'purchase_item', { p_item_id: 'classic-pack', p_expected_price: 0 }, /Create an account/i);
  await expectFail('guest cannot claim the gift', ghost, 'claim_daily_gift', {}, /Create an account/i);
  await expectFail('guest cannot be paid for a match', ghost, 'award_match', { p_match_id: 'g', p_won: true, p_eligible: true }, /Create an account/i);
  await ghost.auth.signOut();
}

await me.auth.signOut();
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
