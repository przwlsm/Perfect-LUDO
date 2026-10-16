# Utsav Cards: engineering plan

## The idea

Sending festival wishes and "good morning" pictures on WhatsApp is a daily
habit for hundreds of millions of people in India. The apps that make them
are cluttered, low quality and full of ads. Utsav is the elegant one:
gorgeous cards in seconds, in your language, with your name and photo, and
nothing in your way. The bar is Play's Editors' Choice: crafted, respectful
of attention, accessible, honest about money.

## Rules the app keeps

- **Cards are drawn, never stock.** Every template is code that paints with
  Skia (rangoli, diyas, fireworks, marigold torans, lanterns, kolam,
  pookalam, watercolour blooms…). No copyright risk, nothing to download,
  everything offline.
- **No dates.** Festival dates follow lunar calendars that differ by region
  and year; a wrong date costs trust. Home orders occasions with a
  hand-curated "Popular now" row (`SEASONS` in
  `src/application/catalogue/templates.ts`) and search. Edit it before each
  festival season, especially Eid, which moves through the solar year.
- **Nothing interrupts making a card.** No banners, no interstitials, no ads
  while creating, ever. A rewarded video plays only after a tap on "Watch a
  short video" in the unlock sheet; the ad SDK is not even initialised until
  then.
- **Core use is never blocked.** Every occasion has at least three free
  designs, in every language, with photo, name and editing. Plus adds
  premium designs, HD and status size, custom lettering and removes the mark.
- **Private by design.** No accounts, no servers. Photos are picked with the
  system picker (no permission on modern Android/iOS), copied into the
  app's own folder, and leave the phone only inside a card the sender shares.
- **Calm and accessible.** Calmer motion (follows the OS) turns off
  sparkles, flicker and falling petals; sound and vibration have their own
  switches; every control is ≥ 44 dp with a label and state; text scales.

## Architecture

```
src/domain        Occasion, Language, Template/palette types, CardSpec + parsing, Settings, Products; ports
src/application   Pure, tested: palettes, templates + "Popular now", message catalogue (9 languages),
                  search, layout maths (zones, stack fitting, photo cover/drag), card rules, export plan
src/infrastructure  Photo picker (expo-image-picker + expo-file-system copy), clipboard, web sharer
src/config        Composition root (app-kit/native adapters + the above)
src/presentation  Theme (Night/Ivory), kit, i18n, providers, card painting engine, screens
src/app           expo-router routes (one-line re-exports)
```

### The card engine (`src/presentation/cards`)

- Cards are designed on a 1080-wide canvas: 1080×1080 square, 1080×1920
  status. Previews and exports scale the same drawing, so they match.
- `paint/kit.ts` holds drawing primitives (petals, leaves, hearts, glows,
  diya, marigold, arches, background with grain and vignette).
- `paint/festive.ts`, `paint/everyday.ts`, `paint/lotus.ts`: 34 designs.
  Each paints around the template's text zone and records points the live
  preview animates (`fx`) and flames that flicker (`lights`).
- `paint/card.ts`: text layout with Skia's paragraph engine (HarfBuzz
  shaping, so Indic conjuncts and Urdu RTL are correct), `fitStack` sizing
  from `application/layout.ts`, the photo frame, halo, divider and the
  "Utsav" mark.
- `fonts.tsx`: one Baloo family per script (Baloo 2 Devanagari, Thambi
  Tamil, Tammudu Telugu, Tamma Kannada, Da Bengali, Bhai Gujarati,
  Bhaijaan Urdu), plus Yatra One, Kalam, Great Vibes and Playfair Display
  for Latin/Devanagari lettering styles. All SIL OFL.
- `LivePreview.tsx`: the editor bakes the art and the words into two images
  at screen resolution; the photo sits between them so pinch/drag never
  redraws the card; `Fx.tsx` adds twinkle/flicker/snow/confetti/petals on
  the UI thread (Reanimated shared values).
- `render.ts`: offscreen rendering for exports (PNG) and a one-at-a-time,
  cached thumbnail queue (JPEG data URIs) for galleries, so the home screen
  is a gallery of real cards without one GPU canvas per tile.

## Catalogue (v1)

