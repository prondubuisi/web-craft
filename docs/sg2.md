# sg2 — Aims, Current State, and Suggested Changes

_Observed: 2026-08-14, against v1.3.0_

## Aims and goals

Per `README.md`, Zineverse's stated identity is: *"A playful, Spider-Verse-inspired zine builder. Pages are digital collage — block-based like Notion, maximalist like a printed comic."* The values threaded through the docs and the feature set itself are consistent and specific, not generic:

- **Mail-swap culture, not a marketplace** — stated verbatim in the Board section of the README. Nothing is monetized; scarcity mechanics (numbered runs, out-of-print) exist for feel, not for sale.
- **Preservation over popularity** — the Archive is explicitly nomination-based rather than a sort-by-likes list, mirroring real zine libraries (ZAPP, Denver Zine Library).
- **Client-first, server-optional** — the studio and issue data are meant to work with no account and no server at all; the API is additive sync, not a requirement.
- **Physical-object nostalgia** — fold-sheet printing with QR, riso/print-texture finishes, aging/wear, postcards, corkboards: the app keeps reaching for what makes a *paper* zine feel like an object, not just a webpage.

This is a coherent, well-differentiated identity. The suggestions below are about keeping the implementation matched to it, not about changing what it's for.

## Current state of development

Verified directly against the repo, not just the docs:

- **Version 1.3.0.** Five feature releases since the initial audit (0.9.0 → 1.3.0), each shipping through a real `feature/* → develop → release/*` git-flow, each with its own CI run.
- **Health: green.** `npm run build` (91 modules → 15 chunked bundles), `npm test` (114/114 passing across 19 files), and `npm run lint` (oxlint + stylelint, warnings only, no errors) all pass clean right now. CI on `main`/`develop` is green. The one exception is `.github/workflows/deploy-api.yml`, which has been failing on every push — almost certainly a missing `FLY_API_TOKEN` secret / unclaimed Fly.io app, not a code problem, but worth either fixing or muting so it stops reporting false alarm failures.
- **The architecture plan (`docs/ARCHITECTURE_PLAN.md`) is fully implemented, and it's real:** `server/app.ts` dropped from 1,651 lines to 46 (now just mounts route modules); routes live in `server/routes/*.ts`, business logic in `server/services/*.ts` with their own unit tests (`jams.test.ts`, `notify.test.ts`, `publish.test.ts`); schema now runs through `server/migrations/0001_init.sql` via `server/migrate.ts` instead of ad hoc `ALTER TABLE` checks; every route in `App.tsx` is `React.lazy`-split (confirmed in the build output — `Preview`, `Editor`, `Board`, `Fest`, etc. are now separate chunks); `global.css` (2,247 lines) is now a 10-line import list pulling in `tokens.css`, `base.css`, `editor.css`, `reader.css`, `board.css`, `mail.css`, `jam.css`, `fest.css`, `cork.css`, `print.css`, with `stylelint` wired into `npm run lint`; a `src/lib/contract.ts` exists for shared client/server types (partial coverage — auth/board/fest so far, per the plan doc's own note).
- **Scale:** 13 views, ~8,000 lines of client TS/TSX, ~2,400 lines of server TS, 25 database tables, and by now a very large vocabulary of named mechanics — vibes, drops, chains/corpses, b-sides, distro shelves, bags, blurbs, marginalia, dedications, tear-out replies, errata, compilations, loans, postcards, passport stamps, fest tables/sits, jams, the archive, the corkboard, swapped trades, series watches. Every one of them is real and tested, not vaporware — but that's a lot of surface for what started as a block-based collage editor.

## Suggested changes

Unlike the last several rounds of `docs/IMPROVEMENTS.md`, the honest next move here isn't more feature ideas — four rounds of research already covered that ground thoroughly, and the project has independently kept shipping beyond even that list (1.2.0 and 1.3.0 introduced errata, compilations, dedications, tear-out replies, and more, none of which came from this doc). The gap that actually matters now is between **feature surface** and **everything else needed to support it**.

1. **Add in-app onboarding — this is the biggest gap.** There is no tour, tooltip, glossary, or help affordance anywhere in `src/` (`grep`-confirmed empty). A first-time visitor to the live Pages demo lands cold on a vocabulary of "fest tables," "cork pins," "jam," "archive nominations," "b-sides," "chains," "distro shelf," "passport stamps" with nothing in-product to explain any of it — only the README does, and README readers are developers, not the app's actual audience. Recommend a lightweight, non-blocking first-visit primer (a dismissible comic-panel-styled intro on `/`) plus a persistent `/help` or glossary route explaining each named mechanic in the app's own voice. This is the single highest-leverage change available: every other item on this list improves something that already works; this one fixes the thing a new visitor experiences first.

2. **Take a consolidation pass before the next feature round.** 25 tables and 13 routes for a "block-based collage editor" is a lot of conceptual weight, and several mechanics now sit close enough to overlap in intent (bag vs. distro shelf vs. archive; postcards vs. mail letters; fest sits vs. board swaps; dedications vs. tear-out replies vs. blurbs vs. marginalia vs. letters-to-the-editor — five distinct ways to respond to an issue). None of these are wrong individually, each has real README-documented purpose, but nobody has yet stepped back to ask which of them readers actually reach for versus which are novelty that adds maintenance weight without proportionate use. Worth doing before adding a "Round 5" of new ideas: instrument or just qualitatively review which surfaces get used, and consider merging or retiring the weakest overlaps.

3. **Confirm the migration discipline actually holds under a real schema change.** `server/migrations/` currently has exactly one file (`0001_init.sql`) — the retroactive baseline captured when the architecture plan landed. No schema change has happened since, so the new numbered-migration pattern is untested in practice; the 1.2.0/1.3.0 features that needed new columns went in *before* the framework existed, under the old ad hoc `ALTER TABLE` approach. Treat the next feature that needs a schema change as a checkpoint: confirm it actually produces a `0002_....sql` file rather than reverting to inline `ALTER TABLE` under release-day time pressure.

4. **The CSS split is a real improvement but two files are still large.** `reader.css` (820 lines) and `base.css` (680 lines) are much smaller and more legible than the old 2,247-line monolith, but they're still big enough that a subtle bug could hide in either. Not urgent — this was a genuine fix to the actual problem (file size + reviewability) — but worth a further split (`reader.css` in particular mixes Preview, FlipReader, and print/fold concerns) if either file keeps growing.

5. **Finish the client/server contract types incrementally.** `src/lib/contract.ts` currently covers auth/board/fest per the architecture plan's own notes, out of ~60 endpoints. Rather than a dedicated sweep, the natural path is to add a route's types to the contract file whenever that route is next touched for an unrelated reason — same incremental spirit as the rest of the plan.

6. **Small housekeeping:** get `deploy-api.yml` either working (add the missing Fly.io secret) or explicitly non-blocking, so a red X in Actions means something again instead of being routine noise.
