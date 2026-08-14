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
npm run lint
npm run build
```

CI runs those on `main` and `develop`.

## State

`ZineProvider` is the client store. `apply()` in `src/store/reducer.ts` is the reducer — add tests there when you change behavior. Signed-in sessions persist a Bearer token in `localStorage` (`zineverse.token`) so GitHub Pages can call a hosted API on another origin.

## API

Hono + SQLite in `server/`. Auth is handle + password (`scrypt`). Publish, likes, remix, comments, poll votes, profiles, mail, fest, and the drop-seal are server-enforced. Deploy with `Dockerfile` + `fly.toml` (`flyctl deploy`) after `flyctl auth login`. Needs repo secret `FLY_API_TOKEN` for Actions.
