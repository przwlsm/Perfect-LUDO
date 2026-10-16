import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Exercises the whole friends -> challenge -> lobby -> countdown -> start flow
// against a real Supabase project, as three ordinary signed-in players. Run it
// after changing any social migration or RPC:
//
//   LUDO_TEST_EMAILS=a@x.com,b@x.com,c@x.com LUDO_TEST_PASSWORD=secret \
//     node scripts/check-social-flow.mjs
//
// The three accounts need to exist and be confirmed (Dashboard > Authentication
// > Users > Add user, with "Auto Confirm User" ticked). Nothing here needs a
// service key: it uses the same public anon key the app ships, so it also
// proves the flow works with the privileges a real client actually has.
//
// Re-runnable: it clears friendships and open challenges between the three
// accounts before it starts, and again when it finishes.
//
// This complements check-rls.mjs, which proves what an ANONYMOUS client cannot
// do. This one proves what a legitimate player can.

const EMAILS = (process.env.LUDO_TEST_EMAILS ?? '').split(',').map((e) => e.trim());
const PASSWORD = process.env.LUDO_TEST_PASSWORD;
if (EMAILS.length !== 3 || EMAILS.some((e) => !e) || !PASSWORD) {
  console.error('Set LUDO_TEST_EMAILS (three comma-separated addresses) and LUDO_TEST_PASSWORD.');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`PASS  ${name}${detail ? ' -- ' + detail : ''}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}${detail ? ' -- ' + detail : ''}`);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(label, email) {
  const c = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`${label} (${email}): ${error.message}`);
  return { label, c, uid: data.user.id };
}

const alice = await signIn('alice', EMAILS[0]);
const bob = await signIn('bob', EMAILS[1]);
const carol = await signIn('carol', EMAILS[2]);
const everyone = [alice, bob, carol];
console.log('Signed in: alice, bob, carol\n');

const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.c.rpc(fn, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
};
const quiet = (p) => p.catch(() => undefined);
const expectFail = async (name, who, fn, args, match) => {
  try {
    await rpc(who, fn, args);
    ok(name, false, 'call unexpectedly succeeded');
  } catch (e) {
    ok(name, match ? match.test(e.message) : true, e.message.slice(0, 66));
  }
};

// Re-runnable: clear any friendships and open challenges left by a prior run.
for (const who of everyone) {
  for (const other of everyone) {
    if (other !== who) await quiet(rpc(who, 'remove_friend', { p_friend_id: other.uid }));
  }
  const { data } = await who.c
    .from('challenges')
    .select('id')
    .in('status', ['PENDING', 'IN_LOBBY']);
  for (const row of data ?? [])
    await quiet(rpc(who, 'cancel_challenge', { p_challenge_id: row.id }));
}

// --- identity ---------------------------------------------------------------
const ids = {};
for (const who of everyone) {
  ids[who.label] = await rpc(who, 'ensure_social_identity', {
    p_display_name: who.label[0].toUpperCase() + who.label.slice(1),
  });
}
ok(
  'usernames assigned and unique',
  new Set(Object.values(ids).map((i) => i.username)).size === 3,
  Object.values(ids)
    .map((i) => '@' + i.username)
    .join(' '),
);
ok(
  'ensure is idempotent',
  (await rpc(alice, 'ensure_social_identity')).username === ids.alice.username,
);

// --- presence ---------------------------------------------------------------
for (const who of everyone) await rpc(who, 'touch_presence', { p_status: 'ONLINE' });
ok('heartbeat accepted', true);
await rpc(carol, 'touch_presence', { p_status: 'IN_GAME' });
ok('IN_GAME is a valid presence state', true);

// --- discovery --------------------------------------------------------------
const found = await rpc(alice, 'search_users', { p_query: ids.bob.username });
ok('search finds a player by username', found.length >= 1 && found.some((u) => u.id === bob.uid));
const hit = found.find((u) => u.id === bob.uid);
ok('search reports the relationship', hit?.relationship === 'NONE', hit?.relationship);
ok('search never leaks email', hit && !('email' in hit), Object.keys(hit ?? {}).join(','));
ok(
  'search by user id works',
  (await rpc(alice, 'search_users', { p_query: bob.uid })).length === 1,
);
ok(
  'one-character queries are refused',
  (await rpc(alice, 'search_users', { p_query: 'a' })).length === 0,
);

