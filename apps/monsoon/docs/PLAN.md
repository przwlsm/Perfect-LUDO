# Monsoon Fields — plan

## The idea

The monsoon is coming. On a terraced hillside farm, stone channels carry
rain from the clouds to the fields. The player taps a tile to turn it a
quarter turn; water runs the moment a path joins up, fields fill and rice
sprouts. Readable in five seconds, deep by level 150. The bar is Play's
Editors' Choice: crafted, calm, accessible, honest about money.

## Rules (as the engine implements them)

| Tile        | What it does                                                              | Turns?          |
| ----------- | ------------------------------------------------------------------------- | --------------- |
| Rain spring | A basin under a small cloud. Rain starts here and leaves by its openings. | Yes             |
| Temple tank | A stepped tank. Tank water starts here.                                   | Yes             |
| Channel     | Dead end (a little basin), straight, bend, tee or cross.                  | Yes (not cross) |
| Rice paddy  | Wants rain. Turns green, and rice sprouts, when rain reaches it.          | Yes             |
| Lotus pond  | Wants temple-tank water. A lotus opens when it gets it.                   | Yes             |
| Bridge      | One channel north–south below, one east–west above. Flows never mix.      | Never           |
| Check-dam   | A straight channel that lets water through only the way its arrow points. | Yes             |
| Rock        | Nothing passes.                                                           | Never           |

- Iron pins at a tile's corners mean it is fixed. A hint pins a tile with a
  gold rim.
- **Solved** = every channel carries water, no open end spills (every open
  end meets another end), the two waters never mix, and every field has its
  own water. "Every channel carries water" is what keeps the answer unique
  and makes a dry channel visibly unfinished; the spills lesson says it in
  one line.
- **Cloud budget** (from level 16): the clouds pass after a number of
  turns, the fewest needed plus some slack (60% early, 25% late, at least
  2). It only decides the third star; never a fail.

## Engine (`src/application/engine`, pure TypeScript, tested)

- `flow.ts` — breadth-first flood from every spring over tile _parts_ (a
  bridge has two). Water passes only where both neighbours open towards each
  other; a dam passes it only out of its outlet and refuses it at its outlet
  (marked "blocked" only when nothing feeds it from its inlet). Reports per
  part which waters arrived, in which order and from which side (for the
  animation), every spill, mixing, dry channels and each field's state.
- `solver.ts` — each tile has a domain of distinct facings (a straight 2, a
  bend 4, a cross 1, a dam 4 because its arrow matters, fixed tiles 1).
  1. Edge matching: a shared side is open on both or closed on both; borders
     and rocks are closed. Propagated to a fixed point (arc consistency).
  2. Islands: settled tiles joined by open sides form pieces. A closed piece
     with no spring would stay dry, and any piece with two waters, or a field
     of the other water, is already wrong — so the branch dies early.
  3. Backtracking on the tile with fewest facings, preferring tiles next to
     settled ones; every complete board is checked with the real `flow`.
     Counts solutions up to a limit; accepts pinned tiles (hints). It agrees with
     brute force on 30 small boards of every kind in the tests.
- `generator.ts` — from a seed: rocks scattered without cutting the hillside
  in two; one or two springs (the second far away); growing trees, one per
  water, taking turns (`wind` chooses long winding runs or branching);
  bridges inserted where a straight run can carry a crossing channel (the
  loop that makes is broken by cutting one edge elsewhere); fields at the far
  leaves, spread apart; dead ends trimmed only as twigs (never whole
  branches) and left-over leaves becoming extra fields or small basins;
  check-dams on straight runs facing downstream; a few fixed tiles; then the
  scramble (a share of tiles left facing right, the rest turned). Finally the
  solver must find exactly one answer; if it finds two and fixed tiles are
  taught, one ambiguous tile is pinned and it asks again. Up to 40 boards per
  level (10 after level 100) are tried for a unique one.

### Uniqueness, measured

`npm run levels` reports every level the solver could not prove unique, and
a test checks levels 1–100. Result for the shipped set: **all 300 levels
have exactly one answer**. 196 of the 300 are settled by edge matching and
the island rule alone, with no guessing. The other 104 need a few guesses:
103 of them have check-dams, whose direction the solver only checks on a
finished board; one other level needs a guess too. Every daily board of the first month is unique too (tested).

## Levels and the difficulty curve (`src/application/levels`)

300 levels in 15 chapters of 20. Levels 1–2 are drawn by hand (one and five
taps); the rest come from each level's seed. Ideas arrive one every fifteen
levels, each with a one-line lesson the first time:

| Level | Idea                       |
| ----- | -------------------------- |
| 1     | Turn a channel             |
| 4     | Spills and dry channels    |
| 16    | The cloud budget           |
| 31    | Fixed (pinned) tiles       |
| 46    | Bridges                    |
| 61    | Check-dams                 |
| 76    | Two waters (paddy / lotus) |

