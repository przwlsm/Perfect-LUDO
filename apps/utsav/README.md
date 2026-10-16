# Utsav Cards

Beautiful festival and everyday greeting cards to share on WhatsApp, in
nine Indian languages. Pick an occasion, swipe through designs, change the
words, add your name and a photo, share. Every card is drawn by the app
itself with Skia (no stock images), works offline, and has no ads while you
make it. The plan and the reasoning behind it are in
[docs/PLAN.md](docs/PLAN.md).

```sh
npm run utsav               # from the repo root, if wired: dev server (or `npx expo start` here)
npm run lint                # inside this folder
npm run typecheck
npm test
npm run sounds              # regenerate the original sound effects (app-kit/wav)
npm run icons               # regenerate icon, adaptive icon, splash, favicon (CanvasKit)
npm run web                 # web: copies CanvasKit, then starts the dev server
```

The app follows the shared Clean Architecture layout (`domain` →
`application` → `infrastructure` → `presentation`, wired in
`config/container.ts`), enforced by ESLint. Shared money, billing, ads,
haptics, audio, sharing and review adapters come from `app-kit`. There is no
server and no account.

## What is where

- `src/application/messages/*`: the card words, one file per language.
- `src/application/catalogue/`: palettes, the 90 templates and the
  "Popular now" row (hand-curated by month; no festival dates are shown).
- `src/application/layout.ts`: card geometry, text zones, stack fitting,
  photo framing (pure, tested).
- `src/presentation/cards/`: the painting engine (designs, text, fonts,
  live preview, thumbnails, export).

## Money, in one paragraph

Making and sharing cards is free for every occasion. **Plus**
(`utsav.plus`, one purchase, forever) opens every premium design, HD and
status-size cards, custom lettering, and removes the small "Utsav" mark; a
**rewarded video** (only ever on a tap) opens one premium design for 24
hours, at most 6 a day; **tips** (`utsav.tip.*`) unlock nothing. No
banners, no interstitials, no subscription.

## Fonts

Baloo 2 / Bhai 2 / Bhaijaan 2 / Da 2 / Tamma 2 / Tammudu 2 / Thambi 2 (Ek
Type), Yatra One, Kalam, Great Vibes, Playfair Display, Fraunces and Nunito,
all under the SIL Open Font License 1.1.
