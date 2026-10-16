# Diya: Light Every Lamp — plan

## The idea

A flame sends a beam of light across a grid. The player places and turns
pieces so the light reaches every lamp in exactly its colour; when every lamp
is lit, the board bursts into festival light. Easy to read in five seconds,
deep by level 100. The bar is Play's Editors' Choice: crafted, respectful of
attention, accessible, honest about money.

## Rules (as the engine implements them)

| Piece          | Behaviour                                                                            | Moves?               |
| -------------- | ------------------------------------------------------------------------------------ | -------------------- |
| Flame          | Shines one way, forever. White light unless noted.                                   | Never                |
| Wall           | Stops light.                                                                         | Never                |
| Mirror `/` `\` | Turns light 90°. Tap to turn, drag to move.                                          | Tray, pivot or fixed |
| Prism          | Splits light to both sides (left and right of its travel).                           | Tray or fixed        |
| Coloured glass | Light leaving it takes its colour (red, yellow, blue).                               | Tray or fixed        |
| One-way glass  | Passes light travelling the arrow's way; stops anything else.                        | Never                |
| Lamp (diya)    | Absorbs light. Lit only when the union of colours reaching it is exactly its colour. | Never                |
| Sleeping lamp  | Absorbs light. Must stay dark.                                                       | Never                |

- Beams cross freely. A beam carries one colour; a lamp sees the union of all
  beams that reach it: red + yellow = orange, yellow + blue = green, red + blue
  = purple. White plus any colour is wrong.
- Pieces with rivets are fixed. A pivot mirror (with a hub) turns in place but
  cannot move. Tray pieces can go on any free floor cell.
- A level is solved when every lamp is exactly right and every sleeping lamp
  is dark. Unused tray pieces are fine.

## Engine (`src/application`)

- `engine/grid.ts` — a board compiled to two `Uint8Array`s (code, argument)
  so the solver can change cells in place and trace thousands of times.
- `engine/trace.ts` — breadth-first beam tracing, one cell per step. A beam
  state (cell, direction, colour) is walked at most once, so loops end. It
  returns segments for drawing, the colours reaching each lamp, lamp arrival
  times, and the order and time at which light first crosses each empty cell.
- `engine/solver.ts` — search over placements. Two ideas keep it small:
  1. A piece where no light falls changes nothing, so it only places pieces on
     cells light currently crosses.
  2. It places pieces in the order light reaches their cells. Every cell light
     passed before the chosen one is frozen empty for that branch, so each set
     of placements is visited once (no permutations). Light that reaches a lamp
     before the next free cell can never be taken back; a lamp already given a
     wrong colour (or a woken sleeper) ends the branch immediately.
     Pivots are enumerated up front (at most three per level). Budgeted by boards
     traced; deterministic.
- `engine/generator.ts` — builds a level from a seed: flames with room to
  shine, then pieces placed where light already runs (each must send light
  somewhere new), then lamps where light ends or where two colours cross (for
  mixing), coloured by what reaches them. Pieces that turn out unnecessary
  are dropped. Sleeping lamps go in line with pieces (a wrong turn wakes
  them), one-way glass on stretches only one beam crosses, walls where no
  light needs to go. Then it decides pivots (only mirrors whose turn matters),
  fixed pieces and the tray. A hardening pass asks the solver for another
  answer and blocks a cell only that answer's light uses, repeatedly, to
  narrow towards one solution. Several candidates are built and the one whose
  solver effort (log₂ of boards traced per solution) is nearest the target
  ships. Specs that a seed cannot meet are relaxed step by step, never
  dropping the idea a lesson level teaches.
- `game/play.ts` — immutable play state (placed pieces, pivot slants, moves),
  place / move / lift / rotate, evaluation, undo/redo history, stars.
- `game/hint.ts` — if the player's pieces can still be part of a solution
  (solver with them pinned), reveal the next piece of that solution in the
  order light reaches it; otherwise follow the solution closest to the board
  and put right the first thing that differs. Hinted pieces lock with a gold
  rim and are never disturbed by later hints.
- `levels/` — the codec (two characters per cell), hand-made lessons, the
  difficulty curve, the shipped levels and the daily puzzle.

## Levels and the difficulty curve

300 levels in 15 chapters of 20. Hand-made boards teach each new idea on a
board with only that idea: 1–3 (turn mirrors), 6–7 (place from the tray),
11 (walls), 21 (prism), 31 (fixed pieces), 41 (coloured glass), 51 (mixing).
One-way glass (61), sleeping lamps (71) and two flames (81) are introduced on
generated boards that are required to contain them. From 91 on, each level's
own seed mixes the ideas.

| Chapter          | Levels  | Board      | Tray | Effort (log₂ nodes) |
| ---------------- | ------- | ---------- | ---- | ------------------- |
| 1 First Flame    | 1–20    | 5×6 – 6×7  | 0–3  | ~4.6                |
| 2 The Courtyard  | 21–40   | 6×7 – 6×8  | 2–3  | ~6.0                |
| 3 Coloured Glass | 41–60   | 6×8 – 7×7  | 2–4  | ~6.6                |
| 4–5              | 61–100  | 7×9        | 3–4  | 7.7–8.6             |
| 6–10             | 101–200 | 7×9 – 8×10 | 3–4  | 8.1–10.4            |
| 11–15            | 201–300 | 8×10       | 4–7  | 10.2–12.8           |

Within a chapter difficulty climbs, then the next chapter opens a little
gentler. Levels open three ahead of the furthest solved (app-kit Progress),
so nobody is ever stuck on one board.

Levels are generated at build time (`npm run levels`, about 2.5 minutes) into
`src/application/levels/shipped.ts`, so a phone never waits. A test rebuilds
all of the first 50 and a sample after from their seeds and compares them with
the shipped file: levels cannot change by accident.

## Daily puzzle

Built on the phone from `dailySeed(date)` (same board for everyone that UTC
day; 7×8 or 7×9, Monday gentle to Sunday harder, ideas mixed by the seed).
Number from `dailyNumber` with epoch 2026-10-01 (#1). Share text has no
spoilers: `Diya #212 🪔🪔🪔🪔 · 1:24 · no hints` (time only when the player
shows a timer). The streak counts a daily solved on its own day. Archive:
the last 7 days free, every day since #1 with Plus.

