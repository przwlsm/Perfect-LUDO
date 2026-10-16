# Akshar

Learn to write any Indian script. Trace a letter on a dotted guide, hear it
spoken, then write it from memory: Devanagari, Tamil, Kannada, Telugu,
Bengali, Gujarati, Gurmukhi, Malayalam and Urdu (396 letters), each with an
example word, its meaning and a romanisation. A free practice slate and
printable practice sheets too. The plan and the reasoning are in
[docs/PLAN.md](docs/PLAN.md).

```sh
npm run akshar              # from the repo root: dev server
npm run lint                # inside this folder: lint, typecheck, test
npm run typecheck
npm test
npm run sounds              # regenerate the original sound effects
npm run icons               # regenerate icon, adaptive icon, splash, favicon
npm run web                 # web: copies CanvasKit, then starts the dev server
```

The app follows the shared Clean Architecture layout (`domain` →
`application` → `infrastructure` → `presentation`, wired in
`config/container.ts`), enforced by ESLint. The tracing engine is pure and
tested: a small TrueType reader, glyph fitting and hit-testing, a distance-
transform centre line for the dotted guide, coverage/accuracy scoring and a
speed-sensitive pen. There is no server and no account: progress stays on
the device, and purchases are restored from the store account.

## Money, in one paragraph

Every script, letter and mode is free, always. **Plus** (`akshar.plus`, one
purchase, forever) adds premium papers and pens, unlimited "show me" hints
and watermark-free sharing; a **rewarded video** (only on a tap) opens one
paper or pen for 24 hours or earns a hint, at most 6 a day; **tips**
(`akshar.tip.*`) unlock nothing. No banners, no interstitials, no
subscription, and nothing ever interrupts writing.

## Credits

Letters are drawn with the Baloo 2 family by Ek Type; interface type is
Fraunces and Nunito. All fonts are under the SIL Open Font License 1.1.
Sounds are original. Each script needs a native speaker's review before
launch (see the plan).
