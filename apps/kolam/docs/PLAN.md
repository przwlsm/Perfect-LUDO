# Kolam: One Line — plan

## The idea

Kolam is rice-flour line art drawn around a grid of dots on South Indian
doorsteps before sunrise. The game borrows its single unbroken line for a
classic loop puzzle: draw one closed loop along the dots so every number is
satisfied. When the loop is right it flows into a kolam: corners turn into
curves, rice dots and small flowers bloom inside it, marigold petals fall.
A calm morning ritual, aimed at Play's Editors' Choice bar.

## Rules (as the engine implements them)

- The board is a grid of squares with a dot at every corner. Each side between
  two neighbouring dots is an **edge**: undecided, **line** or **cross** (✕,
  "no line here", a note to yourself).
- A number 0–3 in a square is how many of its four sides the loop uses.
- At every dot the line has 0 or 2 edges: no branches, no dead ends.
- All lines form **one** closed loop.
- Solved = every number exact, every dot 0 or 2, one loop (`rules.isSolved`).
  Crosses and undecided edges both count as "no line".

## Engine (`src/application`, pure, tested)

- `engine/grid.ts` — geometry per size, cached: edges around each cell,
  edges at each dot, cells either side of each edge.
- `engine/rules.ts` — cell counts, broken numbers, branching dots, line
  pieces, `isSolved`, loop order (for the kolam path), inside cells, mistakes.
- `engine/solver.ts` — works like a person:
  - **Tier 1** counting: a number with all its lines crosses the rest; one
    that needs every open side takes them; a dot never has 1 or 3 lines; a
    small loop is never closed early (union-find over pieces).
  - **Tier 2** patterns: corners and pinches around 1s and 3s, a line
    entering a 1 or a 3 at a corner, adjacent and diagonal 3s.
  - **Tier 3** looking ahead: an edge whose line (or cross) leads to a
    contradiction after tier 1–2 must take the other mark.
  - **Tier 4** backtracking with propagation, used to count solutions
    (stops at 2) and to solve anything.
- `engine/generator.ts` — grows a random region one cell at a time, keeping
  the region and its outside both connected (so its boundary is one loop;
  arms are favoured so the loop winds), numbers every cell, then removes
  numbers in random order, putting each back if the allowed tier can no
  longer solve the board. Solvable by deduction implies a unique answer.
- `game/hint.ts` — a wrong mark first ("this line is not part of the loop");
  otherwise the simplest deduction that draws a line, with its reason
  (needs every side, only one way on, corner 3, pinch 3, adjacent 3s,
  diagonal 3s, line entering a 3, look ahead); if none applies, one correct
  edge is revealed. Tests take hints from a blank board to the end on every
  early level and a sample of later ones; every hinted edge is in the answer.
- `game/play.ts` — undo/redo history (a drag stroke is one step), tap cycle
  (empty → line → ✕ → empty), auto-crosses as a view, save codec, clock.

## Levels

300 levels in 15 chapters of 20, built from fixed seeds and baked into
`levels/shipped.ts` by `npm run levels` (big boards take minutes to generate;
players get the shipped copy). A test rebuilds a sample and checks it still
matches, so levels never change by accident.

| Chapters | Board    | Tiers (1 / 2 / 3) |
| -------- | -------- | ----------------- |
| 1        | 4×4, 5×5 | 8 / 12 / 0        |
| 2        | 5×5      | 0 / 20 / 0        |
| 3–4      | 6×6      | 0 / 15 / 25       |
| 5–6      | 7×7      | 0 / 14 / 26       |
| 7–8      | 8×8      | 0 / 14 / 26       |
| 9–10     | 9×9      | 0 / 14 / 26       |
| 11–13    | 10×10    | 0 / 17 / 43       |
| 14–15    | 12×12    | 0 / 6 / 34        |

The first levels are tiny and keep many numbers; each teaches one idea with a
one-line lesson (loop, 0, ✕, dots, corner 3, closing, adjacent 3s at 9, look
ahead at 41). Look-ahead boards wait until level 41. Every chapter starts on
counting and pattern boards and leans harder towards its end. Difficulty
labels (Gentle → Deep) come from size and tier.

Tests prove: every shipped level is well-formed and the planned size; the
first 50 and a random sample of 40 later ones have exactly one answer, which
the solver finds within the level's tier; tutorial and showcase boards are
unique.

## Daily kolam

`dailySeed(date)` from app-kit, numbered from 1 October 2026 (#1). Built on
the phone when it is opened. The week has a rhythm: 6×6 Monday and
Tuesday, 7×7 midweek, a look-ahead 7×7 Friday, 8×8 at the weekend. Share text
has no spoilers: `Kolam #212 ✿ 7×7 · 3:10 · no hints` (time only when the
timer is on). A streak counts days the day's own kolam was drawn. Archive:
the last 7 days free, every day with Plus.

## Input

- Tap between two dots: line → ✕ → clear. Hit areas reach half a cell
  around each side.
- Drag along the dots draws several sides (a fast drag walks dot by dot so
  nothing is skipped); a drag that starts on a line erases. One undo step.
- Boards above 7×7: pinch to zoom (to 3×), move with two fingers; a toolbar
  button zooms to 2.2× or back to the whole board.
- Undo, redo, clear (undoable). Options, on by default: highlight broken
  numbers (and branching dots), auto-cross finished numbers. Timer off by
  default.
- Stars: 3 with no hints, 2 with one, 1 with more. Levels open three ahead
  of the furthest solved.
- A board in progress is saved and resumes where it was left.

## Look and feel

Two lights. **Dawn** (dark): rice-flour white on dark wet earth with a
marigold accent. **Courtyard** (light): ochre and cream with a red-brown
line. The line is drawn like flour: a soft, slightly ragged body, a grain of
white specks, a faint glow. Numbers in Fraunces, UI in Nunito. Soft tick and
haptic per side, a rising chime on solve. Calmer motion (follows the OS)
removes falling petals and makes the reveal a short fade.

The reveal: numbers, dots and ✕ fade; the loop redraws itself as a curved
kolam from start to end; a rice dot with a thin ring blooms in every square
inside, little flowers where the inside is deepest, in a ripple from the
centre; petals drift down. The board rises above the result card, which
folds away to look at the kolam.

Themes are cosmetic: Classic (free), Pongal colours, Margazhi multicolour,
Moonlit, Gold leaf.

## Money (honest, same as every app here)

- Every level and every daily kolam free forever. No banners, no
  interstitials, never an ad in a puzzle.
- 3 free hints a day; one more per tap-only rewarded video (max 6 videos a
  day); `rewardedAds.prepare()` only when the player opens that offer.
- **Plus** (`kolam.plus`, one purchase): unlimited hints, every theme, the full
  daily archive, no mark on shared kolam pictures.
- A video can also open one theme for 24 hours.
- Tips (`kolam.tip.*`) unlock nothing. Prices come from the store; products
  the store doesn't list are hidden. Restore in Settings.
- Review prompt once, after a clean solve from level 12 on.

## Screens

Home, Levels, Game (with the reveal and result card), Daily + archive,
Themes, How to play (an interactive 3×3 board), About kolam (a respectful
note on the tradition), Support, Settings, How we make money, Privacy (no
email invented: "write to the support address on the app's store page").

## Not done yet / next

- Translations beyond English (keys are ready).
- Haptic intensity and sound levels tuned on real devices.
- Share-image layout (currently the board as drawn, with the mark unless
  Plus); a framed card with the kolam number could be nicer.