Boards grow 4×4 → 5×5 (level 10) → 6×6 (41) → 7×7 (81) → 8×9 (161) →
8×11 (241) → 9×12 (last rows). Each chapter grows a row in its last third
and the next chapter opens a little gentler. Networks wind less and branch
more as the game goes on, fewer tiles start already right (30% → 5%) and the
cloud slack tightens. Fewest turns needed: ~2 at level 1, ~40 at 60, ~80 at
150, ~140 at 300.

Levels are baked by `npm run levels` (about 3 s) into `shipped.ts`
(two characters per cell). A test rebuilds all of the first 50 and a sample
after from their seeds and compares, so levels never change by accident.

## Daily field

Built on the phone from `dailySeed(date)`: the same hillside for everyone
that UTC day, 7×8 on Monday growing to 8×10 on Sunday, ideas mixed by the
day's seed. `Monsoon #212 🌧️🌾🌾🌾 · 38 turns · no hints` (🪷 for lotus
ponds). Streak counts a daily solved on its own day. Archive: the last 7
days free; every day since #1 with Plus.

## Stars and hints

Stars: 3 = no hints and within the cloud budget, 2 = one hint (or over the
budget), 1 = solved. Hints turn one wrong tile to the answer and pin it,
choosing the wrong tile nearest the springs along the finished network (so
the water moves on), never a tile the player already has right. On a board
with several answers the hint follows the one closest to the player's board.
Three free hints a day; a rewarded video earns one (tap only, max six a day);
Plus is unlimited. Undo/redo (an undo still counts as a turn), start over
(keeps hinted tiles).

## Feel

- Rain over the hillside and the sky; storm clouds drift. Dusk is a stormy
  evening with silver rain; Morning is a bright monsoon morning.
- Tiles turn on a damped spring with a stone clack and a light haptic.
- Water fills each channel in the order it flows (in by one arm, out by the
  others), then shimmer runs downstream. Spills splash at open ends.
- Fields flood, then rice (or a lotus) springs up with a bounce; each field
  rings a chime a step higher, a sprout pops, and now and then a frog croaks
  (Settings → Frog song). The rain-and-trickle bed swells as the network grows.
- The win: the clouds part, sunlight falls on the hillside, a rainbow rises
  over the terraces and birds cross; the rain stops.
- Calmer motion (OS setting or in-app): no idle rain, no shimmer drift, no
  clouds or birds in the finale; turns and water still animate briefly.
- Water patterns (colour-blind aid): dots on rain water, petal bars on tank
  water; paddies are square, lotus ponds round, springs and tanks differ.
- Valleys (themes): Rice Terraces (free), Kerala Backwaters (laterite,
  palms), Tea Garden (pale stone, tea bushes), Desert Stepwell (sandstone,
  cactus), Night Rain (indigo, glowing water, fireflies).

Rendering: the hillside, rocks and each tile's stone channel are recorded
once as Skia pictures; everything that moves is painted into one picture per
frame from a few timestamps (`board/scene.ts`), so a 9×12 board is two canvas
nodes, not hundreds.

## Money (honest)

- Every level and every daily field free, forever. No ads in a level, ever.
- Plus (`monsoon.plus`, one purchase): unlimited hints, every valley, the
  full daily archive, no watermark on shared pictures.
- Rewarded video, only on a tap: one hint, or one valley for 24 hours.
- Tips (`monsoon.tip.*`) unlock nothing.
- In-app "How we make money" and privacy pages (no invented contact address:
  "write to the support address on the app's store page").

## Architecture

```
src/domain          Board (tiles, rotations, periods), themes, products, hints wallet, record, settings; ports
src/application     engine (flow, solver, generator), game (play, hint), levels (codec, hand-made, curve, daily, shipped)
src/infrastructure  text share sheet (other adapters come from app-kit/native)
src/config          container.ts: the only place concrete adapters are created
src/presentation    theme (palette, valley looks), board (paint, scene, BoardView, GameBoard), components, i18n, state, screens
src/app             routes: one-line re-exports of screens
```

## Before launch

- [ ] `eas init` and real bundle ids / EAS project.
- [ ] Real AdMob app ids and `EXPO_PUBLIC_ADMOB_REWARDED_ID` in EAS secrets.
- [ ] Store products: `monsoon.plus`, `monsoon.tip.chai|coffee|cake|lunch|patron`.
- [ ] Device check of the per-frame scene on a low-end Android (9×12 boards).
- [ ] Play-test levels 1–60 with new players; tune lesson lines and cloud slack.
- [ ] Check sounds on device speakers (rain loop seam, frog volume).
- [ ] Translations (strings are all in `presentation/i18n/en.ts`).
- [ ] Store listing privacy form; support address on the store page.
