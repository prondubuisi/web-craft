# Architecture Improvement Plan

_Compiled: 2026-08-14, against v1.1.0. Implemented on `develop` 2026-08-14._

This is a restructuring plan for the seven issues raised in the architecture critique of the same date. **Authentication/session security** (login rate limiting, token rotation) shipped in 1.4.1 — see `docs/STATUS.md`. Everything else from the critique is covered below.

Each item states the problem in one line, the target structure, and a migration path that doesn't require a big-bang rewrite — every one of these can land as its own incremental PR against `develop`, in the priority order given.

## Round 2 — 2026-08-17, against v1.5.0

Items 1–7 below are the original audit and are fully shipped. A second, independent audit was read against the codebase after the `sg1`–`sg4` product/safety passes (`1.4.0`–`1.5.0`), covering client state, the server, and build/CI/deploy tooling — three areas the first audit already restructured once, now revisited for drift and new growth. It found 18 evidence-backed issues, grouped by risk/value. The **correctness & security tier shipped in 1.5.1**:

- Server-side validation of zine/block JSON, reusing the client's `src/lib/shape.ts` validator (`assertBlocks`) at the two write endpoints that previously did a blind `as Block[]` cast — see item 1 of the original critique's counterpart, now closed at the server too.
- Batched the N+1 query in `decorate()` (3 queries × N rows → 3 total) across the stream/archive/jam list endpoints.
- Gated `pages.yml` and `deploy-api.yml` on lint/test/build actually passing before deploying — `deploy-api.yml` previously had no gate at all.

Items **8** and **9** are done (`useRemote` on Preview; `useRemoteWithFallback` on the merge sites). Items **10–14** are the remaining structural-cleanup and tooling-polish work — not urgent; none change user-facing behavior.

## Priority order

1. Migrations framework (unblocks safely touching schema for everything else) — done
2. Split `server/app.ts` into route + service modules — done
3. Server-side test coverage at the service layer — done
4. Code splitting on routes — done
5. Split `global.css` by domain + add a CSS lint step — done
6. Formalize the "online-only feature" data-fetch pattern — done
7. Shared client/server request-response types — done (incremental; auth/board/fest + `api.ts`)
8. Adopt `useRemote` in the one view that still bypasses it — done
9. Extract the duplicated "remote + local fallback" merge into a shared hook — done
10. Split `Editor.tsx`'s six concerns, starting with undo/redo — not started
11. Add test coverage for `useIssueSocial.ts` — not started
12. Narrow the migration runner's error-swallowing — not started
13. Multi-stage `Dockerfile` — not started
14. CI/tooling housekeeping (composite action, action pin, dead config, Playwright cache) — not started

Items 4 and 5 have no dependency on anything else and can be done anytime, including in parallel with 1–3. Items 8–14 are each independent of one another and of 1–7.

---

## 1. Replace ad hoc `ALTER TABLE` checks with a real migrations framework

**Problem:** `server/db.ts` grows a longer chain of `if (!column) db.exec('ALTER TABLE ... ADD COLUMN ...')` checks with every release (25 tables and counting). No version tracking, no rollback, no history — and there's now a real Fly.io SQLite volume with real user data behind it.

**Target structure:**
- `server/migrations/0001_init.sql`, `0002_...sql`, etc. — one file per schema change, numbered, append-only.
- A `schema_migrations` table (`id TEXT PRIMARY KEY, applied_at INTEGER`) recording what's already run.
- A small runner (no new dependency needed — a ~30-line function reading the `migrations/` directory, diffing against `schema_migrations`, and running new files in order inside a transaction) invoked once at boot in `server/index.ts`.

