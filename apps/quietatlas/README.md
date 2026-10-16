# Quiet Atlas

Calm toys from around the world, in one app: a slowly turning globe with a
light for every destination. Rangoli (India), Ebru marbling (Türkiye), water
calligraphy (China), bubble wrap (USA), a singing bowl (Nepal) and candle
breathing (Denmark), with more on the way. No scores, no timers, nothing to
lose. The plan and the reasoning behind it are in [docs/PLAN.md](docs/PLAN.md).

```sh
npm run quietatlas          # from the repo root: dev server
npm run lint                # inside this folder: lint, typecheck, test
npm run typecheck
npm test
npm run sounds              # regenerate the original sound effects
npm run globe               # regenerate the globe's land dots (Natural Earth)
npm run icons               # regenerate icon, adaptive icon, splash, favicon
npm run web                 # web: copies CanvasKit, then starts the dev server
```

The app follows the same Clean Architecture layout as Ludo and Bagh-Chal
(`domain` → `application` → `infrastructure` → `presentation`, wired in
`config/container.ts`), enforced by ESLint. There is no server and no account:
everything about the player stays on the device, and purchases are restored
from the store account.

## Money, in one paragraph

Every toy is free, now and later. Money only buys looks: **Plus**
(`quietatlas.plus`, one purchase, forever) opens every premium look in every
toy and removes the small watermark from shared pictures; a **rewarded video**
(only ever on a tap) opens one look for 24 hours, at most 6 a day; **tips**
(`quietatlas.tip.*`) unlock nothing. No banners, no interstitials, no
subscription. The "How we make money" page in the app says the same thing to
players.
