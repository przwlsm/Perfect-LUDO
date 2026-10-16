# Tambola Party: plan and decisions

## The idea

Tambola (Housie) is India's favourite family and kitty-party game, and it is
played with paper tickets, a caller and a lot of shouting. Existing apps are
mostly single-player bingo with ads between rounds, or need every phone
online in the same server room. Tambola Party is built for the real thing: a
living room full of relatives, one phone as the caller, everyone else on
their own phone (or on a printed ticket), and no internet required.

The bar is Play's Editors' Choice: crafted, festive, accessible, honest about
money, and readable at a glance by someone's grandmother across the room.

## What was built

### Modes

1. **Party Room (no server).** "Host a game" makes a six-character room code
   that encodes the game's seed (which fixes the call order), the prizes
   played for, and a 4-bit check that catches ~94% of typos. The host's
   phone becomes the Caller: a rolling ball reveal, the traditional fun call
   under it ("Two little ducks"), the Hindi word when the Hindi voice is on,
   the last five balls, and a 1–90 board with the newest number glowing.
   Auto-call every 3–10 s with pause/resume and a progress bar, or tap to
   call. Voice through `expo-speech` (Indian English or Hindi in Devanagari).
   The screen stays awake while calling (`expo-keep-awake`).
   Players tap "Join a game", type or paste the code (or open
   `tambola://join/CODE`, shared through the system sheet), and choose 1–6
   tickets. Tickets are slots of a **strip of six** chosen by a random
   four-character strip code, so a player's tickets never share a number. A
   ticket ID ("H7KQ-3") plus the room code rebuilds the ticket on any phone,
   so the host verifies a claim by typing the ID: the app regenerates the
   ticket, checks it against the numbers called so far, shows the ticket with
   needed/missing numbers marked, and then announces and records the winner
   (optional name). Shared prizes are allowed (two tickets can finish on the
   same ball). Players daub by tapping; a "highlight numbers I might have
   missed" helper (off by default) works out from the call order and the
   player's own daubs which earlier numbers were probably called.
2. **Solo vs computer.** 1–4 tickets, 3–5 named rivals from around the
   world, each with 1–3 tickets and a style (quick, steady, dreamy; dreamy
   players sometimes miss a ball). Rivals claim at believable speeds after
   the ball that completes their prize. The player races them with six claim
   buttons; a bogus claim forfeits that prize. Pausing stops the game clock.
   The results screen shows who won what; "Play again" keeps the options.
3. **Print & share tickets.** For players without the app: pick 1–6 tickets
   for a room code, preview the sheet (Skia offscreen render, 1080 px wide,
   in the current ticket theme) and share it as a PNG. The host checks these
   tickets by ID like any other.

### Screens

Home, Host setup, Caller, Check a claim, Join (also the deep link
`join/[code]`), Player tickets (daub, claim, options), Solo setup, Solo
game, Results (solo and party), Looks, Print & share, How to play (with prize
diagrams), Support (Plus and tips), Settings, How we make money, Privacy.

### Pure logic (tested, `src/application`)

- `tickets.ts`: deterministic strip of six (every number 1–90 once, each
  ticket 15 numbers, 5 per row, 1–3 per column, ascending) and single
  tickets. Tested over thousands of seeds.
- `room.ts`: room codes (encode/decode/typo check/find a code in pasted
  text), ticket IDs, rebuilding tickets from room + ID.
- `calling.ts`, `voice.ts`: call order, called set, missed-number helper,
  English and Hindi number words, caller announcements.
- `claims.ts`: prize numbers, claim checking (bogus detection with the
  missing numbers), the call on which a prize completes.
- `solo.ts`: rivals, their claim plan, the game clock (`advance`), player
  claims, results.
- `sessions.ts`: parsing stored host/player sessions safely.

72 tests across domain, application and presentation (palette contrast,
the 90 fun calls).

### Feel

