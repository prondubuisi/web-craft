# Project Status: Zineverse (web-craft)

_Last reviewed: 2026-08-14 (0.1.2 website pass)_

## Overview

**Zineverse** (`package.json` name: `web-craft`, version `0.0.0`, private) is a client-side, Spider-Verse-styled, block-based zine/collage editor. Stack: React 19.2.8 + TypeScript ~6.0.2 + Vite ^8.2.0, with `react-router-dom` for routing. There is no backend — the entire app runs in the browser.

Routes (from `src/App.tsx` / `src/views/`):
- `/` — Landing (vibe picker / cover)
- `/studio` — Studio (issue list / create)
- `/edit/:id` — Editor (block-based page editor)
- `/explore` — Stream (public-feeling feed of drops)
- `/z/:id` — Preview (issue reader)
- `/s#…` — Snapshot (portable, base64-encoded state in the URL fragment)

## Development Status

**Structure** (~2,572 lines of TS/TSX in `src/`):
- `src/views/` — Landing, Studio, Editor (523 lines, largest file), Explore, Preview, Share
- `src/lib/` — `zine.ts`, `vibes.ts`, `storage.ts`, `share.ts`, `seed.ts`, `widgets.ts`, `types.ts`, `useCountdown.ts`, `id.ts`
- `src/store/ZineContext.tsx` — single React Context holding all app state (222 lines)
- `src/components/` — `Blocks.tsx`, `Chrome.tsx`, `Inspector.tsx`

**Dependencies** are minimal: runtime deps are just `react`, `react-dom`, `react-router-dom`. Dev deps are `typescript`, `vite`, `@vitejs/plugin-react`, `oxlint` (linter), `puppeteer-core` (used only by the local verify script), and `@types/*`.

**Build health:** `npm run build` runs `tsc -b && vite build` — a fresh `dist/` is present in the workspace, meaning the project currently type-checks and builds cleanly.

**Testing:** No unit-test framework (no Jest/Vitest, no `*.test.*`/`*.spec.*` files). There is a custom Puppeteer E2E smoke script, `scripts/verify.mjs` (161 lines), that drives a real browser against a local dev server and exercises the main flows — vibe pick, studio, new issue, editor slash-commands/undo, drop scheduling, preview/like, explore stream, sealed-drop lock, remix, mobile viewport. It saves screenshots to `scripts/shots/`; 17 PNGs exist there, all recently dated, suggesting the script has been run and the main flows currently work.

**Code completeness:** No `TODO`/`FIXME`/`HACK`/"not implemented" markers were found anywhere in `src/`, `scripts/`, or the README — the codebase reads as functionally complete for its current scope rather than mid-refactor or full of stubs.

**Documentation:** `README.md` covers run/test, the live demo, and a short "How state flows" note. This file is the status/risk log. There is still no `CONTRIBUTING.md` or `CHANGELOG.md`.

## Access & Security Review

Several things are worth flagging as gaps rather than just describing neutrally:

- **Version control is in place.** Public repo: https://github.com/prondubuisi/web-craft — git-flow with `main` / `develop`, tags `0.1.0` and `0.1.1`.
- **No authentication or access control of any kind.** There's no login, no session, no user identity system. Whoever has the page has full read/write access to whatever's stored.
- **No backend/API.** All persistence is browser `localStorage` (key `zineverse.v1`, see `src/lib/storage.ts`), scoped to a single browser on a single device. The `owner` field on a zine is a display label, not an authenticated identity.
- **"Sharing" is a data blob, not a permission system.** `src/lib/share.ts` base64-encodes a zine's full content into the URL fragment — anyone with the link has the full content; there's no revocation or access scoping.
- **Scheduled "Drop" is not a real access gate.** The sealed-until-drop-time behavior is a client-side timestamp check. It's a UX affordance, not a security boundary — trivially bypassable by anyone inspecting the client state.
- **CI and Pages are live.** `.github/workflows/ci.yml` runs lint + test + build on `main`/`develop`. `.github/workflows/pages.yml` deploys `main` to https://prondubuisi.github.io/web-craft/.
- **No secrets/env handling exists, and none is currently needed** — there's no `.env`/`.env.example` since there's no backend to configure.

## Evaluation

Zineverse is a **complete, working, single-user client-side prototype**. The scope-to-implementation match is good: for a local, browser-only creative tool, skipping auth and a backend is a reasonable and simple choice, not an oversight. The build is healthy, the feature set matches the README, and the E2E smoke script gives real (if informal) confidence that the main flows work.

The remaining product risk is **no multi-device identity**. Sharing is a snapshot blob or a JSON file. That is an intentional ceiling, not an accident.

## Decision: optional SQLite API

The public Pages demo stays client-only. Locally (or any host that runs `npm run dev:api`), Zineverse has a Hono + SQLite backend:

- handle + password accounts (`scrypt`, httpOnly session cookie)
- server-side publish / drop seal (strangers get empty blocks until `dropsAt`)
- likes, views, remixes as rows, not just local counters
- login uploads existing `you`-owned drafts

Snapshot URLs and JSON export remain for when the API is down.

## Suggested Next Steps

Done: git + GitHub, CI, Vitest, README state-flow note, live Pages demo, optional backend.

Still open:

1. **Host the API** (Fly/Railway/a VPS) and set `VITE_API_URL` if the Pages demo should sign in.
2. **Vitest for more of `src/store`** if reducer bugs start showing up.
3. **CONTRIBUTING.md** if more than one person is committing.
