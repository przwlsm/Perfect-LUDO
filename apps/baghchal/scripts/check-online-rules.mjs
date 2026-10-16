// Proves the PL/pgSQL rules in supabase/migrations match the TypeScript
// engine, then exercises the match functions the way a client (or a
// tampered client) would. Runs the migrations in an in-process PostgreSQL
// (pglite), so it needs no server and runs in CI on every push.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Compile the engine for this Node-only test.
const engineSource = path.resolve('../../packages/baghchal-engine/src');
const out = path.resolve('.test-artifacts/engine');
async function compile(dir, target) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory())
      await compile(path.join(dir, entry.name), path.join(target, entry.name));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      const source = await fs.readFile(path.join(dir, entry.name), 'utf8');
      await fs.writeFile(
        path.join(target, entry.name.replace(/\.ts$/, '.js')),
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      );
    }
  }
}
await compile(engineSource, out);
const { createGame, legalMoves, applyMove, moveKey, boardFromString } = createRequire(
  import.meta.url,
)(path.join(out, 'index.js'));

const db = new PGlite();
const normalize = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
let compared = 0;

/** Every legal move and its successor from the database, keyed like the engine's. */
async function sqlSuccessors(state) {
  const { rows } = await db.query(
    'select m as move, public.bc_next($1::jsonb, m) as next from public.bc_legal_moves($1::jsonb) m',
    [JSON.stringify(state)],
  );
  return new Map(rows.map((r) => [moveKey(r.move), r.next]));
}

/** Asserts the database agrees with the engine on this position, and returns the engine's successors. */
async function compare(state, label) {
  const moves = legalMoves(state);
  const expected = new Map(moves.map((m) => [moveKey(m), applyMove(state, m)]));
  const actual = await sqlSuccessors(state);
  assert.deepEqual(
    [...actual.keys()].sort(),
    [...expected.keys()].sort(),
    `legal moves differ: ${label}`,
  );
  for (const [key, next] of expected) {
    assert.equal(
      normalize(actual.get(key)),
      normalize(next),
      `successor differs for ${key}: ${label}`,
    );
  }
  compared += moves.length;
  return moves;
}

function position(rows, turn, extra = {}) {
  return {
    ...createGame(),
    board: boardFromString(rows.replace(/\s+/g, '')),
    turn,
    goatsInHand: 0,
    ...extra,
  };
}

const uidA = randomUUID();
const uidB = randomUUID();
const uidC = randomUUID();
async function as(uid) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
}
async function call(fn, args = []) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await db.query(`select public.${fn}(${placeholders}) as r`, args);
  return rows[0].r;
}
async function rejects(fn, args, pattern) {
  await assert.rejects(call(fn, args), (error) => {
    assert.match(error.message, pattern, `${fn} should fail with ${pattern}`);
    return true;
  });
}