**Migration path:**
- Write one "baseline" migration that `CREATE TABLE IF NOT EXISTS`s the current live schema exactly as `db.ts` produces it today, and mark it pre-applied for any existing database (so production data isn't touched).
- From that point on, every future schema change is a new numbered file — the current inline `ALTER TABLE` block in `db.ts` is deleted once its contents are captured in the baseline.
- No behavior change for existing installs; new installs get the same schema via the migration chain instead of the imperative checks.

---

## 2. Split `server/app.ts` into route modules and a service layer

**Problem:** One 1,651-line file holds all 63 routes with 77 inline `db.prepare()` calls. Business logic (notification fanout, jam matching, mention parsing, password orchestration) is embedded directly in HTTP handlers, so nothing about it is independently reusable or testable.

**Target structure:**
```
server/
  routes/
    auth.ts        (register, login, logout, me)
    zines.ts        (CRUD, publish, like, view, remix, unlock)
    social.ts       (comments, polls, follows, notices)
    board.ts        (listings, swap)
    mail.ts
    jam.ts
    archive.ts      (nominations)
    fest.ts         (tables, stamps)
    cork.ts
    bag-shelf.ts    (bag, shelf, guestbook, reviews, loans, claims)
    margins.ts
  services/
    notify.ts        (fanout logic, currently inline per-handler)
    jams.ts           (jamForLive/jamForPublish matching, currently in lib/jam.ts shared with client — keep shared, just stop re-deriving jam logic inline in handlers)
    publish.ts        (drop-seal + visibility/password orchestration extracted from the publish handler)
  db.ts               (schema + migrations runner only)
  app.ts              (mounts each route module on the Hono app; nothing else)
```

**Migration path:** extract one domain at a time, starting with the newest/most isolated ones (board, mail, jam, fest, cork — least entangled with the core zine model), each as its own PR: move the routes verbatim into their new file, run `npm test` to confirm `api.test.ts` still passes unchanged (route paths and behavior don't move, only file location), then pull out any obviously-reusable logic (the notification fanout blocks are duplicated across `publish`, `follow`, `comment`, `nominate` — that's the first thing worth lifting into `services/notify.ts`). Save the core zine CRUD/publish routes for last since they're the most-touched and highest-risk to move.

---

## 3. Add service-layer tests, not just one large integration file

**Problem:** All server behavior is verified through one 613-line `server/api.test.ts` that exercises the whole app over HTTP. The client's `src/lib/` has good practice here already (`jam.test.ts`, `fold.test.ts`, `cutout.test.ts`, `fest.test.ts`, `tags.test.ts` are all small and focused) — the server should match that convention once it has service modules to test.

**Target:** once §2 lands, each `server/services/*.ts` ships with a co-located `*.test.ts` that calls the function directly (no HTTP layer, no test server), covering the actual business rules: drop-seal timing, password verification, jam-matching edge cases, notification fanout targeting. `server/api.test.ts` stays as-is as the end-to-end smoke layer — it doesn't need to shrink, it just stops being the *only* layer.

**Migration path:** add tests alongside each service extraction from §2, one PR at a time — this item has no independent work of its own, it's a checklist item attached to §2's PRs.

---

## 4. Route-based code splitting

**Problem:** No `React.lazy`/`Suspense` anywhere in `App.tsx`. All 15 routes — Editor, Fest, Cork, Jam, Board, Mail, Profile, everything — ship in one ~376KB bundle on first load, which works against the README's phone-install pitch.

**Target:** wrap each route element in `App.tsx` with `React.lazy(() => import('./views/X'))` and a single top-level `<Suspense>` with a lightweight fallback (a comic-styled loading sticker, matching the existing visual language). Keep `Landing` (and maybe `Studio`) eager since they're the near-certain first screen; lazy-load everything reachable only after navigation.

**Migration path:** single self-contained PR, no server or state changes involved. Verify with `npm run build` that the output now produces multiple chunks instead of one, and spot-check that navigating to each route still works (existing Puppeteer `scripts/verify.mjs` smoke script already exercises most routes, so it doubles as a regression check here).

---

## 5. Split `global.css` by domain, add a CSS lint step

**Problem:** 2,247 lines in one unscoped file, growing with every feature. This isn't hypothetical risk — it's exactly how the `@page` nesting bug went unnoticed through five releases (0.9.0 → 1.1.0) and broke every production build in that window; nobody was going to catch one bad rule by eye in a file this size.

**Target structure:** split into `src/styles/` files by domain, all still imported globally (no CSS Modules migration — that's a bigger, separate call and not needed to fix the actual problem, which is file size and reviewability, not scoping):
```
src/styles/
  tokens.css       (:root, [data-vibe='*'] — the design system)
  base.css          (resets, typography, buttons, .panel/.sticker primitives)
  editor.css
  reader.css        (Preview/FlipReader/print + fold)
  board.css
  mail.css
  jam.css
  fest.css
  cork.css
  print.css         (the @media print block, including the now-fixed @page rules)
```
A single `global.css` (or `index.css`) keeps `@import`-ing all of them in order, so nothing about the app's actual CSS behavior changes — this is a pure file-organization split.

**Additionally:** add `stylelint` (dev dependency, one config file) to `npm run lint` (or a new `npm run lint:css`) and to `ci.yml`, so an invalid at-rule like the `@page` nesting bug fails fast in CI before it ever reaches `vite build`, rather than silently breaking the production build for multiple releases.

**Migration path:** mechanical — cut sections out of the current file into the new ones by the comment boundaries that already roughly exist, verify visually via `npm run dev` and the Puppeteer screenshots in `scripts/shots/` that nothing shifted.

---

## 6. Formalize the "online-only feature" data-fetch pattern

**Problem:** Core zine/session data flows through the central reducer (`ZineContext.tsx` + `reducer.ts`) with a genuine local-first fallback. Every feature since ~0.7.0 (board, mail, jam, archive, margins, fest, cork, bag, shelf, guestbook, reviews) instead does its own ad hoc `useEffect` + direct `api.*` call per view, each reimplementing the same online-check/loading/error shape slightly differently, with no local fallback at all.

**Target:** don't fold these into the mega-reducer (that makes an already-large context bigger and doesn't fix the duplication) — instead add one small shared hook, e.g. `src/lib/useRemote.ts`, exporting something like `useRemote(fetcher, deps)` that returns `{ data, loading, error }` and internally handles the existing `online` gate consistently. Every view listed above swaps its bespoke `useEffect` block for a call to this hook. This doesn't change what these features do (they stay online-only by design), it just makes that a single documented, tested pattern instead of eleven slightly different copies of it.

**Also:** update `README.md`'s "still runs locally from `localStorage`" line to be explicit that this applies to the core studio/zine data only, not to board/mail/jam/archive/fest/cork/etc. — the current wording overstates what works offline.

**Migration path:** write the hook once with its own test, then convert one view at a time (low risk — each conversion is independent and behavior-preserving).

---

## 7. Shared request/response types between client and server

**Problem:** `src/lib/api.ts` (client) and `server/app.ts`/route modules (server) each hand-define the shape of ~60 endpoints independently. Nothing enforces they match beyond the test suite and discipline — a field rename on one side is a silent runtime bug, not a compile error.

**Target (intentionally modest — not a tRPC/codegen migration):** a single `server/contract.ts` (or `src/lib/contract.ts`, imported by both sides since this is a single npm workspace) defining the request/response TypeScript types for each endpoint. `api.ts` methods and the route handlers in `server/routes/*.ts` both import from it instead of inlining `{ ... }` shapes. A shape mismatch becomes a TypeScript error in `tsc -b` (already part of `npm run build`) instead of a runtime surprise.

**Migration path:** lowest priority, highest effort-to-value ratio of the seven — do this last, and only once §2's route split exists (defining one contract file against 63 routes scattered through one file is much more error-prone than doing it against ten small route modules). Add types incrementally, endpoint group by endpoint group, not all at once.

---

## 8. `Preview.tsx` doesn't use `useRemote`

**Problem:** §6 (above) added `useRemote` specifically to stop every view from hand-rolling its own online-check/loading/error fetch effect. Eight call sites across seven views (`Cork`, `Studio`, `Explore` ×2, `Profile` ×2, `Board`, `Fest`, `Jam`) adopted it. `Preview.tsx:68-77` — the single highest-traffic view in the app — still hand-rolls its own `cancelled`-flag `useEffect` around `api.get(id, key)`, the exact pattern `useRemote` was built to replace.

**Target:** convert `Preview.tsx`'s fetch to `useRemote(() => api.get(id, key), [id, key])`, matching every other adopter. **Done.** Unlock still writes an overlay (`unlockedZine`) because `api.unlock` is a user action, not the initial fetch.

**Migration path:** single-view, self-contained change. `e2e/reader.spec.ts` already exercises `/z/:id` end to end (missing-issue fallback, locked/sealed states, passphrase gating, chain mode) — that's the regression net; no new test needed unless behavior actually changes.

---

## 9. The "remote value + local fallback" merge is duplicated five times

**Problem:** even with `useRemote` handling the fetch itself, four views hand-copy a second, near-identical `useEffect` on top of it that merges the remote result with a `localStorage` fallback when offline or errored: `Cork.tsx:24-31`, `Studio.tsx:43-50`, `Explore.tsx:24-45`, `Profile.tsx:74-96`. This is the same class of duplication §6 already fixed one layer down — it just grew back a layer up.

**Target:** a small hook layered on `useRemote`, e.g. `useRemoteWithFallback(fetcher, loadLocal, deps)` returning the merged value directly, so each view drops its second effect.

**Migration path:** write the hook once with its own test (mirrors how `useRemote` itself was introduced), then convert one view at a time — low risk, each conversion is independent and behavior-preserving, same migration shape §6 used.

**Done.** `useRemoteWithFallback` lives next to `useRemote` and returns `[value, setValue]`. Cork, Studio, Explore, Profile, Board, Mail, Fest, and Jam drop their second merge effect. Profile still copies a arrived user into editable bio/scene/notes fields; Mail still syncs the compose `to` field from the route. Preview stays on `useRemote` — it has no local fallback.

---

## 10. `Editor.tsx` mixes six concerns in one 587-line component

**Problem:** undo/redo history (`snapshot`/`remember`/`undo`/`redo`), global keyboard shortcut handling, drag-and-drop reordering plus scatter-mode positioning, block CRUD, share/clipboard actions, and photo-cutout upload all live in one component with nothing extracted to hooks — unlike `Preview.tsx`, which did pull its social logic into `useIssueSocial` (see item 11).

**Target:** extract at least undo/redo into its own hook (e.g. `useHistory`) as the first, most self-contained cut — the functions are already named and bounded (`snapshot`/`remember`/`undo`/`redo`), making it the lowest-risk starting point. Keyboard shortcuts and drag/scatter positioning are reasonable follow-ups once the pattern is proven, not required in the same PR.

**Migration path:** one concern at a time, each its own PR, each behavior-preserving. `e2e/studio.spec.ts` already covers undo/redo, keyboard shortcuts (`Meta+Z`, `Meta+Shift+Z`, `Backspace`), and drag/scatter — existing regression net, no new tests required unless the extraction changes an edge case.

---

## 11. `useIssueSocial.ts` has no test coverage

**Problem:** at 308 lines, `useIssueSocial` is the largest and most logic-dense hook in `src/lib/` — it backs most of `Preview.tsx`'s business logic (margins, archive, run, bag, watch state) via six independent hand-rolled fetch effects plus several imperative `.catch(catchBackground)` calls — and has zero dedicated tests. Every other safety-relevant module added this cycle (`shape.ts`, `catch.ts`, the reducer's `assertDev` invariants) shipped with tests; this one predates that discipline and was never backfilled.

