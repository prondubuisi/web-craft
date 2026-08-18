# Issues — later amendments

_Logged 2026-08-18 from a live `npx playwright test` against `http://127.0.0.1:5173/` (Vite) + `http://127.0.0.1:8787` (API). 74 passed in 1.6 minutes. Not a feature round — see `sg.md` freeze. These are suite and support bottlenecks to amend when touching the files anyway._

## Live run (2026-08-18)

| | |
| --- | --- |
| Result | 74 passed, 0 failed, 0 skipped |
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
| 2.9s | `5 help glossary lists every term` | Walks 22 `dt`s then three hops already covered in 5b / 40. |
| 2.8s | `29 jam` / `30 scene hop` | Extra navigations; scene hop is three `goto /explore`. |

Everything else is under ~2.4s. Studio stories are cheap (mostly <700ms).

## Later amendments

### Suite cost

1. **One worker is the wall-clock bottleneck.** `playwright.config.ts` is `workers: 1` + `fullyParallel: false` because board / mail / cork / SQLite and `localStorage` are shared. Parallel workers would race pins, letters, and claims. Amendment: isolate SQLite per worker (temp file + `DATABASE` env) and namespace `localStorage` keys, then raise workers to 2–4.

2. **Help is tested three times.** `5`, `5b`, and snapshot `40 help CTAs` all walk glossary links. Fold hops into one story; keep `40` as a one-line smoke or delete it.

3. **Nav chrome loops eight routes.** Same four links + “no Board” on `/`, `/studio`, `/help`, `/explore`, `/board`, `/fest`, `/cork`, `/mail`. A helper that asserts chrome once per path is fine; the cost is the eight cold loads. Amendment: hop via the topbar instead of `goto`, or assert chrome only on `/` + one scene route + `/studio`.

4. **`claimHandle` waits 15s for “Checking API”.** Health is usually back in <200ms. The 15s ceiling is leftover from Fly wake. Amendment: drop to 3–4s locally; keep 15s only when `CI` or a `SLOW_API` flag is set. Two-handle stories (34, 35, 36) pay this twice.

5. **Two-browser social stories are one pile.** 34 / 35 / 36 each open a second context and claim a second handle. Amendment: one shared “two handles” fixture for the file, or split “API down local letter” from “two-handle postcard” so the empty-state path stays cheap.

6. **Offline stories pay the health wait twice.** `forceOffline` + `reload` (31b, 33b, sample-issue, cover 3) sit through `checking` → `API offline` on every reload. Amendment: a helper that plants `apiReady` / `online: false` in `localStorage` before first paint, or stub `/api/health` as 503 without aborting every `/api/**` mid-flight.

7. **Pixel floors in Help.** `5c` asserts `< 180px` / `< 220px` / `>= 180px` on bounding boxes. Fonts or a 390-width wrap can flake this. Amendment: assert computed `min-height` on `.help-entry` vs `.comic-cell`, not layout height.

8. **No retries.** Config has `trace: 'off'` and no `retries`. A single clipboard miss (`37`) skips rather than retries. Amendment: `retries: 1` in CI only, `trace: 'retain-on-failure'`.

9. **Silent skips hide a down API.** `claimHandle` returns `null` and several stories `test.skip`. CI would still go green if Fly/local API is dead. Amendment: fail (not skip) when `CI` is set and `/api/health` is down.

### Support, not product

10. **Clipboard snapshot path is environment-tied.** `37` skips when the Chrome channel will not yield a hash. Amendment: build the `/s#` token in-process with `encodeShareToken` and only use the clipboard as a bonus assertion.

11. **Export/import used to flake ~50%.** sg3: `replaceZines` vs `mergeZines`. Fixed in 1.4.5; `14 export import delete` is now 533ms and green. Keep it in CI. Do not reintroduce a blind replace.

12. **Rate limit vs parallel claims.** Login/register is 8 / 10 minutes per handle. Unique `pw…` handles dodge it today. A parallel suite (item 1) must keep unique handles or the second worker gets 429s.

## Not issues

- First-visit MAIL being quiet is intended (sg6 tone, shipped).
- One worker is correct until item 1 lands — do not flip `workers` without SQLite isolation.
- Do not add a seventh feature round to “use” this list.
