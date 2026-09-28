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
    [750, 1, 1, 1, 1],
  );
  assert.equal((await award('match-1', true, true)).coins, 750, 'a replayed result pays once');
  const secondAward = await award('match-2', false, true);
  assert.deepEqual(
    [secondAward.coins, secondAward.games, secondAward.streak, secondAward.bestStreak],
    [765, 2, 0, 1],
  );
  assert.equal((await award('match-3', true, false)).coins, 765, 'ineligible: stats only');
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
  for (const fn of ['create_link_room(integer,integer)', 'join_link_room(text)'])
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
  assert.equal(onlineWon.coins, 1390, 'online win pays 250, plus 140 for reaching level 2');
  assert.equal(onlineWon.xp, 120);
  assert.equal(onlineWon.level.level, 2);
  assert.equal(onlineWon.gems, 25, 'levelling up to 2 paid 5 gems');
  assert.equal((await db.query('select public.award_online_match($1) as w', [pMatch])).rows[0].w.coins, 1390, 'paid once');
  await login(pLose);
  // The loser never collects; loading the wallet collects for them.
  const collectedWallet = (await db.query('select public.get_wallet() as w')).rows[0].w;
  assert.equal(collectedWallet.coins, 1060, 'online finish pays 60, collected on wallet load');
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

  // Guests have none of this.
  await login(ghost2, true);
  for (const fn of ['spin_daily()', 'get_rewards()', "claim_mission('play-3')", 'buy_season_premium()'])
    await assert.rejects(db.query(`select public.${fn}`), /Create an account/);
  for (const fn of [
    'spin_daily()', 'get_rewards()', 'claim_mission(text)', 'buy_season_premium()',
    'claim_season_tier(integer,boolean)', 'get_tournament()', 'claim_tournament_prize()',
    'award_online_match(uuid,integer,integer,integer)',
  ])
    assert.equal(await privilege(`select has_function_privilege('anon','public.${fn}','EXECUTE') as ok`), false, fn);
  for (const fn of ['grant_xp(uuid,integer)', 'bump_mission(uuid,text,integer)', 'award_online_for(uuid,uuid)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  console.log(
    'PASS: progression levels up on a rising curve paying coins and gems; online rewards come from the server match record (250/60, once, collected on wallet load, never claimable as a bot game); bot games pay 50/15 capped at 25 a day; the weekly tournament scores and pays last week once by rank; the daily spin allows one free and three gem spins; missions progress from events and claim once; season tiers unlock by XP and premium costs 250 gems; guests and anon are shut out.',
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
  assert.equal(await coinsOf(st1) - st1Before, 250 + 900 + levelBonus, 'win pays 250 plus the 900 prize');
  const st2Before = await coinsOf(st2);
  await login(st2);
  await db.query('select public.get_wallet()');
  assert.equal(await coinsOf(st2) - st2Before, 60, 'the loser gets the finish reward only');

  // The staked tables are member-only and the helpers are private.
  assert.equal(await privilege("select has_function_privilege('anon','public.claim_turn_timeout(uuid,integer)','EXECUTE') as ok"), false);
  assert.equal(await privilege("select has_function_privilege('anon','public.join_quick_match(integer,integer)','EXECUTE') as ok"), false);
  for (const fn of ['require_stake(uuid,integer)', 'secure_die()', 'create_match_for_lobby(uuid)'])
    assert.equal(await privilege(`select has_function_privilege('authenticated','public.${fn}','EXECUTE') as ok`), false, fn);
  assert.equal(await privilege("select has_table_privilege('authenticated','public.match_stakes','SELECT') as ok"), false);
  console.log(
    'PASS: staked tables check coins and refuse guests; different stakes never share a table; stakes are taken once at match creation; the winner collects 90% of the pool, a walk-out forfeits to the players who stayed, and short abandoned games pay no game reward; turn clocks let others claim an idle turn, which the server plays once, and three misses in a row end the match.',
  );
} finally {
  await db.close();
}