**Target:** add `useIssueSocial.test.ts`. This requires a hook-testing utility not currently a devDependency (the project's existing tests are either pure-function unit tests or full HTTP integration tests via Hono's `app.request` — nothing renders a hook in isolation yet). Evaluate `@testing-library/react` (already implied by `happy-dom` + `react`/`react-dom` being present) before reaching for a heavier dependency.

**Migration path:** lowest priority of this group — it's additive test coverage, not a behavior change, and the dependency question needs a decision before the first line of test code. Do items 8–10 first; revisit this once there's a second hook that would benefit from the same test setup, to justify the new tooling.

---

## 12. The migration runner swallows errors too broadly

**Problem:** `server/migrate.ts:53-67` (`execSql`) now silently continues past *any* error matching `/duplicate column name|no such table/i`, repo-wide. It was broadened to patch one Fly.io incident (a deployed volume missing schema `0001_init` should have applied), but the fix — `0003_legacy_columns.sql`, which re-declares all 22 `CREATE TABLE IF NOT EXISTS` statements and every `ALTER TABLE ADD COLUMN` already in `0001_init.sql` — combined with the now-global error swallow means a genuinely broken future migration (a typo'd table or column name) fails silently instead of loudly, undermining the numbered-migration framework's original guarantee. `migrate.ts:47` also hardcodes a one-off `if (id === '0002_scatter' &amp;&amp; !hasTable(db, 'zines')) continue` special case inside the runner itself.

**Target:** narrow the swallowed-error matching back down to be migration-specific rather than global — e.g., a small per-migration allowlist of "this exact error is expected here" rather than a blanket regex applied to every migration that ever runs. Express the `0002_scatter` special case as an idempotent guard inside that migration file (or drop it now that `0001_init`/`0003_legacy_columns` cover the same ground), not as a conditional in the runner.

**Migration path:** the most sensitive item in this group — it touches the live Fly deploy path. Test against a copy of the pre-`0003` "legacy" schema shape (the exact scenario `0003` was written for) to confirm the tightened runner still applies cleanly, before narrowing the swallow. Don't touch `0001_init.sql` or `0003_legacy_columns.sql` themselves — they're applied history; fix the runner's handling going forward only.

---

## 13. Single-stage `Dockerfile` ships unused devDependencies

**Problem:** `Dockerfile` runs plain `npm ci` (not `--omit=dev`) and its `CMD` runs the server via `tsx` directly rather than a compiled/pruned output — single stage, nothing removed. The resulting image carries `typescript`, `vite`, `vitest`, `playwright-core`, `puppeteer-core`, `oxlint`, `stylelint`, `concurrently` (~70MB combined) plus the `python3`/`make`/`g++` toolchain installed to compile `better-sqlite3`'s native addon, none of which the running server needs.

**Target:** a multi-stage build — a builder stage with the full dependency set (needed to compile `better-sqlite3` and run any build step), and a runtime stage that does `npm ci --omit=dev` and copies over only what `server/` actually imports (confirmed: `src/lib/*` only — never `src/components`, `src/views`, `src/store`, or `src/styles`), dropping the build toolchain from the final image.

**Migration path:** moderate diff, no behavior change to the running app — verify with `docker build` followed by hitting `/api/health` against the built image locally before considering it done. Independent of every other item here.

---

## 14. CI/tooling housekeeping

Four small, independent, low-risk items — good candidates to bundle into one PR or pick off individually when touching nearby files:

- **`ci.yml` and `pages.yml` duplicate identical checkout/setup-node/`npm ci` boilerplate** with no composite action — and already drifted once (lint was added to `ci.yml` without `pages.yml` following, until Round 2's correctness pass closed that gap). A `.github/actions/setup/action.yml` composite action would make a future Node-version or cache-strategy change apply once instead of needing to be hand-applied everywhere.
- **`deploy-api.yml` pins `superfly/flyctl-actions/setup-flyctl@master`** — a floating branch reference, the only unpinned action among the four used across all three workflow files (everything else is pinned to a major-version tag: `@v5`, `@v4`). Pin it to a version tag.
- **`package.json` has a dead `allowScripts` field** (`"allowScripts": { "better-sqlite3@13.0.3": true }`) — not a real npm config key (that's a pnpm concept; this project uses npm, confirmed by `package-lock.json`). Has no effect; safe to remove.
- **No `actions/cache` for Playwright's browser binary in `ci.yml`** — `npx playwright install --with-deps chromium` re-downloads on every run. Caching keyed on the Playwright version would speed up every CI run.

---

## What's deliberately not in this plan

- **Auth/session hardening** (login rate limiting, token rotation) — shipped 1.4.1.
- **A full CSS Modules or CSS-in-JS migration** — the actual problem (file size, reviewability, the class of bug that slipped through) is solved by §5's split + lint step without paying for a bigger scoping migration.
- **A full tRPC/GraphQL/codegen layer** — §7 gets most of the safety (compile-time shape checking) at a fraction of the migration cost; revisit only if the hand-written contract file itself becomes unwieldy.
- **Splitting `ZineContext.tsx`** (371 lines: local persistence, auth/session, all zine mutations, notices, follow graph, in one provider with a 20-member `Store` type and no test coverage of the provider layer itself) — observed in Round 2, not recommended as an action. Scoping it into separate contexts (auth, notices, zines) is a real architectural call, not a mechanical refactor, and there's no measured evidence yet (e.g. unnecessary re-renders) that the current shape is actually causing a problem rather than just being long. Revisit if that evidence shows up.
- **Splitting `Landing`/`Studio` out of the eager bundle** (`src/App.tsx:5-6` — the only two routes not `React.lazy`-split, and the direct cause of the largest build chunk) — observed in Round 2, not recommended. Eager-loading the near-certain first screen to avoid a loading flash on first paint is a defensible, common trade-off, not clearly a mistake.
