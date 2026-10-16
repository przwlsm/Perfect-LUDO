# Quiet Atlas: engineering plan

## The idea

Small, calming toys with no goals, each from a different culture, arranged on
a globe. The culture is the hook: people look for their own country's toy and
share it. Generic "ASMR fidget" apps exist in numbers (pop-its, slime); a
world tour of crafted, culturally rooted toys did not come up in research
(2026-10-15). The bar is Play's Editors' Choice: quality over quantity,
respectful of attention, accessible, honest about money.

## Rules the app keeps

- **Nothing interrupts a toy.** No banners, no interstitials, no pop-ups. A
  rewarded video plays only after a tap on "Watch a video", and the ad SDK is
  not even initialised until a player opens that offer.
- **Toys are free, forever.** Money buys looks (palettes, sheets, bowl metals)
  and removes the share watermark. A new toy is never paywalled.
- **No accounts, no servers.** Settings, passport and look choices live on the
  device; Plus is restored from the store account.
- **Calm by default.** The globe's idle spin, drifting stars and springy
  entrances all switch off under the OS "reduce motion" setting or the app's
  own "Calmer motion" toggle. Haptics and sound have their own switches.
- **Accessible.** Every control is at least 44–48 dp, labelled, with
  selected/disabled state; text scales with the system font; both lights
  (Dusk, Dawn) meet WCAG AA for text on surfaces.
- **Culturally careful.** Each toy's "About" sheet gives its origin in a few
  honest sentences. Sacred practices are not toys. Each toy should be checked
  by someone from that culture before launch.

## Architecture

```
src/domain        Toy catalogue, looks, products, entitlements, passport, settings; ports.
src/application   Pure toy models with tests: marbling (Jaffer's ink physics), brush,
                  symmetry, bubble sheet, bowl rim, breathing rhythm, seeded random.
src/infrastructure  Adapters: AdMob (UMP consent, test ids in dev), expo-iap (5.8:
                  request.apple / request.google), expo-audio (voices + looped hum),
                  haptics, sharing via the system sheet, store review, AsyncStorage.
src/config        Composition root.
src/presentation  Theme (Dusk/Dawn), kit, i18n (typed keys), globe, toy shell, toys, screens.
```

Rendering is `@shopify/react-native-skia`. Finished work in the drawing toys
is baked into one image (`toys/raster.ts`); only the stroke in progress is
redrawn each frame. The globe projects ~1,400 Natural Earth land dots per
frame in a Skia picture driven from a Reanimated shared value, so spinning
stays on the UI thread. Gestures run on the JS thread through
`useToyGesture` (toys keep their models in plain JS).

## Toys (v1)

| Toy               | Model                                                            | Signature moment                                                    |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Rangoli           | `symmetry.ts`: n-fold rotation, optional mirror, midpoint curves | Powder strokes repeat in 4–12 slices; "clear" blows the powder away |
| Ebru              | `marbling/Tray.ts`: area-preserving drops, needle, 5-tine comb   | Lift a print onto paper, share it                                   |
| Water calligraphy | `brush.ts`: speed → width, taper, drying curve                   | Strokes evaporate; optional 永 / 静 / 和 / 心 guide                 |
| Bubble wrap       | `bubbles/sheet.ts`: packed rows, 1-in-70 golden                  | Pitch-varied pops, a fresh sheet rolls in                           |
| Singing bowl      | `bowl/rim.ts`: angular speed → voice, ring-down                  | Seamless looped hum follows the finger; strike                      |
| Candle breath     | `breath/breath.ts`: calm / box / 4-7-8                           | Flame rises with the breath; bells at each turn                     |

Coming soon (pins on the globe, "arriving soon" sheet): kintsugi, papel
picado, zellige, kente, floating lanterns, snow globe, stone skipping,
matryoshka.

## Money

- `quietatlas.plus`: non-consumable. Every premium look, no watermark.
- `quietatlas.tip.chai|coffee|cake|lunch|patron`: consumables, grant nothing.
- Rewarded video (AdMob): one look for 24 h, ≤6/day, `requestNonPersonalizedAdsOnly`.
- Share watermark: a small "Quiet Atlas" pill on shared pictures without Plus.
- Store review prompt: once, after a finished breathing session.

Prices are set in Play Console / App Store Connect; the app shows the store's
localized price and hides a product the store does not list.

## Before launch

- Create the products above in Play Console (and App Store Connect).
- AdMob app + rewarded unit ids (`ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`,
  `EXPO_PUBLIC_ADMOB_REWARDED_ID`), GDPR message in AdMob.
- `eas init`, build profiles, store listing (screenshots, feature graphic).
- Translations: en only today; the i18n layer is typed and ready. Hindi,
  Turkish, Chinese, Nepali, Danish, Spanish, Portuguese, Arabic first, since
  they match the toys.
- Device checks: real haptics, audio mixing with the player's own music, the
  share sheet, large-text layouts, both lights, calmer motion.
- A cultural review of each toy's About text.
