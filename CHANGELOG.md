# Changelog

All notable changes to Zineverse live here. Versions match git tags.

## Unreleased

Make / New issue plants the vibe photo and the grain scrap on the first hero so Open the page already looks like collage. A heading and a picture is treated as a finished page. After Drop, the snapshot copies as the next step. The drop modal says a local desk stays in this browser until you claim a handle.

The cover’s finished issue now has Remix next to Read. After hours is the other person before anyone claims a handle.

Inspector samples can link across the page: same scrap on the page plants overlapping cuts on every widget that can hold them. Slash Shift+Enter does the same. No new block type. Playwright 10i–10k cover the link, the photo-only link, and remix → link → drop.

Slash and the tray now share that link. A sample hit has a page chip. Filter the tray by a cut and scraps appear; page plants the scrap on every widget that can hold it. Stories 10l and 10m.

`docs/sg7.md` shipped: empty studio wall and quiet community stream get a line; stream cards tint on hover; modals rise and sheets slide up, carved out of reduced-motion.

Claim studio is ghost on the desk; New issue stays the loud button. An empty watching lane hops to the whole stream or remix after hours before asking for a handle. Three more scraps — gutter notes, pass this, corner store — land in the existing sample library.

Reset demo now includes two studio toolkit issues: **the kit** walks all 17 widgets (samples, cuts, bind lane, a compilation slip of after hours) and **scatter floor** is an unpublished ham page with pinned scraps. Cover after hours is unchanged. An older saved studio is offered those two issues once, without wiping the desk. Cover and Help **Open the kit** open the issue itself. Help **Open scatter floor** opens the pinned draft.

Open the kit still edits the walkthrough. The editor says remix it to keep the original; Remix this kit forks a draft and leaves the seed on the wall. Studio cards tagged toolkit show a kit chip. An empty wall mentions reset demo.

A remix names the original. The editor and reader say remix of {title} and hop back when that issue is still on the desk. Studio cards mark remixes. Help already said credit stays — now the page does.

Drop prints the page from the modal. Fold sheet stays on Preview. Print CSS hides the editor chrome so the issue is what comes out. Studio puts toolkit walkthroughs after your issues and says so.

After hours and ghost notes are seeded the same way as the kit. Opening them from the wall offers Remix this page so the cover sample stays. Seeded cards sit at the end; yours come first.

More scraps in the existing library: leftover ink (drop when, heading picture, print pass, hold the click), cites (the margin, stranger on the L, this browser), sets (cover toc, pick link drop), cuts (lg, scribble, speed, three), pin positions for scatter, and vowels out holes. No tape scrap — there is no audio file. No new block type.

`docs/sg9.md` §3: `parseJsonColumn` is the one helper for tags and includes on a zine row. A bad page JSON still fails loud. §2: `zineFields.ts` is the edition list for row mapping and PUT extras. §1: `blockRecipes.ts` is the one table for create, harvest, apply, and validate.

Changing the page vibe restyles default art and default ink that still match the old vibe. New stickers, heroes, sfx, glitch, and quotes speak `VIBE_VOICE`. Five vibe-ink scraps. No sixth vibe. No new block type.

Craft scraps — stapler, still wet, fold sheet, kitchen table, cut glue leave, hand tilt, staple pin, tear here. Bind defaults say fold / staple / pass. Tear-out reads like perforated paper.

Make / New issue tilts the starter sticker with the hand-tilt scrap. A remix whose original is not on this desk hops to the stream instead of a guessed reader link. Editor and reader share that credit line.

## 1.6.0 — 2026-08-18

`src/lib/contract.ts` now names request and response types for every current `/api` route. Client `api.ts` methods `satisfies` those bodies; every `server/routes` module (and health / publish) returns a typed payload. Upsert no longer answers with a null zine if the row is missing after write.

Ghost buttons on the reader and in modals use ink on paper instead of cream-on-cream.

Board's compose kind picker is no longer a second `filter-bar`. It uses `kind-picker` and a “posting as” label.

Profile issue cards show the vibe once when there is no pen name.

Help glossary cards no longer force a 180px minimum height.

Playwright covers Board filter vs posting-as, penned vs unpenned profile bylines, remaining Help hops, and Help card height on a phone.

Stream filters group into lane / vibe / sort / tag clusters. Vibe chips use the same palette tint as the New issue picks.

First-visit MAIL and Letters arrive already read. The seeded @wobble / @inkstain notices and the @yuzu thread stay so those surfaces are not empty; the badge is not hot until something new happens.

`docs/ISSUES.md` items 2–10 shipped. Offline API is a fast 503. Help height asserts `min-height`. CI retries once and keeps failure traces. A down API fails CI instead of skip. Snapshot 37 no longer needs the clipboard.

Widget tray groups into page / ink / bind. Slash ↑↓ moves the highlight. Inspector marks the current size, layout, style, burst, voice, and press. Snap inserts after the selected block. Alt+↑/↓ moves a block; ⌘D duplicates. Redo sits next to Undo.

