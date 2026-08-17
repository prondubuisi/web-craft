# sg1 — Observation and suggested changes

_Read against `develop` at `9225d54` (v1.3.0 + architecture plan 1–7). Not a backlog dump and not a seventh feature round._

## What the project is trying to be

Zineverse has two promises, stated in different places:

1. **Maker promise** (README + landing): a Spider-Verse-styled, block-based zine builder. Pages are digital collage — Notion-shaped blocks with comic-maximalist vibes (Miles, Gwen, Peni, Ham, Noir). “Don’t build a website. Craft a world.” Local-first. Printable. Installable on a phone.
2. **Scene promise** (README “What you can do” + `docs/IMPROVEMENTS.md`): mail-swap culture, not a marketplace. Trades, letters, jams, a fest floor, an archive, a corkboard, a bag, a distro shelf. Remix over follow-count. Handmade internet, not flipbook SaaS.

Those two promises are compatible. They are not the same product. The maker promise is the thing a first visit can feel in thirty seconds. The scene promise only exists once there is a signed-in API and other people.

The landing page still argues against Squarespace, Wix, Webflow, Framer, and Notion. The nav and the last six releases argue for a small zine social network. That split is the main thing to resolve next — not another culturally authentic mechanic.

## Current state

**It works.** Version `1.3.0`, git-flow (`main` / `develop`), Pages demo, optional Hono + SQLite API, PWA, print + fold sheet, snapshot URLs. CI lints, tests, and builds. The architecture plan dated 2026-08-14 is implemented on `develop`: numbered migrations, route/service split, service tests, route-level code splitting, CSS split + stylelint, `useRemote`, incremental `contract.ts`.

**The feature list is empty on purpose.** `docs/IMPROVEMENTS.md` rounds 1–6 all shipped. `docs/STATUS.md` has no open product items. Remaining tracked work is engineering: login rate limits and token rotation, `FLY_API_TOKEN` if the hosted API should actually deploy, and a `CHANGELOG.md`.

**The surface is large for the age of the app.**

| Layer | Count | Notes |
| --- | --- | --- |
| Top-level routes | 13 screens | 3 are “make” (studio / editor / reader). The rest are scene. |
| Block types | 17 | heading through tear-out reply |
| `Zine` fields | ~30 | publish, seal, tags, finish, chain, series, pen name, jam, b-side, archive, edition, errata, compilation, dedication… |
| Reader actions on `/z/:id` | ~15 buttons | like, remix, snapshot, print, fold, flip, stock, bag, nominate, watch run, checkout, claim, b-side, corpse, edit |
| Topbar destinations | 8 + MAIL | Cover, Studio, Desk, Stream, Board, Fest, Letters, profile |
| Largest files | Editor 681, Preview 645, `social.ts` 646 | the two most important screens plus the social grab-bag |

Releases from `0.7.0` to `1.3.0` each added a cluster of zine-culture verbs. The loop was: survey real zine practice → ship the next four mechanics → bump. That loop succeeded. Continuing it will make a museum, not a tool people finish an issue in.

**The offline story is honest in the README and confusing in the UI.** Studio and issue data live in `localStorage` (`zineverse.v1`). Board, mail, jam, archive, fest, cork, bag, and the rest need the API. On the public Pages demo, those nav items still render. Snapshot links drop custom photo uploads because images are too heavy for a hash URL. Sealed drops and passphrases are server-enforced only when the API is up.

**Auth is good enough to exist and not good enough to trust.** Handle + `scrypt`, 30-day session, token hashed at rest, Bearer in `localStorage` so Pages can call another origin. No login rate limit, no rotation. That is the one STATUS item that gets more important every time someone actually claims a handle on a hosted API.

## Diagnosis

The project is past “what zine feature is missing?” and into “which of the things we already built should a new person be asked to notice?”

Three tensions:

