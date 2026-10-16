# Akshar: engineering plan

## The idea

"Learn to write any Indian script." Akshar (अक्षर, "letter") teaches the
letters of nine scripts by tracing: see a letter, hear it, trace it on a
dotted guide, then write it from memory. It is for people who moved to
another state and want to read the signs, families keeping a mother tongue
alive, and the curious. The bar is Play's Editors' Choice: crafted,
respectful of attention, accessible, honest about money.

**Audience: teens and adults (13+).** It is friendly enough for a parent to
use beside a child, but it is **not** a children's-category app and is not
enrolled in Google Play's Families programme (nor the App Store Kids
category). The store listing, the in-app privacy page and "How we make
money" all say it is not directed at children under 13. Rewarded videos
request non-personalised ads only.

## Rules the app keeps

- **Nothing interrupts writing, ever.** No banners, no interstitials. A
  rewarded video plays only after a tap on "Watch a video", and the ad SDK
  is not initialised until someone opens such an offer.
- **Every script, letter, mode and the practice slate are free forever.**
  Money buys comfort and cosmetics only (see below).
- **No accounts, no servers.** Settings, stars and practice days live on
  the device; Plus is restored from the store account.
- **Calm by default.** Springy entrances, popping stars and the stamp's
  sparks switch off under the OS reduce-motion flag or "Calmer motion".
  Sound and vibration have separate switches.
- **Accessible.** Targets ≥ 44–48 dp with role, label and state; text scales
  (max ×1.8); both lights (Paper, Slate) meet WCAG AA, checked in
  `palette.test.ts`; every pen is checked for contrast on every paper.
- **Left-handed friendly.** A "Writing hand" setting mirrors the tools and
  moves "Show me" so the writing hand never covers them.

## Scripts v1 (396 letters)

| Script     | Languages                            | Letters                                      | Speech              | Font (SIL OFL)   |
| ---------- | ------------------------------------ | -------------------------------------------- | ------------------- | ---------------- |
| Devanagari | Hindi, Marathi (ळ), Nepali, Sanskrit | 11 vowels + 34 consonants                    | hi-IN, mr-IN, ne-NP | Baloo 2          |
| Tamil      | Tamil                                | 12 vowels + āytam, 18 consonants + 4 Grantha | ta-IN               | Baloo Thambi 2   |
| Kannada    | Kannada                              | 13 + 34                                      | kn-IN               | Baloo Tamma 2    |
| Telugu     | Telugu                               | 13 + 34                                      | te-IN               | Baloo Tammudu 2  |
| Bengali    | Bengali, Assamese                    | 11 + 36 (incl. ড় ঢ় য় ৎ)                   | bn-IN, bn-BD        | Baloo Da 2       |
| Gujarati   | Gujarati                             | 11 + 34                                      | gu-IN               | Baloo Bhai 2     |
| Gurmukhi   | Punjabi                              | 10 vowels + 32 paintī consonants             | pa-IN               | Baloo Paaji 2    |
| Malayalam  | Malayalam                            | 13 + 36                                      | ml-IN               | Baloo Chettan 2  |
| Urdu       | Urdu (Arabic script)                 | 39 letters                                   | ur-PK, ur-IN        | Baloo Bhaijaan 2 |

Each letter has a romanisation, an example word that contains it (usually
starting with it), the word's romanisation and an English meaning (from a
shared, translatable glossary in `en.ts`). Each script also has a "well
done" word for the three-star stamp (शाबाश, அருமை, ಭೇಷ್, శభాష్, দারুণ,
શાબાશ, ਸ਼ਾਬਾਸ਼, കൊള്ളാം, شاباش).

**Romanisation.** Indic scripts use ISO 15919 letter values (ā ī ū ṛ ṅ ñ ṭ
ḍ ṇ ś ṣ ḷ ḻ ṟ ṉ), with anusvāra written ṃ (IAST style, because the interface
font has no ṁ) and the Tamil āytam as ḵ. Example words are romanised as they
are said (a final unspoken "a" dropped in Hindi, Bengali, Gujarati and
Punjabi). Bengali is romanised graphemically (য = "ya", অ = "a" though said
"ô"). Urdu uses the letters' primer names (alif, be, pe…) with the usual
sound beside each, and a simple romanisation with long vowels marked.

**Left for later (deliberately):** conjuncts (क्ष त्र ज्ञ, ক্ষ…), vowel signs
(mātrās) on consonants, anusvāra/visarga/candrabindu as separate lessons,
chillu letters, the Gurmukhi dotted letters (ਸ਼ ਜ਼ ਫ਼…), Urdu joining forms
and Nastaliq. These need text shaping, which the tracing engine does not do
(it draws one code point at a time).

### ⚠ Native-speaker review before launch

The letter lists, example words, meanings, romanisations and praise words
were prepared carefully but **each script must be reviewed by a native
speaker (ideally a teacher) before launch.** Points to check in particular:

- Devanagari: ङ/ञ example words (गङ्गा, पञ्जा use traditional spellings);
  षट्कोण as the ष example; ळ shown with the Marathi word बाळ.
