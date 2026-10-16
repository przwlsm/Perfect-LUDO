# Monsoon Fields

A pipe-connection puzzle for the rainy season. Turn the stone channels on a
terraced hillside so rain from the clouds reaches every field; fields fill
and rice sprouts as the water arrives. 300 levels, a daily field for
everyone, five valleys. Every level is free, forever.

Expo SDK 57 · React Native 0.86 · Expo Router · Skia · Reanimated · app-kit.
See `docs/PLAN.md` for the rules, the engine (flow, solver, generator), the
difficulty curve, uniqueness results and money.

## Run

```sh
npx expo start          # from apps/monsoon
npm run web             # browser build (copies Skia's wasm to public/ first)
```

Ads and purchases need a development build (`npx expo run:android`).

## Check

```sh
npx tsc --noEmit
npx eslint src
npx jest                # flow and spill rules, solver vs brute force, generator, every shipped level, hints
```

## Regenerate assets

```sh
npm run levels          # rebuild src/application/levels/shipped.ts from the seeds (~3 s) and report uniqueness
npm run sounds          # assets/audio/*.wav, synthesized
npm run icons           # assets/images/*.png, drawn with CanvasKit
```

Changing the generator changes levels players already have: rebuild with
`npm run levels`, and the shipped-levels test will tell you if you forgot.