1. **Cover vs. product.** The cover sells an expressive builder. The chrome sells a scene. A phone PWA with eight nav links and a MAIL badge does not feel like “zero learning curve — play.”
2. **Depth vs. verbs.** The editor is still a vertical block stack with slash commands and a widget tray. Cork has freeform scatter. The page itself does not. Seventeen widgets and a fifteen-button reader do not make collage more tactile.
3. **Demo vs. community.** The Pages build is the public face. Most of the scene is empty or local-stubbed there. That trains people that Board / Fest / Letters are hollow, even when a hosted API would make them real.

Do not start round 7. Spend the next stretch making the two promises readable, and making the original one feel inevitable.

## Suggested changes

Ordered. Each item is a change, not a vibe.

### 1. Freeze the feature surface

Treat `docs/IMPROVEMENTS.md` as history, not a prompt to invent round 7.

- No new block types, routes, badges, or notice kinds until the items below have landed.
- Any new idea has to pass: does this help someone finish a first issue, share it, or find one other person — or is it another authentic noun?
- Add a one-line “won’t add” note at the top of `IMPROVEMENTS.md` so the empty “Suggested starting point” is not read as a vacancy.

This is the highest-leverage change because it stops the thing that is currently working against the aims.

### 2. Pick a front door and hide the rest

The topbar is the product, whether it means to be or not.

**Proposal:** three persistent destinations, everything else one hop away.

- **Cover** `/`
- **Studio** `/studio` (cork lives here as “desk,” already linked)
- **Stream** `/explore` (board, fest, jam, archive as lanes or a “scene” sheet — not siblings of Studio)

Letters and MAIL stay available when a session exists. Desk, Board, Fest drop out of the persistent nav. Profile stays on the signed-in handle.

Do this before adding anything to those screens. A smaller chrome makes the maker promise visible again without deleting the scene.

### 3. Make the Pages demo tell the truth

On `https://prondubuisi.github.io/web-craft/` without a working `VITE_API_URL`:

- Do not offer Board / Fest / Letters / claim-studio as if they work.
- Show one line: local studio, snapshot links, print. Community needs the API.
- Keep Stream as the seeded local wall, not a set of empty online-only lanes.

The README already says this. The UI should say it too. A hollow fest floor is worse than no fest link.

If the hosted API is meant to be real, set `FLY_API_TOKEN` and `VITE_API_URL` and treat that as a release task, not a footnote. An optional API that never deploys is a second app nobody can join.

### 4. Thin the reader. Keep the issue.

`Preview.tsx` is the other front door — every snapshot, remix, and drop lands here — and it currently hosts the whole culture.

Split the action row into two layers:

- **Always:** like, remix, print, flip/scroll, stuff in bag, edit (if yours).
- **More (sheet / details):** snapshot, fold sheet, stock in distro, nominate, watch run, checkout, claim copy, b-side, corpse link, postcard.

Keep Reviews and Comments. Move marginalia to a quieter affordance (it is already per-block). The issue should read as a zine first and a control panel second.

While doing this, pull the 20+ `useState` islands in `Preview.tsx` into a `useIssueSocial(zine)` hook (or two: read-model vs. actions). Same behavior, a file a person can review. `social.ts` (646 lines, every localStorage side path) should follow: group by bag / mail / archive / run instead of one kitchen drawer.

### 5. Deepen the editor, don’t widen it

The maker promise is still “pages like collage.” The editor is still a Notion list with comic skins.

Do these, in this order, instead of widget 18:

1. **Photos that travel.** Custom uploads dying at the snapshot boundary is the biggest hole in “copy a link, open it somewhere else.” Store images as compressed data URLs with a hard cap, or host them on the API when signed in, and refuse the snapshot copy with a clear “export JSON / sign in to carry photos” when they won’t fit. Silent drop is the current failure.
2. **Camera → cutout → sticker on a phone.** Cutout already exists on hero. The path a phone user actually wants is: take a picture, knock out the background, drop it as a tilted sticker. That is the ZINECORE-shaped gap that is still real.
3. **One page that can scatter.** Cork already knows freeform pins. Let a single page opt into a scatter layout (absolute stickers on a spread) without turning the whole editor into a canvas app. Linear blocks stay the default. Collage stops being a metaphor.

