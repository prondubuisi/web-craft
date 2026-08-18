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

Readable slice and maker-depth shipped in **1.4.0**. Auth, `social/` split, checkout-into-bag, reader INK, and the 60 Playwright stories shipped in **1.4.1**. Fly leftover-schema fix is **1.4.2**. Playwright in CI is **1.4.3** (sg3 item 3). Hook/provider split and Actions v5 are **1.4.4**. The sg3 safety pass is **1.4.5**: `mergeZines`, `assertZineShape`, reducer invariants, and the client catch sweep. **1.4.6** drops leftover local demo copies that are not yours (two `sunday market` rows with different ids). **1.4.7** is chrome: MAIL and studio modals close with Escape, the phone nav wraps, and the topbar has its own Playwright suite. **1.4.8** waits for health before calling the API down. **1.5.0** is the consolidation observation (`docs/sg4.md`): Help names blurb, margin, dedication, and tear-out; the More sheet points at Help. **1.5.1** runs `assertBlocks` on API upsert and corpse pages, and batches list decoration. **1.5.2** loads the reader through `useRemote`. **1.5.3** finishes Round 2 items 9–14. **1.5.4** names create as make/new (`docs/sg5.md`). **1.5.5** sends cover make through `/studio?new=1`. **1.5.6** applies that vibe in studio create mode. **1.5.7** paints studio on first paint and remembers the cover vibe. **1.5.8** opens every named resource from Help and scene hops; empty lanes hop to another resource. `docs/sg6.md` items 1–5 shipped: ghost buttons use `--ghost-ink` / `--ghost-border`; Board's compose picker is `kind-picker` + “posting as”; Profile no longer doubles the vibe; Help glossary cards drop the 180px floor; Stream filters group into lane / vibe / sort / tag with vibe-tinted chips.

**Still open from sg3 (safety, not features):** none as a dedicated pass. Server `req.json()` parse-or-null stays; leftover `catch {}` in storage/share/api are parse fallbacks, not user actions.

**Honesty:** first paint says `checking` until `/api/health` returns. `local` / `API offline` only after a failed check — Pages no longer lies while Fly is waking up.

Insert is an upsert; uniqueness is asserted on the result, not as a collision error.

Do not start a seventh product round. `docs/sg3.md` stays the observation note; this file is the live list.

## After 1.4.8

The 1.4.x support pass is complete. Do not cut another 1.4.x patch unless CI is red or the live demo lies.

**1.5.0 shipped as observation, not a feature train.** See `docs/sg4.md`. Bag / shelf / archive stay. The five answer forms stay. Help and the More sheet name them. Do not merge stores. No 1.5.x follow-up unless CI is red, the live demo lies, or you open a new note.

`docs/ARCHITECTURE_PLAN.md` Round 2 is that note. **§8–14 done.** Incremental only when touching a file: `contract.ts` for that route; `0004_` on the next schema change.

`docs/sg5.md` is the first-visit honesty note: create is make/new; drop stays publish. Cover make uses `/studio?new=1`, not a silent `/edit` draft. Help terms and SceneLinks now open each named resource.

`docs/sg6.md` is a visual QA pass, read from running screenshots rather than code alone. Items 1–5 shipped. Seeded first-visit mail arrives already read (MAIL not hot; Letters has no "new" chip). Live Playwright 74/74 on 2026-08-18. Suite bottlenecks for later amendments: `docs/ISSUES.md`. Widget editor: tray lanes, slash arrows, inspector current-pick, Alt-move / ⌘D, Redo — no new block types. Widget language: recipes of ink/photo/tape/cut/pin/set/cite/holes; inspector Type retargets and carries overlapping attributes. Tray and Type picker filter by cut. Help names type and cut. `widgetLang.test.ts` covers the retarget engine (harvest/applyBag, id/type invariants, full retarget matrix). `docs/playwright-e2e-prompt.txt` and `docs/playwright-user-stories.txt` are removed — both were e2e bootstrap prompts, self-marked historical, cited nowhere, stale against the live 78-test suite.

**Incremental, when touching a file anyway (not a project):**
- Add the route’s types to `src/lib/contract.ts`
- Split `reader.css` only if it grows again
- The next real schema change is `0004_…`, not an inline `ALTER TABLE`

`assertBlocks` now also guards API upsert and corpse-chain pages. List endpoints decorate noms/claims in batch.

**Do not:** a dedicated silent-catch sweep of parse fallbacks; SaaS; a second client.

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