try {
  // The slice of Supabase's auth schema the migrations touch.
  await db.exec(
    `create role anon; create role authenticated;
     grant usage on schema public to anon, authenticated;
     create schema auth;
     create table auth.users(id uuid primary key, email text, is_anonymous boolean not null default false);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  for (const file of (await fs.readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(await fs.readFile(path.join('supabase/migrations', file), 'utf8'));

  // --- Rules parity -------------------------------------------------------
  assert.equal(
    normalize((await db.query('select public.bc_opening() as s')).rows[0].s),
    normalize(createGame()),
    'opening position',
  );
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const endings = {};
  for (let game = 0; game < 40; game++) {
    let state = createGame();
    for (let ply = 0; ply < 160 && !state.result; ply++) {
      const moves = await compare(state, `game ${game} ply ${ply}`);
      // Tigers prefer captures, so games reach five captures and trapped tigers too.
      const jumps = moves.filter((m) => m.kind === 'jump');
      const pick = jumps.length && game % 2 === 0 && random() % 3 ? jumps : moves;
      state = applyMove(state, pick[random() % pick.length]);
    }
    if (state.result) endings[state.result.reason] = (endings[state.result.reason] ?? 0) + 1;
  }
  const edge = [
    [position('TG...\n.G...\n.....\n.....\n.....', 'tiger'), 'jumps from a corner'],
    [position('.T...\n..G..\n...G.\n.....\n.....', 'tiger'), 'no diagonal jump from an odd point'],
    [position('TGG..\nGGG..\nG.G..\n.....\n.....', 'tiger'), 'tigers trapped'],
    [position('GT...\nTT...\n.....\n.....\n.....', 'goat'), 'goats cannot move'],
    [position('TG...\n.....\n.....\n.....\n.....', 'tiger', { goatsCaptured: 4 }), 'fifth capture'],
    [
      position('T....\n.....\n.....\n.....\n....G', 'tiger', {
        quietPositions: Array.from({ length: 59 }, (_, i) => `k${i}`),
      }),
      'no-progress draw',
    ],
    [position('T....\n.....\n.....\n.....\n....G', 'goat', { goatsInHand: 1 }), 'last placement'],
  ];
  for (const [state, label] of edge) await compare(state, label);
  {
    // Repetition: shuffle back and forth until the third occurrence.
    let state = position('T....\n.....\n.....\n.....\n....G', 'tiger');
    const cycle = [
      { kind: 'move', from: 0, to: 1 },
      { kind: 'move', from: 24, to: 23 },
      { kind: 'move', from: 1, to: 0 },
      { kind: 'move', from: 23, to: 24 },
    ];
    for (const move of [...cycle, ...cycle, cycle[0]]) {
      await compare(state, 'repetition');
      state = applyMove(state, move);
    }
    assert.deepEqual(state.result, { kind: 'draw', reason: 'repetition' });
  }
  const trapped = (
    await db.query(`select public.bc_result($1::jsonb) as r`, [
      JSON.stringify(position('TGG..\nGGG..\nG.G..\n.....\n.....', 'tiger')),
    ])
  ).rows[0].r;
  assert.deepEqual(trapped, { kind: 'win', winner: 'goat', reason: 'trapped' });
  console.log(
    `Rules parity: ${compared} legal transitions matched. Random endings: ${JSON.stringify(endings)}`,
  );

  // --- Match functions ----------------------------------------------------
  await db.query(
    'insert into auth.users (id, is_anonymous) values ($1, true), ($2, true), ($3, true)',
    [uidA, uidB, uidC],
  );
  await as(null);
  await rejects('create_match', ['goat', 45], /signed in/);
  await as(uidA);
  await rejects('create_match', ['dragon', 45], /tigers or goats/);
  await rejects('create_match', ['goat', 5], /15 seconds/);
  let snap = await call('create_match', ['goat', 45]);
  assert.equal(snap.match.status, 'WAITING');
  assert.equal(snap.mySide, 'goat');
  assert.match(snap.match.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(snap.players.goat.username.slice(0, 7), 'player_');
  const first = snap.match.id;
  // Opening another game closes the first.
  snap = await call('create_match', ['tiger', 30]);
  const id = snap.match.id;
  assert.equal(
    (await db.query('select status from public.matches where id = $1', [first])).rows[0].status,
    'ABANDONED',
  );
  const code = snap.match.code;
  // The host joining their own code just returns it; a stranger joins and the clock starts.
  assert.equal((await call('join_match', [code.toLowerCase()])).match.status, 'WAITING');
  await as(uidB);
  await rejects('join_match', ['ZZZZZZ'], /No open game/);
  snap = await call('join_match', [` ${code.toLowerCase()} `]);
  assert.equal(snap.match.status, 'ACTIVE');
  assert.equal(snap.mySide, 'goat');
  assert.ok(snap.match.turnDeadline, 'clock started');
  assert.equal(snap.match.version, 1);
  await as(uidC);
  await rejects('join_match', [code], /No open game/);
  await rejects('get_match', [id], /no longer available/);
  await rejects('submit_move', [id, 1, { kind: 'place', to: 12 }], /not in that match/);
  // Wrong turn, illegal move, stale version.
  await as(uidA);
  await rejects('submit_move', [id, 1, { kind: 'move', from: 0, to: 1 }], /not your turn/);
  await as(uidB);
  await rejects('submit_move', [id, 1, { kind: 'place', to: 0 }], /not legal/);
  await rejects('submit_move', [id, 1, { kind: 'move', from: 24, to: 23 }], /not legal/);
  await rejects('submit_move', [id, 0, { kind: 'place', to: 12 }], /board has changed/);
  snap = await call('submit_move', [id, 1, { kind: 'place', to: 12 }]);
  assert.equal(snap.match.version, 2);
  assert.equal(snap.match.state.board[12], 'G');
  assert.equal(snap.match.state.turn, 'tiger');
  assert.deepEqual(snap.match.lastMove, { kind: 'place', to: 12 });
  // The same submission again is answered, not replayed.
  const retry = await call('submit_move', [id, 1, { kind: 'place', to: 12 }]);
  assert.equal(retry.match.version, 2);
  await rejects(
    'submit_move',
    [id, 1, { kind: 'place', to: 13 }],
    /not your turn|board has changed/,
  );
  assert.equal(
    (await db.query('select count(*)::int as n from public.match_moves where match_id = $1', [id]))
      .rows[0].n,
    1,
  );
  // The clock: only the waiting player, only once it has run out.
  await rejects('claim_timeout', [id, 2], /not run out/);
  await as(uidA);
  await rejects('claim_timeout', [id, 2], /your own move/);
  await db.query(
    `update public.matches set turn_deadline = now() - interval '1 second' where id = $1`,
    [id],
  );
  await as(uidB);
  await rejects('claim_timeout', [id, 1], /board has changed/);
  snap = await call('claim_timeout', [id, 2]);
  assert.equal(snap.match.status, 'FINISHED');
  assert.deepEqual(snap.match.state.result, { kind: 'win', winner: 'goat', reason: 'timeout' });
  assert.equal(
    (await call('claim_timeout', [id, 2])).match.version,
    3,
    'claim retry is idempotent',
  );
  await rejects('submit_move', [id, 3, { kind: 'move', from: 0, to: 1 }], /not in play/);
  // Resignation.
  await as(uidA);
  snap = await call('create_match', ['goat', 60]);
  await as(uidB);
  snap = await call('join_match', [snap.match.code]);
  snap = await call('resign_match', [snap.match.id]);
  assert.deepEqual(snap.match.state.result, { kind: 'win', winner: 'goat', reason: 'resigned' });
  // A full game through the function, both seats, to the result.
  await as(uidA);
  snap = await call('create_match', ['tiger', 60]);
  await as(uidB);
  snap = await call('join_match', [snap.match.code]);
  const gameId = snap.match.id;
  let plies = 0;
  while (snap.match.status === 'ACTIVE' && plies < 200) {
    const state = snap.match.state;
    await as(state.turn === 'tiger' ? uidA : uidB);
    const moves = legalMoves(state);
    const jumps = moves.filter((m) => m.kind === 'jump');
    const move = (jumps.length ? jumps : moves)[random() % (jumps.length || moves.length)];
    snap = await call('submit_move', [gameId, snap.match.version, move]);
    assert.equal(
      normalize(snap.match.state),
      normalize(applyMove(state, move)),
      'stored state follows the engine',
    );
    plies += 1;
  }
  assert.equal(snap.match.status, 'FINISHED', 'the game reached a result');
  assert.equal(
    (
      await db.query('select count(*)::int as n from public.match_moves where match_id = $1', [
        gameId,
      ])
    ).rows[0].n,
    plies,
  );
  // --- Economy ------------------------------------------------------------
  // The finished game above paid both seats once; walking out paid nothing.
  await as(uidA);
  let wallet = await call('get_wallet');
  // Before the full game: A won the resignation (+30) and lost on time (0); B the reverse.
  const aStart = 130;
  const finished = (
    await db.query('select result, tiger_id from public.matches where id = $1', [gameId])
  ).rows[0];
  const aWon = finished.result.winner === (finished.tiger_id === uidA ? 'tiger' : 'goat');
  assert.equal(wallet.coins, aStart + (aWon ? 30 : 10), 'match reward paid to A');
  await as(uidB);
  wallet = await call('get_wallet');
  assert.equal(wallet.coins, aStart + (aWon ? 10 : 30), 'match reward paid to B');
  const profile = (
    await db.query('select games_played, games_won from public.profiles where uid = $1', [uidB])
  ).rows[0];
  assert.equal(
    profile.games_played,
    3,
    'the timeout, the resignation and the full game all counted',
  );
  // The result card knows the reward.
  snap = await call('get_match', [gameId]);
  assert.equal(snap.match.myReward, aWon ? 10 : 30);
  assert.equal(snap.match.myRewardDoubled, false);
  // Doubling it with an ad: once, then refused.
  const doubled = await call('claim_ad_reward', ['double', gameId]);
  assert.equal(doubled.granted, aWon ? 10 : 30);
  assert.equal(doubled.coins, wallet.coins + doubled.granted);
  await rejects('claim_ad_reward', ['double', gameId], /already doubled/);
  await rejects('claim_ad_reward', ['double', randomUUID()], /no game reward/);
  assert.equal((await call('get_match', [gameId])).match.myRewardDoubled, true);
  // Earning coins with ads: 25 each, five a day.
  for (let i = 0; i < 5; i++) wallet = await call('claim_ad_reward', ['coins']);
  assert.equal(wallet.adRewardsToday.coins, 5);
  await rejects('claim_ad_reward', ['coins'], /all the ad rewards for today/);
  await rejects('claim_ad_reward', ['jackpot'], /not available/);
  // The store: catalogue, and what cannot be bought.
  const store = await call('get_store');
  assert.ok(store.items.some((i) => i.id === 'mahogany' && i.price === 400));
  assert.ok(store.products.some((p) => p.id === 'baghchal.supporter' && p.kind === 'pass'));
  assert.deepEqual(store.wallet.owned, []);
  await rejects('buy_item', ['golden_dawn'], /Supporter Pass/);
  await rejects('buy_item', ['throne'], /not for sale/);
  await rejects('equip_item', ['mahogany'], /do not own/);
  await rejects('buy_item', ['cyberpunk'], /more coins/);
  // A coin pack first: granted once per store order, however often the order is replayed.
  const unpaid = wallet.coins;
  await db.query("select public.grant_iap($1, 'baghchal.coins.small', 'android', 'GPA.1')", [uidB]);
  await db.query("select public.grant_iap($1, 'baghchal.coins.small', 'android', 'GPA.1')", [uidB]);
  wallet = await call('get_wallet');
  assert.equal(wallet.coins, unpaid + 300, 'a replayed order grants once');
  // Buying and equipping.
  const before = wallet.coins;
  wallet = await call('buy_item', ['mahogany']);
  assert.equal(wallet.coins, before - 400);
  assert.deepEqual(wallet.owned, ['mahogany']);
  assert.equal(
    (await call('buy_item', ['mahogany'])).coins,
    before - 400,
    'buying twice charges once',
  );
  wallet = await call('equip_item', ['mahogany']);
  assert.equal(wallet.equippedBoard, 'mahogany');
  wallet = await call('equip_item', ['classic_wood']);
  assert.equal(wallet.equippedBoard, 'classic_wood', 'the free look is always owned');
  await rejects('equip_item', ['golden_dawn'], /do not own/);
  // The pass unlocks its perk, and a restored pass follows the store account to a new profile.
  await db.query("select public.grant_iap($1, 'baghchal.supporter', 'ios', 'TX.1')", [uidB]);
  wallet = await call('equip_item', ['golden_dawn']);
  assert.equal(wallet.supporter, true);
  assert.equal(wallet.equippedBoard, 'golden_dawn');
  await as(uidC);
  await call('ensure_profile');
  await db.query("select public.grant_iap($1, 'baghchal.supporter', 'ios', 'TX.1')", [uidC]);
  assert.equal((await call('get_wallet')).supporter, true, 'restored to the new profile');
  await as(uidB);
  assert.equal((await call('get_wallet')).supporter, false, 'and gone from the old one');
  await assert.rejects(
    db.query("select public.grant_iap($1, 'baghchal.jet', 'ios', 'TX.2')", [uidB]),
    /Unknown product/,
  );
  console.log(
    'Economy: match rewards, ad rewards and caps, store buys and equips, purchase grants and restores all behaved.',
  );

  // Row Level Security: a member sees the match, a stranger sees nothing, nobody writes.
  await db.exec('set role authenticated');
  await as(uidC);
  assert.equal((await db.query('select count(*)::int as n from public.matches')).rows[0].n, 0);
  await as(uidA);
  assert.ok((await db.query('select count(*)::int as n from public.matches')).rows[0].n >= 1);
  assert.equal(
    (await db.query('select count(*)::int as n from public.profiles')).rows[0].n,
    1,
    'only own profile',
  );
  await assert.rejects(
    db.query(`update public.matches set board = 'T........................'`),
    /permission denied/,
  );
  await assert.rejects(db.query(`update public.profiles set coins = 1000000`), /permission denied/);
  await assert.rejects(
    db.query(
      `insert into public.match_moves (match_id, ply, side, move) values ($1, 99, 'goat', '{}')`,
      [gameId],
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.query('select public.bc_next($1::jsonb, $2::jsonb)', ['{}', '{}']),
    /permission denied/,
  );
  for (const table of ['coin_ledger', 'inventory', 'iap_receipts', 'ad_rewards'])
    await assert.rejects(db.query(`select count(*) from public.${table}`), /permission denied/);
  await assert.rejects(
    db.query("select public.grant_iap($1, 'baghchal.coins.small', 'android', 'X')", [uidA]),
    /permission denied/,
  );
  assert.equal(
    (await db.query('select count(*)::int as n from public.store_items')).rows[0].n,
    9,
    'the catalogue is readable',
  );
  await db.exec('reset role');
  console.log(
    `Match functions: seats, turns, versions, legality, retries, clock, resignation, a ${plies}-ply game and RLS all behaved.`,
  );
} finally {
  await db.close();
}
