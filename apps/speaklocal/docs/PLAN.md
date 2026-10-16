# Speak Local: engineering plan

## The idea

"Speak the language of your new city." Millions of Indians move between
states for work and study: to Bengaluru, Chennai, Hyderabad, Pune, Mumbai,
Kolkata, Kochi, Delhi. The big language apps rarely teach Kannada, Tamil,
Telugu or Marathi. Speak Local teaches the **everyday spoken language of
your city**: survival conversations with the auto driver, the vegetable
seller, the landlord, the colleague at tea. Not grammar.

**Audience: teens and adults (13+).** Not a children's-category app; the
privacy page and "How we make money" say so. Rewarded videos request
non-personalised ads only.

## Rules the app keeps

- **No ads during lessons, ever.** No banners, no interstitials. A rewarded
  video plays only after a tap on "Watch a video"; the ad SDK is not set up
  until someone opens such an offer.
- **Free forever:** all twelve everyday scenes, every quiz, review, Say it,
  recording, Show-to-a-local and the phrasebook.
- **No accounts, no servers.** Settings, progress and the review schedule
  live on the device; recordings are files in the app's private folder,
  never uploaded; Plus is restored from the store account.
- **Microphone only when asked:** permission is requested on the first tap
  of Record, never at launch.
- **Calm by default:** springy entrances, the passing auto-rickshaw and
  pulsing prompts switch off under the OS reduce-motion flag or "Calmer
  motion". Sound and vibration have separate switches.
- **Accessible:** targets >= 44-48 dp with role, label and state; text scales
  (native script x1.4, interface x1.6-1.8); both lights (Day, Dusk) meet
  WCAG AA, checked in `palette.test.ts`, including every chat colour.

## Cities and languages (v1)

| City      | Language  | Speech tag | Script font (SIL OFL) | Skyline (stylised, no logos) |
| --------- | --------- | ---------- | --------------------- | ---------------------------- |
| Bengaluru | Kannada   | kn-IN      | Baloo Tamma 2         | domed assembly hall          |
| Chennai   | Tamil     | ta-IN      | Baloo Thambi 2        | temple gateway tower         |
| Hyderabad | Telugu    | te-IN      | Baloo Tammudu 2       | four-minaret arch            |
| Pune      | Marathi   | mr-IN      | Baloo 2               | fort gate with bastions      |
| Mumbai    | Marathi   | mr-IN      | Baloo 2               | seafront arch, water         |
| Kolkata   | Bengali   | bn-IN      | Baloo Da 2            | cantilever bridge, river     |
| Kochi     | Malayalam | ml-IN      | Baloo Chettan 2       | fishing nets, palm, water    |
| Delhi     | Hindi     | hi-IN      | Baloo 2               | memorial arch                |

Pune and Mumbai share one Marathi pack (no place names in the lines).

## Content

**22 scenes x 7 languages = 1,372 lines** (196 per language: 139 dialogue
lines + 57 extra phrases).

- Core, free (12 scenes, 112 phrases per language): Greetings & polite
  words, Numbers & money, Auto & cab, Shopping & vegetables, Landlord &
  house, Office small talk, Neighbours, Directions, Restaurant & tea stall,
  Doctor & pharmacy, Emergencies, Phone & delivery.
- Bonus packs, 2 scenes each (84 phrases per language): Festivals &
  weddings, Cricket & movies, Kids & school, Bank & government office,
  Making friends.

