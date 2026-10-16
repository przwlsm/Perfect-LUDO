# Chai Sort — plan

## The idea

A pour-to-sort puzzle at a chai stall. Kulhads hold layers of ingredients;
tap a cup, tap another, and the top layer pours across. When every cup holds
one ingredient, the chaiwala's order is served. Easy to read in five seconds,
cosy for three hundred levels. The bar is Play's Editors' Choice: crafted,
respectful of attention, accessible, honest about money.

## Rules (as the engine implements them)

- A cup holds 4 layers (a tall glass holds 6). Every ingredient on a counter
  has exactly 4 layers; a finished cup holds those 4.
- A pour moves the whole **top run** (the visible layers of one ingredient on
  top) as far as there is room. It lands only on the same ingredient, or in an
  empty cup.
- A finished cup (4 alike) steams and stays put: it can no longer be poured.
- Sorted = every cup finished or empty.
- **Froth** hides a layer until it is the top layer; a hidden layer also ends
  a run, so what pours is always what you can see.
- **Lids**: a lidded cup cannot be poured from or into until N pours have
  been made anywhere on the counter (the badge counts down).
- **Tall glass**: room for 6 layers.
- **Spices** (black pepper, kokum): a spice layer pours only onto the same
  spice, never into an empty cup. The generator guarantees each spice starts
  at the bottom of some cup, or it could never be gathered.

Refusals carry a reason (`same | empty | lidFrom | lidTo | served | full |
mismatch | spice`) so the game can say kindly why a pour did not happen.

## Engine (`src/application`)

- `engine/state.ts` — immutable positions (`cups`, `caps`, `lids`), `check`
  (legal pour or a reason), `applyPour` (reveals froth, counts lids down),
  `keyOf` (canonical: cups sorted, so reshuffles of the same counter are one
  state), `withExtraCup`.
- `engine/solver.ts` — A* over pours with an admissible heuristic (every run
  above a cup's bottom run must leave at least once; of several cups with the
  same bottom ingredient, all but one bottom run must move), canonical state
  hashing, and two safe prunings (a single-ingredient cup is never poured into
  an empty cup of the same size; of several identical empty cups only the
  first is tried). `route()` tries a proven-shortest search first, then
  weighted searches, within a budget. Tests check it against plain BFS.
- `engine/generator.ts` — deals ingredients from a seed (tall glasses first,
  froth spread just under the tops, lids on full cups), keeps only deals the
  solver sorts, and of several candidates picks the one whose best route is
  closest to the spec's target. Par = best + max(1, 15%).
- `game/play.ts` — a level in play: full history (undo is free, unlimited and
  exact), restart, the extra-cup assist (added to every position in history,
  once per level), stars.
- `game/hint.ts` — the next pour on the solver's route from where you are; if
  there is none, it walks back through your history to the latest position
  that still sorts ("undo to here") and gives the pour from there.
- `levels/levels.ts`, `levels/codec.ts`, `levels/shipped.ts` — 300 levels in
  20 chapters of 15, baked at build time (`npm run levels`, ~40 s) into short
  strings; a test checks the shipped file still matches the seeds.
- `levels/daily.ts` — the daily order from `dailySeed`, built on the phone.

## The curve

Levels 1–2 are set by hand (pour; match). Each chapter climbs and the next
opens a little gentler. One idea at a time, then mixed:

| Levels | Chapter          | What is new                                 |
| ------ | ---------------- | ------------------------------------------- |
| 1–15   | First Boil       | 2→5 ingredients, two spare cups             |
| 16–30  | Under the Froth  | hidden layers                               |
| 31–45  | One Spare Cup    | only one empty cup                          |
| 46–60  | Lids On          | lids that lift after N pours                |
| 61–75  | The Tall Glass   | a 6-layer glass, one spare                  |
| 76–90  | Spice Shelf      | a spice that only pours onto itself         |
| 91–300 | 14 more chapters | each features one or two twists, then mixes |

Measured: best routes climb from 3 pours (level 1) to 30–34 (the last
chapters); 2–11 ingredients; twists every 15 levels. One spare cup is tight
(beyond ~6 ingredients most deals cannot be sorted), so one-spare chapters
keep to 3–6 ingredients unless a tall glass gives room.

## Daily

`Chai Sort #n`, numbered from 1 October 2026 (UTC), the same counter for
everyone: a gentle Monday, 5 ingredients, up to 8 by Sunday, with the day's
seed choosing froth, lids, a tall glass or a spice. Share text:
`Chai Sort #212 ☕ in 24 pours · no hints` — no spoilers. Free: the last 7
days; Plus: the whole archive.

## Stars and help

- 3 stars: no hints or extra cups, within par.
- 2 stars: within par + 30%, with at most one hint or extra cup.
- 1 star: any finish.
- Undo and restart are always free. Hints and the extra cup share the hint
  wallet: 3 free a day, +1 per tap-only video (max 6 videos a day), unlimited
  with Plus.

## Feel

- Skia counter: cups are static pictures moved by animated transforms; the
  pour is painted per frame — the cup lifts, flies over, tips 80–110° around
  its lip (more when it is nearly empty), a stream falls and narrows, the
  source drains while the target fills and its surface sloshes, then the cup
  flies home. A refused pour shakes the cup. A finished cup bursts with a ring
  of sparks, says "Ready!" and steams. The order ticket ticks off its chips;
  the chaiwala goes from waiting to smiling to beaming.
- Sounds (original, `npm run sounds`): clink as cups meet, a bubbling gurgle a
  step higher in five versions as the receiving cup fills, a spoon-on-glass
  ting for a finished cup, a shop-bell jingle for the order, a lid tink, a
  soft simmer loop under play.
- Calmer motion (follows the OS until changed): no flight, no stream, no
  drifting steam or twinkling lights; the layers simply change.
- Evening: a dark stall with string lights. Morning: sun on a terracotta
  counter.
- Cup themes: Kulhad (free), Cutting glass, Copper tumblers, Porcelain
  teacups, Night market — looks only.

## Accessibility

- **Ingredient marks are on by default.** Colour is the whole rule in a sort
  puzzle, about one man in twelve sees some colours alike, and the people who
  need such a setting are the least likely to go looking for it. The marks
  (star, drop, zigzag, pod, threads, flower, leaf, slice, bean, petal, heart,
  peppercorns, crescent) read as spice motifs, so they cost everyone else
  nothing; Settings can turn them off. Spices also carry a speckle, froth a
  "?" with bubbles.
- Every cup is a labelled button ("Cup 3, Masala chai, Milk, top Milk; room
  for 2"), with selected state; notes are live regions.
- 44–48 dp targets, text scales to 1.8×, AA contrast in both lights (tested).

## Money (honest)

All levels and daily orders free forever. No banners, no interstitials, no
ads in a level. Rewarded video only after a tap: one hint, or a 24-hour pass
on one cup theme. Plus (`chaisort.plus`, one purchase): unlimited hints and
extra cups, every cup theme, the full daily archive, no watermark on shared
pictures. Tips (`chaisort.tip.*`) unlock nothing. "How we make money" and an
in-app privacy page (no accounts, no servers; contact via the store page's
support address).

## Not done / next

- Store listing, real AdMob ids (from EAS secrets), store products.
- Translations beyond English (the resource is typed and ready).
- On-device timing of hints on the busiest counters (budgeted; in Jest a
  12-cup hint takes well under a second).