Slash stays open after insert so you can stack widgets from the keyboard. Stack and grid get add / drop last in the inspector. On a scatter page, arrow keys nudge a selected sticker or hero.

Paste or drop a photo onto the page to make a sticker. `]` / `[` tilts a selected sticker. Contents can pull headings. Blackout can clear holes or redact all. `/` on a block opens slash under it.

Widgets are recipes of ink / photo / tape / cut / pin / set / cite / holes. The inspector Type row retargets a block and carries overlapping attributes. Slash `/photo` or `/set` finds every recipe that uses that cut. The tray can filter by those same cuts. Help names type and cut. Slash lists the cuts on each hit. The inspector Type row filters by the same vocabulary.

Widgets share a sample library of scraps (ink, photo, set, cite, cut, holes). Pick more than one in the inspector — they combine. City ink plus a collage photo makes a sticker. Slash `/city` plants that scrap on the selection, or inserts a widget that can hold it.

Local e2e reuses `http://127.0.0.1:5173` (Vite `strictPort`). IDE launch configs run the current spec headed or in Playwright UI against that same server. Open `127.0.0.1`, not `localhost`.

Four more cut scraps push the halftone hero into pixelated, color-split territory — `gif diff`, `pixel bloom`, `chroma tear`, `static color` — each a density/split pair from soft grain to a heavy chromatic tear. Combine any of them with a photo scrap (now six: collage, miles, gwen, noir, peni, ham) for a colored, pixelated variant on real art, through the existing halftone/RGB-split rendering — no new block type.

`widgetLang.test.ts` covers harvest/applyBag/retarget: same-type is a no-op, id survives a retarget, heading text carries into a quote, a sticker photo carries into a hero, poll options carry into contents lines, and every widget retargets to every other widget without throwing. The inspector's Type row and its per-type option pickers (size, layout, style…) no longer collide on `.tray-item.on` — Playwright scopes the size-row assertion past the Type row instead.

`docs/playwright-e2e-prompt.txt` and `docs/playwright-user-stories.txt` are gone — both were bootstrap prompts for the e2e suite, self-marked historical/implemented, cited nowhere, and stale against the current 77-test suite. The suite itself (`e2e/*.spec.ts`) is the living reference now.

`docs/ISSUES.md` item 1 shipped: each Playwright worker spawns its own API process on its own port with its own temp-file SQLite (`e2e/fixtures.ts`), so board / mail / cork / claims can't race across workers. `vite.config.ts` routes `/api` to a worker's port via a header, scoped to `/api` requests only so it doesn't touch cross-origin font loads. `workers: 4` locally, `2` in CI. Full suite: 1.6 min → ~25s.

## 1.5.8 — 2026-08-17

Empty watching / archive / jam / board / cork / fest / mail / bag / wire / editor states hop to another resource instead of dead-ending.

Help terms that name a resource now open it. Scene hops (stream, desk, board, fest, letters) sit on every scene page, the cover, studio, help, jam, and profile.

## 1.5.7 — 2026-08-17

Cover vibe paints studio on first paint. Enter the studio and the topbar Studio hop keep the last picked vibe.

## 1.5.6 — 2026-08-17

Studio create mode (`?new=1`) applies the cover vibe to the page and the new-issue picks.

## 1.5.5 — 2026-08-17

Cover make / build / start open `/studio?new=1` with the vibe. The editor is only after Open the page.

## 1.5.4 — 2026-08-17

Cover and studio create buttons say make / new. Editor **Drop issue** still means publish (`docs/sg5.md`).

## 1.5.3 — 2026-08-17

Architecture plan Round 2 items 9–14. Remote + local merges use `useRemoteWithFallback`. Editor undo/redo lives in `useHistory`. `useIssueSocial` has tests. Migration leftovers ignore errors only on `0002`/`0003`. API image is multi-stage. CI shares one setup action, caches Playwright, and pins `flyctl` to `@v1`.

## 1.5.2 — 2026-08-17

Reader `/z/:id` loads through `useRemote` instead of a hand-rolled fetch. Passphrase unlock is unchanged.

## 1.5.1 — 2026-08-17

API upsert and corpse-chain pages run `assertBlocks`. Stream/jam/archive decorate nomination and claim counts in one query per list. Pages CI lints; Fly deploy runs test and build first.

## 1.5.0 — 2026-08-17

Consolidation observation (`docs/sg4.md`), not more features. Help names blurb, margin, dedication, and tear-out. The reader More sheet says bag / distro / archive in one line and links to Help. Three piles and five answer forms stay.

## 1.4.8 — 2026-08-17

First paint no longer pretends the API is down. Brand, studio chip, claim button, and the local-studio line wait until health has answered.

## 1.4.7 — 2026-08-17

