# Project Status: Zineverse (web-craft)

_Last reviewed: 2026-08-17 (1.4.3)_

## Overview

**Zineverse** (`package.json` name: `web-craft`, version `1.4.3`, private) is a Spider-Verse-styled, block-based zine/collage editor. Stack: React 19 + TypeScript ~6 + Vite 8, with `react-router-dom`. Persistence is `localStorage` (`zineverse.v1`) plus an optional Hono + SQLite API.

Public repo: https://github.com/prondubuisi/web-craft  
Live demo: https://prondubuisi.github.io/web-craft/  
git-flow: `main` / `develop`, tags `0.1.0` … `1.4.3`.

Routes (from `src/App.tsx`):

- `/` — Cover
- `/studio` — Studio
- `/help` — Glossary
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

- `src/views/` — 14 screens (Help added). Editor canvas + extracted DropModal/EditorMeta. Preview chrome; social state in `useIssueSocial`
- `src/components/` — Blocks, Chrome, Inspector, Comments, Reviews, Margins, FlipReader, FoldSheet
- `src/lib/` — types, widgets, storage, share (`social/` bag mail archive run ink scene), api, jam, fest, fold, cutout, tags
- `src/store/` — `ZineContext.tsx` + `reducer.ts`
- `server/` — Hono app (`app.ts` mounts `routes/`), SQLite (`db.ts` + `migrations/`), services, auth (`scrypt`), community seed
- `src/lib/contract.ts` — shared request/response types
- `src/lib/useRemote.ts` — online-only fetch hook
- `src/styles/` — tokens/base/editor/reader/board/mail/jam/fest/cork/print

**Runtime deps:** `react`, `react-dom`, `react-router-dom`, `hono`, `@hono/node-server`, `better-sqlite3`, `qrcode`.

**Build health:** `npm run build` is `tsc -b && vite build`. CI on `main`/`develop` runs lint + unit tests + build + Playwright e2e.

**Testing:** Vitest + happy-dom (21 `*.test.ts` files, 124 tests, including `server/api.test.ts`, `server/rateLimit.test.ts`, and service tests). Playwright user-story suite in `e2e/` — 60 tests (`npm run test:e2e`, needs `npm run dev`). Puppeteer smoke script `scripts/verify.mjs`; 22 shots in `scripts/shots/`.

**Documentation:** `README.md` (run + feature list + state flow), `CONTRIBUTING.md` (git-flow), this file, `docs/IMPROVEMENTS.md` (idea log; rounds 1–6 shipped; frozen), `docs/ARCHITECTURE_PLAN.md` (restructuring plan, written against 1.1.0), `CHANGELOG.md`, `sg.md` (next changes).

## Access & Security Review

- **Auth exists when the API is up.** Handle + password (`scrypt`). Session is a Bearer token in `localStorage` (`zineverse.token`) so GitHub Pages can call a hosted API on another origin. Cookie also used same-origin. Login/register are rate-limited (8 attempts / 10 minutes per handle). A new login retires other sessions for that handle. Sessions past halfway through their 30-day life rotate on `/api/auth/me`.
- **Without the API the app is still a local studio.** `owner` is a display label (`you` or `@handle`). Anyone with the page can edit whatever is in that browser’s `localStorage`.
- **Sharing is still a blob.** Snapshot URLs (`/s#…`) encode the issue. No revocation.
- **Sealed drops and passphrases are enforced on the API** when it is up. Offline they are client-side checks only.
- **CI and Pages are live.** `.github/workflows/ci.yml` on `main`/`develop`. `.github/workflows/pages.yml` deploys `main`. `.github/workflows/deploy-api.yml` deploys Fly when `FLY_API_TOKEN` is set; without the secret the job skips (not a failure).
- **Hosted API** is optional. `VITE_API_URL` is a repo Actions variable. Fly volume holds SQLite.

## Evaluation

Zineverse is a **working client-first zine tool with an optional multi-user API**. The Pages demo stays usable offline. Signed-in local or hosted API sessions sync drafts and enforce publish, likes, remix, comments, polls, mail, fest, and the drop-seal.

Product features from `docs/IMPROVEMENTS.md` rounds 1–6 are implemented as of 1.3.0. The readable slice and maker-depth pass shipped in 1.4.0. Auth hardening, the `social/` split, checkout-into-bag, reader INK grouping, and the expanded Playwright suite shipped in 1.4.1. `0003_legacy_columns` (1.4.2) upgrades leftover Fly volumes that never ran `0001_init`. Playwright e2e runs in CI as of 1.4.3.

`docs/ARCHITECTURE_PLAN.md` items 1–7 are implemented: numbered SQL migrations, `server/routes` + `server/services` with service tests, `React.lazy` on navigated routes, `src/styles/` split + stylelint, `useRemote` for online-only fetches, and incremental `src/lib/contract.ts` types.

## Suggested Next Steps

Feature list: none open from `docs/IMPROVEMENTS.md` (frozen — see the note at the top of that file). Do not start a seventh round of mechanics.

No product items open. `FLY_API_TOKEN` and `VITE_API_URL` are set. Hosted API is `https://zineverse-api.fly.dev` (`0003_legacy_columns` unblocked the leftover volume).

Bag, distro shelf, and archive stay distinct (private pile / public table / community preservation). Checkout now also stuffs the bag. Blurbs and letters stay two forms, grouped as ink on the reader. Dedication and tear-out stay maker-side.
