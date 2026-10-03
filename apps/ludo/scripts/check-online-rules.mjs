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
  getTrackLength,
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
  // The same comparison for every variant: Quick 1, Quick 2 and Kill & Go.
  const classicCompared = compared;
  for (const variant of ['quick1', 'quick2', 'kill']) {
    for (const count of [2, 4, 6]) {
      const fresh = () => createGame(seatColors(count), { variant });
      let state = fresh();
      assert.deepEqual(
        normalize((await db.query('select public.ludo_opening($1,$2) as state', [count, variant])).rows[0].state),
        normalize(state),
        `opening board for ${variant}`,
      );
      for (let turn = 0; turn < 300; turn++) {
        const die = (random() % 6) + 1;
        if (turn % 10 === 0) for (let check = 1; check <= 6; check++) await compare(state, check);
        const choices = await compare(state, die);
        state = choices[random() % choices.length];
        if (state.status === 'FINISHED') state = fresh();
      }
      // Edge boards: one step from the goal, and (Kill & Go) a coin at the
      // mouth of a still-locked home path, then the same board unlocked.
      const edge = fresh();
      const finish = getFinishProgress(count);
      edge.players[0].pieces.forEach((p, i) => (p.progress = i === 0 ? finish - 2 : i === 1 ? getTrackLength(count) - 2 : 0));
      for (let die = 1; die <= 6; die++) await compare(edge, die);
      if (variant === 'kill') {
        edge.hunters = [edge.players[0].color];
        for (let die = 1; die <= 6; die++) await compare(edge, die);
      }
    }
  }
  const beforeTeams = compared;
  for (const variant of ['classic', 'quick2', 'kill']) {
    const fresh = () => createGame(seatColors(4), { variant, teams: true });
    let state = fresh();
    assert.deepEqual(
      normalize((await db.query('select public.ludo_opening(4,$1,true) as state', [variant])).rows[0].state),
      normalize(state),
      `2 v 2 opening board for ${variant}`,
    );
    for (let turn = 0; turn < 400; turn++) {
      const die = (random() % 6) + 1;
      if (turn % 10 === 0) for (let check = 1; check <= 6; check++) await compare(state, check);
      const choices = await compare(state, die);
      state = choices[random() % choices.length];
      if (state.status === 'FINISHED') state = fresh();
    }
    // A player with all four home moves their partner's coins; partners
    // sharing a square neither block nor capture each other.
    const finish = getFinishProgress(4);
    const edge = fresh();
    edge.players[0].pieces.forEach((pc) => (pc.progress = finish));
    edge.players[2].pieces.forEach((pc, i) => (pc.progress = i === 0 ? finish - 3 : i === 1 ? 20 : 0));
    for (let die = 1; die <= 6; die++) await compare(edge, die);
    const stack = fresh();
    stack.players[0].pieces[0].progress = 28;
    stack.players[2].pieces[0].progress = 5;
    stack.players[2].pieces[1].progress = 5;
    stack.players[1].pieces[0].progress = 18;
    for (let die = 1; die <= 6; die++) await compare(stack, die);
  }
  console.log(
    `PASS: ${classicCompared} PostgreSQL transitions match the domain engine across 2-6 players, plus ${beforeTeams - classicCompared} more for Quick 1, Quick 2 and Kill & Go, and ${compared - beforeTeams} for 2 v 2 teams.`,
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
    await db.query('select id, kind, price, currency, board, dice from public.store_items')
  ).rows
    .map((r) => ({ id: r.id, kind: r.kind, price: r.price, currency: r.currency, board: r.board, dice: r.dice }))
    .sort(compareIds);
  assert.deepEqual(
    storeRows,
    catalog
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        price: c.price,
        currency: c.currency ?? 'coins',
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
    'claim_rescue()',
    'award_match(text,boolean,boolean,integer,integer,integer)',
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
  // Grind-worthy prices: the starting balance affords nothing paid.
  await assert.rejects(buy('neon-pack', 9375), /Not enough coins/);
  await db.query('update public.profiles set coins = 10000 where uid=$1', [a]);
  const bought = await buy('neon-pack', 9375);
  assert.equal(bought.coins, 625);
  assert.deepEqual([...bought.owned].sort(), ['neon', 'neon-dice', 'neon-pack']);
  assert.equal((await buy('neon-pack', 9375)).coins, 625, 'owned again: no second charge');
  assert.equal((await buy('neon-dice', 1200)).coins, 625, 'pack contents are already owned');
  // Legendaries cost gems (0021): the default 20 gems afford none of them.
  await assert.rejects(buy('royal', 480), /Not enough gems/);
  assert.equal((await walletOf()).coins, 625, 'a refused purchase changes nothing');
  await db.query('update public.profiles set gems = 500 where uid=$1', [a]);
  const gemBought = await buy('midnight', 240);
  assert.equal(gemBought.gems, 260, 'a gem item charges gems');
  assert.equal(gemBought.coins, 625, 'and leaves coins alone');
  // The daily gift climbs a 7-day calendar: day 1 pays 100.
  const gift = (await db.query('select public.claim_daily_gift() as w')).rows[0].w;
  assert.equal(gift.coins, 725);
  assert.equal(gift.giftStreak, 1);
  assert.match(gift.lastGift, /^\d{4}-\d{2}-\d{2}$/);
  await assert.rejects(db.query('select public.claim_daily_gift()'), /claimed/);
  const firstAward = await award('match-1', true, true);
  assert.deepEqual(
    [firstAward.coins, firstAward.games, firstAward.wins, firstAward.streak, firstAward.bestStreak],
    [775, 1, 1, 1, 1],
  );
  assert.equal((await award('match-1', true, true)).coins, 775, 'a replayed result pays once');
  const secondAward = await award('match-2', false, true);
  assert.deepEqual(
    [secondAward.coins, secondAward.games, secondAward.streak, secondAward.bestStreak],
    [775, 2, 0, 1],
    'a finished loss pays XP, not coins',
  );
  assert.equal((await award('match-3', true, false)).coins, 775, 'ineligible: stats only');
  // The comeback rescue: only while nearly broke, once a day.
  await assert.rejects(db.query('select public.claim_rescue()'), /nearly out of coins/);
  await db.query('update public.profiles set coins = 40 where uid=$1', [a]);
  const rescued = (await db.query('select public.claim_rescue() as w')).rows[0].w;
  assert.equal(rescued.coins, 340);
  assert.match(rescued.lastRescue, /^\d{4}-\d{2}-\d{2}$/);
  await db.query('update public.profiles set coins = 20 where uid=$1', [a]);
  await assert.rejects(db.query('select public.claim_rescue()'), /rescue is used/);
  await db.query('update public.profiles set coins = 775 where uid=$1', [a]);
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
    ['claim_rescue()', []],
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
  // --- feedback (migration 0008) ----------------------------------------------
  const sendFeedback = (category, message, email = null) =>
    db.query('select public.submit_feedback($1,$2,$3,$4,$5)', [category, message, email, 'android', '1.0.0']);
  const feedbackCount = async () =>
    (await db.query('select count(*)::int as n from public.feedback')).rows[0].n;
  // A caller with no session at all can still report a bug.
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("select set_config('request.jwt.claims','{}',false)");
  await sendFeedback('bug', '  The dice froze.  ');
  const anonRow = (await db.query('select uid, message, platform from public.feedback')).rows[0];
  assert.equal(anonRow.uid, null);
  assert.equal(anonRow.message, 'The dice froze.', 'message is trimmed server-side');
  assert.equal(anonRow.platform, 'android');
  await assert.rejects(sendFeedback('complaint', 'x'), /choose a category/);
  await assert.rejects(sendFeedback('bug', '   '), /between 1 and 2000/);
  await assert.rejects(sendFeedback('bug', 'x'.repeat(2001)), /between 1 and 2000/);
  await assert.rejects(sendFeedback('bug', 'hi', 'not-an-email'), /valid email/);
  // A signed-in reporter is throttled after five messages in ten minutes.
  const reporter = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'reporter@example.test')", [reporter]);
  await login(reporter);
  for (let i = 0; i < 5; i++) await sendFeedback('suggestion', `idea ${i}`, 'reporter@example.test');
  await assert.rejects(sendFeedback('suggestion', 'one too many'), /wait a bit/);
  assert.equal(await feedbackCount(), 6);
  // Nobody can read feedback back, not even its author, and nothing can write it directly.
  assert.equal(
    (await db.query("select count(*)::int as n from pg_policies where tablename='feedback'")).rows[0].n,
    0,
    'feedback must have no RLS policies at all',
  );
  assert.equal(
    await privilege("select has_function_privilege('anon','public.submit_feedback(text,text,text,text,text)','EXECUTE') as ok"),
    true,
  );
  console.log(
    'PASS: feedback accepts reports from anyone, trims and validates server-side, throttles a signed-in reporter, and exposes no read or direct-write path.',
  );

  // --- account deletion (migration 0009) --------------------------------------
  const leaving = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'leaving@example.test')", [leaving]);
  await login(leaving);
  await walletOf();
  await buy('classic-pack', 0);
  await award('leaving-match', true, true);
  await sendFeedback('bug', 'Before I go: the board flickers.');
  // Moving in an online match used to pin the account in place (0005's FK had
  // no ON DELETE action). Seat this player in one and record a submit by them.
  await db.query('update public.matches set last_submit_user=$1 where id=$2', [leaving, match]);
  await db.query('select public.delete_own_account()');
  const remaining = async (sql) => (await db.query(sql, [leaving])).rows[0].n;
  assert.equal(await remaining('select count(*)::int as n from auth.users where id=$1'), 0);
  assert.equal(await remaining('select count(*)::int as n from public.profiles where uid=$1'), 0);
  assert.equal(await remaining('select count(*)::int as n from public.profile_items where uid=$1'), 0);
  assert.equal(await remaining('select count(*)::int as n from public.profile_rewards where uid=$1'), 0);
  assert.equal(
    (await db.query('select last_submit_user from public.matches where id=$1', [match])).rows[0].last_submit_user,
    null,
    'the match survives with its bookkeeping column cleared',
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.feedback where message like 'Before I go%' and uid is null")).rows[0].n,
    1,
    'feedback outlives the account, detached from it',
  );
  // No session, no deletion; and the function is closed to anon entirely.
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("select set_config('request.jwt.claims','{}',false)");
  await assert.rejects(db.query('select public.delete_own_account()'), /sign in again/);
  assert.equal(
    await privilege("select has_function_privilege('anon','public.delete_own_account()','EXECUTE') as ok"),
    false,
  );
  console.log(
    'PASS: deleting an account removes its profile, inventory and rewards, detaches its feedback, no longer trips the match foreign key, and needs a signed-in session.',
  );
  // --- invite links (migration 0011) -------------------------------------------
  const linkHost = randomUUID();
  const linkGuest = randomUUID();
  const linkThird = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'host@example.test'),($2,null),($3,'third@example.test')", [linkHost, linkGuest, linkThird]);
  await db.query('update auth.users set is_anonymous=true where id=$1', [linkGuest]);
  await login(linkHost);
  await assert.rejects(db.query('select public.create_link_room(5)'), /2 to 4/);
  const linkRoom = (await db.query('select public.create_link_room(2) as r')).rows[0].r;
  assert.match(linkRoom.code, /^[A-HJ-NP-Z2-9]{6}$/);
  const hostView = (await db.query('select public.get_lobby($1) as l', [linkRoom.lobbyId])).rows[0].l;
  assert.equal(hostView.lobby.inviteCode, linkRoom.code, 'the host can read the code back');
  assert.equal(hostView.challenge.kind, 'LINK');
  assert.equal(hostView.players.length, 1);
  // A guest can join by code, typed loosely.
  await login(linkGuest, true);
  await assert.rejects(db.query('select public.get_lobby($1) as l', [linkRoom.lobbyId]), /./, 'not a member yet');
  await assert.rejects(db.query('select public.join_link_room($1)', ['nope']), /does not look right/);
  await assert.rejects(db.query('select public.join_link_room($1)', ['ZZZZZZ']), /No game found/);
  const looseCode = linkRoom.code.toLowerCase().slice(0, 3) + '-' + linkRoom.code.toLowerCase().slice(3);
  const linkJoined = (await db.query('select public.join_link_room($1) as r', [looseCode])).rows[0].r;
  assert.equal(linkJoined.lobbyId, linkRoom.lobbyId);
  const guestView = (await db.query('select public.get_lobby($1) as l', [linkRoom.lobbyId])).rows[0].l;
  assert.equal(guestView.players.filter((pl) => pl.status === 'JOINED').length, 2);
  assert.equal((await db.query('select public.join_link_room($1) as r', [linkRoom.code])).rows[0].r.lobbyId, linkRoom.lobbyId, 'joining twice is harmless');
  // Full now.
  await login(linkThird);
  await assert.rejects(db.query('select public.join_link_room($1)', [linkRoom.code]), /full/);
  // The guest leaves; the seat frees up for someone else.
  await login(linkGuest, true);
  await db.query('select public.leave_lobby($1)', [linkRoom.lobbyId]);
  await login(linkThird);
  assert.equal((await db.query('select public.join_link_room($1) as r', [linkRoom.code])).rows[0].r.lobbyId, linkRoom.lobbyId);
  // A new linkRoom replaces the host's old one, and a closed linkRoom refuses joins.
  await login(linkHost);
  const secondRoom = (await db.query('select public.create_link_room(3) as r')).rows[0].r;
  assert.notEqual(secondRoom.code, linkRoom.code);
  assert.equal((await db.query('select status from public.lobbies where id=$1', [linkRoom.lobbyId])).rows[0].status, 'CANCELLED');
  await login(linkGuest, true);
  await assert.rejects(db.query('select public.join_link_room($1)', [linkRoom.code]), /already started or was closed/);
  // Expiry closes a linkRoom nobody filled.
  await db.query("update public.challenges set expires_at = now() - interval '1 minute' where lobby_id=$1", [secondRoom.lobbyId]);
  await assert.rejects(db.query('select public.join_link_room($1)', [secondRoom.code]), /already started or was closed/);
  for (const fn of ['create_link_room(integer,integer,text,boolean)', 'join_link_room(text)'])
    assert.equal(
      await privilege(`select has_function_privilege('anon','public.${fn}','EXECUTE') as ok`),
      false,
    );
  console.log(
    'PASS: invite links create a coded room, let members and guests join by code (loosely typed, idempotent), refuse full, closed, expired and malformed codes, free a seat when someone leaves, and show the code only to people in the room.',
  );
  // --- progression (migration 0012) --------------------------------------------
  const levelOf = async (xp) => (await db.query('select public.level_info($1) as l', [xp])).rows[0].l;
  assert.deepEqual(await levelOf(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(await levelOf(99), { level: 1, into: 99, need: 100 });
  assert.deepEqual(await levelOf(100), { level: 2, into: 0, need: 140 });
  assert.deepEqual(await levelOf(240), { level: 3, into: 0, need: 180 });

  // Two members play an online match to the end; the server pays from its own record.
  const pWin = randomUUID();
  const pLose = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'winner@example.test'),($2,'loser@example.test')", [pWin, pLose]);
  const pLobby = randomUUID();
  const pMatch = randomUUID();
  await login(pWin);
  await db.query('select public.get_wallet()');
  await login(pLose);
  await db.query('select public.get_wallet()');
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,2,'IN_LOBBY',now()+interval '1 hour')", [pLobby, pWin]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status) values ($1,$1,$2,2,'STARTED')", [pLobby, pWin]);
  await db.query("insert into public.matches(id,lobby_id,player_count,status,winner_seat,finished_at) values ($1,$2,2,'FINISHED',0,now())", [pMatch, pLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1)', [pMatch, pWin, pLose]);
  await login(pWin);
  const onlineWon = (await db.query('select public.award_online_match($1,3,2,1) as w', [pMatch])).rows[0].w;
  assert.equal(onlineWon.coins, 1240, 'online win pays 100, plus 140 for reaching level 2');
  assert.equal(onlineWon.xp, 120);
  assert.equal(onlineWon.level.level, 2);
  assert.equal(onlineWon.gems, 25, 'levelling up to 2 paid 5 gems');
  assert.equal((await db.query('select public.award_online_match($1) as w', [pMatch])).rows[0].w.coins, 1240, 'paid once');
  await login(pLose);
  // The loser never collects; loading the wallet collects for them.
  const collectedWallet = (await db.query('select public.get_wallet() as w')).rows[0].w;
  assert.equal(collectedWallet.coins, 1000, 'the loser earns XP only, collected on wallet load');
  const outsiderTry = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'nosy@example.test')", [outsiderTry]);
  await login(outsiderTry);
  await assert.rejects(db.query('select public.award_online_match($1)', [pMatch]), /not in that match/);
  await assert.rejects(db.query("select public.award_match('online:x', true, true)"), /Invalid match id/, 'cannot claim an online reward as a bot game');

  // Computer games pay 50 / 15, and only 25 paid games a day.
  await login(pLose);
  for (let i = 0; i < 25; i++) await db.query("select public.award_match($1, true, true)", [`bot-${i}`]);
  const cappedAward = (await db.query("select public.award_match('bot-25', true, true) as w")).rows[0].w;
  const paidRows = (await db.query("select count(*)::int as n from public.profile_rewards where uid=$1 and coins > 0 and match_id like 'bot-%'", [pLose])).rows[0].n;
  assert.equal(paidRows, 25, 'the 26th bot game of the day pays no coins');
  assert.equal(cappedAward.games, 27);

  // Tournament: the online win scored 3, the finish 1.
  await login(pWin);
  const tourney = (await db.query('select public.get_tournament() as t')).rows[0].t;
  assert.equal(tourney.me.points, 3);
  assert.equal(tourney.me.rank, 1);
  assert.equal(tourney.top[0].userId, pWin);
  assert.equal(tourney.top[1].points, 1);
  await assert.rejects(db.query('select public.claim_tournament_prize()'), /did not play/);
  // Last week's standings pay by rank, once.
  await db.query("insert into public.tournament_scores(uid,week,points,wins,games) values ($1, public.current_week()-7, 9, 3, 3), ($2, public.current_week()-7, 4, 1, 3)", [pWin, pLose]);
  const prizeBefore = (await db.query('select coins, gems from public.profiles where uid=$1', [pWin])).rows[0];
  const claimedTour = (await db.query('select public.claim_tournament_prize() as t')).rows[0].t;
  assert.equal(claimedTour.lastWeek.rank, 1);
  assert.equal(claimedTour.lastWeek.claimed, true);
  const prizeAfter = (await db.query('select coins, gems from public.profiles where uid=$1', [pWin])).rows[0];
  assert.equal(prizeAfter.coins - prizeBefore.coins, 3000);
  assert.equal(prizeAfter.gems - prizeBefore.gems, 60);
  await db.query('select public.claim_tournament_prize()');
  assert.equal((await db.query('select coins from public.profiles where uid=$1', [pWin])).rows[0].coins, prizeAfter.coins, 'claimed once');

  // Daily doSpin: one free, three paid with gems, then done.
  const doSpin = async () => (await db.query('select public.spin_daily() as s')).rows[0].s;
  const firstSpin = await doSpin();
  assert.ok(['coins', 'gems', 'xp'].includes(firstSpin.reward.kind));
  assert.equal(firstSpin.spinsToday, 1);
  const gemsBefore = (await db.query('select gems from public.profiles where uid=$1', [pWin])).rows[0].gems;
  const secondSpin = await doSpin();
  const gemsAfter = secondSpin.wallet.gems;
  assert.equal(gemsAfter, gemsBefore - 10 + (secondSpin.reward.kind === 'gems' ? secondSpin.reward.amount : 0), 'extra spins cost 10 gems');
  await doSpin();
  await doSpin();
  await assert.rejects(doSpin(), /all the spins for today/);

  // Missions: three a day; progress from real events; claim once when done.
  const rewardsView = (await db.query('select public.get_rewards() as r')).rows[0].r;
  assert.equal(rewardsView.missions.length, 3);
  const spinMission = rewardsView.missions.find((m) => m.id === 'spin-1');
  if (spinMission) assert.equal(spinMission.progress, 1, 'the spin counted toward the spin mission');
  const unfinished = rewardsView.missions.find((m) => m.progress < m.target);
  if (unfinished) await assert.rejects(db.query('select public.claim_mission($1)', [unfinished.id]), /Finish the mission first/);
  // Force one mission complete and claim it.
  const missionTarget = rewardsView.missions[0];
  await db.query("insert into public.mission_progress(uid,day,mission_id,progress) values ($1, public.utc_today(), $2, $3) on conflict (uid,day,mission_id) do update set progress = excluded.progress", [pWin, missionTarget.id, missionTarget.target]);
  const coinsPre = (await db.query('select coins from public.profiles where uid=$1', [pWin])).rows[0].coins;
  const afterClaim = (await db.query('select public.claim_mission($1) as r', [missionTarget.id])).rows[0].r;
  assert.ok(afterClaim.missions.find((m) => m.id === missionTarget.id).claimed);
  assert.ok(afterClaim.wallet.coins >= coinsPre + missionTarget.coins);
  await db.query('select public.claim_mission($1)', [missionTarget.id]);
  await assert.rejects(db.query("select public.claim_mission('not-today')"), /not one of today/);

  // Season pass: tiers unlock with season XP; premium costs 250 gems.
  const seasonView = (await db.query('select public.get_rewards() as r')).rows[0].r.season;
  assert.ok(seasonView.xp >= 120, 'match XP also counts toward the season');
  await assert.rejects(db.query('select public.claim_season_tier(30, false)'), /more season XP/);
  await assert.rejects(db.query('select public.claim_season_tier(0, false)'), /no such tier/);
  const tierCoins = (await db.query('select coins from public.profiles where uid=$1', [pWin])).rows[0].coins;
  await db.query('select public.claim_season_tier(1, false)');
  assert.equal((await db.query('select coins from public.profiles where uid=$1', [pWin])).rows[0].coins, tierCoins + 90);
  await db.query('select public.claim_season_tier(1, false)');
  assert.equal((await db.query('select coins from public.profiles where uid=$1', [pWin])).rows[0].coins, tierCoins + 90, 'a tier pays once');
  await assert.rejects(db.query('select public.claim_season_tier(1, true)'), /premium pass/);
  await db.query('update public.profiles set gems = 300 where uid=$1', [pWin]);
  await db.query('select public.buy_season_premium()');
  assert.equal((await db.query('select gems from public.profiles where uid=$1', [pWin])).rows[0].gems, 50);
  await db.query('select public.claim_season_tier(1, true)');

  // Rewarded ads (0020): small grants, capped per UTC day, all opt-in.
  const adUser = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'ads@example.test')", [adUser]);
  await login(adUser);
  const adClaim = async (kind) =>
    (await db.query('select public.claim_ad_reward($1) as w', [kind])).rows[0].w;
  await assert.rejects(db.query("select public.claim_ad_reward('nope')"), /not available/);
  for (let i = 1; i <= 5; i++) assert.equal((await adClaim('gem')).gems, 20 + i, 'one gem per ad');
  await assert.rejects(adClaim('gem'), /tomorrow/);
  // The rescue boost needs today's rescue claimed first, then pays once.
  await assert.rejects(adClaim('rescue-boost'), /rescue first/);
  await db.query('update public.profiles set coins = 40 where uid=$1', [adUser]);
  assert.equal((await db.query('select public.claim_rescue() as w')).rows[0].w.coins, 340);
  assert.equal((await adClaim('rescue-boost')).coins, 640);
  await assert.rejects(adClaim('rescue-boost'), /tomorrow/);
  // A spin credit pays the next extra spin instead of gems.
  const adSpin = async () => (await db.query('select public.spin_daily() as s')).rows[0].s;
  await adSpin(); // the free one
  await adClaim('spin');
  const gemsHeld = (await db.query('select gems from public.profiles where uid=$1', [adUser])).rows[0].gems;
  const credited = await adSpin();
  assert.equal(
    credited.wallet.gems,
    gemsHeld + (credited.reward.kind === 'gems' ? credited.reward.amount : 0),
    'an ad credit paid the extra spin, not gems',
  );
  const adsView = (await db.query('select public.get_rewards() as r')).rows[0].r.ads;
  assert.equal(adsView.gem, 5);
  assert.equal(adsView.spin, 1);
  assert.equal(adsView['rescue-boost'], 1);

  // Leagues (0022): weekly settlement, promotion pays only a first arrival.
  const lgUser = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'league@example.test')", [lgUser]);
  await login(lgUser);
  const leagueOf = async () => (await db.query('select public.get_league() as l')).rows[0].l;
  const freshLeague = await leagueOf();
  assert.equal(freshLeague.division, 1);
  assert.equal(freshLeague.promoteAt, 15);
  assert.equal(freshLeague.demoteBelow, null, 'Bronze never relegates');
  assert.equal(freshLeague.lastResult, null);
  // A 20-point week promotes Bronze → Silver and pays first-arrival gems.
  await db.query('update public.league_state set week = public.current_week() - 7 where uid=$1', [lgUser]);
  await db.query('insert into public.tournament_scores(uid, week, points) values ($1, public.current_week() - 7, 20)', [lgUser]);
  const lgGems = (await db.query('select gems from public.profiles where uid=$1', [lgUser])).rows[0].gems;
  const lgPromoted = await leagueOf();
  assert.equal(lgPromoted.division, 2);
  assert.deepEqual(
    { from: lgPromoted.lastResult.from, to: lgPromoted.lastResult.to, gems: lgPromoted.lastResult.gems },
    { from: 1, to: 2, gems: 15 },
  );
  assert.equal((await db.query('select gems from public.profiles where uid=$1', [lgUser])).rows[0].gems, lgGems + 15);
  // Reading again the same week settles nothing more.
  const settledLeague = await leagueOf();
  assert.equal(settledLeague.division, 2);
  assert.equal(settledLeague.lastResult, null);
  // A quiet week relegates Silver → Bronze…
  await db.query('update public.league_state set week = public.current_week() - 7 where uid=$1', [lgUser]);
  await db.query('delete from public.tournament_scores where uid=$1', [lgUser]);
  const dropped = await leagueOf();
  assert.equal(dropped.division, 1);
  assert.equal(dropped.lastResult.gems, 0);
  // …and re-climbing a division already reached pays nothing again.
  await db.query('update public.league_state set week = public.current_week() - 7 where uid=$1', [lgUser]);
  await db.query('insert into public.tournament_scores(uid, week, points) values ($1, public.current_week() - 7, 20)', [lgUser]);
  const reclimbed = await leagueOf();
  assert.equal(reclimbed.division, 2);
  assert.equal(reclimbed.lastResult.gems, 0, 'a promotion already banked pays once');

  // Real-money grants (0023): a verified order grants exactly once, and the
  // function is closed to clients entirely (only the Edge Function calls it).
  const iapUser = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'buyer@example.test')", [iapUser]);
  await login(iapUser);
  await db.query('select public.get_wallet()');
  const grantIap = async (product, order) =>
    (await db.query('select public.grant_iap($1,$2,$3,$4) as w', [iapUser, product, 'android', order])).rows[0].w;
  assert.equal((await grantIap('ludo.gems.small', 'order-1')).gems, 180);
  assert.equal((await grantIap('ludo.gems.small', 'order-1')).gems, 180, 'a replayed order grants once');
  assert.equal((await grantIap('ludo.gems.small', 'order-2')).gems, 340, 'a new order grants again');
  const starter = await grantIap('ludo.starter', 'order-3');
  assert.equal(starter.coins, 6000);
  assert.equal(starter.gems, 460);
  assert.equal((await grantIap('ludo.starter', 'order-4')).coins, 6000, 'the starter pack is once per account');
  // Coffee tips (0030): recorded once, and they change nothing in the game.
  const beforeTip = await grantIap('ludo.gems.small', 'order-2');
  const tipped = await grantIap('ludo.tip.coffee', 'tip-1');
  assert.equal(tipped.coins, beforeTip.coins, 'a tip grants no coins');
  assert.equal(tipped.gems, beforeTip.gems, 'a tip grants no gems');
  await grantIap('ludo.tip.coffee', 'tip-1');
  assert.equal(
    Number((await db.query("select count(*) from public.iap_receipts where order_id='tip-1'")).rows[0].count),
    1,
    'a replayed tip is recorded once',
  );
  await grantIap('ludo.pass', 'order-5');
  assert.equal(
    (await db.query('select premium from public.season_progress where uid=$1 and season=public.current_season()', [iapUser])).rows[0].premium,
    true,
    'the paid pass unlocks the premium track',
  );
  await assert.rejects(db.query("select public.grant_iap($1,'nope','android','order-6')", [iapUser]), /Unknown product/);
  // Piggy bank and Ludo Club (0024).
  assert.ok(
    (await db.query('select piggy_coins from public.profiles where uid=$1', [a])).rows[0].piggy_coins > 0,
    'play fills the piggy through granted XP',
  );
  await db.query('update public.profiles set piggy_coins = 4321 where uid=$1', [iapUser]);
  const coinsBeforePiggy = (await db.query('select coins from public.profiles where uid=$1', [iapUser])).rows[0].coins;
  const cracked = await grantIap('ludo.piggy', 'order-7');
  assert.equal(cracked.coins, coinsBeforePiggy + 4321, 'cracking the piggy pays what it held');
  assert.equal(cracked.piggyCoins, 0, 'and starts it again');
  const clubbed = await grantIap('ludo.club', 'order-8');
  assert.ok(new Date(clubbed.clubUntil) > new Date(), 'the club membership runs');
  const renewed = await grantIap('ludo.club', 'order-9');
  assert.ok(new Date(renewed.clubUntil) > new Date(clubbed.clubUntil), 'each renewal order adds a month');
  const clubGift = (await db.query('select public.claim_daily_gift() as w')).rows[0].w;
  assert.equal(clubGift.gems, renewed.gems + 10, 'a club gift brings 10 gems on top');
  await db.query('select public.spin_daily()');
  const clubGems = (await db.query('select gems from public.profiles where uid=$1', [iapUser])).rows[0].gems;
  const clubSpin = (await db.query('select public.spin_daily() as s')).rows[0].s;
  assert.equal(
    clubSpin.wallet.gems,
    clubGems + (clubSpin.reward.kind === 'gems' ? clubSpin.reward.amount : 0),
    'a club extra spin charges nothing',
  );
  for (const role of ['anon', 'authenticated'])
    assert.equal(
      await privilege(`select has_function_privilege('${role}','public.grant_iap(uuid,text,text,text)','EXECUTE') as ok`),
      false,
      `grant_iap is closed to ${role}`,
    );

  // Event windows, gifting and the ledger (0025). Still signed in as the buyer.
  await db.query('update public.profiles set gems = 500, coins = 5000 where uid=$1', [iapUser]);
  const eventBuy = (await db.query("select public.purchase_item('diwali', 300) as w")).rows[0].w;
  assert.ok(eventBuy.owned.includes('diwali'), 'an open event look sells normally');
  assert.equal(eventBuy.gems, 200);
  await assert.rejects(
    db.query("select public.gift_item($1,'diwali-dice',1200)", [lgUser]),
    /friends/i,
    'gifts only go to friends',
  );
  await db.query('insert into public.friendships(user_id, friend_id) values ($1,$2)', [iapUser, lgUser]);
  const gifted = (await db.query("select public.gift_item($1,'diwali-dice',1200) as w", [lgUser])).rows[0].w;
  assert.equal(gifted.coins, 3800, 'the giver pays the price');
  assert.ok(!gifted.owned.includes('diwali-dice'), 'and does not gain the item');
  assert.equal(
    (await db.query("select count(*)::int as n from public.profile_items where uid=$1 and item_id='diwali-dice'", [lgUser])).rows[0].n,
    1,
    'the friend owns it',
  );
  await assert.rejects(db.query("select public.gift_item($1,'diwali-dice',1200)", [lgUser]), /already owns/);
  assert.ok(
    (await db.query("select 1 from public.notifications where user_id=$1 and type='GIFT'", [lgUser])).rows.length >= 1,
    'the friend hears about it',
  );
  await db.query("update public.store_items set available_until = now() - interval '1 day' where id='diwali-pack'");
  await assert.rejects(db.query("select public.purchase_item('diwali-pack', 375)"), /past event/);
  await assert.rejects(db.query("select public.gift_item($1,'diwali-pack',375)", [lgUser]), /past event/);
  await db.query("update public.store_items set available_until = '2026-11-15 23:59:59+00' where id='diwali-pack'");
  const ledger = (await db.query('select * from public.economy_ledger where day = public.utc_today()')).rows[0];
  assert.ok(
    ledger && Number(ledger.coins_in) > 0 && Number(ledger.coins_out) > 0
      && Number(ledger.gems_in) > 0 && Number(ledger.gems_out) > 0,
    'the ledger counts every coin and gem, both directions',
  );

  // The guest vault (0026): capped at 5,000, claimed once per account ever.
  const vaultUser = randomUUID();
  await db.query("insert into auth.users(id,email) values ($1,'vault@example.test')", [vaultUser]);
  await login(vaultUser);
  await db.query('select public.get_wallet()');
  const vaultClaim = async (n) =>
    (await db.query('select public.claim_vault($1) as w', [n])).rows[0].w;
  assert.equal((await vaultClaim(99999)).coins, 6000, 'the claim is capped at 5,000');
  assert.equal((await vaultClaim(500)).coins, 6000, 'and pays once per account');

  // Guests have none of this.
  await login(ghost2, true);
  for (const fn of ['spin_daily()', 'get_rewards()', "claim_mission('play-3')", 'buy_season_premium()', "claim_ad_reward('gem')", 'get_league()', 'claim_vault(1)'])
    await assert.rejects(db.query(`select public.${fn}`), /Create an account/);
  for (const fn of [
    'spin_daily()', 'get_rewards()', 'claim_mission(text)', 'buy_season_premium()',
    'claim_season_tier(integer,boolean)', 'get_tournament()', 'claim_tournament_prize()',
    'claim_ad_reward(text)', 'get_league()',
    'award_online_match(uuid,integer,integer,integer)',
  ])
    assert.equal(await privilege(`select has_function_privilege('anon','public.${fn}','EXECUTE') as ok`), false, fn);
  for (const fn of ['grant_xp(uuid,integer)', 'bump_mission(uuid,text,integer)', 'award_online_for(uuid,uuid)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  console.log(
    'PASS: progression levels up on a rising curve paying coins and gems; online rewards come from the server match record by finishing place (100/50/20, losers 0, once, collected on wallet load, never claimable as a bot game); bot wins pay 50 (losses XP only) capped at 25 paid games a day; the weekly tournament scores and pays last week once by rank; the daily spin allows one free and three gem spins; missions progress from events and claim once; season tiers unlock by XP and premium costs 250 gems; guests and anon are shut out.',
  );
  // --- stakes and turn timers (migration 0013) -----------------------------------
  const coinsOf = async (uid) =>
    (await db.query('select coins from public.profiles where uid=$1', [uid])).rows[0].coins;
  const st1 = randomUUID();
  const st2 = randomUUID();
  const st3 = randomUUID();
  await db.query(
    "insert into auth.users(id,email) values ($1,'st1@example.test'),($2,'st2@example.test'),($3,'st3@example.test')",
    [st1, st2, st3],
  );
  for (const u of [st1, st2, st3]) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  await db.query('delete from public.matchmaking_queue');
  await login(st1);
  await assert.rejects(db.query('select public.join_quick_match(2, 250)'), /not available/);
  await db.query('update public.profiles set coins = 50 where uid=$1', [st3]);
  await login(st3);
  await assert.rejects(db.query('select public.join_quick_match(2, 100)'), /need 100 coins/);
  await assert.rejects(db.query('select public.create_link_room(2, 100)'), /need 100 coins/);
  await login(ghost2, true);
  await assert.rejects(db.query('select public.join_quick_match(2, 100)'), /Create an account/);

  // The high tables (0021): level-gated, and never in private rooms.
  await login(st1);
  await assert.rejects(db.query('select public.join_quick_match(2, 10000)'), /Reach level 10/);
  await assert.rejects(db.query('select public.create_link_room(2, 10000)'), /up to 2,000/);
  await db.query('update public.profiles set coins = 60000, xp = 2500 where uid=$1', [st1]);
  const highTicket = (await db.query('select public.join_quick_match(2, 10000) as t')).rows[0].t;
  assert.equal(highTicket.status, 'WAITING');
  assert.equal(highTicket.stake, 10000);
  await assert.rejects(db.query('select public.join_quick_match(2, 50000)'), /Reach level 20/);
  await db.query('delete from public.matchmaking_queue where user_id=$1', [st1]);
  await db.query('update public.profiles set coins = 1000, xp = 0 where uid=$1', [st1]);

  // Different stakes never share a table.
  await login(st1);
  const stakeTicket = (await db.query('select public.join_quick_match(2, 500) as t')).rows[0].t;
  assert.equal(stakeTicket.status, 'WAITING');
  assert.equal(stakeTicket.stake, 500);
  await login(st2);
  const freeTicket = (await db.query('select public.join_quick_match(2, 0) as t')).rows[0].t;
  assert.equal(freeTicket.status, 'WAITING', 'a free seeker is not seated at a 500 table');
  const matchedTicket = (await db.query('select public.join_quick_match(2, 500) as t')).rows[0].t;
  assert.equal(matchedTicket.status, 'MATCHED');
  const stakeLobby = matchedTicket.lobbyId;
  assert.equal((await db.query('select stake from public.lobbies where id=$1', [stakeLobby])).rows[0].stake, 500);
  assert.equal(await coinsOf(st1), 1000, 'nothing is taken in the lobby');

  // Stakes are taken once, when the match is created.
  await db.query("update public.lobbies set start_at = now() - interval '1 second' where id=$1", [stakeLobby]);
  await login(st1);
  await db.query('select public.start_match($1)', [stakeLobby]);
  await db.query('select public.start_match($1)', [stakeLobby]);
  const staked = (await db.query('select * from public.matches where lobby_id=$1', [stakeLobby])).rows[0];
  assert.equal(staked.stake, 500);
  assert.equal(staked.pool, 1000);
  assert.ok(staked.turn_deadline, 'the first turn has a clock');
  assert.equal(await coinsOf(st1), 500);
  assert.equal(await coinsOf(st2), 500);
  const stakeSnap = (await db.query('select public.get_match($1) as m', [stakeLobby])).rows[0].m;
  assert.equal(stakeSnap.match.pool, 1000);
  assert.equal(stakeSnap.match.prize, 900);

  // A claim before the clock runs out does nothing.
  await login(st2);
  const notYet = (await db.query('select public.claim_turn_timeout($1,$2) as m', [staked.id, staked.version])).rows[0].m;
  assert.equal(notYet.match.version, staked.version);
  // Once it has, the server plays the idle seat's turn, exactly once.
  await db.query("update public.matches set turn_deadline = now() - interval '1 second' where id=$1", [staked.id]);
  const autoPlayed = (await db.query('select public.claim_turn_timeout($1,$2) as m', [staked.id, staked.version])).rows[0].m;
  assert.equal(autoPlayed.match.version, staked.version + 1, 'the idle turn was played');
  assert.equal(autoPlayed.match.lastRoll, null);
  await db.query("update public.matches set turn_deadline = now() - interval '1 second' where id=$1", [staked.id]);
  const staleClaim = (await db.query('select public.claim_turn_timeout($1,$2) as m', [staked.id, staked.version])).rows[0].m;
  assert.equal(staleClaim.match.version, staked.version + 1, 'a claim on an old board is ignored');
  assert.equal(
    (await db.query('select timeouts from public.match_players where match_id=$1 and seat_index=0', [staked.id])).rows[0].timeouts,
    1,
  );
  await login(outsiderTry);
  await assert.rejects(db.query('select public.claim_turn_timeout($1,$2)', [staked.id, staked.version + 1]), /not in that match/);

  // Nobody plays: the first seat to miss three turns in a row walks out.
  let guard = 0;
  for (;;) {
    const row = (await db.query('select status, version, turn_seat from public.matches where id=$1', [staked.id])).rows[0];
    if (row.status !== 'IN_PROGRESS') break;
    assert.ok(guard++ < 40, 'the idle match ends');
    await db.query("update public.matches set turn_deadline = now() - interval '1 second' where id=$1", [staked.id]);
    await login(row.turn_seat === 0 ? st2 : st1);
    await db.query('select public.claim_turn_timeout($1,$2)', [staked.id, row.version]);
  }
  const walked = (await db.query('select status, abandoned_by, version from public.matches where id=$1', [staked.id])).rows[0];
  assert.equal(walked.status, 'ABANDONED');
  const keeper = walked.abandoned_by === st1 ? st2 : st1;
  const walker = walked.abandoned_by;
  assert.ok([st1, st2].includes(walker));
  // The one who stayed takes the whole pool; a match this short pays no game reward.
  await login(keeper);
  await db.query('select public.get_wallet()');
  assert.equal(await coinsOf(keeper), 1500, 'keeper gets the 1000 pool back, no 60 for a short game');
  await login(walker);
  await db.query('select public.get_wallet()');
  assert.equal(await coinsOf(walker), 500, 'walking out forfeits the stake');

  // A finished staked match pays the winner 90% of the pool on top of the win.
  const fLobby = randomUUID();
  const fMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,2,'IN_LOBBY',now()+interval '1 hour')", [fLobby, st1]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status,stake) values ($1,$1,$2,2,'STARTED',500)", [fLobby, st1]);
  await db.query("insert into public.matches(id,lobby_id,player_count,status,winner_seat,finished_at,stake,pool) values ($1,$2,2,'FINISHED',0,now(),500,1000)", [fMatch, fLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1)', [fMatch, st1, st2]);
  await db.query('insert into public.match_stakes(match_id,user_id,amount) values ($1,$2,500),($1,$3,500)', [fMatch, st1, st2]);
  const st1Before = await coinsOf(st1);
  const st1Level = (await db.query('select xp from public.profiles where uid=$1', [st1])).rows[0].xp;
  await login(st1);
  await db.query('select public.award_online_match($1)', [fMatch]);
  const levelBonus = st1Level < 100 && st1Level + 120 >= 100 ? 140 : 0;
  assert.equal(await coinsOf(st1) - st1Before, 100 + 900 + levelBonus, 'win pays 100 plus the 900 prize');
  const st2Before = await coinsOf(st2);
  await login(st2);
  await db.query('select public.get_wallet()');
  assert.equal(await coinsOf(st2) - st2Before, 0, 'the loser takes no prize');

  // The staked tables are member-only and the helpers are private.
  assert.equal(await privilege("select has_function_privilege('anon','public.claim_turn_timeout(uuid,integer)','EXECUTE') as ok"), false);
  assert.equal(await privilege("select has_function_privilege('anon','public.join_quick_match(integer,integer,text,boolean)','EXECUTE') as ok"), false);
  for (const fn of ['require_stake(uuid,integer)', 'secure_die()', 'create_match_for_lobby(uuid)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  assert.equal(await privilege("select has_table_privilege('authenticated','public.match_stakes','SELECT') as ok"), false);
  console.log(
    'PASS: staked tables check coins and refuse guests; different stakes never share a table; stakes are taken once at match creation; the winner collects 90% of the pool, a walk-out forfeits to the players who stayed, and short abandoned games pay no game reward; turn clocks let others claim an idle turn, which the server plays once, and three misses in a row end the match.',
  );
  // --- game variants (migration 0014) --------------------------------------------
  await db.query('delete from public.matchmaking_queue');
  await login(st1);
  await assert.rejects(db.query("select public.join_quick_match(2, 0, 'turbo')"), /mode is not available/);
  const killTicket = (await db.query("select public.join_quick_match(2, 0, 'kill') as t")).rows[0].t;
  assert.equal(killTicket.variant, 'kill');
  await login(st2);
  const classicTicket = (await db.query('select public.join_quick_match(2, 0) as t')).rows[0].t;
  assert.equal(classicTicket.status, 'WAITING', 'a classic seeker is not seated at a Kill & Go table');
  const killMatched = (await db.query("select public.join_quick_match(2, 0, 'kill') as t")).rows[0].t;
  assert.equal(killMatched.status, 'MATCHED');
  await db.query("update public.lobbies set start_at = now() - interval '1 second' where id=$1", [killMatched.lobbyId]);
  const killLobbySnap = (await db.query('select public.start_match($1) as l', [killMatched.lobbyId])).rows[0].l;
  assert.equal(killLobbySnap.lobby.variant, 'kill');
  const killSnap = (await db.query('select public.get_match($1) as m', [killMatched.lobbyId])).rows[0].m;
  assert.equal(killSnap.match.variant, 'kill');
  // The first move is validated against the Kill & Go opening board.
  const killMatch = killSnap.match;
  await db.query('update public.matches set last_roll = 6, version = version + 1 where id=$1', [killMatch.id]);
  const killOpening = createGame(seatColors(2), { variant: 'kill' });
  const [firstMove] = getValidMovesForCurrentPlayer({ ...killOpening, lastRoll: 6, consecutiveSixes: 1 });
  const afterFirst = applyMove({ ...killOpening, lastRoll: 6, consecutiveSixes: 1 }, firstMove);
  const seatAtTurn = killMatch.turnSeat;
  await login(seatAtTurn === 0 ? st1 : st2);
  const moved = (await db.query('select public.submit_match_turn($1,$2,$3::jsonb,null) as m', [killMatch.id, killMatch.version + 1, JSON.stringify(afterFirst)])).rows[0].m;
  assert.equal(moved.match.state.killToEnter, true);
  assert.deepEqual(moved.match.state.hunters, []);
  // A classic board is refused at a Kill & Go table.
  await login(st3);
  await db.query('update public.profiles set coins = 1000 where uid=$1', [st3]);
  await assert.rejects(db.query("select public.create_link_room(2, 0, 'nope')"), /mode is not available/);
  const quickRoom = (await db.query("select public.create_link_room(2, 0, 'quick1') as r")).rows[0].r;
  const quickRoomSnap = (await db.query('select public.get_lobby($1) as l', [quickRoom.lobbyId])).rows[0].l;
  assert.equal(quickRoomSnap.lobby.variant, 'quick1');
  assert.equal(await privilege("select has_function_privilege('authenticated','public.require_variant(text)','EXECUTE') as ok"), false);
  console.log(
    'PASS: game variants are validated, queue separately, carry through lobby and match snapshots, and the first move is checked against the variant\'s own opening board.',
  );
  // --- lifelines (migration 0015) --------------------------------------------------
  const lf = [randomUUID(), randomUUID(), randomUUID()];
  await db.query(
    "insert into auth.users(id,email) values ($1,'lf1@example.test'),($2,'lf2@example.test'),($3,'lf3@example.test')",
    lf,
  );
  for (const u of lf) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  const lfLobby = randomUUID();
  const lfMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,3,'IN_LOBBY',now()+interval '1 hour')", [lfLobby, lf[0]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status,stake) values ($1,$1,$2,3,'STARTED',100)", [lfLobby, lf[0]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,stake,pool,turn_deadline) values ($1,$2,3,100,300,now())", [lfMatch, lfLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1),($1,$4,2)', [lfMatch, ...lf]);
  await db.query('insert into public.match_stakes(match_id,user_id,amount) values ($1,$2,100),($1,$3,100),($1,$4,100)', [lfMatch, ...lf]);
  // Seat 0 has already missed four turns; one more and they are out.
  await db.query('update public.match_players set missed = 4 where match_id=$1 and seat_index=0', [lfMatch]);
  const lfVersion = (await db.query('select version from public.matches where id=$1', [lfMatch])).rows[0].version;
  await db.query("update public.matches set turn_deadline = now() - interval '1 second' where id=$1", [lfMatch]);
  await login(lf[1]);
  const afterOut = (await db.query('select public.claim_turn_timeout($1,$2) as m', [lfMatch, lfVersion])).rows[0].m;
  assert.equal(afterOut.match.status, 'IN_PROGRESS', 'a 3-player game carries on without them');
  assert.equal(afterOut.match.lifelines, 5);
  const outSeat = afterOut.players.find((pl) => pl.seatIndex === 0);
  assert.equal(outSeat.out, true);
  assert.equal(outSeat.missed, 5);
  assert.notEqual(afterOut.match.turnSeat, 0, 'the turn has moved on');
  // From now on their turns are skipped, whoever plays.
  for (let i = 0; i < 12; i++) {
    const row = (await db.query('select status, version, turn_seat from public.matches where id=$1', [lfMatch])).rows[0];
    if (row.status !== 'IN_PROGRESS') break;
    assert.notEqual(row.turn_seat, 0, 'an out seat never gets the turn');
    await db.query("update public.matches set turn_deadline = now() - interval '1 second' where id=$1", [lfMatch]);
    // Keep the two remaining players from running out themselves.
    await db.query('update public.match_players set missed = 0 where match_id=$1 and seat_index <> 0', [lfMatch]);
    await login(row.turn_seat === 1 ? lf[2] : lf[1]);
    await db.query('select public.claim_turn_timeout($1,$2)', [lfMatch, row.version]);
  }
  // Settling now (say it ended): the out player forfeits; the others split the pool.
  await db.query("update public.matches set status='ABANDONED', finished_at=now(), abandoned_by=null, turn_deadline=null where id=$1", [lfMatch]);
  const lfBefore = await Promise.all(lf.map(coinsOf));
  for (const u of lf) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  const lfAfter = await Promise.all(lf.map(coinsOf));
  assert.equal(lfAfter[0] - lfBefore[0], 0, 'out of lifelines forfeits the stake');
  assert.equal(lfAfter[1] - lfBefore[1], 150, 'the two who stayed split the 300 pool');
  assert.equal(lfAfter[2] - lfBefore[2], 150);
  // Two players: the fifth miss is a walk-over.
  const duoLobby = randomUUID();
  const duoMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,2,'IN_LOBBY',now()+interval '1 hour')", [duoLobby, lf[1]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status) values ($1,$1,$2,2,'STARTED')", [duoLobby, lf[1]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,turn_deadline) values ($1,$2,2,now() - interval '1 second')", [duoMatch, duoLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index,missed) values ($1,$2,0,4),($1,$3,1,0)', [duoMatch, lf[1], lf[2]]);
  await login(lf[2]);
  const walkover = (await db.query('select public.claim_turn_timeout($1,0) as m', [duoMatch])).rows[0].m;
  assert.equal(walkover.match.status, 'ABANDONED', 'two players: out of lifelines ends the match');
  assert.equal((await db.query('select abandoned_by from public.matches where id=$1', [duoMatch])).rows[0].abandoned_by, lf[1]);
  assert.equal(await privilege("select has_function_privilege('authenticated','public.skip_out_seats(uuid,jsonb)','EXECUTE') as ok"), false);

  // Leaving (0028): a bigger table plays on without the leaver…
  const lvLobby = randomUUID();
  const lvMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,3,'IN_LOBBY',now()+interval '1 hour')", [lvLobby, lf[0]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status) values ($1,$1,$2,3,'STARTED')", [lvLobby, lf[0]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,turn_deadline) values ($1,$2,3,now() + interval '1 minute')", [lvMatch, lvLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1),($1,$4,2)', [lvMatch, ...lf]);
  await login(lf[0]);
  const leftBig = (await db.query('select public.abandon_match($1) as m', [lvMatch])).rows[0].m;
  assert.equal(leftBig.match.status, 'IN_PROGRESS', 'leaving a 3-player table does not end it');
  assert.equal(leftBig.players.find((pl) => pl.seatIndex === 0).out, true, 'the leaver is out');
  assert.notEqual(leftBig.match.turnSeat, 0, 'and their turn passes on');
  const leftAgain = (await db.query('select public.abandon_match($1) as m', [lvMatch])).rows[0].m;
  assert.equal(leftAgain.match.version, leftBig.match.version, 'leaving twice changes nothing');
  // …and at a table of two the one who stays wins the walk-over.
  const woLobby = randomUUID();
  const woMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,2,'IN_LOBBY',now()+interval '1 hour')", [woLobby, lf[1]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status) values ($1,$1,$2,2,'STARTED')", [woLobby, lf[1]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,version,turn_deadline) values ($1,$2,2,45,now() + interval '1 minute')", [woMatch, woLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1)', [woMatch, lf[1], lf[2]]);
  await login(lf[1]);
  const quit = (await db.query('select public.abandon_match($1) as m', [woMatch])).rows[0].m;
  assert.equal(quit.match.status, 'ABANDONED', 'leaving a table of two ends it');
  const winsBefore = (await db.query('select games_won from public.profiles where uid=$1', [lf[2]])).rows[0].games_won;
  await login(lf[2]);
  await db.query('select public.get_wallet()');
  const stayer = (await db.query("select coins, won from public.profile_rewards where uid=$1 and match_id=$2", [lf[2], `online:${woMatch}`])).rows[0];
  assert.deepEqual([stayer.coins, stayer.won], [100, true], 'the one who stayed wins +100');
  assert.equal((await db.query('select games_won from public.profiles where uid=$1', [lf[2]])).rows[0].games_won, winsBefore + 1);
  await login(lf[1]);
  await db.query('select public.get_wallet()');
  const quitter = (await db.query("select coins, won from public.profile_rewards where uid=$1 and match_id=$2", [lf[1], `online:${woMatch}`])).rows[0];
  assert.deepEqual([quitter.coins, quitter.won], [0, false], 'the one who left gets nothing');
  // An out seat places last, whatever it had home.
  const outBoard = {
    players: [0, 1, 2, 3].map((s) => ({
      pieces: Array.from({ length: 4 }, () => ({ progress: s === 0 ? 57 : s === 3 ? 10 : 0 })),
    })),
  };
  const place = async (seat, out) =>
    (await db.query('select public.match_placement($1::jsonb,$2,1,$3::int[]) as r', [JSON.stringify(outBoard), seat, out])).rows[0].r;
  assert.equal(await place(0, [0]), 4, 'out with all coins home still places last');
  assert.equal(await place(3, [0]), 2, 'the best player still in takes second');
  console.log(
    'PASS: lifelines: five missed turns and a player is out; a bigger table carries on with their turns skipped and their stake forfeited to the players who stayed, and a two-player table ends as a walk-over.',
  );
  // --- 2 v 2 online (migration 0016) ---------------------------------------------
  await db.query('delete from public.matchmaking_queue');
  await login(lf[0]);
  await assert.rejects(db.query("select public.join_quick_match(2, 0, 'classic', true)"), /four-player table/);
  const teamTicket = (await db.query("select public.join_quick_match(4, 0, 'classic', true) as t")).rows[0].t;
  assert.equal(teamTicket.teams, true);
  await login(lf[1]);
  const soloFour = (await db.query('select public.join_quick_match(4, 0) as t')).rows[0].t;
  assert.equal(soloFour.status, 'WAITING');
  assert.equal(soloFour.waiting, 1, 'a solo 4-player seeker does not count toward a 2 v 2 table');
  await db.query('delete from public.matchmaking_queue');
  // A finished 2 v 2 with a pool: both winners are paid as winners and share the prize.
  const team = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await db.query("insert into auth.users(id,email) values ($1,'t1@example.test'),($2,'t2@example.test'),($3,'t3@example.test'),($4,'t4@example.test')", team);
  for (const u of team) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  const tLobby = randomUUID();
  const tMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,4,'IN_LOBBY',now()+interval '1 hour')", [tLobby, team[0]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status,stake,teams) values ($1,$1,$2,4,'STARTED',100,true)", [tLobby, team[0]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,status,winner_seat,finished_at,stake,pool,teams) values ($1,$2,4,'FINISHED',2,now(),100,400,true)", [tMatch, tLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1),($1,$4,2),($1,$5,3)', [tMatch, ...team]);
  const tBefore = await Promise.all(team.map(coinsOf));
  for (const u of team) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  const tAfter = await Promise.all(team.map(coinsOf));
  const levelBonusOf = async (u, gained) => gained; // coins only; level-ups at level 1 add 140
  void levelBonusOf;
  const gain = tAfter.map((c, i) => c - tBefore[i]);
  // Seat 2 won, so seats 0 and 2 are the winning pair: 100 + 180 (half of 360) each.
  // 120 XP from level 1 also levels up (140 coins), so allow for that.
  assert.ok([280, 420].includes(gain[0]), `winner's partner paid as a winner (got ${gain[0]})`);
  assert.ok([280, 420].includes(gain[2]), `winner paid (got ${gain[2]})`);
  assert.equal(gain[1], 0, 'the losing pair takes no prize');
  assert.equal(gain[3], 0);
  // A partner walking out loses it for the pair; the other pair split the pool.
  const wLobby = randomUUID();
  const wMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,4,'IN_LOBBY',now()+interval '1 hour')", [wLobby, team[0]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status,stake,teams) values ($1,$1,$2,4,'STARTED',100,true)", [wLobby, team[0]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,status,finished_at,stake,pool,teams,abandoned_by) values ($1,$2,4,'ABANDONED',now(),100,400,true,$3)", [wMatch, wLobby, team[1]]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index) values ($1,$2,0),($1,$3,1),($1,$4,2),($1,$5,3)', [wMatch, ...team]);
  const wBefore = await Promise.all(team.map(coinsOf));
  for (const u of team) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  const wGain = (await Promise.all(team.map(coinsOf))).map((c, i) => c - wBefore[i]);
  assert.equal(wGain[1], 0, 'the one who walked out gets nothing');
  assert.equal(wGain[3], 0, 'their partner loses too');
  assert.equal(wGain[0], 200, 'the other pair split the 400 pool');
  assert.equal(wGain[2], 200);
  // In 2 v 2, running out of lifelines ends the match for that pair.
  const oLobby = randomUUID();
  const oMatch = randomUUID();
  await db.query("insert into public.challenges(id,creator_id,player_count,status,expires_at) values ($1,$2,4,'IN_LOBBY',now()+interval '1 hour')", [oLobby, team[0]]);
  await db.query("insert into public.lobbies(id,challenge_id,host_id,max_players,status,teams) values ($1,$1,$2,4,'STARTED',true)", [oLobby, team[0]]);
  await db.query("insert into public.matches(id,lobby_id,player_count,teams,turn_deadline) values ($1,$2,4,true,now() - interval '1 second')", [oMatch, oLobby]);
  await db.query('insert into public.match_players(match_id,user_id,seat_index,missed) values ($1,$2,0,4),($1,$3,1,0),($1,$4,2,0),($1,$5,3,0)', [oMatch, ...team]);
  await login(team[1]);
  const teamOut = (await db.query('select public.claim_turn_timeout($1,0) as m', [oMatch])).rows[0].m;
  assert.equal(teamOut.match.status, 'ABANDONED', 'out of lifelines in 2 v 2 ends the match');
  assert.equal(teamOut.match.teams, true);
  for (const fn of ['require_teams(boolean,integer)', 'partner_seat(boolean,integer)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  console.log(
    'PASS: 2 v 2 online: teams need four seats and queue apart; both winners are paid and share the prize; a partner walking out or running out of lifelines loses it for the pair, and the other pair split the pool.',
  );
  // --- team parties (migration 0017) -----------------------------------------------
  const party = Array.from({ length: 9 }, () => randomUUID());
  await db.query(
    `insert into auth.users(id,email) select id, 'party' || n || '@example.test' from unnest($1::uuid[]) with ordinality as t(id, n)`,
    [party],
  );
  for (const u of party) {
    await login(u);
    await db.query('select public.get_wallet()');
  }
  await db.query('delete from public.matchmaking_queue');
  const seatOf = async (lobbyId, uid) =>
    (await db.query("select seat_index from public.lobby_players where lobby_id=$1 and user_id=$2 and status='JOINED'", [lobbyId, uid])).rows[0]?.seat_index;
  // The first friend to join a 2 v 2 room sits opposite the host.
  await login(party[0]);
  const roomA = (await db.query("select public.create_link_room(4, 0, 'classic', true) as r")).rows[0].r;
  await login(party[1]);
  await db.query('select public.join_link_room($1)', [roomA.code]);
  assert.equal(await seatOf(roomA.lobbyId, party[1]), 2, 'first friend is the partner, opposite');
  // Nobody else yet: a non-host cannot search, and the host can.
  await assert.rejects(db.query('select public.seek_opponents($1)', [roomA.lobbyId]), /Only the host/);
  await login(party[0]);
  const seeking = (await db.query('select public.seek_opponents($1) as l', [roomA.lobbyId])).rows[0].l;
  assert.equal(seeking.lobby.seeking, true);
  // Seats cannot be shuffled while searching.
  await login(party[1]);
  await assert.rejects(db.query('select public.move_lobby_seat($1, 1)', [roomA.lobbyId]), /Stop searching/);
  // For the first 20 seconds a searching pair waits for another pair: a
  // stranger is not seated yet (0018).
  await login(party[2]);
  const tooSoon = (await db.query("select public.join_quick_match(4, 0, 'classic', true) as t")).rows[0].t;
  assert.equal(tooSoon.status, 'WAITING', 'strangers wait while a pair looks for another pair');
  assert.equal(await seatOf(roomA.lobbyId, party[2]), undefined);
  assert.ok(seeking.lobby.seekingSince, 'the room says when it started searching');
  // After that, a stranger searching for 2 v 2 takes a seat on the other side.
  await db.query("update public.lobbies set seeking_since = now() - interval '30 seconds' where id=$1", [roomA.lobbyId]);
  const strangerTicket = (await db.query("select public.join_quick_match(4, 0, 'classic', true) as t")).rows[0].t;
  assert.equal(strangerTicket.status, 'MATCHED');
  assert.equal(strangerTicket.lobbyId, roomA.lobbyId);
  assert.equal(await seatOf(roomA.lobbyId, party[2]), 1);
  // A second stranger completes the table, which stops searching and counts down.
  await login(party[3]);
  await db.query("select public.join_quick_match(4, 0, 'classic', true)");
  assert.equal(await seatOf(roomA.lobbyId, party[3]), 3);
  const fullA = (await db.query('select status, seeking from public.lobbies where id=$1', [roomA.lobbyId])).rows[0];
  assert.equal(fullA.seeking, false);
  assert.equal(fullA.status, 'COUNTDOWN');

  // Two searching pairs play each other, at the older table.
  await db.query('delete from public.matchmaking_queue');
  await login(party[4]);
  const roomB = (await db.query("select public.create_link_room(4, 0, 'kill', true) as r")).rows[0].r;
  await login(party[5]);
  await db.query('select public.join_link_room($1)', [roomB.code]);
  await login(party[4]);
  await db.query('select public.seek_opponents($1)', [roomB.lobbyId]);
  await login(party[6]);
  const roomC = (await db.query("select public.create_link_room(4, 0, 'kill', true) as r")).rows[0].r;
  await login(party[7]);
  await db.query('select public.join_link_room($1)', [roomC.code]);
  // Changing sides before searching: move to an empty seat, then back.
  await db.query('select public.move_lobby_seat($1, 3)', [roomC.lobbyId]);
  assert.equal(await seatOf(roomC.lobbyId, party[7]), 3);
  await assert.rejects(db.query('select public.move_lobby_seat($1, 0)', [roomC.lobbyId]), /already sitting/);
  await login(party[6]);
  await assert.rejects(db.query('select public.seek_opponents($1)', [roomC.lobbyId]), /partner opposite/);
  await login(party[7]);
  await db.query('select public.move_lobby_seat($1, 2)', [roomC.lobbyId]);
  await login(party[6]);
  const merged = (await db.query('select public.seek_opponents($1) as l', [roomC.lobbyId])).rows[0].l;
  assert.equal(merged.lobby.movedTo, roomB.lobbyId, 'the newer pair is sent to the older table');
  assert.equal(merged.lobby.status, 'CANCELLED');
  assert.equal(await seatOf(roomB.lobbyId, party[6]), 1);
  assert.equal(await seatOf(roomB.lobbyId, party[7]), 3, 'partners stay opposite each other');
  assert.equal((await db.query('select status from public.lobbies where id=$1', [roomB.lobbyId])).rows[0].status, 'COUNTDOWN');
  // A different mode never merges.
  await login(party[8]);
  await db.query("select public.join_quick_match(4, 0, 'classic', true)");
  assert.equal(await seatOf(roomB.lobbyId, party[8]), undefined);
  for (const fn of ['free_seat(uuid,integer[])', 'seat_player(lobbies,uuid,integer)', 'fill_team_room(uuid)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  for (const fn of ['move_lobby_seat(uuid,integer)', 'seek_opponents(uuid,boolean)'])
    assert.equal(await privilege(`select has_function_privilege('anon','public.${fn}','EXECUTE') as ok`), false, fn);
  console.log(
    'PASS: team parties: the first friend in a 2 v 2 room sits opposite as partner; players can change to an empty seat; a searching pair meets another searching pair at once (at the older table, partners kept opposite), and only after 20 seconds without one do 2 v 2 quick-play strangers fill in; modes never mix.',
  );

  // --- store-version policy (migration 0029) ------------------------------------
  const policyOf = async (platform) =>
    (await db.query('select public.get_app_version_policy($1) as p', [platform])).rows[0].p;
  // Seeded rows ask nothing of anyone.
  assert.deepEqual(await policyOf('android'), {
    min_version: '0.0.0',
    latest_version: '0.0.0',
    store_url: null,
    message: null,
  });
  assert.equal(await policyOf('web'), null, 'unknown platforms have no policy');
  await db.query("update public.app_versions set min_version='1.1.0', latest_version='1.2.0' where platform='ios'");
  assert.equal((await policyOf('ios')).min_version, '1.1.0');
  await assert.rejects(
    db.query("update public.app_versions set min_version='1.x' where platform='android'"),
    /check constraint/,
  );
  await assert.rejects(
    db.query("update public.app_versions set store_url='http://example.test' where platform='ios'"),
    /check constraint/,
  );
  assert.equal(
    (await db.query("select count(*)::int as n from pg_policies where tablename='app_versions'")).rows[0].n,
    0,
    'app_versions must have no RLS policies: read through the function only',
  );
  assert.equal(
    await privilege("select has_function_privilege('anon','public.get_app_version_policy(text)','EXECUTE') as ok"),
    true,
  );
  assert.equal(
    await privilege("select has_function_privilege('anon','public.touch_app_versions()','EXECUTE') as ok"),
    false,
  );
  console.log(
    'PASS: store-version policy is readable by anyone through its function, validated on write, and has no client write path.',
  );
} finally {
  await db.close();
}