// --- friend requests --------------------------------------------------------
await expectFail(
  'cannot befriend yourself',
  alice,
  'send_friend_request',
  { p_target: alice.uid },
  /yourself/i,
);
await rpc(alice, 'send_friend_request', { p_target: bob.uid });
await expectFail(
  'duplicate request rejected',
  alice,
  'send_friend_request',
  { p_target: bob.uid },
  /already sent/i,
);

const incoming = await rpc(bob, 'list_friend_requests', { p_direction: 'incoming' });
ok('request reaches the receiver', incoming.length === 1);
ok(
  'sender sees it in their outbox',
  (await rpc(alice, 'list_friend_requests', { p_direction: 'sent' })).length === 1,
);
ok(
  'receiver is notified',
  (await bob.c.from('notifications').select('type')).data?.some((n) => n.type === 'FRIEND_REQUEST'),
);

await rpc(bob, 'respond_friend_request', { p_request_id: incoming[0].id, p_accept: true });
const aliceFriends = await rpc(alice, 'list_friends');
ok(
  'friendship is mutual',
  aliceFriends.length === 1 && (await rpc(bob, 'list_friends')).length === 1,
);
ok('friend reads as online', aliceFriends[0].presence === 'ONLINE', aliceFriends[0].presence);
await expectFail(
  'cannot re-add an existing friend',
  alice,
  'send_friend_request',
  { p_target: bob.uid },
  /already friends/i,
);

// Both sides want it: the second request completes the handshake.
await rpc(carol, 'send_friend_request', { p_target: alice.uid });
await rpc(alice, 'send_friend_request', { p_target: carol.uid });
ok(
  'mutual requests auto-accept instead of stacking',
  (await rpc(alice, 'list_friends')).length === 2,
);
const carolRow = (await rpc(alice, 'list_friends')).find((f) => f.id === carol.uid);
ok('a friend in a match shows as IN_GAME', carolRow?.presence === 'IN_GAME', carolRow?.presence);

// --- challenge --------------------------------------------------------------
await expectFail(
  'cannot challenge a non-friend',
  bob,
  'create_challenge',
  { p_friend_ids: [carol.uid] },
  /only challenge your friends/i,
);
await expectFail(
  'cannot challenge nobody',
  alice,
  'create_challenge',
  { p_friend_ids: [] },
  /Pick one friend/i,
);
await expectFail(
  'cannot seat four',
  alice,
  'create_challenge',
  { p_friend_ids: [bob.uid, carol.uid, alice.uid] },
  /already in the game|Pick one friend/i,
);

const duo = await rpc(alice, 'create_challenge', { p_friend_ids: [bob.uid] });
ok('challenge + lobby created', Boolean(duo.challengeId && duo.lobbyId));
await expectFail(
  'cannot open a second challenge',
  alice,
  'create_challenge',
  { p_friend_ids: [bob.uid] },
  /already have a game waiting/i,
);

const bobNotes = await bob.c
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false });
const invite = bobNotes.data?.find((n) => n.type === 'CHALLENGE_INVITE');
ok('invited player is notified', Boolean(invite), invite?.message);
ok('notification carries the lobby id', invite?.related_lobby_id === duo.lobbyId);

await expectFail(
  'uninvited player cannot join',
  carol,
  'join_lobby',
  { p_lobby_id: duo.lobbyId },
  /not invited/i,
);
await expectFail(
  'uninvited player cannot even read it',
  carol,
  'get_lobby',
  { p_lobby_id: duo.lobbyId },
  /no longer available/i,
);