**Model** (`src/domain/content`). A scene is written once as a
language-independent template (`scenes.ts`): who speaks each line, its
English meaning, its Hindi meaning, and where it matters its register
(polite or casual). Each language pack (`packs/*.ts`) gives every line id
its native text and romanisation, optionally a culture note (about 30 per
language) and, where the language says something local, a paired English
and Hindi override (local dishes at the tea stall, Pongal or Onam for "the
festival", coffee rather than tea in Bengaluru and Chennai).
`catalogue.ts` joins them into `Phrase`s keyed `<lang>:<line id>`, which
progress, review, favourites and recordings key on.

**Recorded audio later.** `audio.ts` maps phrase keys to bundled audio
files. It is empty in v1. When native speakers record lines, add them there
and every player (scene, Say it, quiz, review, show card) plays the
recording first and falls back to text-to-speech.

**Gender-neutral lines.** The learner's gender is unknown, so lines spoken
by "you" avoid first-person verb forms that change with the speaker's
gender (Hindi and Marathi). Other speakers can be gendered.

**Instruction language.** English meanings, with an optional Hindi meaning
line in Devanagari (Settings, or onboarding) for Hindi-speaking learners.
It is hidden for the Hindi pack itself.

### Romanisation

All languages: plain ASCII letters the way Indians type these languages in
chats, with no diacritics. Hyphens split long words into sayable chunks
("Ell-li hog-beku?"). The romanisation has the same number of words and
the same sentence punctuation as the native line, and a capital after each
sentence end. Enforced by `validate.ts`; every pack passes. Each pack
documents its own scheme in its header:

- **kn, te, ml, ta:** long vowels doubled (aa, ee, oo). Dental th/dh,
  retroflex t/d, double consonants doubled. Tamil and Malayalam use zh for
  ழ/ഴ. Tamil uses th word-initially and dh between vowels, as said.
- **mr:** aa for ा; ee/oo only where Marathi says them long; final ं as "a".
- **hi:** Hindi chat style. t/d for both dental and retroflex (Hindi
  speakers would not read "thum" for tum). Final ई written i.
- **bn:** **no doubled vowels** (Bengali has no spoken vowel length and
  Bengalis do not type it). The inherent vowel is written o where it is said.

### Native-speaker review before launch (required)

**Every language needs native-speaker review before launch** (ideally
someone from that city who teaches). The content was written carefully, but
no native speaker has checked it yet. For each pack, check that every line
is natural colloquial speech for that city, at the right register; that
the romanisation reads aloud correctly; that every note is true; and that
the Hindi meanings and overrides are correct. The writers flagged these
lines:

- **Kannada (Bengaluru):** greetings.1/delivery.2 colloquial -aa vs -ri
  endings; numbers.x3 "maadbodaa"; shopping.1 "Henge kodtheera?" as the
  price idiom; shopping.4 "ಲಾಸ್ಟ್ ರೇಟು" vs roman "rate"; neighbours.2
  "ಬಂದ್ವಿ" spelling; emergency.3/x2 "ಕರೀರಿ" vs "ಫೋನ್ ಮಾಡಿ"; emergency.7 a
  little formal; teacher.1/x2 dative spellings; cricket.4 names
  Bengaluru; restaurant.4 "ಖಾರಾ ಬಾತ್" and its Hindi "खारा बाथ".
- **Tamil (Chennai):** numbers.x3 UPI wording (GPay is more common in
  speech); auto.1 "Central varumaa?" alternative and the "Anney" spelling;
  doctor.2 தலைவலி vs spoken தலவலி; teacher.1/2 குழந்தை for a school child;
  teacher.3 பாஷை vs மொழி; movies.3 "mass"; cricket.6/movies.6 "en treat";
  newFriends.4 names Chennai; neighbours.1 "...இல்ல?" tag; emergency.x1
  "Thee" could be misread; the number forms for 55 and 9.
- **Telugu (Hyderabad):** teacher.1/.2/.3/.x2 and parents.1 use "baabu"
  (son) because Telugu has no natural neutral "my child" (a note says use
  "paapa" for a daughter); restaurant.4/.5 pesarattu is more Andhra; how
  much Dakhini to keep (auto.5, directions.2 "సీదా", numbers.6 "వాపస్");
  delivery.5 Telangana form; restaurant.x1; newFriends.1; auto.3;
  greetings.5 and wedding.1 "స్వాగతం" may be formal.
- **Marathi (Pune/Mumbai):** मूल for "child" (parents.1, teacher.1/.x2) is
  slightly bookish; teacher.2 rephrased to avoid gendering the child;
  "आम्ही ... आलो" for a female learner (neighbours.2, parents.2); wedding.4
  "देईन"; directions.1 "जरा ऐका"; landlord.3 डिपॉझिट; govtOffice.4
  झेरॉक्स; newFriends.6; cricket.6 "ठरलं"; emergency.3 ॲ with TTS; the
  capitals in romanised UPI/PAN/ATM.
- **Bengali (Kolkata):** auto.1 uses apni ("jaben") though the template says
  casual; delivery.4 "third floor" in English, because তিনতলা means the
  second floor; festival.1/.2 "Shubho Pujo" without an override;
  shopping.3 tumi to a vendor; greetings.5 "Paray swagoto"; the wedding.1
  and wedding.x1 register; সাত (7) and ষাট (60) both romanised "shat";
  teacher.6 "Share tintey"; parents.6.
- **Malayalam (Kochi):** auto.4 "meter plus fifty"; neighbours.4 waste van
  (Kochi waste is often collected by Haritha Karma Sena workers);
  office.1-3 coffee; shopping.4; newFriends.1/2 turn the yes into a no;
  wedding.x1 a little formal; delivery.4 floor wording; emergency.x2 vs .5
  spellings of "police"; the Hindi spellings पझमपोरी and कडला.
- **Hindi (Delhi):** festival.1/.2 generic greeting (Delhi names the
  festival); wedding.1 "Arre, aaiye aaiye!"; wedding.4 "shagun";
  greetings.3/newFriends.2 "Dilli mein pehli baar?"; newFriends.x1 "Kis
  field mein ho?"; cricket.4, teacher.3 and newFriends.6 localised;
  saath (60) vs saath (with); the tone of restaurant.6 and govtOffice.2/.6.
- **Template Hindi meanings** (`scenes.ts`): one Hindi reviewer should read
  all 196 `hi` meanings once.

## Voice: a female ("lady") voice by default

The device's own text-to-speech (`expo-speech`) reads the native text, with
`language` set to the line's tag and `voice` set to a chosen voice.
expo-speech gives each voice an identifier, a name, a quality and a
language, **but no gender**. So `application/voice/selectVoice.ts` reads
hints the voices carry, from a small table we can justify, and **never
fakes a gender by raising the pitch** (pitch is always 1):

1. The words "female" or "male" in the name or identifier.
2. Samsung TTS identifiers ending `SMTf00` (female) or `SMTm00` (male).
3. Google TTS identifiers `<ll>-in-x-<ll>f-...` (female) and `...m-` (male),
   e.g. `kn-in-x-knf-local`. Hindi uses lettered voices: hia and hic
   female, hid and hie male.
4. Known names. Apple: Lekha and Kiyara (Hindi), and Soumya, Vani, Geeta,
   Piya, Minu for the Indian-language voices added in iOS 17. Microsoft:
   Swara, Kalpana, Pallavi, Sapna, Shruti, Aarohi, Tanishaa, Sobhana,
   Neerja, Heera. Known male names (Rishi, Madhur, Valluvar, Gagan, Mohan,
   Manohar, Bashkar, Midhun...) sort last.

The ranking is female, then unknown, then male. Within each, enhanced
quality comes first, then on-device ("local") before network voices so the
app keeps speaking offline, then a stable order. The voice must match the
city's region (kn-IN) first, then the language anywhere (bn-BD for bn-IN).
The learner's choice in Settings → Voices (listed as "Voice 1 · enhanced ·
woman's voice", each with a preview) wins while the device still has that
voice. Tests cover all of this with fake voice lists (`selectVoice.test.ts`).
The web run with a fake Kannada voice list confirmed the app picked
`kn-in-x-knf-local` over the male voice listed first and the network voice.

**Limits.** Where a phone's voices carry no hint (some OEM engines, some
Google voices such as `ta-in-x-tag`), the pick is the best voice of unknown
gender, and it may be male; Settings lets the learner switch. The Apple
iOS 17 Indian names and the Google Hindi letter codes come from observed
voice lists and must be **verified on real devices before launch**.

