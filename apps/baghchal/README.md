# Bagh-Chal Arena

The tigers-and-goats board game as a mobile and web app. Rules live in
[`packages/baghchal-engine`](../../packages/baghchal-engine); the plan and the
reasoning behind it in [docs/PLAN.md](docs/PLAN.md).

```sh
npm run baghchal            # from the repo root: dev server
npm run lint                # inside this folder: lint, typecheck, test
npm run typecheck
npm test
```

The app follows the same Clean Architecture layout as Ludo
(`domain` → `application` → `infrastructure` → `presentation`, wired in
`config/container.ts`), enforced by ESLint.
