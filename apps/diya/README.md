# Diya: Light Every Lamp

A light-beam puzzle for a festival night. Turn and place mirrors, prisms and
coloured glass so every lamp glows in exactly its colour. 300 levels, a daily
puzzle for everyone, five festival skins. Every level is free, forever.

Expo SDK 57 · React Native 0.86 · Expo Router · Skia · Reanimated · app-kit.
See `docs/PLAN.md` for rules, the engine, the difficulty curve and money.

## Run

```sh
npx expo start          # from apps/diya
npm run web             # browser build (copies Skia's wasm to public/ first)
```

Ads and purchases need a development build (`npx expo run:android`).

## Check

```sh
npx tsc --noEmit
npx eslint src
npx jest                # engine, solver on every shipped level, generator, hints
```

## Regenerate assets

```sh
npm run levels          # rebuild src/application/levels/shipped.ts from the seeds (~2.5 min)
npm run sounds          # assets/audio/*.wav, synthesized
npm run icons           # assets/images/*.png, drawn with CanvasKit
```

Changing the generator changes levels players already have: rebuild with
`npm run levels`, and the shipped-levels test will tell you if you forgot.
