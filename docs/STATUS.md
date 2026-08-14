# Project Status: Zineverse (web-craft)

_Last reviewed: 2026-08-14 (1.3.0)_

## Overview

**Zineverse** (`package.json` name: `web-craft`, version `1.3.0`, private) is a Spider-Verse-styled, block-based zine/collage editor. Stack: React 19 + TypeScript ~6 + Vite 8, with `react-router-dom`. Persistence is `localStorage` (`zineverse.v1`) plus an optional Hono + SQLite API.

Public repo: https://github.com/prondubuisi/web-craft  
Live demo: https://prondubuisi.github.io/web-craft/  
git-flow: `main` / `develop`, tags `0.1.0` … `1.3.0`.

Routes (from `src/App.tsx`):

- `/` — Cover
- `/studio` — Studio
- `/explore` — Stream (search, vibe, watching, jam, archive)
- `/board` — Trade / collab / feedback pins (can mark swapped)
- `/fest` — Fest tables + sit
- `/cork` — Corkboard
- `/mail` and `/mail/:handle` — Pen-pal letters + postcards
- `/jam/:id` — Jam pile
- `/u/:handle` — Profile / Watch wall / guestbook / distro / passport
- `/edit/:id` — Editor
- `/z/:id` — Reader
- `/s#…` — Snapshot
- `*` — 404

## Development Status

**Structure** (~8,800 lines of TS/TSX in `src/`):

- `src/views/` — 13 screens. Largest: Editor (~681), Preview (~645)
- `src/components/` — Blocks, Chrome, Inspector, Comments, Reviews, Margins, FlipReader, FoldSheet
- `src/lib/` — types, widgets, storage, share, social, api, jam, fest, fold, cutout, tags
- `src/store/` — `ZineContext.tsx` + `reducer.ts`
- `server/` — Hono app (`app.ts` mounts `routes/`), SQLite (`db.ts` + `migrations/`), services, auth (`scrypt`), community seed
- `src/lib/contract.ts` — shared request/response types
- `src/lib/useRemote.ts` — online-only fetch hook
- `src/styles/` — tokens/base/editor/reader/board/mail/jam/fest/cork/print

**Runtime deps:** `react`, `react-dom`, `react-router-dom`, `hono`, `@hono/node-server`, `better-sqlite3`, `qrcode`.

**Build health:** `npm run build` is `tsc -b && vite build`. CI on `main`/`develop` runs lint + test + build.

**Testing:** Vitest + happy-dom (19 `*.test.ts` files, including `server/api.test.ts` plus migration and service tests). Puppeteer smoke script `scripts/verify.mjs` (~319 lines); 22 shots in `scripts/shots/`.

**Documentation:** `README.md` (run + feature list + state flow), `CONTRIBUTING.md` (git-flow), this file, `docs/IMPROVEMENTS.md` (idea log; rounds 1–6 shipped), `docs/ARCHITECTURE_PLAN.md` (restructuring plan, written against 1.1.0). No `CHANGELOG.md`.

## Access & Security Review

- **Auth exists when the API is up.** Handle + password (`scrypt`). Session is a Bearer token in `localStorage` (`zineverse.token`) so GitHub Pages can call a hosted API on another origin. Cookie also used same-origin. No rate limit, no token rotation — see `docs/ARCHITECTURE_PLAN.md` (auth hardening is out of scope there).
- **Without the API the app is still a local studio.** `owner` is a display label (`you` or `@handle`). Anyone with the page can edit whatever is in that browser’s `localStorage`.
- **Sharing is still a blob.** Snapshot URLs (`/s#…`) encode the issue. No revocation.
- **Sealed drops and passphrases are enforced on the API** when it is up. Offline they are client-side checks only.
- **CI and Pages are live.** `.github/workflows/ci.yml` on `main`/`develop`. `.github/workflows/pages.yml` deploys `main`. `.github/workflows/deploy-api.yml` deploys Fly when `FLY_API_TOKEN` is set; without the secret the job fails immediately.
- **Hosted API** is optional. `VITE_API_URL` is a repo Actions variable. Fly volume holds SQLite.

## Evaluation

Zineverse is a **working client-first zine tool with an optional multi-user API**. The Pages demo stays usable offline. Signed-in local or hosted API sessions sync drafts and enforce publish, likes, remix, comments, polls, mail, fest, and the drop-seal.

Product features from `docs/IMPROVEMENTS.md` rounds 1–6 are implemented as of 1.3.0.

`docs/ARCHITECTURE_PLAN.md` items 1–7 are implemented on `develop`: numbered SQL migrations, `server/routes` + `server/services` with service tests, `React.lazy` on navigated routes, `src/styles/` split + stylelint, `useRemote` for online-only fetches, and incremental `src/lib/contract.ts` types.

## Suggested Next Steps

Feature list: none open from `docs/IMPROVEMENTS.md`.

Still open (engineering, not product):

1. Auth/session hardening (rate limit, token rotation) — tracked above, out of the architecture plan
2. `FLY_API_TOKEN` if the hosted API should actually deploy
3. A `CHANGELOG.md` if release notes should live in-repo
