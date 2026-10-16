# Ludo monorepo

A [Turborepo](https://turborepo.com) of Expo apps, using npm workspaces.

| Folder          | What it is                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/ludo`     | **Ludo Rumble**, the whole app: code, assets, scripts, docs and its own Supabase project. See [its README](apps/ludo/README.md).        |
| `apps/baghchal` | **Bagh-Chal Arena**, the tigers-and-goats game. Own Supabase project, separate from Ludo's. See [its plan](apps/baghchal/docs/PLAN.md). |
| `packages/`     | Shared code: `baghchal-engine` is the pure-TypeScript Bagh-Chal rules engine.                                                           |

## Everyday commands (from the repo root)

```sh
npm install                              # one install for every app
npm run ludo                             # start Ludo's dev server
npm run baghchal                         # start Bagh-Chal's dev server
npx turbo run lint typecheck test        # check every app (unchanged ones come from cache)
npx turbo run test --filter=ludo         # one app only
```

Building, store submission and over-the-air updates run from inside the app
folder, e.g. `cd apps/ludo && npx eas-cli@latest build --profile preview`.

## Adding another app

Create it under `apps/` with the **same Expo SDK** as the others (two React
Native versions cannot live in one repo), give it its own `.env` pointing at
its own Supabase project, then run `npm install` at the root.
