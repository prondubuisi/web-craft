# Project Status: Zineverse (web-craft)

_Last reviewed: 2026-08-14_

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

**Documentation:** Only `README.md` exists (29 lines) — a user-facing feature tour (what each route does, "Drop issue" scheduling, "Copy snapshot link" sharing, the five visual "vibes": Miles, Gwen, Peni, Ham, Noir). There is no `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, or roadmap doc.

## Access & Security Review

Several things are worth flagging as gaps rather than just describing neutrally:

- **No version control.** Despite a `.gitignore` being present, there is **no `.git` directory anywhere** in the project. Nothing is under source control — no history, no backup, no ability to branch, review, or revert. This is the single biggest risk to the project regardless of its architecture, since a lost or corrupted working copy would lose everything.
- **No authentication or access control of any kind.** There's no login, no session, no user identity system. Whoever has the page has full read/write access to whatever's stored.
- **No backend/API.** All persistence is browser `localStorage` (key `zineverse.v1`, see `src/lib/storage.ts`), scoped to a single browser on a single device. The `owner` field on a zine is a display label, not an authenticated identity.
- **"Sharing" is a data blob, not a permission system.** `src/lib/share.ts` base64-encodes a zine's full content into the URL fragment — anyone with the link has the full content; there's no revocation or access scoping.
- **Scheduled "Drop" is not a real access gate.** The sealed-until-drop-time behavior is a client-side timestamp check. It's a UX affordance, not a security boundary — trivially bypassable by anyone inspecting the client state.
- **No CI/CD or deployment configuration.** No `.github/workflows/`, no `vercel.json`, `netlify.toml`, or `Dockerfile`. Nothing currently automates build, lint, test, or deploy.
- **No secrets/env handling exists, and none is currently needed** — there's no `.env`/`.env.example` since there's no backend to configure.

## Evaluation

Zineverse is a **complete, working, single-user client-side prototype**. The scope-to-implementation match is good: for a local, browser-only creative tool, skipping auth and a backend is a reasonable and simple choice, not an oversight. The build is healthy, the feature set matches the README, and the E2E smoke script gives real (if informal) confidence that the main flows work.

The risks are concentrated in two places:
1. **Missing version control** — unrelated to the app's design, and worth fixing immediately regardless of any other roadmap decisions.
2. **No path to multi-device or multi-user use** — acceptable today, but if the product direction ever needs a user to see their zines on a second device, or needs any real sharing/collaboration, that will require introducing a backend and genuine authentication; the current `localStorage`-only model and the drop-scheduling "seal" won't extend to that use case as-is.

## Suggested Next Steps

Roughly prioritized:

1. **Run `git init`, commit the current state, and push to a remote.** Zero cost, highest priority — protects all existing work. (Not run as part of this doc — left as a deliberate decision for you to make.)
2. **Add a minimal CI workflow** (type-check + build + lint on push) once the repo is under git — cheap to add given the existing `build`/`lint` scripts.
3. **Decide the multi-device/sharing ambition.** If Zineverse should ever sync across devices or support real collaboration, that decision drives whether a backend + auth is needed — worth deciding deliberately rather than growing into it accidentally.
4. **Add a lightweight test setup (Vitest)** for the pure logic in `src/lib/` (`zine.ts`, `share.ts`, `storage.ts`) to complement the existing Puppeteer smoke test with fast, granular unit coverage.
5. **Add an `ARCHITECTURE.md` or expand the README** with a short "how state flows" section (`ZineContext` → `storage` → `share`) to help any future contributor (including future-you) ramp up faster.
