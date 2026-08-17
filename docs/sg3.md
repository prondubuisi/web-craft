# sg3 — Tiger style pass

_Observed: 2026-08-17, against `develop` at `1.4.1` (post auth-hardening, `social/` split, 60-test Playwright suite). Not a feature round — see `sg.md`'s freeze note, still in effect. This is a discipline pass, read through [Tiger Style](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), TigerBeetle's engineering philosophy: safety first, performance second, developer experience third, in that order, because a fast wrong answer is worse than a slow one and a fast wrong answer nobody can debug is worse still._

_Item 1 (`replaceZines` → `mergeZines`, action removed) landed after 1.4.4. Item 2 (`assertZineShape`) landed after 1.4.4. Item 3 (Playwright in CI) shipped in 1.4.3. Item 5 (reducer invariants) landed after 1.4.4. Item 4 is started (`catchBackground` / `actionError` in the store and reader social). The live list is `sg.md`._

## What Tiger Style means for this app, not TigerBeetle's

TigerBeetle is a financial database written in Zig with no heap allocation after startup and fixed-size buffers everywhere, because a single-node crash or a silently wrong balance is the worst thing that can happen. Zineverse is a browser app backed by `localStorage` and an optional SQLite API; the literal rules (static memory, no allocation after init, fixed-size arrays) don't transfer and shouldn't be forced. What transfers is the reasoning underneath three pillars:

1. **Safety.** Assert your assumptions instead of hoping they hold. Handle every case explicitly — Tiger Style calls the unhandled ones "negative-space programming": code that's only correct because of what it *doesn't* do, which is invisible until someone does the thing you didn't plan for. Fail loudly and specifically. Never let a caught error look like success.
2. **Performance.** Batch what can be batched. Know which resource is actually the bottleneck before optimizing. Don't guess.
3. **Developer experience.** Small functions, narrow interfaces, names that say what a thing is for. Consistency beats cleverness. A file someone can hold in their head is safer than a clever one.

Applied here, in priority order: **safety first** means the biggest win in this codebase is closing the gap between "TypeScript says this is a `Zine`" and "this was actually checked at runtime" — because that gap is exactly where a real bug is sitting right now (below). Performance is mostly already fine for an app this size. Developer experience is the two largest view files, not a rewrite.

## Current state, read for discipline, not features

Facts checked against the repo today, not assumed from prior `sg*` docs:

- **9,657 lines of TS/TSX in `src/`**, up from ~8,800 at the last `sg` reading. Largest files: `Editor.tsx` (586), `Preview.tsx` (480), `Blocks.tsx` (464), `Inspector.tsx` (323), `Profile.tsx` (361).
- **Zero runtime assertions anywhere in `src/` or `server/`.** `grep -rn "assert(\|invariant("` outside test files returns nothing. Every invariant in this app — "a zine always has an id," "the reducer never drops a zine a user just created," "a decoded snapshot has the fields `Blocks.tsx` will render" — is enforced by nothing except the type checker, which only runs at build time and has no opinion about a `JSON.parse()` result or a `fetch()` response.
- **No runtime validation library** (`zod`/`yup`/`ajv`/`valibot` — none in `package.json`). Every place external data enters the app crosses that boundary as a bare cast: `JSON.parse(text) as Zine` in `Studio.tsx`'s import handler, checked only for truthy `.blocks` and `.title`; `decodeShare()` for `/s#…` snapshot payloads, which are attacker-controlled by construction (anyone can hand-craft a hash); every `api.*()` response in `src/lib/api.ts`.
- **39 silent-failure catch blocks**: 19 empty `catch {}` and ~20 `catch(() => undefined)`, across `src/` and `server/`. Each one means "if this fails, proceed as if it didn't." Some of these are correct fallbacks (offline-first is the design), most don't distinguish "expected, we're offline" from "unexpected, something broke."
- **One of these gaps is a live, reproducible bug, not a hypothetical.** Verified today by rerunning the Playwright suite (`npx playwright test --repeat-each=2`, plus isolated reruns): `studio.spec.ts` → `14 export import delete` fails roughly 50–60% of the time. Root cause, traced in `src/store/ZineContext.tsx:97–131`: the mount effect that syncs local state with the server dispatches `{ type: 'replaceZines', zines: [...localMine, ...stream.zines] }`, and `reducer.ts:138–139` implements `replaceZines` as a blind overwrite — `return { ...state, zines: action.zines }`. If a user creates or imports a zine while that mount-time fetch is still in flight, the effect's `localMine` snapshot can miss it, and the overwrite silently deletes a zine the user just made. **The safe primitive already exists in the same reducer** — `mergeZines` (`reducer.ts:140–143`) upserts by id instead of replacing — it's just not the one the effect calls. This is textbook negative-space programming: the code is correct only because nobody happened to race it during review, and the invariant it depends on ("the sync effect never runs concurrently with a local write") was never written down, asserted, or tested until an e2e suite happened to flake on it.
- **CI does not run `npm run test:e2e`.** `.github/workflows/ci.yml` runs lint, unit tests, and build — never Playwright. That's exactly why the bug above shipped in 1.4.1's changelog as "60 [passing] user-story tests" undetected. `sg.md`'s own roadmap already names this as `1.4.3` — this pass agrees it's overdue, not new information.
- **What's already right, worth naming so it doesn't get "fixed" by accident:** `queueUpsert` (`ZineContext.tsx:87–95`) debounces writes to the API by 450ms per zine id — that's the batching pillar done correctly, already. `useRemote` centralizes the online-fetch-with-local-fallback pattern instead of repeating it per view. The reducer itself, `mergeZines` included, is a small (146-line) pure function — exactly the shape Tiger Style wants for the part of a codebase that most needs to be provably right, and it already mostly earns that shape.

