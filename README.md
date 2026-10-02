# Ludo monorepo

A [Turborepo](https://turborepo.com) of Expo apps, using npm workspaces.

| Folder         | What it is                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/ludo`    | **Ludo Rumble**, the whole app: code, assets, scripts, docs and its own Supabase project. See [its README](apps/ludo/README.md). |
| `apps/starter` | The next app, empty for now. It will get its own Supabase project, separate from Ludo's.                                         |
| `packages/`    | Shared code between apps (empty for now).                                                                                        |

## Everyday commands (from the repo root)

```sh
npm install                              # one install for every app
npm run ludo                             # start Ludo's dev server
npx turbo run lint typecheck test        # check every app (unchanged ones come from cache)
npx turbo run test --filter=ludo         # one app only
```

Building, store submission and over-the-air updates run from inside the app
folder, e.g. `cd apps/ludo && npx eas-cli@latest build --profile preview`.

## Adding the new app

Create it inside `apps/starter` with the **same Expo SDK** as Ludo (two React
Native versions cannot live in one repo), give it its own `.env` pointing at
its own Supabase project, then run `npm install` at the root.
