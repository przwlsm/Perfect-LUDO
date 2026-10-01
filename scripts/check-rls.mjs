// Verifies the Supabase security boundary from the outside, using only the
// public anon key that ships in the app -- i.e. exactly what an attacker who
// unpacked the bundle would hold. Run after applying migrations:
//
//   node scripts/check-rls.mjs
//
// Every check must pass. A failure here means player data is exposed.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [
      line.slice(0, line.indexOf('=')).trim(),
      line.slice(line.indexOf('=') + 1).trim(),
    ]),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_* in .env');
  process.exit(1);
}

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const results = [];
const check = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
};

const reach = await client.from('profiles').select('uid').limit(1);
if (reach.error?.code === 'PGRST205') {
  console.error('\nThe profiles table does not exist yet.');
  console.error('Apply supabase/migrations/0001_profiles.sql first.');
  process.exit(1);
}

check(
  'anonymous cannot read any profile',
  (reach.data?.length ?? 0) === 0,
  reach.error ? `${reach.error.code}` : `returned ${reach.data?.length ?? 0} rows`,
);

const insert = await client
  .from('profiles')
  .insert({ uid: '00000000-0000-0000-0000-000000000000', display_name: 'rls probe' });
check('anonymous cannot create a profile', Boolean(insert.error), insert.error?.code);

// `count: 'exact'` matters: without it PostgREST leaves `count` null, and a
// check for `count === 0` would silently pass no matter what was modified.
const update = await client
  .from('profiles')
  .update({ games_won: 9999 }, { count: 'exact' })
  .not('uid', 'is', null);
check(
  'anonymous cannot inflate anyone stats',
  Boolean(update.error) || update.count === 0,
  update.error?.code ?? `${update.count} rows affected`,
);

const rpc = await client.rpc('record_game_result', {
  p_uid: '00000000-0000-0000-0000-000000000000',
  p_won: true,
});
check('anonymous cannot call record_game_result', Boolean(rpc.error), rpc.error?.code);

// --- Social graph (0002_social.sql) -----------------------------------------
// The friends/challenge/lobby tables carry no insert, update or delete policy
// at all: every mutation must go through a security-definer function that
// re-derives the caller. These checks prove an unauthenticated client holding
// the shipped key can neither read other people's social data nor drive any
// state transition.

const socialTables = [
  'friendships',
  'friend_requests',
  'challenges',
  'challenge_participants',
  'lobbies',
  'lobby_players',
  'notifications',
  'user_presence',
  'social_settings',
];

const firstTable = await client.from('friendships').select('user_id').limit(1);
if (firstTable.error?.code === 'PGRST205') {
  console.error('\nThe social tables do not exist yet.');
  console.error('Apply supabase/migrations/0002_social.sql first.');
  process.exit(1);
}

for (const table of socialTables) {
  const read = await client.from(table).select('*').limit(1);
  check(
    `anonymous cannot read ${table}`,
    (read.data?.length ?? 0) === 0,
    read.error ? read.error.code : `returned ${read.data?.length ?? 0} rows`,
  );
}

const forgeFriendship = await client.from('friendships').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  friend_id: '00000000-0000-0000-0000-000000000001',
});
check(
  'anonymous cannot forge a friendship',
  Boolean(forgeFriendship.error),
  forgeFriendship.error?.code,
);

const forgeLobbyPlayer = await client.from('lobby_players').insert({
  lobby_id: '00000000-0000-0000-0000-000000000000',
  user_id: '00000000-0000-0000-0000-000000000000',
  seat_index: 0,
});
check(
  'anonymous cannot add itself to a lobby',
  Boolean(forgeLobbyPlayer.error),
  forgeLobbyPlayer.error?.code,
);

const forceStart = await client
  .from('lobbies')
  .update({ status: 'STARTED' }, { count: 'exact' })
  .not('id', 'is', null);
check(
  'anonymous cannot force a lobby to start',
  Boolean(forceStart.error) || forceStart.count === 0,
  forceStart.error?.code ?? `${forceStart.count} rows affected`,
);

// Every mutating function begins with require_uid(), so an anonymous caller
// is rejected before any validation or write happens.
const guardedFunctions = [
  ['search_users', { p_query: 'a' }],
  ['list_friends', {}],
  ['send_friend_request', { p_target: '00000000-0000-0000-0000-000000000000' }],
  ['create_challenge', { p_friend_ids: ['00000000-0000-0000-0000-000000000000'] }],
  ['join_lobby', { p_lobby_id: '00000000-0000-0000-0000-000000000000' }],
  ['start_match', { p_lobby_id: '00000000-0000-0000-0000-000000000000' }],
  ['touch_presence', { p_status: 'ONLINE' }],
  ['mark_notifications_read', { p_ids: null }],
];

for (const [fn, args] of guardedFunctions) {
  const call = await client.rpc(fn, args);
  check(`anonymous cannot call ${fn}`, Boolean(call.error), call.error?.code);
}

// Internal helpers must not be reachable at all, even by a signed-in client.
for (const fn of ['notify', 'refresh_lobby_state']) {
  const call = await client.rpc(fn, {});
  check(`${fn} is not exposed to clients`, Boolean(call.error), call.error?.code);
}

// --- Account wallet (0007_account_wallet.sql) -------------------------------
// Coins, inventory and rewards are server-owned. These checks prove the
// shipped anon key alone -- no session at all -- can browse the catalog but
// touch nothing that belongs to an account.