- 18 occasions: Diwali, Holi, Eid, Christmas, New Year, Pongal & Sankranti,
  Raksha Bandhan, Ganesh Chaturthi, Navratri & Durga Puja, Onam, Gurpurab,
  birthday, anniversary, good morning, good night, thank you,
  congratulations, get well soon.
- 90 templates (5 per occasion: 54 free, 36 Plus) built from 34 designs and
  32 palettes; each template has 2–3 palette variants (225 combinations).
- Messages: 18 occasions × 9 languages, 753 original lines in all. English and
  Hindi: 2 greetings + 4 messages per occasion; the other seven languages:
  1–2 greetings + 3 messages. Every language has its own sign-off
  ("With love, {name}", "सप्रेम, {name}", "அன்புடன், {name}"…). Tests check
  completeness, length limits, uniqueness and that each line is in its
  language's script.

### Translations: needs native review

| Language           | Status                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| English            | Written for Utsav                                                                |
| Hindi (हिन्दी)     | **Needs native review**                                                          |
| Marathi (मराठी)    | **Needs native review**                                                          |
| Tamil (தமிழ்)      | **Needs native review**                                                          |
| Telugu (తెలుగు)    | **Needs native review**                                                          |
| Kannada (ಕನ್ನಡ)    | **Needs native review**                                                          |
| Bengali (বাংলা)    | **Needs native review**                                                          |
| Gujarati (ગુજરાતી) | **Needs native review**                                                          |
| Urdu (اردو)        | **Needs native review**; also consider a Nastaliq face (Baloo Bhaijaan is Naskh) |

Reviewers should check tone (formal "you" is used throughout: आप, நீங்கள்,
మీరు, ನೀವು, আপনি, તમે, آپ), festival-specific vocabulary (e.g. Durga Puja
vs Navratri lines in Bengali, Dasara in Kannada/Telugu, Uttarayan in
Gujarati) and religious phrasing. The in-app About page and the editor say
the translations are new and invite corrections.

## Money

- `utsav.plus`: non-consumable. All premium designs, HD 1080 px export,
  status size (1080×1920), custom lettering, no mark.
- `utsav.tip.chai|coffee|cake|lunch|patron`: consumables, unlock nothing.
- Rewarded video (AdMob, non-personalised): one premium template for 24 h,
  at most 6 a day, only from the unlock sheet.
- Free exports: 720×720 PNG with a small "Utsav" mark bottom-right (how
  friends find the app), set on a soft clearing in the card's own colour so
  it stays legible over busy borders.
- Store review prompt: once, on the "Sent with love" screen after the
  second shared card.

## Screens

Home (Popular now, search, recent cards, all occasions as card tiles) ·
Occasion gallery · Editor (swipe designs; Words / Photo / Style; Share) ·
Sent with love (copy words, share again, make another) · My cards ·
Support (Plus + tips) · Settings (name, card language, sound, vibration,
light, calmer motion, restore, ad privacy) · How we make money · Privacy ·
About (font licences).

## Verification

`npx tsc --noEmit`, `npx eslint src`, `npx jest` (126 tests), and a web
export screenshotted at 412×892 DPR 2 in both lights, plus real exported
cards for every occasion in English and Hindi, three designs in each other
language, every Plus design, story size for 35 designs, free cards with the
mark, and photo cards (circle and arch).

## Known limitations / before launch

- Translations need native review (above).
- "Save" keeps a card in My cards; saving straight to the photo gallery
  needs `expo-media-library` (not installed). The share sheet offers "Save
  image" on iOS and Google Photos/Files on most Android phones.
- A photo picked but never saved/shared stays in the app's photos folder
  until the app is reinstalled (cleanup on card delete is implemented).
- In a browser, saved cards keep their words but drop the photo (browser
  photo addresses do not survive a reload).
- Products above must be created in Play Console / App Store Connect; AdMob
  app and rewarded unit ids go in EAS secrets (`ADMOB_ANDROID_APP_ID`,
  `ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_ID`).
- Festival art is respectful and non-iconic by choice (no deity likenesses):
  modak, lotus and marigold for Ganesh Chaturthi; lamps and light for
  Gurpurab. Have people from each community look at their festival's cards.