## Stars, hints, timer

3 stars with no hints, 2 with one, 1 with more. Undo/redo, start over (keeps
hinted pieces), move counter. The timer is hidden by default (relaxed); a
setting shows it. Three free hints a day; a rewarded video earns one more
(tap only, at most six videos a day); Plus is unlimited.

## Feel

Beams are additive light: a wide blurred glow, a bright body, a white-hot
core and sparks flowing outward along the beam; new light is revealed in the
order it travels. Lamps flicker as embers when dark, blaze with a halo when
lit, sputter in the wrong colour when wrong; sleeping lamps pulse red when
woken. Each newly lit lamp chimes a step higher on a pentatonic scale. Pieces
click in with a spring and a haptic; mirrors spin a quarter turn. The win:
every lamp flares in turn, a gold wash, sparks rise from each lamp, soft
fireworks, then the card. Calmer motion (OS setting or in-app) keeps only the
glow. Colour symbols (triangle red, circle yellow, square blue) mark coloured
light, glass and lamps, because colour is a rule.

Two lights: Night (deep violet and marigold gold) and Dusk (a pale warm page
with the board kept as a twilight window so light still glows). Festival
skins change lamps, metal, walls and palette: Diwali (clay diyas, free),
Christmas (bulbs, snow on walls), Eid (brass fanous lanterns), Hanukkah
(candles), Lantern Festival (red paper lanterns).

## Money (honest)

- Every level and every daily puzzle free, forever. No ads in a level, ever.
- Plus (`diya.plus`, one purchase): unlimited hints, every festival, the full
  daily archive, no watermark on shared win pictures.
- Rewarded video, only on a tap: one hint, or one festival for 24 hours.
- Tips (`diya.tip.*`) unlock nothing.
- In-app "How we make money" and privacy pages.

## Architecture

```
src/domain          Board, settings, festivals, products, hints wallet, player record; ports
src/application     engine (grid, trace, solver, generator), game (play, hint), levels
src/infrastructure  text share sheet (other adapters come from app-kit/native)
src/config          container.ts: the only place concrete adapters are created
src/presentation    theme, board renderer (Skia), components, i18n, state, screens
src/app             routes: one-line re-exports of screens
```

## Before launch

- [ ] `eas init` and real bundle ids / EAS project.
- [ ] Real AdMob app ids and `EXPO_PUBLIC_ADMOB_REWARDED_ID` in EAS secrets.
- [ ] Store products: `diya.plus`, `diya.tip.chai|coffee|cake|lunch|patron`.
- [ ] Play-test levels 1–60 with new players; tune lesson lines.
- [ ] Ask people who celebrate each festival to review its skin.
- [ ] Check sounds on device speakers (levels, hum loop seam).
- [ ] Translations (strings are all in `presentation/i18n/en.ts`).
- [ ] Privacy contact address and store listing privacy form.
- [ ] Device test of drag precision on small phones and tablets.