MAIL on the topbar closes with Escape or a close control. The phone nav wraps so Cover / Studio / Stream / Help / MAIL stay on screen. Studio claim and new-issue modals do the same. Playwright covers the topbar hops, guest vs signed-in extras, and phone wrap.

## 1.4.6 — 2026-08-17

Remote sync drops leftover local demo copies that are not yours, so a stream fetch cannot leave two `sunday market` rows with different ids.

## 1.4.5 — 2026-08-17

Boot and sign-in merge the stream into the local list instead of replacing it. A late health/stream response no longer drops a just-imported or just-created unpublished issue. The blind `replaceZines` action is gone.

Studio JSON import and snapshot `decodeShare()` run untrusted bytes through `assertZineShape` and fail with a field-specific error instead of a bare cast.

The reducer asserts non-empty ids and unique `mergeZines` input in dev. Background API failures go through `catchBackground`; like and street-poll fall back locally if the API misses. View-level user actions (mail, board, guestbook, unlock, cutout) use `actionError` or a local fallback instead of a bare swallow.

## 1.4.4 — 2026-08-17

Store hooks live in `useZines.ts` so `ZineContext` only exports the provider. GitHub Actions use checkout/setup-node v5. Lint is clean. STATUS and sg match the 1.4.x line.

CI runs the Playwright user-story suite. Playwright starts `npm run dev` when `CI` is set; locally it still reuses a running server.

## 1.4.2 — 2026-08-17

`0003_legacy_columns` upgrades leftover Fly SQLite volumes that skipped `0001_init` (missing `series` and later zine columns). The hosted API was crash-looping on `seedSeries`.

## 1.4.1 — 2026-08-17

Auth: login/register rate limit (8 attempts / 10 minutes per handle). A new login retires other sessions for that handle. Mid-life sessions rotate on `/api/auth/me`; the client already stores a returned `token`.

`social.ts` is a barrel over bag / mail / archive / run (plus ink and scene leftovers). Checking out an archived issue also tucks it in the bag. Reader blurbs and letters sit under one INK grouping.

Playwright suite is 60 user-story tests, including cork drag, editor redo/backspace/slash filter, reader widget round-trip, board/mail/profile edge states, and nav/MAIL chrome.

## 1.4.0 — 2026-08-17

Readable slice (`sg.md`): smaller topbar, offline honesty, cover rewrite, first-visit primer, `/help` glossary, thinned reader actions. Reader social state lives in `useIssueSocial`. Shared `contract.ts` types cover the remaining `api.ts` endpoints.

Maker depth: compressed photo uploads, snapshot links refuse (instead of silently dropping) photos that will not fit, camera → cutout → sticker, optional scatter layout, DropModal/EditorMeta extracted. `0002_scatter` migration. Auth hardening still deferred.

Playwright user-story suite (`npm run test:e2e`) covers every route, every widget, and the readable-chrome regressions. Remix from the stream/reader no longer no-ops when the issue is not already in the local store. Snapshot `/s` follows hash changes. Demo `midnight run` reseals on health/stream so a long-lived API does not leave it open.

## 1.3.0 — 2026-08-14

Dedications, tear-out reply blocks, series watch, sit at a fest table, mark a board trade swapped.

## 1.2.0 — 2026-08-14

Errata slips, flyer inserts, paste cork pins into a draft, compilations, library checkout.

## 1.1.0 — 2026-08-14

Numbered limited runs, wear from circulation, time-capsule drops, postcards, corkboard.

## 1.0.0 — 2026-08-14

Fest floor, passport stamps, scene/city, blackout poetry, table of contents.

## 0.9.0 — 2026-08-14

Zine jam, micro-format challenges, the Archive, marginalia, pen name per issue, b-side fold.

## 0.8.0 — 2026-08-14

In my bag, series / issue numbers, blurbs, pen-pal mail, mini-comic strip, colophon.

## 0.7.0 — 2026-08-14

Page-flip reader, photo cutout, per-page linger stats, exquisite corpse, distro shelf, guestbook, pull from the pile, community tags, QR on the fold sheet, riso/grain finish.

## 0.6.0 — 2026-08-14

Audio / mixtape blocks, unlisted drops, optional passphrase.

## 0.5.0 — 2026-08-14

Trade / collab / feedback board, fold-and-staple print sheet.

## 0.4.0 — 2026-08-14

Watch a creator, watching lane, MAIL wire.

## 0.3.0 — 2026-08-14

Public stream, remix, sealed drops, snapshot links.

## 0.2.2 — 2026-08-14

API binds to `0.0.0.0` for container deploys.

## 0.2.1 — 2026-08-14

API / session fixes for the hosted studio.

## 0.2.0 — 2026-08-14

Optional Hono + SQLite API: claim a handle, sync drafts.

## 0.1.2 — 2026-08-14

Pages demo and PWA packaging.

## 0.1.1 — 2026-08-14

Editor and seed fixes.

## 0.1.0 — 2026-08-14

First public studio: vibes, block editor, localStorage, print issue.