const catalogRead = await client.from('store_items').select('id').limit(1);
if (catalogRead.error?.code === 'PGRST205') {
  console.error('\nThe store_items table does not exist yet.');
  console.error('Apply supabase/migrations/0007_account_wallet.sql first.');
  process.exit(1);
}
check(
  'anonymous can browse the store catalog',
  (catalogRead.data?.length ?? 0) > 0,
  catalogRead.error ? catalogRead.error.code : `returned ${catalogRead.data?.length ?? 0} rows`,
);

for (const table of ['profile_items', 'profile_rewards']) {
  const read = await client.from(table).select('*').limit(1);
  check(
    `anonymous cannot read ${table}`,
    (read.data?.length ?? 0) === 0,
    read.error ? read.error.code : `returned ${read.data?.length ?? 0} rows`,
  );
}

const forgeItem = await client
  .from('profile_items')
  .insert({ uid: '00000000-0000-0000-0000-000000000000', item_id: 'classic' });
check('anonymous cannot grant itself an item', Boolean(forgeItem.error), forgeItem.error?.code);

const forgeCoins = await client
  .from('profiles')
  .update({ coins: 999999 }, { count: 'exact' })
  .not('uid', 'is', null);
check(
  'anonymous cannot edit anyone\'s coins',
  Boolean(forgeCoins.error) || forgeCoins.count === 0,
  forgeCoins.error?.code ?? `${forgeCoins.count} rows affected`,
);

for (const [fn, args] of [
  ['get_wallet', {}],
  ['purchase_item', { p_item_id: 'classic-pack', p_expected_price: 0 }],
  ['claim_daily_gift', {}],
  ['award_match', { p_match_id: 'probe', p_won: true, p_eligible: true }],
]) {
  const call = await client.rpc(fn, args);
  check(`anonymous cannot call ${fn}`, Boolean(call.error), call.error?.code);
}

for (const fn of ['wallet_json', 'lock_wallet']) {
  const call = await client.rpc(fn, fn === 'wallet_json' ? { p_uid: '00000000-0000-0000-0000-000000000000' } : {});
  check(`${fn} is not exposed to clients`, Boolean(call.error), call.error?.code);
}


// --- Feedback and account deletion (0008, 0009) ------------------------------
const feedbackRead = await client.from('feedback').select('*').limit(1);
check(
  'anonymous cannot read feedback',
  (feedbackRead.data?.length ?? 0) === 0,
  feedbackRead.error ? feedbackRead.error.code : `returned ${feedbackRead.data?.length ?? 0} rows`,
);
const feedbackInsert = await client
  .from('feedback')
  .insert({ category: 'bug', message: 'direct insert probe' });
check('anonymous cannot write feedback directly', Boolean(feedbackInsert.error), feedbackInsert.error?.code);
const deleteCall = await client.rpc('delete_own_account', {});
check('anonymous cannot call delete_own_account', Boolean(deleteCall.error), deleteCall.error?.code);


// --- Invite links (0011) -------------------------------------------------------
for (const [fn, args] of [
  ['create_link_room', { p_player_count: 2 }],
  ['join_link_room', { p_code: 'ABCDEF' }],
]) {
  const call = await client.rpc(fn, args);
  check(`anonymous cannot call ${fn}`, Boolean(call.error), call.error?.code);
}
const probeCodes = await client.from('lobbies').select('invite_code').limit(1);
check(
  'anonymous cannot read invite codes',
  (probeCodes.data?.length ?? 0) === 0,
  probeCodes.error ? probeCodes.error.code : `returned ${probeCodes.data?.length ?? 0} rows`,
);

// --- Progression, stakes and turn timers (0012, 0013) -------------------------
for (const [fn, args] of [
  ['get_rewards', {}],
  ['spin_daily', {}],
  ['get_tournament', {}],
  ['join_quick_match', { p_player_count: 2, p_stake: 100 }],
  ['claim_turn_timeout', { p_match_id: '00000000-0000-0000-0000-000000000000', p_version: 0 }],
  ['move_lobby_seat', { p_lobby_id: '00000000-0000-0000-0000-000000000000', p_seat: 1 }],
  ['seek_opponents', { p_lobby_id: '00000000-0000-0000-0000-000000000000', p_on: true }],
]) {
  const call = await client.rpc(fn, args);
  check(`anonymous cannot call ${fn}`, Boolean(call.error), call.error?.code);
}
const probeStakes = await client.from('match_stakes').select('*').limit(1);
check(
  'anonymous cannot read match stakes',
  (probeStakes.data?.length ?? 0) === 0,
  probeStakes.error ? probeStakes.error.code : `returned ${probeStakes.data?.length ?? 0} rows`,
);

// --- Store-version policy (0029) -----------------------------------------------
// Readable by anyone through the function, writable by no client.
const versionPolicy = await client.rpc('get_app_version_policy', { p_platform: 'android' });
check(
  'anonymous can read the version policy',
  !versionPolicy.error && versionPolicy.data !== null,
  versionPolicy.error?.code,
);
const forceVersion = await client
  .from('app_versions')
  .update({ min_version: '99.0.0' }, { count: 'exact' })
  .eq('platform', 'android');
check(
  'anonymous cannot change the minimum version',
  Boolean(forceVersion.error) || forceVersion.count === 0,
  forceVersion.error?.code ?? `${forceVersion.count} rows affected`,
);
const touchCall = await client.rpc('touch_app_versions', {});
check(
  'touch_app_versions is not exposed to clients',
  Boolean(touchCall.error),
  touchCall.error?.code,
);

const failed = results.filter((r) => !r.passed);
if (failed.length > 0) {
  console.error(`\n${failed.length} security check(s) FAILED. Do not ship this.`);
  process.exit(1);
}
console.log('\nAll RLS checks passed.');
