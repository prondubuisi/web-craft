# Architecture Improvement Plan

_Compiled: 2026-08-14, against v1.1.0. Implemented on `develop` 2026-08-14._

This is a restructuring plan for the seven issues raised in the architecture critique of the same date. **Authentication/session security** (login rate limiting, token rotation) shipped in 1.4.1 — see `docs/STATUS.md`. Everything else from the critique is covered below.

Each item states the problem in one line, the target structure, and a migration path that doesn't require a big-bang rewrite — every one of these can land as its own incremental PR against `develop`, in the priority order given.

## Priority order

1. Migrations framework (unblocks safely touching schema for everything else) — done
2. Split `server/app.ts` into route + service modules — done
3. Server-side test coverage at the service layer — done
4. Code splitting on routes — done
5. Split `global.css` by domain + add a CSS lint step — done
6. Formalize the "online-only feature" data-fetch pattern — done
7. Shared client/server request-response types — done (incremental; auth/board/fest + `api.ts`)

Items 4 and 5 have no dependency on anything else and can be done anytime, including in parallel with 1–3.

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

## What's deliberately not in this plan

- **Auth/session hardening** (login rate limiting, token rotation) — shipped 1.4.1.
- **A full CSS Modules or CSS-in-JS migration** — the actual problem (file size, reviewability, the class of bug that slipped through) is solved by §5's split + lint step without paying for a bigger scoping migration.
- **A full tRPC/GraphQL/codegen layer** — §7 gets most of the safety (compile-time shape checking) at a fraction of the migration cost; revisit only if the hand-written contract file itself becomes unwieldy.
