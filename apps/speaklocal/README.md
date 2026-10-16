# Speak Local

**Speak the language of your new city.** Everyday spoken Kannada (Bengaluru),
Tamil (Chennai), Telugu (Hyderabad), Marathi (Pune, Mumbai), Bengali
(Kolkata), Malayalam (Kochi) and Hindi (Delhi): real conversations for the
auto, the vegetable stall, the landlord and new friends. Hear them, say them
(and record yourself), quiz yourself, review with spaced repetition, and
show a phrase full screen to a local.

Expo SDK 57 · React Native 0.86 · Expo Router · Skia · Reanimated · app-kit.
No accounts, no servers, works offline. A female voice by default where the
phone lets us tell (see `docs/PLAN.md`).

> Every language needs **native-speaker review before launch**. The list of
> lines to check is in `docs/PLAN.md`.

## Run

```sh
npm run start          # dev server (from apps/speaklocal)
npm run web            # in a browser
npx expo run:android   # development build (microphone, ads and billing need one)
```

## Check

```sh
npx tsc --noEmit
npx eslint src
npx jest
npx setup-skia-web public && npx expo export --platform web
```

## Assets

```sh
npm run icons    # scripts/generate-icons.mjs (CanvasKit): icon, adaptive layers, splash, favicon
npm run sounds   # scripts/generate-sounds.mjs (app-kit/wav): tap, correct, wrong, chime, record start/stop
```

## Where things are

- `src/domain/content/scenes.ts`: the 22 scenes (who says what, English and Hindi meanings).
- `src/domain/content/packs/*.ts`: one file per language: native text, romanisation, notes.
- `src/domain/content/audio.ts`: recorded lines that replace text-to-speech.
- `src/application/voice/selectVoice.ts`: how the default (female) voice is chosen.
- `src/application/review/srs.ts`: spaced repetition.
- `src/presentation/skyline/`: the city skylines, drawn with Skia.
