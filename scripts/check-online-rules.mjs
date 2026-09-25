import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Compile the pure domain for this Node-only database parity test.
const out = path.resolve('.test-artifacts/domain-rules');
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
await compile('src/domain', out);
const {
  createGame,
  seatColors,
  rollDice,
  getValidMovesForCurrentPlayer,
  applyMove,
  endTurnWithoutMove,
  getFinishProgress,
} = createRequire(import.meta.url)(path.join(out, 'index.js'));
const db = new PGlite();
let compared = 0;
const normalize = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
const outcomes = async (base, die) => {
  const rolled = await rollDice(base, { nextInt: async () => die });
  const moves = getValidMovesForCurrentPlayer(rolled);
  return moves.length ? moves.map((m) => applyMove(rolled, m)) : [endTurnWithoutMove(rolled)];
};
async function compare(base, die) {
  const expected = await outcomes(base, die);
  const { rows } = await db.query('select public.ludo_successors($1::jsonb,$2) as state', [
    JSON.stringify(base),
    die,
  ]);
  assert.deepEqual(
    rows.map((r) => normalize(r.state)).sort(),
    expected.map(normalize).sort(),
    `Rule mismatch: ${base.players.length} players, die ${die}`,
  );
  compared += expected.length;
  return expected;
}
try {
  // The slice of Supabase's auth schema the migrations touch: the users table
  // (email, anonymous flag, sign-up metadata) and the two claim helpers.
  await db.exec(
    `create role anon;create role authenticated;create schema auth;
     create table auth.users(id uuid primary key, email text, is_anonymous boolean not null default false, raw_user_meta_data jsonb);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;`,
  );
  for (const file of (await fs.readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(await fs.readFile(path.join('supabase/migrations', file), 'utf8'));
  let seed = 0x12345678;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  for (const count of [2, 3, 4, 5, 6]) {
    let state = createGame(seatColors(count));
    assert.deepEqual(
      (await db.query('select public.ludo_opening($1) as state', [count])).rows[0].state,
      state,
    );
    for (let turn = 0; turn < 350; turn++) {
      const die = (random() % 6) + 1;
      if (turn % 10 === 0) for (let check = 1; check <= 6; check++) await compare(state, check);
      const choices = await compare(state, die);
      state = choices[random() % choices.length];
      if (state.status === 'FINISHED') state = createGame(seatColors(count));
    }
    const almost = createGame(seatColors(count));
    const finish = getFinishProgress(count);
    almost.players[0].pieces.forEach((p, i) => (p.progress = i === 3 ? finish - 1 : finish));
    for (let die = 1; die <= 6; die++) await compare(almost, die);
    almost.consecutiveSixes = 2;
    await compare(almost, 6);
  }
  console.log(
    `PASS: ${compared} PostgreSQL transitions match the domain engine across 2-6 players.`,
  );
  // Exercise real SQL permissions and RPC contracts with isolated in-memory accounts.
  const a = randomUUID(),
    b = randomUUID(),
    outsider = randomUUID(),
    lobby = randomUUID(),
    match = randomUUID();
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [a, b, outsider]);
  await db.query(
    "insert into public.profiles(uid,username) values ($1,'player_a'),($2,'player_b'),($3,'outsider')",
    [a, b, outsider],
  );
  await db.query(
    "insert into public.lobbies(id,host_id,max_players,status) values ($1,$2,2,'STARTED')",
    [lobby, a],
  );
  await db.query('insert into public.matches(id,lobby_id,player_count) values ($1,$2,2)', [
    match,
    lobby,
  ]);
  await db.query(
    'insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1)',
    [match, a, b],
  );
  const login = async (uid, guest = false) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: uid, is_anonymous: guest }),
    ]);
  };
  await login(a);
  const opening = createGame(seatColors(2));
  await assert.rejects(
    db.query('select public.submit_match_turn($1,0,$2::jsonb,null)', [
      match,
      JSON.stringify(opening),
    ]),
    /Roll the dice/,
  );
  const rolled = (await db.query('select public.roll_match_dice($1,0) as snapshot', [match]))
    .rows[0].snapshot;
  const duplicate = (await db.query('select public.roll_match_dice($1,0) as snapshot', [match]))
    .rows[0].snapshot;
  assert.equal(rolled.match.lastRoll, duplicate.match.lastRoll);
  assert.equal(duplicate.match.version, 1);
  const forged = structuredClone(opening);
  forged.players[0].pieces[0].progress = 57;
  await assert.rejects(
    db.query('select public.submit_match_turn($1,1,$2::jsonb,null)', [
      match,
      JSON.stringify(forged),
    ]),
    /not legal/,
  );
  const next = (await outcomes(opening, rolled.match.lastRoll))[0];
  await login(outsider);
  await assert.rejects(
    db.query('select public.submit_match_turn($1,1,$2::jsonb,null)', [match, JSON.stringify(next)]),
    /not in/,
  );
  await login(b);
  await assert.rejects(
    db.query('select public.submit_match_turn($1,1,$2::jsonb,null)', [match, JSON.stringify(next)]),
    /not your turn/,
  );
  await login(a);
  const accepted = (
    await db.query('select public.submit_match_turn($1,1,$2::jsonb,null) as snapshot', [
      match,
      JSON.stringify(next),
    ])
  ).rows[0].snapshot;
  const repeated = (
    await db.query('select public.submit_match_turn($1,1,$2::jsonb,null) as snapshot', [
      match,
      JSON.stringify(next),
    ])
  ).rows[0].snapshot;
  assert.equal(accepted.match.version, 2);
  assert.equal(repeated.match.version, 2);
  await assert.rejects(db.query('select public.roll_match_dice($1,0)', [match]), /changed|turn/);
  await db.query('select public.abandon_match($1)', [match]);
  await db.query('select public.abandon_match($1)', [match]);
  assert.equal(
    (
      await db.query('select count(*)::int as n from notifications where related_lobby_id=$1', [
        lobby,
      ])
    ).rows[0].n,
    1,
  );
  const permissions = (
    await db.query(
      "select has_function_privilege('authenticated','public.roll_match_dice(uuid)','EXECUTE') as legacy, has_function_privilege('anon','public.submit_match_turn(uuid,integer,jsonb,integer)','EXECUTE') as anonymous",
    )
  ).rows[0];
  assert.equal(permissions.legacy, false);
  assert.equal(permissions.anonymous, false);
  console.log(
    'PASS: SQL rejects forged boards, moves without rolls, non-members, wrong turns and stale rolls; duplicate requests and abandonment are idempotent; legacy/anonymous write access revoked.',
  );

  // --- guests, public IDs and quick play (migration 0006) --------------------
  const guest = randomUUID();
  await db.query('insert into auth.users(id,is_anonymous) values ($1,true)', [guest]);
  // `outsider` becomes a fresh sign-up who chose a username at registration.
  await db.query(
    "update auth.users set email='alex@example.test', raw_user_meta_data='{\"username\":\"AlexGaming\"}' where id=$1",
    [outsider],
  );
  await db.query('update public.profiles set username=null where uid=$1', [outsider]);
  await login(outsider);
  const alex = (await db.query('select public.ensure_social_identity($1) as me', ['Alex'])).rows[0]
    .me;
  assert.equal(alex.username, 'alexgaming');
  assert.match(alex.publicId, /^[1-9][0-9]{7}$/);
  assert.equal(alex.isGuest, false);
  assert.equal((await db.query('select public.ensure_social_identity() as me')).rows[0].me.publicId, alex.publicId);
  await login(a);
  const playerA = (await db.query('select public.ensure_social_identity() as me')).rows[0].me;
  assert.match(playerA.publicId, /^[1-9][0-9]{7}$/);
  assert.notEqual(playerA.publicId, alex.publicId);

  await login(guest, true);
  const ghost = (await db.query('select public.ensure_social_identity() as me')).rows[0].me;
  assert.match(ghost.username, /^guest_[0-9]{4}$/);
  assert.equal(ghost.publicId, null);
  assert.equal(ghost.isGuest, true);
  for (const [fn, args] of [
    ['send_friend_request($1)', [outsider]],
    ['create_challenge(array[$1]::uuid[])', [outsider]],
    ["search_users($1)", ['alex']],
    ["update_social_identity($1, null)", ['ghostrider']],
  ]) {
    await assert.rejects(db.query(`select public.${fn}`, args), /Create an account/);
  }
  // Avatars are fine for guests; usernames are not.
  assert.equal(
    (await db.query("select public.update_social_identity(null,'🦊') as me")).rows[0].me.avatar,
    '🦊',
  );
  await login(outsider);
  await assert.rejects(db.query('select public.send_friend_request($1)', [guest]), /not be found/);
  const byId = (await db.query('select * from public.search_users($1)', [playerA.publicId])).rows;
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, a);
  assert.equal(byId[0].public_id, playerA.publicId);
  assert.equal((await db.query('select * from public.search_users($1)', ['guest_'])).rows.length, 0);
  const availability = async (name) =>
    (await db.query('select public.check_username_available($1) as v', [name])).rows[0].v;
  assert.equal((await availability('player_a')).available, false);
  assert.equal((await availability('guest_9999')).available, false);
  assert.equal((await availability('AlexGaming')).available, true); // the caller's own name
  assert.equal((await availability('brand_new')).available, true);
  assert.equal((await availability('no')).available, false);

  // Quick play: two players of the same table size get seated together, a
  // member and a guest alike, oldest ticket hosting.
  await login(outsider);
  const first = (await db.query('select public.join_quick_match(2) as t')).rows[0].t;
  assert.equal(first.status, 'WAITING');
  assert.equal(first.waiting, 1);
  await login(guest, true);
  const second = (await db.query('select public.join_quick_match(2) as t')).rows[0].t;
  assert.equal(second.status, 'MATCHED');
  await login(outsider);
  const again = (await db.query('select public.join_quick_match(2) as t')).rows[0].t;
  assert.equal(again.status, 'MATCHED');
  assert.equal(again.lobbyId, second.lobbyId);
  const room = (await db.query('select public.get_lobby($1) as l', [second.lobbyId])).rows[0].l;
  assert.equal(room.lobby.status, 'COUNTDOWN');
  assert.equal(room.lobby.hostId, outsider);
  assert.equal(room.challenge.kind, 'QUICK');
  assert.equal(room.players.length, 2);
  assert.ok(room.players.every((p) => p.status === 'JOINED' && p.isReady));
  // A live quick table does not count as "a game waiting" against friend challenges.
  await db.query('insert into public.friendships(user_id,friend_id) values ($1,$2),($2,$1)', [
    outsider,
    a,
  ]);
  const friendly = (await db.query('select public.create_challenge(array[$1]::uuid[]) as c', [a]))
    .rows[0].c;
  assert.ok(friendly.lobbyId);
  await db.query('select public.cancel_challenge($1)', [friendly.challengeId]);
  // A stranger leaving breaks the table up instead of leaving one player waiting forever.
  await login(guest, true);
  await db.query('select public.leave_lobby($1)', [second.lobbyId]);
  assert.equal(
    (await db.query('select status from public.lobbies where id=$1', [second.lobbyId])).rows[0]
      .status,
    'CANCELLED',
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.notifications where user_id=$1 and type='CHALLENGE_CANCELLED' and related_lobby_id=$2",
        [outsider, second.lobbyId],
      )
    ).rows[0].n,
    1,
  );
  await db.query('select public.leave_quick_match()');
  await login(outsider);
  await db.query('select public.leave_quick_match()');

  // A guest who signs up keeps their uid and gets a real handle and ID.
  await db.query(
    "update auth.users set is_anonymous=false, email='ghost@example.test' where id=$1",
    [guest],
  );
  await login(guest);
  const promoted = (await db.query('select public.ensure_social_identity() as me')).rows[0].me;
  assert.equal(promoted.id, guest);
  assert.equal(promoted.isGuest, false);
  assert.equal(promoted.username, 'ghost');
  assert.match(promoted.publicId, /^[1-9][0-9]{7}$/);
  console.log(
    'PASS: guests get temporary handles and no ID, cannot use friend features or be found, can quick-play; quick tables seat by arrival, break up on leave and never block friend games; sign-up keeps the uid and issues a public ID.',
  );
  // --- account wallet (migration 0007) ----------------------------------------
  const catalog = createRequire(import.meta.url)(path.join(out, 'cosmetics/catalog.js')).COSMETICS;
  const compareIds = (x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const storeRows = (
    await db.query('select id, kind, price, board, dice from public.store_items')
  ).rows
    .map((r) => ({ id: r.id, kind: r.kind, price: r.price, board: r.board, dice: r.dice }))
    .sort(compareIds);
  assert.deepEqual(
    storeRows,
    catalog
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        price: c.price,
        board: c.contents?.board ?? null,
        dice: c.contents?.dice ?? null,
      }))
      .sort(compareIds),
    'store_items must mirror src/domain/cosmetics/catalog.ts (add the item to a migration)',
  );
  // The wallet columns are closed to clients even for their own row; only the
  // display name stays theirs. Inventory and rewards have no write path at all.
  const privilege = async (sql) => (await db.query(sql)).rows[0].ok;
  for (const column of ['coins', 'games_played', 'games_won', 'streak', 'best_streak', 'last_gift'])
    assert.equal(
      await privilege(
        `select has_column_privilege('authenticated','public.profiles','${column}','UPDATE') as ok`,
      ),
      false,
      `${column} must not be client-writable`,
    );
  assert.equal(
    await privilege(
      "select has_column_privilege('authenticated','public.profiles','display_name','UPDATE') as ok",
    ),
    true,
  );
  for (const table of ['profile_items', 'profile_rewards'])
    assert.equal(
      await privilege(`select has_table_privilege('authenticated','public.${table}','INSERT') as ok`),
      false,
    );
  for (const fn of [
    'get_wallet()',
    'purchase_item(text,integer)',
    'claim_daily_gift()',
    'award_match(text,boolean,boolean)',
  ])
    assert.equal(
      await privilege(`select has_function_privilege('anon','public.${fn}','EXECUTE') as ok`),
      false,
    );
  const walletOf = async () => (await db.query('select public.get_wallet() as w')).rows[0].w;
  const buy = async (id, price) =>
    (await db.query('select public.purchase_item($1,$2) as w', [id, price])).rows[0].w;
  const award = async (id, won, eligible) =>
    (await db.query('select public.award_match($1,$2,$3) as w', [id, won, eligible])).rows[0].w;
  await login(a);
  const fresh = await walletOf();
  assert.equal(fresh.coins, 1000);
  assert.deepEqual(fresh.owned, []);
  await assert.rejects(buy('not-a-thing', 0), /not in the store/);
  await assert.rejects(buy('royal', 1), /price.*changed/i);
  const bought = await buy('neon-pack', 550);
  assert.equal(bought.coins, 450);
  assert.deepEqual([...bought.owned].sort(), ['neon', 'neon-dice', 'neon-pack']);
  assert.equal((await buy('neon-pack', 550)).coins, 450, 'owned again: no second charge');
  assert.equal((await buy('neon-dice', 150)).coins, 450, 'pack contents are already owned');
  await assert.rejects(buy('royal', 600), /Not enough coins/);
  assert.equal((await walletOf()).coins, 450, 'a refused purchase changes nothing');
  const gift = (await db.query('select public.claim_daily_gift() as w')).rows[0].w;
  assert.equal(gift.coins, 700);
  assert.match(gift.lastGift, /^\d{4}-\d{2}-\d{2}$/);
  await assert.rejects(db.query('select public.claim_daily_gift()'), /claimed/);
  const firstAward = await award('match-1', true, true);
  assert.deepEqual(
    [firstAward.coins, firstAward.games, firstAward.wins, firstAward.streak, firstAward.bestStreak],
    [850, 1, 1, 1, 1],
  );
  assert.equal((await award('match-1', true, true)).coins, 850, 'a replayed result pays once');
  const secondAward = await award('match-2', false, true);
  assert.deepEqual(
    [secondAward.coins, secondAward.games, secondAward.streak, secondAward.bestStreak],
    [890, 2, 0, 1],
  );
  assert.equal((await award('match-3', true, false)).coins, 890, 'ineligible: stats only');
  await assert.rejects(award('', true, true), /Invalid match id/);
  await assert.rejects(award('x'.repeat(65), true, true), /Invalid match id/);
  // Guests have no wallet at all.
  const ghost2 = randomUUID();
  await db.query('insert into auth.users(id,is_anonymous) values ($1,true)', [ghost2]);
  await login(ghost2, true);
  for (const [fn, args] of [
    ['get_wallet()', []],
    ['purchase_item($1,$2)', ['classic-pack', 0]],
    ['claim_daily_gift()', []],
    ['award_match($1,$2,$3)', ['g', true, true]],
  ])
    await assert.rejects(db.query(`select public.${fn}`, args), /Create an account/);
  // A member whose profile row does not exist yet gets one, with the default wallet.
  const newbie = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'new@example.test')", [newbie]);
  await login(newbie);
  assert.equal((await walletOf()).coins, 1000);
  assert.equal((await buy('classic-pack', 0)).coins, 1000);
  console.log(
    'PASS: account wallet mirrors the catalog; coins, inventory and rewards change only through their functions; purchases, gifts and rewards are idempotent and refused for guests, stale prices, unknown items and short balances.',
  );
} finally {
  await db.close();
}