Night (deep plum, marigold and pink fairy lights) and Day (warm cream paper,
magenta and gold), following the device unless chosen in Settings. Fredoka
for display and ticket numbers, Nunito for body, Baloo 2 for Devanagari.
Confetti and a cheer on a valid claim, a soft wobble and "uh-oh" on a bogus
one, a stamp-in dab with a ripple and haptic on every daub, a rolling ball
for every call. Calmer motion (follows the OS) turns off the rolling,
confetti, twinkling and bobbing. All sounds are synthesized by
`scripts/generate-sounds.mjs` with `app-kit/wav`; the icon set is drawn by
`scripts/generate-icons.mjs` with CanvasKit.

## Decisions

- **No server, ever.** The room code is the game. Phones never talk to each
  other; the host's phone is the authority on what has been called. This
  makes the app work in a basement, on a train, at a wedding with no signal.
- **Strip-based ticket IDs.** Four characters name a strip (31⁴ ≈ 924k
  strips per room), the digit is the slot. A 30-player party has ~0.05%
  chance of two players drawing the same strip; players can also tap
  "Different tickets" before their first daub.
- **Claims are checked against called numbers, not daubs.** That is the
  traditional rule (the host checks the ticket) and it means a player who
  forgot to daub still wins. The player's phone warns if their own daubs
  don't complete the prize, to save them from a bogus shout.
- **The missed-number helper is off by default** because spotting numbers
  is the fun, and because it can guess wrong after a mis-tap.
- **Fun calls are family-friendly and original where the traditional ones
  were not** (no body or region jokes beyond the classic "Two fat ladies",
  which the brief asked for). Shown as text for free; spoken by the caller
  with the Plus fun-call voice.
- **Voice is the phone's own TTS**, offline, Indian English preferred. Hindi
  numbers are written in Devanagari so the Hindi voice pronounces them.

## Money (the honest model)

- Core play is always free: hosting, joining, solo, printing, up to 6
  tickets.
- **Plus** (`tambola.plus`, one purchase): premium ticket themes (Diwali
  Lights, Wedding Gold, Neon Night, Peacock), premium dabbers (gold star,
  heart, neon ring, flower), the fun-call voice, and no watermark on shared
  ticket pictures. Free: Classic and Kitty Party themes, three dot dabbers.
- **Rewarded video**: only from Looks (or the voice card), on a tap: one
  premium item for 24 hours, max 6 a day. Consent and SDK setup start only
  when the offer opens. Never during a game.
- **Tips**: `tipProducts('tambola')`, unlock nothing.
- "How we make money" and "Privacy policy" pages in the app. Prices come from
  the store; products the store doesn't list are hidden. Restore in Settings.
- The store review card is asked once, after a celebrated result.

## Before launch

- [ ] Create Play products: `tambola.plus` (non-consumable), consumables
      `tambola.tip.chai`, `tambola.tip.coffee`, `tambola.tip.cake`,
      `tambola.tip.lunch`, `tambola.tip.patron`. Same ids on the App Store.
- [ ] AdMob: create the app and one rewarded unit; set
      `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID` (EAS secrets) and
      `EXPO_PUBLIC_ADMOB_REWARDED_ID`. A production build refuses test ids.
- [ ] `eas init` for this app and a development build (`expo-speech`,
      `expo-keep-awake`, Skia, IAP and AdMob need native code).
- [ ] Test the voice on real devices: Indian English and Hindi voices, the
      pacing at 3 s calls (the caller cuts off the previous line), and the
      ring/silent switch.
- [ ] Test the deep link `tambola://join/CODE` from WhatsApp on Android and
      iOS (WhatsApp does not linkify custom schemes everywhere; the code in
      the message is the fallback). Consider an https App Link later.
- [ ] Have a Hindi speaker review the Hindi announcements, and a few
      families play a full party game with 10+ phones.
- [ ] Privacy policy URL for the store listing (same text as the in-app
      page); data safety form: no data collected by the app; AdMob only on
      opted-in videos.
- [ ] Store listing screenshots (the Playwright set is a good start) and a
      short video of a party game.

## Known limitations

- On the web build, ads, purchases and picture sharing are unavailable (by
  design; the screens say so).
- The player's phone cannot know which numbers have been called (there is
  no connection to the host); it relies on the player listening, which is
  the game.
- Only English UI for now; Hindi is a voice option, not a UI language.
