# Chai Sort: Pour & Sort Puzzle

A cosy pour-to-sort puzzle at a chai stall. Tap a cup, tap another, and the
top layer pours across; fill every cup with one ingredient to serve the
chaiwala's order. 300 levels with froth, lids, tall glasses and fussy spices,
a daily order for everyone, five cup themes. Every level is free, forever.

Expo SDK 57 · React Native 0.86 · Expo Router · Skia · Reanimated · app-kit.
See `docs/PLAN.md` for the rules, the engine, the curve and money.

## Run

```sh
npx expo start          # from apps/chaisort
npm run web             # browser build (copies Skia's wasm to public/ first)
```

Ads and purchases need a development build (`npx expo run:android`).

## Check

```sh
npx tsc --noEmit
npx eslint src
npx jest                # pour rules, solver vs brute force, every level, hints
```

## Regenerate assets

```sh
npm run levels          # rebuild src/application/levels/shipped.ts from the seeds (~40 s)
npm run sounds          # assets/audio/*.wav, synthesized
npm run icons           # assets/images/*.png, drawn with CanvasKit
```

Changing the generator changes levels players already have: rebuild with
`npm run levels`, and the shipped-levels test will tell you if you forgot.