- Tamil: ஔ → ஔவையார் (a name); ஷ/ஸ/ஹ Grantha examples; āytam romanisation.
- Kannada/Telugu: ಙ/ఙ (ವಾಙ್ಮಯ/వాఙ్మయం) and ಞ/ఞ (ಜ್ಞಾನ/జ్ఞానం) examples; ಢ/ఢ words.
- Bengali: romanisation style; ঐ → ঐরাবত; ঢ় → আষাঢ়.
- Gujarati: ઠ → ઠળિયો; ઙ/ઞ examples.
- Gurmukhi: ਙ and ਞ show their letter names (ਙੰਙਾ, ਞੰਞਾ) as examples.
- Malayalam: ഝ → ഝരി; ഡ → ഡപ്പി; ഛ → ഛായ.
- Urdu: letter names and the ء example (ابتداء); ژ → ژالہ.
- Every script: the device TTS pronunciation of isolated letters.

## Tracing engine (pure, in `src/application`, tested)

There is no stroke-order dataset for these scripts, so Akshar traces against
the glyph itself.

1. **Outline.** On phones, `Skia.Path.MakeFromText(char, 0, 1000, font)`
   with the script's Baloo face loaded by `useFont`. In a browser CanvasKit
   has no text-to-path, so `glyph/ttf.ts` (a small TrueType reader: cmap 4/12,
   simple and composite glyf) reads the same outline from the same file.
   Tests use the reader to prove every letter exists in its font (no tofu).
2. **Fit.** `path.ts` flattens the outline, fits it into the square writing
   box (74%, with a cap so the āytam or hamza stay small marks) and gives a
   non-zero-winding `contains(x, y)`.
3. **Dotted centre line.** `centreline.ts` runs a chamfer distance transform
   over a grid of `contains` samples; ridge cells are the middle of each
   stroke. Spaced ridge points become the dotted guide, and the median ridge
   depth is the stroke's half-width.
4. **Score.** `tracing/score.ts`: coverage = share of glyph grid points with
   ink within `max(pen radius, half-width) × 1.25`; accuracy = share of ink
   samples inside the glyph dilated by a little slack. Writing from memory
   is aligned to the glyph's bounds first (shape matters, not position).
   Stars: tracing gives up to two (≥60/60% one, ≥85/82% two); writing from
   memory gives the third (≥72/72%). Missed points show as warm dots.
5. **Pen.** `pen/pen.ts`: speed-sensitive width (slow pools, fast thins),
   Chaikin-smoothed spine, round caps; a broad nib takes its width from the
   stroke's direction (fountain pen); chalk keeps one width and is drawn
   with rough edges. The newest stroke shines wet for a moment.

## Money (honest, same model as every app)

- **Plus** (`akshar.plus`, one purchase, never a subscription): premium
  papers (palm leaf, kraft, blackboard, midnight) and pens (gold ink,
  fountain pen, vermilion, rose and mint chalk), unlimited "show me" hints,
  and practice sheets/slates shared without the watermark.
- **Rewarded video** (only after a tap, max 6 a day): opens one premium paper
  or pen for 24 hours, or earns one hint.
- **Free hints:** 3 "show me" peeks a day without Plus.
- **Tips** (`akshar.tip.chai|coffee|cake|lunch|patron`): unlock nothing.
- Prices always come from the store; unlisted products are hidden. Restore
  is in Settings and on the Support page. The store review card is asked
  for once, after the learner's third letter written from memory.

## Architecture

```
src/domain          Script data (9 scripts), settings, progress, cosmetics, products; ports (+ ISpeech)
src/application     glyph (TrueType reader, paths, centre line), tracing (score), pen, learning
src/infrastructure  ExpoSpeech (expo-speech: voice lookup by language, slow rate)
src/config          container.ts: app-kit/native adapters + speech
src/presentation    theme (Paper/Slate), kit, i18n, state, glyph hooks, writing pad, screens
src/app             expo-router routes (one-line re-exports)
```

Screens: Welcome (pick scripts, pick a goal), Home (letter of the day from
`dailySeed`, streak, scripts with progress rings), Script (vowels/consonants
grid with stars, printable practice sheet), Trace (trace / from memory,
hear, undo, clear, show me, score, stamp, letter strip), Practice slate
(share as image), Progress (totals, four-week calendar, rings, gentle
milestones), Support, Settings, How we make money, Privacy, About (credits).

## Assets

- `npm run icons`: CanvasKit draws अ in Baloo 2 Bold on an indigo slate with
  the dotted guide and a vermilion spark (icon, adaptive layers, monochrome,
  splash light/dark, favicon).
- `npm run sounds`: original synthesized cues via `app-kit/wav`: nib scratch,
  chime, stamp (thump + sparkle), page turn, tap, soft "not yet".

## Before launch

- Native-speaker review of every script (above).
- Real AdMob ids (`ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`,
  `EXPO_PUBLIC_ADMOB_REWARDED_ID`) and store products (`akshar.plus`, tips).
- Test speech on a range of Android phones (Indic voices vary a lot).
- A development build to try haptics, audio and sharing on device.
