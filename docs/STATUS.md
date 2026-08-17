# Project Status: Zineverse (web-craft)

_Last reviewed: 2026-08-17 (1.5.1)_

## Overview

**Zineverse** (`package.json` name: `web-craft`, version `1.5.1`, private) is a Spider-Verse-styled, block-based zine/collage editor. Stack: React 19 + TypeScript ~6 + Vite 8, with `react-router-dom`. Persistence is `localStorage` (`zineverse.v1`) plus an optional Hono + SQLite API.

Public repo: https://github.com/prondubuisi/web-craft  
Live demo: https://prondubuisi.github.io/web-craft/  
git-flow: `main` / `develop`, tags `0.1.0` … `1.5.1`.

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
- `src/store/` — `ZineContext.tsx` (provider) + `useZines.ts` + `ctx.ts` + `reducer.ts`
- `server/` — Hono app (`app.ts` mounts `routes/`), SQLite (`db.ts` + `migrations/`), services, auth (`scrypt`), community seed
- `src/lib/contract.ts` — shared request/response types
- `src/lib/useRemote.ts` — online-only fetch hook
- `src/styles/` — tokens/base/editor/reader/board/mail/jam/fest/cork/print

**Runtime deps:** `react`, `react-dom`, `react-router-dom`, `hono`, `@hono/node-server`, `better-sqlite3`, `qrcode`.

**Build health:** `npm run build` is `tsc -b && vite build`. CI on `main`/`develop` runs lint + unit tests + build + Playwright e2e.

**Testing:** Vitest + happy-dom (23 `*.test.ts` files, including `server/api.test.ts`, `src/lib/shape.test.ts`, `src/lib/catch.test.ts`, and service tests; 140 unit tests). Playwright user-story suite in `e2e/` — 68 tests. Locally `npm run test:e2e` reuses `npm run dev`; CI starts the app itself. Puppeteer smoke script `scripts/verify.mjs`; 22 shots in `scripts/shots/`.

**Documentation:** `README.md` (run + feature list + state flow), `CONTRIBUTING.md` (git-flow), this file, `docs/IMPROVEMENTS.md` (idea log; rounds 1–6 shipped; frozen), `docs/ARCHITECTURE_PLAN.md` (restructuring plan, written against 1.1.0), `CHANGELOG.md`, `sg.md` (live next changes), `docs/sg3.md` (Tiger-style observation), `docs/sg4.md` (1.5.0 consolidation observation).

## Access & Security Review

- **Auth exists when the API is up.** Handle + password (`scrypt`). Session is a Bearer token in `localStorage` (`zineverse.token`) so GitHub Pages can call a hosted API on another origin. Cookie also used same-origin. Login/register are rate-limited (8 attempts / 10 minutes per handle). A new login retires other sessions for that handle. Sessions past halfway through their 30-day life rotate on `/api/auth/me`.
- **Without the API the app is still a local studio.** `owner` is a display label (`you` or `@handle`). Anyone with the page can edit whatever is in that browser’s `localStorage`.
- **Sharing is still a blob.** Snapshot URLs (`/s#…`) encode the issue. No revocation.
- **Sealed drops and passphrases are enforced on the API** when it is up. Offline they are client-side checks only.
- **CI and Pages are live.** `.github/workflows/ci.yml` on `main`/`develop` (lint, unit, build, Playwright). `.github/workflows/pages.yml` deploys `main`. `.github/workflows/deploy-api.yml` deploys Fly (`FLY_API_TOKEN` is set).
- **Hosted API** is `https://zineverse-api.fly.dev`. `VITE_API_URL` is a repo Actions variable. Fly volume holds SQLite (`0003_legacy_columns` covers leftover schemas).

## Evaluation

Zineverse is a **working client-first zine tool with an optional multi-user API**. The Pages demo stays usable offline. Signed-in local or hosted API sessions sync drafts and enforce publish, likes, remix, comments, polls, mail, fest, and the drop-seal.

Product features from `docs/IMPROVEMENTS.md` rounds 1–6 are implemented as of 1.3.0. The readable slice and maker-depth pass shipped in 1.4.0. Auth hardening, the `social/` split, checkout-into-bag, reader INK grouping, and the expanded Playwright suite shipped in 1.4.1. `0003_legacy_columns` (1.4.2) upgrades leftover Fly volumes that never ran `0001_init`. Playwright e2e runs in CI as of 1.4.3. Store hooks and Actions v5 landed in 1.4.4. The 1.4.5 safety pass: `mergeZines` on boot/sign-in, `assertZineShape` on import and snapshot hashes, reducer id invariants, and named client catches. 1.4.6 drops leftover local demo copies on stream sync. 1.4.7: topbar MAIL/modal close, phone nav wrap, topbar e2e. 1.4.8 waits for health before calling the API down. **1.5.0** is the consolidation observation: Help names the four missing answer terms; the More sheet points at Help. **1.5.1** validates API blocks and batches stream decoration.

`docs/ARCHITECTURE_PLAN.md` items 1–7 are implemented: numbered SQL migrations, `server/routes` + `server/services` with service tests, `React.lazy` on navigated routes, `src/styles/` split + stylelint, `useRemote` for online-only fetches, and incremental `src/lib/contract.ts` types.

## Suggested Next Steps

The 1.4.x support pass is complete as of **1.4.8**. **1.5.0** shipped as the consolidation observation (`docs/sg4.md`). Three piles and five answer forms stay. No further 1.5.x work unless CI is red, the live demo lies, or you open a new note.

Feature list: none open from `docs/IMPROVEMENTS.md` (frozen). Do not start a seventh round of mechanics. Do not merge bag / shelf / archive.

Incremental only when touching a file: `contract.ts` for that route; `0004_` on the next schema change.

`FLY_API_TOKEN` and `VITE_API_URL` are set. Hosted API is `https://zineverse-api.fly.dev`.