let snap = await rpc(alice, 'get_lobby', { p_lobby_id: duo.lobbyId });
ok(
  'host is seated and joined',
  snap.players.find((p) => p.userId === alice.uid)?.status === 'JOINED',
);
ok('invitee is waiting', snap.players.find((p) => p.userId === bob.uid)?.status === 'INVITED');
ok('lobby waits before everyone arrives', snap.lobby.status === 'WAITING', snap.lobby.status);
ok('snapshot carries a server clock', Boolean(snap.serverNow));
await expectFail(
  'cannot start with an empty seat',
  alice,
  'start_match',
  { p_lobby_id: duo.lobbyId },
  /still waiting/i,
);

// --- realtime ---------------------------------------------------------------
const seen = [];
const channel = bob.c
  .channel('e2e-lobby')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${duo.lobbyId}` },
    (p) => seen.push(p.new?.status),
  );
const subscribed = await Promise.race([
  new Promise((r) => channel.subscribe((s) => s === 'SUBSCRIBED' && r(true))),
  sleep(10000).then(() => false),
]);
ok('realtime channel subscribed', subscribed === true);
// SUBSCRIBED acks the socket join, but the server-side change filter can take
// a moment longer to attach. Settle before provoking the first write, or the
// test races the subscription rather than testing delivery.
await sleep(1500);

// --- join, countdown, start -------------------------------------------------
await rpc(bob, 'respond_challenge', { p_challenge_id: duo.challengeId, p_accept: true });
snap = await rpc(bob, 'join_lobby', { p_lobby_id: duo.lobbyId });
ok('lobby enters countdown once full', snap.lobby.status === 'COUNTDOWN', snap.lobby.status);
ok('server sets an authoritative start time', Boolean(snap.lobby.startAt));
const lead = Date.parse(snap.lobby.startAt) - Date.parse(snap.serverNow);
ok('countdown is ~3s ahead of the server clock', lead > 1000 && lead <= 4000, `${lead}ms`);
await expectFail(
  'client cannot start early',
  alice,
  'start_match',
  { p_lobby_id: duo.lobbyId },
  /has not finished/i,
);
ok(
  'host notified that the player joined',
  (await alice.c.from('notifications').select('type')).data?.some(
    (n) => n.type === 'CHALLENGE_ACCEPTED',
  ),
);

await sleep(Math.max(0, lead) + 800);
const started = await rpc(bob, 'start_match', { p_lobby_id: duo.lobbyId });
ok('match starts after the countdown', started.lobby.status === 'STARTED', started.lobby.status);
ok(
  'start is idempotent for everyone else',
  (await rpc(alice, 'start_match', { p_lobby_id: duo.lobbyId })).lobby.status === 'STARTED',
);
ok('seats are distinct', new Set(started.players.map((p) => p.seatIndex)).size === 2);

await sleep(1500);
ok(
  'realtime delivered the transitions',
  seen.includes('COUNTDOWN') && seen.includes('STARTED'),
  seen.join(' -> ') || 'nothing received',
);
await bob.c.removeChannel(channel);

// --- decline ----------------------------------------------------------------
const declineRun = await rpc(alice, 'create_challenge', { p_friend_ids: [carol.uid] });
await rpc(carol, 'respond_challenge', { p_challenge_id: declineRun.challengeId, p_accept: false });
ok(
  'declining cancels the lobby rather than shrinking it',
  (await rpc(alice, 'get_lobby', { p_lobby_id: declineRun.lobbyId })).lobby.status === 'CANCELLED',
);
ok(
  'host told about the decline',
  (await alice.c.from('notifications').select('type')).data?.some(
    (n) => n.type === 'CHALLENGE_DECLINED',
  ),
);

// --- cancel -----------------------------------------------------------------
const cancelRun = await rpc(alice, 'create_challenge', { p_friend_ids: [bob.uid] });
await expectFail(
  'only the host may cancel',
  bob,
  'cancel_challenge',
  { p_challenge_id: cancelRun.challengeId },
  /Only the host/i,
);
await rpc(alice, 'cancel_challenge', { p_challenge_id: cancelRun.challengeId });
ok(
  'host can cancel',
  (await rpc(bob, 'get_lobby', { p_lobby_id: cancelRun.lobbyId })).lobby.status === 'CANCELLED',
);
await expectFail(
  'cancelled lobby cannot be joined',
  bob,
  'join_lobby',
  { p_lobby_id: cancelRun.lobbyId },
  /no longer accepting/i,
);

// --- 3-player flow ----------------------------------------------------------
const trio = await rpc(alice, 'create_challenge', { p_friend_ids: [bob.uid, carol.uid] });
let t = await rpc(alice, 'get_lobby', { p_lobby_id: trio.lobbyId });
ok('3-player lobby has three seats', t.players.length === 3 && t.lobby.maxPlayers === 3);
ok('all three seat indexes are distinct', new Set(t.players.map((p) => p.seatIndex)).size === 3);

await rpc(bob, 'join_lobby', { p_lobby_id: trio.lobbyId });
t = await rpc(alice, 'get_lobby', { p_lobby_id: trio.lobbyId });
ok(
  'still waiting at 2 of 3',
  t.lobby.status === 'WAITING',
  `${t.players.filter((p) => p.status === 'JOINED').length}/3 joined`,
);

t = await rpc(carol, 'join_lobby', { p_lobby_id: trio.lobbyId });
ok('countdown starts at 3 of 3', t.lobby.status === 'COUNTDOWN', t.lobby.status);

await rpc(carol, 'leave_lobby', { p_lobby_id: trio.lobbyId });
t = await rpc(alice, 'get_lobby', { p_lobby_id: trio.lobbyId });
ok('countdown stands down when someone leaves', t.lobby.status === 'WAITING', t.lobby.status);
ok('start time is cleared', t.lobby.startAt === null);
await expectFail(
  'cannot start a stood-down lobby',
  alice,
  'start_match',
  { p_lobby_id: trio.lobbyId },
  /still waiting/i,
);

t = await rpc(carol, 'join_lobby', { p_lobby_id: trio.lobbyId });
ok('rejoining resumes the countdown', t.lobby.status === 'COUNTDOWN', t.lobby.status);

const trioLead = Date.parse(t.lobby.startAt) - Date.parse(t.serverNow);
await sleep(Math.max(0, trioLead) + 800);
t = await rpc(carol, 'start_match', { p_lobby_id: trio.lobbyId });
ok('3-player match starts', t.lobby.status === 'STARTED', t.lobby.status);

// --- shared board (authoritative rules, migration 0005) ---------------------
// The 3-player match from above is now live. Legal moves are computed with the
// compiled TypeScript engine — the same one check-online-rules.mjs proves the
// SQL agrees with — so this section asserts that the HOSTED database enforces
// those rules, not that the rules themselves are right.

const compiled = path.resolve('.test-artifacts/domain-rules');
async function compileDomain(dir, target) {
  await fsp.mkdir(target, { recursive: true });
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await compileDomain(path.join(dir, entry.name), path.join(target, entry.name));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      const source = await fsp.readFile(path.join(dir, entry.name), 'utf8');
      await fsp.writeFile(
        path.join(target, entry.name.replace(/\.ts$/, '.js')),
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      );
    }
  }
}
await compileDomain('src/domain', compiled);
const engine = createRequire(import.meta.url)(path.join(compiled, 'index.js'));

const trioSeats = {};
let m = await rpc(alice, 'get_match', { p_lobby_id: trio.lobbyId });
for (const who of everyone) {
  const mine = await rpc(who, 'get_match', { p_lobby_id: trio.lobbyId });
  trioSeats[who.label] = mine.mySeat;
}
const seatOwner = (seat) => everyone.find((w) => trioSeats[w.label] === seat);
ok(
  'every player is seated in the match',
  new Set(Object.values(trioSeats)).size === 3,
  JSON.stringify(trioSeats),
);
ok('match starts on an empty board', m.match.state === null && m.match.version === 0);
ok('match starts at seat 0', m.match.turnSeat === 0 && m.match.lastRoll === null);

const onTurn = seatOwner(m.match.turnSeat);
const offTurn = everyone.find((w) => w !== onTurn);
const opening = engine.createGame(engine.seatColors(3));
const roll = (who, version) =>
  rpc(who, 'roll_match_dice', { p_match_id: m.match.id, p_version: version });
const submit = (who, version, state, winnerSeat = null) =>
  rpc(who, 'submit_match_turn', {
    p_match_id: m.match.id,
    p_version: version,
    p_state: state,
    p_winner_seat: winnerSeat,
  });

await expectFail(
  'a player cannot roll out of turn',
  offTurn,
  'roll_match_dice',
  { p_match_id: m.match.id, p_version: m.match.version },
  /not your turn/i,
);
await expectFail(
  'cannot move before rolling',
  onTurn,
  'submit_match_turn',
  { p_match_id: m.match.id, p_version: m.match.version, p_state: opening },
  /roll the dice/i,
);

m = await roll(onTurn, m.match.version);
const die = m.match.lastRoll;
ok('the server issues a die', die >= 1 && die <= 6, `rolled ${die}`);
ok('rolling bumps the version', m.match.version === 1);
const again = await roll(onTurn, 0);
ok(
  'a retried roll with the old version is idempotent, not a second roll',
  again.match.lastRoll === die && again.match.version === 1,
);
await expectFail(
  'cannot roll twice in one turn',
  onTurn,
  'roll_match_dice',
  { p_match_id: m.match.id, p_version: m.match.version },
  /already rolled/i,
);

// The only boards the server will accept are exact legal successors.
const rolled = await engine.rollDice(opening, { nextInt: async () => die });
const moves = engine.getValidMovesForCurrentPlayer(rolled);
const legal = moves.length ? engine.applyMove(rolled, moves[0]) : engine.endTurnWithoutMove(rolled);
const forged = structuredClone(legal);
forged.players[0].pieces[0].progress = 30;

await expectFail(
  'a player cannot move out of turn',
  offTurn,
  'submit_match_turn',
  { p_match_id: m.match.id, p_version: m.match.version, p_state: legal },
  /not your turn/i,
);
await expectFail(
  'a stale write is refused immediately',
  onTurn,
  'submit_match_turn',
  { p_match_id: m.match.id, p_version: m.match.version - 1, p_state: legal },
  /has changed/i,
);
await expectFail(
  'a forged board is refused by the rules engine',
  onTurn,
  'submit_match_turn',
  { p_match_id: m.match.id, p_version: m.match.version, p_state: forged },
  /not legal/i,
);

m = await submit(onTurn, m.match.version, legal);
ok('a legal move is accepted', m.match.state !== null && m.match.version === 2);
ok(
  'the turn passes to the seat the board names',
  m.match.turnSeat === legal.currentPlayerIndex,
  `seat ${m.match.turnSeat}${moves.length ? '' : ' (no legal move, turn passed)'}`,
);
ok('the roll is cleared, so the next die must come from the server', m.match.lastRoll === null);
const replay = await submit(onTurn, 1, legal);
ok('retrying a lost submit does not apply the move twice', replay.match.version === 2);

const next = seatOwner(m.match.turnSeat);
if (next === onTurn) {
  ok('a six keeps the same seat for a bonus turn', die === 6);
} else {
  await expectFail(
    'the previous player cannot keep playing',
    onTurn,
    'roll_match_dice',
    { p_match_id: m.match.id, p_version: m.match.version },
    /not your turn/i,
  );
}
m = await roll(next, m.match.version);
ok('the next player can roll', m.match.lastRoll >= 1 && m.match.lastRoll <= 6);

// Everyone reads the same board.
const asSeen = await Promise.all(
  everyone.map((w) => rpc(w, 'get_match', { p_lobby_id: trio.lobbyId })),
);
ok(
  'all three players see the same version and turn',
  new Set(asSeen.map((s) => `${s.match.version}:${s.match.turnSeat}:${s.match.lastRoll}`)).size ===
    1,
);

m = await rpc(next, 'abandon_match', { p_match_id: m.match.id });
ok('any player can end a stalled match', m.match.status === 'ABANDONED', m.match.status);
await expectFail(
  'an ended match cannot be rolled',
  next,
  'roll_match_dice',
  { p_match_id: m.match.id, p_version: m.match.version },
  /finished/i,
);

// --- public identity (migration 0006) ---------------------------------------
for (const who of everyone) await quiet(rpc(who, 'leave_quick_match'));
const me = await rpc(alice, 'ensure_social_identity');
ok('members carry an eight-digit public ID', /^[1-9][0-9]{7}$/.test(me.publicId), me.publicId);
ok('members are not guests', me.isGuest === false);
const bobId = (await rpc(bob, 'ensure_social_identity')).publicId;
const byPublicId = await rpc(alice, 'search_users', { p_query: bobId });
ok(
  'search finds a player by public ID',
  byPublicId.length === 1 && byPublicId[0].id === bob.uid && byPublicId[0].public_id === bobId,
);
ok(
  'own username reads as available to its owner',
  (await rpc(alice, 'check_username_available', { p_username: ids.alice.username })).available,
);
ok(
  "a friend's username reads as taken",
  !(await rpc(alice, 'check_username_available', { p_username: ids.bob.username })).available,
);
ok(
  'guest_ prefix is reserved',
  !(await rpc(alice, 'check_username_available', { p_username: 'guest_0001' })).available,
);
await expectFail(
  'members cannot take a guest_ handle',
  alice,
  'update_social_identity',
  { p_username: 'guest_0001', p_avatar: null },
  /reserved/i,
);

// --- quick play ---------------------------------------------------------------
const ticketSeen = [];
const ticketChannel = bob.c
  .channel('e2e-ticket')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'matchmaking_queue', filter: `user_id=eq.${bob.uid}` },
    (p) => ticketSeen.push(p.new?.lobby_id ? 'MATCHED' : 'WAITING'),
  );
await Promise.race([
  new Promise((r) => ticketChannel.subscribe((s) => s === 'SUBSCRIBED' && r(true))),
  sleep(10000),
]);
await sleep(1500);

const firstTicket = await rpc(bob, 'join_quick_match', { p_player_count: 2 });
ok('first player waits in the queue', firstTicket.status === 'WAITING', firstTicket.status);
ok('the ticket says how many are waiting', firstTicket.waiting === 1, `${firstTicket.waiting}`);
ok(
  'a heartbeat keeps the same ticket',
  (await rpc(bob, 'join_quick_match', { p_player_count: 2 })).status === 'WAITING',
);
await expectFail(
  'table sizes outside 2-4 are refused',
  carol,
  'join_quick_match',
  { p_player_count: 6 },
  /2 to 4/i,
);
const secondTicket = await rpc(carol, 'join_quick_match', { p_player_count: 2 });
ok('second player is seated immediately', secondTicket.status === 'MATCHED', secondTicket.status);
const bobTicket = await rpc(bob, 'join_quick_match', { p_player_count: 2 });
ok(
  'first player learns of the same table',
  bobTicket.status === 'MATCHED' && bobTicket.lobbyId === secondTicket.lobbyId,
);
let q = await rpc(bob, 'get_lobby', { p_lobby_id: secondTicket.lobbyId });
ok('quick table is a QUICK challenge', q.challenge.kind === 'QUICK', q.challenge.kind);
ok('quick table counts down at once', q.lobby.status === 'COUNTDOWN', q.lobby.status);
ok(
  'everyone is joined and ready without an invite step',
  q.players.length === 2 && q.players.every((p) => p.status === 'JOINED' && p.isReady),
);
const quickLead = Date.parse(q.lobby.startAt) - Date.parse(q.serverNow);
ok('quick countdown leaves time to arrive (>=4s)', quickLead >= 4000, `${quickLead}ms`);
ok('the longest-waiting player hosts', q.lobby.hostId === bob.uid);
ok(
  'a third player does not join a full table',
  (await rpc(alice, 'join_quick_match', { p_player_count: 2 })).status === 'WAITING',
);
await sleep(1500);
ok(
  'realtime reports the seat on the own ticket',
  ticketSeen.includes('MATCHED'),
  ticketSeen.join(' -> ') || 'nothing received',
);
await bob.c.removeChannel(ticketChannel);
ok(
  'a live quick table does not block a friend challenge',
  Boolean((await rpc(bob, 'create_challenge', { p_friend_ids: [alice.uid] })).lobbyId),
);
for (const row of (await bob.c.from('challenges').select('id, kind').eq('kind', 'FRIENDS'))
  .data ?? [])
  await quiet(rpc(bob, 'cancel_challenge', { p_challenge_id: row.id }));
await rpc(carol, 'leave_lobby', { p_lobby_id: secondTicket.lobbyId });
q = await rpc(bob, 'get_lobby', { p_lobby_id: secondTicket.lobbyId });
ok('a stranger leaving breaks the table up', q.lobby.status === 'CANCELLED', q.lobby.status);
ok(
  'the remaining player is told',
  (await bob.c.from('notifications').select('type, related_lobby_id')).data?.some(
    (n) => n.type === 'CHALLENGE_CANCELLED' && n.related_lobby_id === secondTicket.lobbyId,
  ),
);
for (const who of everyone) await quiet(rpc(who, 'leave_quick_match'));

// --- guests (needs "Allow anonymous sign-ins" in the dashboard) ---------------
const guestClient = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const guestSignIn = await guestClient.auth.signInAnonymously();
if (guestSignIn.error?.code === 'anonymous_provider_disabled') {
  console.log('SKIP  guest checks: anonymous sign-ins are disabled in the Supabase dashboard');
} else if (guestSignIn.error) {
  ok('guest sign-in', false, guestSignIn.error.message);
} else {
  const guest = { label: 'guest', c: guestClient, uid: guestSignIn.data.user.id };
  const ghost = await rpc(guest, 'ensure_social_identity');
  ok('guests get a temporary handle', /^guest_[0-9]{4}$/.test(ghost.username), ghost.username);
  ok('guests have no public ID', ghost.publicId === null && ghost.isGuest === true);
  await expectFail(
    'guests cannot send friend requests',
    guest,
    'send_friend_request',
    { p_target: alice.uid },
    /Create an account/i,
  );
  await expectFail(
    'guests cannot search players',
    guest,
    'search_users',
    { p_query: ids.alice.username },
    /Create an account/i,
  );
  await expectFail(
    'guests cannot change their handle',
    guest,
    'update_social_identity',
    { p_username: 'ghostrider', p_avatar: null },
    /Create an account/i,
  );
  await expectFail(
    'members cannot befriend a guest',
    alice,
    'send_friend_request',
    { p_target: guest.uid },
    /not be found/i,
  );
  ok(
    'guests are invisible to search',
    (await rpc(alice, 'search_users', { p_query: ghost.username })).length === 0,
  );
  const g1 = await rpc(guest, 'join_quick_match', { p_player_count: 2 });
  const g2 = await rpc(alice, 'join_quick_match', { p_player_count: 2 });
  ok('a guest and a member can be seated together', g1.status === 'WAITING' && g2.status === 'MATCHED');
  const gl = await rpc(guest, 'get_lobby', { p_lobby_id: g2.lobbyId });
  ok('the guest can read the shared lobby', gl.players.some((p) => p.userId === guest.uid));
  await rpc(alice, 'leave_lobby', { p_lobby_id: g2.lobbyId });
  await quiet(rpc(guest, 'leave_quick_match'));
  await quiet(rpc(alice, 'leave_quick_match'));
  await guestClient.auth.signOut();
}

// --- leave the accounts clean ----------------------------------------------
for (const who of everyone) {
  for (const other of everyone) {
    if (other !== who) await quiet(rpc(who, 'remove_friend', { p_friend_id: other.uid }));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