Leave `/tape`, `/blackout`, `/insert`, `/reply`, `/toc`, `/colophon` alone. They are enough. The tray on a phone is already a grid of seventeen glyphs.

Extract `DropModal` (already a local function, ~100 lines) and the issue-meta fields (series, pen name, tags, finish, edition, b-side, errata, dedication, jam) out of `Editor.tsx`. The canvas file should be canvas.

### 6. Close the security items that STATUS already named

Now that community features exist, this is product, not hygiene.

- Rate-limit `POST /auth/login` and `POST /auth/register` (per IP + per handle).
- Rotate tokens on login; expire idle sessions shorter than 30 days, or make 30 days sliding and documented.
- Keep Bearer-in-`localStorage` if Pages-to-Fly is still the deploy shape, but treat XSS as account theft and keep the surface small (no `dangerouslySetInnerHTML`, tight image pipeline).
- Say in the reader when a passphrase is “honored here” vs. “theater until the API is up.”

Do not expand auth into OAuth or magic links. Handle + password fits the project. Make that pair hold.

### 7. Rewrite the cover so it sells this app

`Landing.tsx` still demo’s five of seventeen widgets and a competitor table from the website-builder pitch.

- Lead with: make an issue, print it, pass it, remix it.
- Show one finished seeded issue, not a widget zoo.
- Mention the scene in one sentence (“trades, letters, and a fest floor when you claim a handle”), not as the feature list.
- Drop or shrink the Squarespace/Wix/Webflow/Framer/Notion grid. Those are not the competitors anymore. ZINECORE, a photocopier, and a group chat are.

The cover is the only place most people will read the aims. It should match `1.3.0`, not the 0.3 pitch.

### 8. Housekeeping that unblocks the above

Small, do them when touching the files anyway:

- **`CHANGELOG.md`** from the existing tags (`0.1.0` … `1.3.0`). STATUS already wants this. Future freezes are easier to explain with a log.
- **Finish `src/lib/contract.ts`** for the remaining `api.ts` endpoints (bag, claims, checkout, errata, compilations, dedications, series watch are the obvious gaps). Incremental was the right call; leaving it half-done reintroduces the bug the plan was for.
- **Group `Zine` metadata** in `types.ts` (publish, edition, chain, extras) so every new optional field stops landing as another top-level `foo?:`. No behavior change.
- **`scripts/verify.mjs`** should assert the new nav and the thinned reader, not only “route renders.” Editor and Preview still have no unit tests; the smoke script is the regression net.

## What not to do

- Do not add analytics dashboards, payments, algorithmic ranking, or video blocks. `IMPROVEMENTS.md` already drew that line.
- Do not fold board/mail/fest into the `Zine` reducer. `useRemote` is the right split.
- Do not migrate off SQLite, CSS files, or hand-written contracts. The architecture plan was correct about scope.
- Do not build a second client. The PWA is the client.

## Suggested sequence

One release, or three small ones, in this order:

1. **1.4.0 — readable:** freeze note, nav collapse, Pages-offline honesty, cover rewrite, `CHANGELOG.md`.
2. **1.4.x — reader + auth:** thinned `/z/:id`, `useIssueSocial`, rate limit + token rotation.
3. **1.5.0 — maker depth:** traveling photos, phone cutout path, optional scatter page, Editor split.

After that, the project matches its aims again: a collage studio you can finish an issue in, with a mail-swap scene behind a handle, instead of a complete catalogue of zine nouns.

## How this was read

Sources: `README.md`, `CONTRIBUTING.md`, `docs/STATUS.md`, `docs/IMPROVEMENTS.md`, `docs/ARCHITECTURE_PLAN.md`, `package.json` (`1.3.0`), `src/App.tsx`, `src/lib/types.ts`, `src/lib/widgets.ts`, `src/lib/contract.ts`, `src/views/{Landing,Studio,Editor,Preview,Explore}.tsx`, `src/components/Chrome.tsx`, `server/auth.ts`, git history `0.7.0`–`1.3.0` and the `feature/architecture-priorities` merge. No product behavior was changed.