**No voice on the device.** Many phones have no Kannada or Malayalam voice.
The app then shows the romanisation bigger, with a gentle note on how to add
a voice (Android: Text-to-speech → Google → Install voice data; iPhone:
Spoken Content → Voices). Playback still runs: lines are highlighted for a
reading time. Practice works the same. When the app returns to the
foreground, it asks for voices again, so a newly installed voice shows up
at once.

**Speed: Slow by default (rate 0.7), Normal 1.0.** New sounds are much
easier to catch slowly, and beginners are the audience. The pauses in Say
it and Your turn scale with the line's syllables (longer when slow). One tap
on the header chip switches to Normal.

## Learning modes

- **Scene player:** chat bubbles, with your side in your chat colour. Tap a
  line to hear it. "Play conversation" plays every line with a highlight and
  auto-scroll. **Your turn** hides your lines; when one comes up you get a
  countdown to say it, then it is revealed and spoken. Culture notes and
  register tags sit by the lines.
- **Say it (shadowing):** listen, then your turn (a timed pause), then
  listen again, automatically for each phrase. "Once more" repeats it.
  **Record yourself:** the mic permission is asked on the first tap. A
  take plays back next to the native voice. Free keeps the latest take per
  phrase; Plus keeps a history of 20. You can delete any take, or all of
  them in Progress.
