# How we build every app

Every app in this repo aims at Google Play's Editors' Choice bar: crafted,
respectful of attention, accessible, honest about money. `apps/quietatlas` is
the reference implementation: when in doubt, read how it does it.

## Stack (do not change)

- Expo SDK 57, React Native 0.86, Expo Router (routes in `src/app/`, thin
  re-exports of screens), TypeScript strict with `noUncheckedIndexedAccess`.
- `@shopify/react-native-skia` 2.6 for anything drawn: boards, particles,
  glows, toys. Note: `SkPath` is immutable; build with
  `Skia.PathBuilder.Make()…build()`. Imperative paint via `createPicture` /
  `Skia.Paint()`. Bake finished work into an image (`Skia.Surface`) when a
  scene has many static elements.
- Reanimated 4 for motion; on shared values use `.get()` / `.set()` (the
  React Compiler lint rules require it). Gesture Handler 2.32.
- `app-kit` (pure: money, progress, daily seed, colour, random) and
  `app-kit/native` (AdMob rewarded, expo-iap billing, haptics, audio cues,
  storage, sharing, review). Import `app-kit/native` only in
  `src/config/container.ts`.
- i18n: i18next + react-i18next with a typed English resource (`en.ts`,
  `declare module 'i18next'` CustomTypeOptions) and the `intl-pluralrules`
  polyfill. Keys never contain dots inside a segment (dot is the separator).
  Every visible string and every accessibility label goes through `t()`.
- No new npm dependencies without asking the lead: everything needed is
  installed. Never run `npm install` / `expo install` yourself.

## Architecture

Clean Architecture folders, enforced by ESLint `boundaries` (the config is
already in each app):

```
src/domain          entities (pure data + rules), ports
src/application     pure game/app logic with jest tests: generators, solvers, rules
src/infrastructure  app-specific adapters (most come from app-kit/native)
src/config          container.ts: the only place concrete adapters are created
src/presentation    theme, components, i18n, state providers, screens
src/app             expo-router routes: one-line re-exports of screens
```

Rules: domain imports nothing outside domain; application imports domain;
presentation never imports infrastructure (only `config`).

## Money (same honest model everywhere)

- **No banners. No interstitials. Nothing ever interrupts play.**
- Rewarded video only after the player taps "Watch a video"; it grants one
  hint or a 24-hour pass on one premium item; max 6 a day
  (`adsLeftToday`). Call `rewardedAds.prepare()` only when the player opens
  that offer (consent asked only from people who want videos).
- **Plus** (`<prefix>.plus`, one purchase, never a subscription): every
  premium cosmetic, unlimited hints where hints exist, no watermark on shared
  images, the full archive where one exists. Never paywalls core play.
- **Tips** (`tipProducts('<prefix>')`): chai/coffee/cake + "Give more"
  (lunch/patron). They unlock nothing.
- A **"How we make money"** page in plain words, and an in-app **privacy
  policy** page (no accounts, no servers, what AdMob does, purchases via the
  store, not directed at children under 13).
- Prices always come from the store (`listings`); hide a product the store
  doesn't list. Restore purchases in Settings.
- Store review prompt: once, after a genuinely good moment.

## Quality bar

- **Two lights**, chosen per app but always both: a dark and a light
  palette as tokens (`palette.ts`), following the device unless the player
  picks one in Settings. Text meets WCAG AA (4.5:1); check with
  `contrast()` from app-kit.
- **Motion**: lively, springy, purposeful; and a "Calmer motion" setting
  that follows the OS reduce-motion flag (`useReducedMotion`) and turns off
  idle/decorative animation.
- **Touch**: every target ≥ 44–48 dp, `accessibilityRole`, label, and
  state (selected/disabled/busy). Text scales with the system font
  (`maxFontSizeMultiplier` ~1.8) without breaking layouts.
- **Feedback**: haptics (`tick/tap/pop/thump/delight`) and original
  synthesized sounds (`app-kit/wav`, `npm run sounds`); separate on/off
  switches for sound and vibration in Settings.
- **Wide screens**: content max-width ~640 dp, centred; boards scale to fit.
- **First run**: playable within seconds, a one-line hint the first time,
  no sign-up, no permission prompts until a feature needs one.
- **Offline**: everything works without a network except purchases and ads.
- **Brand**: own name, palette, fonts (`@expo-google-fonts/*` already
  installed: Fraunces, Nunito; ask the lead before adding a family), app
  icon + adaptive icon (foreground, background, monochrome) + splash +
  favicon drawn by `scripts/generate-icons.mjs` with CanvasKit (see
  `apps/quietatlas/scripts/generate-icons.mjs`), wired in `app.json`.

## Verify before you report done

From the app folder:

```sh
npx tsc --noEmit
npx eslint src
npx jest
npx expo export --platform web   # after `npx setup-skia-web public` once
```

Then serve `dist/` and screenshot every screen at phone size (412×892,
DPR 2) in both lights with Playwright-core driving system Chrome
(`C:/Program Files/Google/Chrome/Application/chrome.exe`). Look at every
screenshot yourself and fix what looks wrong: overlaps, clipped text, low
contrast, empty states, things that look cheap. Repeat until it looks
like an app you'd feature.
