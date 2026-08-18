# Contributing to Zineverse

## Branches

This repo uses [git-flow](https://nvie.com/posts/a-successful-git-branching-model/):

- `main` — production (GitHub Pages + tagged releases)
- `develop` — integration
- `feature/*` — work
- `release/*` — version bumps before `main`

```bash
git checkout develop
git flow feature start my-change
# commit
git checkout develop
git merge --no-ff feature/my-change
```

Use `--no-ff` so feature history stays visible. Ship to production with a `release/*` branch, merge to **both** `main` and `develop`, and tag.

## Run locally

```bash
npm install
npm run dev
```

- Web: Vite prints a localhost URL
- API: `http://127.0.0.1:8787` (SQLite in `server/data/`)

`npm run dev:web` / `npm run dev:api` start one side. Without the API the UI stays on `localStorage`.

## Checks

```bash
npm test
npm run test:e2e         # Playwright; reuses `npm run dev` on http://127.0.0.1:5173
npm run test:e2e:headed  # same server, visible Chrome
npm run test:e2e:ui      # Playwright UI — pick a story, watch it hit localhost
npm run lint
npm run build
```

CI on `main` and `develop` runs lint, unit tests, build, and Playwright (`npm run test:e2e`). Local e2e **reuses** an already-running `npm run dev` so IDE tests and the browser you have open share one Vite + SQLite process.

## Live tests from the IDE

1. Start the app once: `npm run dev` (or Run Task **dev: live localhost**).
2. Open **http://127.0.0.1:5173/** — not `localhost` (Vite is bound to IPv4 only; tests use the same origin).
3. Run a spec against that server:
   - Playwright extension (recommended): gutter ▶ on a `test(...)` in `e2e/*.spec.ts`. Turn on **Show browser** to watch Chrome hit the same origin.
   - Run and Debug: **Playwright: current file (reuse localhost)** or the **headed** / **UI** variants.
   - Terminal: `npx playwright test e2e/studio.spec.ts -g "10h"` (add `HEADED=1` to see it).

`playwright.config.ts` has `reuseExistingServer: true` when `CI` is unset. Do not start a second `npm run dev` — port 5173 is strict. The API stays `http://127.0.0.1:8787`.

## State

`ZineProvider` is the client store. `apply()` in `src/store/reducer.ts` is the reducer — add tests there when you change behavior. Signed-in sessions persist a Bearer token in `localStorage` (`zineverse.token`) so GitHub Pages can call a hosted API on another origin.

## API

Hono + SQLite in `server/`. Schema lives in numbered files under `server/migrations/`; `openDb()` runs them at boot. Auth is handle + password (`scrypt`). Publish, likes, remix, comments, poll votes, profiles, mail, fest, and the drop-seal are server-enforced. Shared request/response shapes live in `src/lib/contract.ts`. Deploy with `Dockerfile` + `fly.toml` (`flyctl deploy`) after `flyctl auth login`. Needs repo secret `FLY_API_TOKEN` for Actions.