## Diagnosis

The project has already done the hard part of Tiger Style's performance and developer-experience pillars without naming them: batched writes, a small pure reducer, route-level code splitting, a CSS split. What's missing is the safety pillar's specific discipline — **assert what you assume, validate what crosses a trust boundary, never let a failure look like a success** — and the gap is not evenly spread. It's concentrated at exactly three seams: where external JSON becomes a `Zine`, where a background sync effect writes over local state, and where a `catch` block decides silence is an acceptable response. Those three seams are small, ownable, and don't require adopting a validation library or rewriting the state layer to close.

## Suggested changes

Ordered by leverage, not by size.

### 1. Fix the `replaceZines` → `mergeZines` bug

This is not a style preference, it's a live data-loss bug with a reproduction in hand (`npx playwright test -g "14 export import delete" --repeat-each=3` fails roughly 1 time in 3). Swap both `replaceZines` call sites in `ZineContext.tsx` (lines ~116 and ~122) to dispatch `mergeZines` instead. Then delete the `replaceZines` action type and its reducer case entirely — if overwriting the whole array is never actually the safe operation, the type shouldn't exist to be reached for by accident next time. The existing flaky test becomes the regression check; it should go from ~50% failing to 0% once this lands.

### 2. Validate at the trust boundaries, by hand, not with a library

Two call sites take arbitrary external bytes and cast them straight to `Zine`: `Studio.tsx`'s JSON-import `onChange` handler, and `decodeShare()` for `/s#…`. Write one small `assertZineShape(value: unknown): Zine` function (throwing with a specific message per missing/wrong-typed field, not a generic "not a zine") and call it at both sites instead of the current truthy-check-then-cast. This is the negative-space fix: today the code is correct only for well-formed input; a malformed or partially-truncated hash currently either silently mis-renders in `Blocks.tsx` or throws somewhere unrelated to the actual problem. A validation library is not warranted for two call sites — add one if a third and fourth show up.

### 3. Wire `test:e2e` into CI

Already on the roadmap as `1.4.3` in `sg.md`; this pass just adds the reason it shouldn't slip further: a rule you don't enforce in CI isn't a rule, and #1 above is proof — it shipped in a tagged release specifically because nothing ran the suite that would have caught it. Needs `npm run dev` (Vite + the SQLite API) up before `playwright test`; treat server-readiness and SQLite-file isolation between CI runs as the actual work here, not a one-line addition.

### 4. Make silent catches say something

Not a rewrite — a sweep, doable incrementally when touching each file anyway. For each of the 39 empty/swallowing `catch` blocks, ask: is this guarding a background sync (fine to stay quiet, offline-first is the design) or a user-initiated action (claim a handle, drop an issue, send a letter)? For the second kind, the user currently gets no signal that anything happened at all. At minimum, distinguish the two kinds in the code (a comment or a named helper like `catchBackground` vs `catchAction`) so a future reader doesn't have to guess which silence is intentional.

### 5. Put the reducer's correctness in writing

`reducer.ts` is the one place in this app that's already reducer-pure and small enough to fully reason about — exactly what Tiger Style means by asserting the state machine. Add a handful of dev-mode invariant checks at the top of the reducer function (no perf concern at this scale): every dispatched zine has a non-empty `id`; `insert` never collides with an existing id; `mergeZines`'s incoming list never contains a duplicate id. These are cheap, and they turn "this reducer looks right" into "this reducer asserts it's right," which is the whole point.

## What not to do

- Don't adopt `zod` or any schema library for two validation call sites — write the narrow check by hand, matching the incremental spirit `sg2.md` already set for `contract.ts`.
- Don't chase TigerBeetle's literal rules that don't apply here — no fixed-size buffers, no "no allocation after startup," no rewriting `localStorage` access into a static arena. The browser's GC and dynamic collections are the right tool for this app's scale.
- Don't turn this into an assertion-everywhere pass overnight. Start at the reducer and the two trust boundaries named above; expand only if a new bug shows the same negative-space shape.
- Don't let this become round 7. `sg.md`'s freeze note still holds — this is entirely inside "support the surface you have," not a new mechanic.

## Suggested sequence

1. **Now, small, ships alone:** `replaceZines` → `mergeZines` (#1). It's a one-line-per-call-site fix with an existing failing test as proof it's needed and proof it's fixed.
2. **`1.4.2` or folded into it:** the two trust-boundary validators (#2) — small, touches the same import/snapshot code paths `sg.md`'s `1.4.2` Fly-schema work is already near.
3. **`1.4.3`** (already named in `sg.md`): Playwright in CI (#3), now with a concrete example of the bug class it exists to catch.
4. **Ongoing, opportunistic:** the silent-catch sweep (#4) and reducer invariants (#5) — do them when touching the relevant files for other reasons, same incremental discipline as the rest of this codebase's recent history.

## How this was read

Sources: `sg.md`, `sg1.md`, `docs/sg2.md` (for voice, format, and what's already been decided), `docs/STATUS.md`, `CHANGELOG.md`, `package.json` (`1.4.1`), `src/store/ZineContext.tsx`, `src/store/reducer.ts`, `src/views/Studio.tsx`, `src/views/Share.tsx`, `.github/workflows/ci.yml`, and a live rerun of `npx playwright test` (plain, `--repeat-each=2`, and three isolated reruns of the one failure) against `npm run dev` today, which is where the `replaceZines`/`mergeZines` finding came from — not a static read of the code alone. No product behavior was changed by this pass; it's an observation and proposal, same as `sg1`/`sg2` were before `sg.md` merged them.
