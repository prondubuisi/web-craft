# Issues — later amendments

_Logged 2026-08-18 from a live `npx playwright test` against `http://127.0.0.1:5173/` (Vite) + `http://127.0.0.1:8787` (API). First pass: 74 in 1.6 min. Suite is now 77 (story 40 folded). Not a feature round — see `sg.md` freeze. These are suite and support bottlenecks to amend when touching the files anyway._

## Live run (2026-08-18)

| | |
| --- | --- |
| Result | 74 passed then, 77 now (40 removed) |
| Wall time | 1.6 min, 1 worker |
| Server | `npm run dev` — web `:5173`, API `:8787` |

Slowest stories (the suite's actual cost):

| Time | Story | Why it is slow |
| --- | --- | --- |
| 5.6s | `nav chrome is on every top-level route` | Eight full `goto`s. Same chrome asserted eight times. |
| 5.0s | `5b help hops every named resource` | Six `/help` reloads, one per hop. |
| 4.5s | `34 letters and postcards` | Two browsers, two `claimHandle`s, API mail. |
| 4.2s | `35 profile wall watch guestbook shelf` | Claim + explore + watch + guestbook + stock. |
| 3.0s | `35b profile series, sealed, empty wall` | Ends with a second `claimHandle` for the empty-wall path. |
| 3.0s | `37 good snapshot unpacks` | Clipboard + two `/s#` unpacks. |
| 2.9s | `5 help glossary lists every term` | Walks every `dt` then three hops. 40 is gone; 5b still covers the other named hops. |
| 2.8s | `29 jam` / `30 scene hop` | Extra navigations; scene hop is three `goto /explore`. |

Everything else is under ~2.4s. Studio stories are cheap (mostly <700ms).

## Later amendments

### Suite cost

1. **One worker is the wall-clock bottleneck.** **Shipped.** Each worker now spawns its own `tsx server/index.ts` on `8788 + workerIndex`, backed by its own temp-file SQLite (`e2e/fixtures.ts`, `PORT` / `DATABASE_PATH`). `vite.config.ts`'s `api-proxy` plugin routes `/api` to that port when a request carries `x-e2e-worker`; the `context` fixture sets that header (scoped to `/api` only — `setExtraHTTPHeaders` broke Google Fonts CORS preflight the first time). Contexts made directly from `browser` (two-desk / stranger stories) route the same way via `routedContext`/`openSecondDesk`. `localStorage` needed no namespacing — Playwright already isolates it per browser context. `workers: 4` locally, `2` in CI (4 vCPU runners). Full suite: 1.6min → ~25s locally, confirmed stable across repeated runs and under simulated CI (2 workers, bundled Chromium, retries).

2. **Help is tested three times.** **Shipped.** Snapshot `40 help CTAs` is gone. `5` lists terms + studio/stream/board; `5b` covers the remaining hops.

3. **Nav chrome loops eight routes.** **Shipped.** Cover asserts chrome, then hops Studio and Stream via the topbar. Not eight cold `goto`s.

4. **`claimHandle` waits 15s for “Checking API”.** **Shipped.** `HEALTH_MS` is 4s locally and 15s when `CI` is set. Two-handle stories still claim twice.

5. **Two-browser social stories are one pile.** **Shipped.** `34` is offline empty + postcard cap; `34c` and `36` share `openSecondDesk` / `requireHandle`.

6. **Offline stories pay the health wait twice.** **Shipped.** `forceOffline` fulfills `/api/**` as 503 JSON instead of aborting the socket.

7. **Pixel floors in Help.** **Shipped.** `5c` asserts computed `min-height` (`auto`/`0px` on `.help-entry`, `>= 180px` on primer `.comic-cell`).

8. **No retries.** **Shipped.** `retries: 1` when `CI` is set; `trace: 'retain-on-failure'`.

9. **Silent skips hide a down API.** **Shipped.** `requireApi` / `requireHandle` / `claimHandle` throw in CI when the API is down; local runs still skip.

### Support, not product

10. **Clipboard snapshot path is environment-tied.** **Shipped.** `37` builds both hashes with `encodeShareToken`. Clipboard is no longer required.

11. **Export/import used to flake ~50%.** sg3: `replaceZines` vs `mergeZines`. Fixed in 1.4.5; `14 export import delete` is now 533ms and green. Keep it in CI. Do not reintroduce a blind replace.

12. **Rate limit vs parallel claims.** **Not an issue after item 1.** The rate limiter (`server/rateLimit.ts`) is an in-memory `Map` inside the API process; each worker's process is now separate, so buckets can't collide across workers. Unique `pw…` handles still avoid same-worker collisions as before.

## Not issues

- First-visit MAIL being quiet is intended (sg6 tone, shipped).
- Do not add a seventh feature round to “use” this list.
