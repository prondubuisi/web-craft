# sg — Next changes

_Merged from `sg1.md` (repo root), `docs/sg2.md` (readable slice), and `docs/sg3.md` (Tiger-style safety). Implementation target: support the surface you have, not another feature round._

## How the two notes compare

Both notes looked at v1.3.0 on `develop` after architecture plan 1–7. Both say the same diagnosis in different words: **stop adding zine nouns; the surface is already bigger than a first visit can hold.**

| | sg1 | sg2 |
| --- | --- | --- |
| Identity | Two promises: maker (collage studio) vs scene (mail-swap). Compatible, not the same product. | One identity: collage + mail-swap + preservation + client-first + paper-object feel. |
| What not to do | No round 7. No SaaS (payments, algo rank, video). | No more `IMPROVEMENTS.md` idea rounds until the surface is supported. |
| Highest leverage | Collapse chrome so the maker promise is visible again. | In-app onboarding — there is no tour, glossary, or help in `src/`. |
| Product UX | Nav to Cover / Studio / Stream. Pages demo must tell the truth when the API is down. Thin the reader. Rewrite the cover. | Consolidation of overlapping verbs (bag vs shelf vs archive; five ways to respond). Qualitative, not a rewrite. |
| Maker depth | Photos that travel, phone cutout, optional scatter page. Later (1.5.0). | Not the next move. |
| Engineering | Auth rate limit + token rotation. Finish `contract.ts`. Group `Zine` fields. CHANGELOG. | Migration discipline (`0002_` on the next schema change). Further CSS split. `deploy-api.yml` must stop being a routine red X. |
| Sequence | 1.4.0 readable → 1.4.x reader + auth → 1.5.0 maker depth. | Support the surface you have before inventing more of it. |

They disagree on *first cut*, not on destination. sg1 starts with chrome and cover. sg2 starts with a glossary. This file takes both as the same release: **make the app readable**.

## Status

Readable slice and maker-depth shipped in **1.4.0**. Auth, `social/` split, checkout-into-bag, reader INK, and the 60 Playwright stories shipped in **1.4.1**. Fly leftover-schema fix is **1.4.2**. Playwright in CI is **1.4.3** (sg3 item 3). Hook/provider split and Actions v5 are **1.4.4**. The sg3 safety pass is **1.4.5**: `mergeZines`, `assertZineShape`, reducer invariants, and the client catch sweep. **1.4.6** drops leftover local demo copies that are not yours (two `sunday market` rows with different ids).

**Still open from sg3 (safety, not features):** none as a dedicated pass. Server `req.json()` parse-or-null stays; leftover `catch {}` in storage/share/api are parse fallbacks, not user actions.

Insert is an upsert; uniqueness is asserted on the result, not as a collision error.

Do not start a seventh product round. `docs/sg3.md` stays the observation note; this file is the live list.

**Shipped in 1.4.0 (maker depth + leftover housekeeping, no auth):**

- Photos that travel, or a clear refusal when they will not
- Camera → cutout → sticker
- Optional scatter layout
- Extract DropModal and issue-meta from the editor
- Group `Zine` metadata types
- `0002_scatter` so the next schema change uses the migration runner
- Fold/landing CSS split
- Playwright user-story suite

Hosted API is live (`https://zineverse-api.fly.dev`). Bag / shelf / archive stay three stores. Checkout writes the bag. Reader ink groups blurbs + letters without deleting either form.

## What this pass implements

1. **Freeze the feature surface.** Note at the top of `docs/IMPROVEMENTS.md`: history, not a vacancy. No new blocks, routes-as-mechanics, badges, or notice kinds.
2. **Collapse the topbar** to Cover, Studio, Stream, Help. Letters + `@handle` only when signed in. MAIL stays (local notices exist). Desk / Board / Fest leave the persistent nav; Stream links them when the API is up.
3. **Offline honesty.** When `online` is false, a single line says this is a local studio (snapshots + print). Community surfaces are not offered as if they work.
4. **Cover rewrite.** Lead with make / print / pass / remix. Show one seeded issue. Scene in one sentence. Drop the widget zoo and the Squarespace/Wix/Webflow/Framer/Notion table.
5. **First-visit primer + `/help`.** Non-blocking comic strip on Cover; persistent glossary in the app’s voice. sg2’s highest-leverage item.
6. **Thin the reader.** Always: like, remix, print, flip/scroll, bag, edit. “More on this issue” holds snapshot, fold, stock, nominate, watch run, checkout, claim, b-side, corpse. Passphrase theater is labeled when the API is down.
7. **Housekeeping.** `CHANGELOG.md`. `deploy-api.yml` skips cleanly without `FLY_API_TOKEN` (not a failure). STATUS + README + sitemap + `scripts/verify.mjs` match the new chrome.

Routes `/board`, `/fest`, `/cork`, `/mail` stay. Nothing is deleted. The front door gets smaller.