- **Quick quiz:** "How do you say…" (pick the phrase), "What does this
  mean?" (pick the meaning) and "Tap what you heard" (only with a voice).
  Wrong choices come from the same scene first. A quiz is deterministic for
  its seed (`application/quiz`).
- **Review (SM-2-lite):** `application/review/srs.ts`. A missed answer, or a
  phrase you bookmark, joins review, due today. After that, "Got it" sets
  the gap to 1 day, then 3, then x ease; "Easy" leaps further and "Again"
  brings it back today. Ease is clamped between 1.3 and 3, and the gap is
  capped at 180 days. Sessions re-show an "Again" card once.
- **Show to a local:** the phrase full screen in big script (sized by
  length), with its romanisation and meaning, a big Hear button, a bookmark
  and a favourite. Share card: a 1080x1080 image drawn with Skia, with a
  small watermark unless you have Plus. Native only.
- **Phrasebook:** search across English, the romanisation (it forgives
  doubled letters and hyphens: "eli" finds "Ell-li") and the native script,
  plus favourites.
- **Home:** your city's skyline (an auto-rickshaw drives past; a boat on
  water cities), the phrase of the day (from `dailySeed`), a gentle streak,
  review due, continue, and tiles.

## Money (honest)

- **Plus** (`speaklocal.plus`, one purchase): every bonus pack, all chat
  colours (Marigold, Monsoon, Jasmine, Chilli), recording history, and
  watermark-free cards.
- **Rewarded video:** one bonus pack (or one chat colour) open for 24 hours,
  tap only, at most 6 a day (`app-kit` entitlements).
- **Tips:** `tipProducts('speaklocal')`. Prices always come from the store;
  products the store does not list are hidden.
- In-app "How we make money" and Privacy pages. The privacy page covers the
  microphone and recordings. Contact: "write to the support address on the
  app's store page" (no invented email).

## Architecture

Clean Architecture folders, enforced by ESLint boundaries:

- `domain/content`: types, scenes, languages and cities, packs,
  catalogue, validation, and the audio registry.
- `domain/entities`: Settings, Progress (with review cards), Recording,
  Bubbles and Products.
- `domain/ports`: speech, recorder, clip player and recording store, plus
  the app-kit ports.
- `application`: voice selection, SRS, quiz, search, phrase of the day,
  pacing, and a cmap reader for font tests.
- `infrastructure`: ExpoSpeech (with a guard for browsers whose empty voice
  list never resolves), ExpoRecorder (expo-audio, made on demand),
  ExpoClipPlayer, and FileRecordingStore (expo-file-system; in memory on
  the web).
- `config/container.ts` is the only place adapters are made.
- `presentation`: theme (Day and Dusk), Kit, Skia skylines, providers
  (settings, entitlements, progress, recordings, voice) and screens.

## Tests

`npx jest` runs 148 tests, covering:

- **Content completeness:** every pack covers every line, with no unknown
  ids. Every line keeps the script, romanisation and punctuation rules. No
  two meanings share the same native text.
- **Templates:** 4-8 lines per scene, both speakers, extras, Hindi in
  Devanagari.
- **No tofu:** every character of every phrase exists in its Baloo font,
  read from the real font files. Hindi meanings are covered in Baloo 2, and
  romanisations, meanings and notes in all three Nunito weights.
- **App logic:** spaced-repetition maths, voice selection with fake lists,
  quiz determinism and distractors, search, pacing, and phrase of the day.
- **Data and theme:** parsing of settings, progress and recordings, and the
  contrast of both palettes and every chat colour.

## Before launch

1. **Native-speaker review of all seven packs** (list above), then fix and
   re-run `npx jest`.
2. Verify voice selection on real devices: Android with Google TTS
   (download each Indian voice), Samsung TTS, and an iPhone with iOS 17+
   Indian voices. Confirm the female hints in `selectVoice.ts` and add any
   new names you find.
3. Test recording on Android and iOS: the permission flow, playback through
   the speaker after recording, deleting takes, and the history kept with
   Plus.
4. Optional: record native-speaker audio for the core scenes and register
   it in `domain/content/audio.ts`.
5. Store: create `speaklocal.plus` and the five tips. Set the real AdMob
   app IDs (`ADMOB_ANDROID_APP_ID` and `ADMOB_IOS_APP_ID`) and the rewarded
   ad unit. Add the support email to the store listing. Write the store
   copy (13+, not for children).
6. Run `eas init`, then build a development client, then store builds. Run
   `npx expo-doctor`.
