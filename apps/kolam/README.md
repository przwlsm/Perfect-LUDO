# Kolam: One Line

A calm loop puzzle drawn in rice flour. Draw one closed line around the dots
so every number is satisfied, and watch it flow into a kolam. 300 levels from
4×4 to 12×12, a daily kolam for everyone, five themes. Every level is free,
forever.

Expo SDK 57 · React Native 0.86 · Expo Router · Skia · Reanimated · app-kit.
See `docs/PLAN.md` for the rules, the engine, the difficulty curve and money.

## Run

```sh
npx expo start          # from apps/kolam
npm run web             # browser build (copies Skia's wasm to public/ first)
```

Ads and purchases need a development build (`npx expo run:android`).

## Check

```sh
npx tsc --noEmit
npx eslint src
npx jest                # rules, solver vs brute force, generator, uniqueness of shipped levels, hints
```

## Regenerate assets

```sh
npm run levels          # rebuild src/application/levels/shipped.ts from the seeds (slow: minutes)
npm run sounds          # assets/audio/*.wav, synthesized with app-kit/wav
npm run icons           # assets/images/*.png, drawn with CanvasKit
```

Changing the generator or the difficulty curve changes levels players already
have: rebuild with `npm run levels`; the shipped-levels test fails if you
forget.

## Layout

```
src/domain          Board (marks, puzzles, stars), Look (themes), Hints, Record, Settings, Products, ports
src/application     engine (grid, rules, solver, generator), game (play, hint), levels (curve, shipped, daily, tutorial)
src/presentation    board (Skia board, geometry, reveal, share picture), components, screens, i18n, state, theme
src/config          container.ts: the only place adapters are created
src/app             expo-router routes
```
