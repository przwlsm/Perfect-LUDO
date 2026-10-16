# Tambola Party

Tambola (Housie), the family and kitty-party numbers game, on every phone at
the party. One phone hosts and calls the numbers (big rolling balls, a 1–90
board, voice in English or Hindi, the traditional fun calls); everyone else
joins with a six-character room code and daubs their own tickets. No server
and no internet: the room code holds the whole game, so the host's phone can
rebuild any player's ticket from its ID and check a claim. There is also a
solo mode against friendly computer players, and printable tickets for
relatives without the app. The plan and its reasoning are in
[docs/PLAN.md](docs/PLAN.md).

```sh
npm run tambola             # from the repo root: dev server
npm run lint                # inside this folder
npm run typecheck
npm test
npm run sounds              # regenerate the original sound effects (app-kit/wav)
npm run icons               # regenerate icon, adaptive icon, splash, favicon (CanvasKit)
npm run export:web          # copies CanvasKit to public/, then exports the web build
```

Clean Architecture like the other apps (`domain` → `application` →
`infrastructure` → `presentation`, wired only in `config/container.ts`),
enforced by ESLint. Ticket generation, the strip of six, call order, claim
checking, room codes, ticket IDs and the solo game are pure and tested in
`src/application`.

## Money, in one paragraph

Every mode is free, with up to six tickets. Money only buys looks: **Plus**
(`tambola.plus`, one purchase, forever) opens every premium ticket theme and
dabber, the fun-call voice, and removes the small watermark from shared ticket
pictures; a **rewarded video** (only on a tap in Looks, never during a game)
opens one premium item for 24 hours, at most 6 a day; **tips**
(`tambola.tip.*`) unlock nothing. No banners, no interstitials, no
subscription.
