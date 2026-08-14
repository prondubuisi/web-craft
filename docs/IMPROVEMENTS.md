# Feature Improvements: Ideas from Zine Culture & Other Zine Tools

_Compiled: 2026-08-14_

A survey of real-world zine culture and other digital zine/collage tools (ZINECORE, Flipsnack, Flipbooks AI, ZineMap), filtered down to ideas that fit Zineverse's existing block/social/server model and aren't already covered by current features (accounts, publish/drop, likes, remixes, comments, street polls, letters to the editor, badges, snapshot links, JSON export, PWA install, print issue, stream search/filter/sort).

## Reader experience

- **Page-flip reading mode** for `/z/:id` — swipe/pinch-to-zoom, animated page turns instead of scrolling. Several zine tools (Flipbooks AI) lean on this because it's what makes a "zine" feel like a physical object rather than a webpage.
- **True foldable print layout** — real zines are usually one sheet folded into 8 pages. Add a "Print as fold-and-staple sheet" mode that reimposes pages into the classic single-sheet zine fold, alongside the existing in-order "Print issue." Pure layout math, no new data model.

## Creation tools

- **One-tap photo cutout / background removal** for uploaded images before dropping them into `hero`/`sticker`/`grid` blocks — ZINECORE's headline feature. Turns a phone photo into a collage-ready sticker without leaving the editor.
- **Audio blocks** — a step beyond the current `sfx` text block: actual short audio clips (voice memo, mixtape snippet) embedded in a page. Fits the maximalist/comic vibe; other tools (Flipbooks AI) support audio/video embeds and this is a genuine gap.

## Community / social layer

- **Trade & collab board** — real zine culture runs on trading and requesting collaborations (see ZineMap's model: trade requests, collab requests, feedback requests, all tagged and browsable). Lightweight version: creators flag an issue or profile as "open to trade" / "open to remix" / "want feedback," browsable in `/explore`. Cheap on the existing SQLite schema (profiles + issues already exist) and the most culturally authentic zine feature currently missing.
- **Follow a creator** — subscribe to a handle, get notified (in-app, or a "new since your last visit" badge) when they drop a new issue. Natural extension of the existing `/u/:handle` profiles.
- **Password-protected / unlisted preview links** — share a draft with a few people before a public drop, distinct from the fully-public snapshot link. Small addition to the existing publish/seal logic on the server.

## Analytics

- **Per-page engagement for your own issues** — which page people lingered on or dropped off at (Flipsnack's differentiator). Mostly a read-model addition since views/likes/remixes are already tracked server-side.

## Shipped from this list

- **Follow a creator** — 0.4.0 (`Watch wall`, watching lane, MAIL)
- **Trade & collab board** — 0.5.0 (`/board`, trade / collab / feedback pins)
- **Foldable print layout** — 0.5.0 (Print fold sheet on `/z/:id`)
- **Password-protected / unlisted preview links** — 0.6.0 (Drop as unlisted + optional passphrase)
- **Audio blocks** — 0.6.0 (`/tape` mixtape widget)
- **Page-flip reading mode** — 0.7.0 (Flip pages on `/z/:id`)
- **Photo cutout** — 0.7.0 (Cut out background on hero)
- **Per-page engagement** — 0.7.0 (linger/reads on flip, owner-visible)
- **Chain zine / exquisite corpse** — 0.7.0 (drop as corpse, `?chain=` invite)
- **Distro shelf** — 0.7.0 (Stock in distro on an issue, shown on profile)
- **Guestbook** — 0.7.0 (per-profile notes)
- **Pull from the pile** — 0.7.0 (random live issue on Stream)
- **Community tags** — 0.7.0 (editor tags + stream `#chips`)
- **QR on fold sheet** — 0.7.0 (page 8 of the print sheet)
- **Riso/print-texture pass** — 0.7.0 (clean / riso / grain in the editor)
- **In my bag** — 0.8.0 (personal reading pile, distinct from the public distro shelf)
- **Series / issue numbers** — 0.8.0 (a run name + # on the editor, stream, and profile)
- **Blurbs** — 0.8.0 (one review per reader, separate from letters to the editor)
- **Pen pal mail** — 0.8.0 (`/mail`, write a letter from a profile)
- **Mini-comic strip** — 0.8.0 (`/strip`)
- **Colophon** — 0.8.0 (`/colophon`)
- **Zine jam** — 0.9.0 (`toner week` live jam, `/jam/:id`, stream lane)
- **Micro-format challenges** — 0.9.0 (one-pager / card caps + JAMMER badge)
- **The Archive** — 0.9.0 (nominate an issue; 2 votes files it)
- **Marginalia** — 0.9.0 (¶ on a block)
- **Pseudonym per issue** — 0.9.0 (pen name in the editor)
- **B-side / secret page** — 0.9.0 (hidden fold on the reader)
- **Zine fest** — 1.0.0 (`/fest` tables + scene)
- **Passport stamps** — 1.0.0 (visit an issue, collect a stamp)
- **Scene / city** — 1.0.0 (profile + fest filter)
- **Blackout poetry** — 1.0.0 (`/blackout`)
- **Table of contents** — 1.0.0 (`/toc`)

## Suggested starting point

1.0.0 is the fest-floor release.

## More ideas, tied to the project's actual identity

Zineverse's own positioning (README: "mail-swap culture, not a marketplace," DIY comic-maximalist collage, Board for trades/collabs/feedback, MAIL wire, Watch wall) points toward real zine-culture mechanics rather than generic content-platform features. These build on what's already shipped instead of converging toward flipbook-SaaS territory (analytics dashboards, monetization, algorithmic feeds).

**Collaboration & mail culture**
- **Chain zine / exquisite corpse mode** — a zine type where each collaborator only sees the page(s) directly before theirs, adds one page, then passes it to the next person via a Board collab pin. This is a century-old, still-active zine-culture practice (mail art "exquisite corpse," round-robin chain tales) and would turn the existing Board from a matchmaking listing into an actual in-app co-creation flow — the natural next step for a "collab" pin that currently just connects two people who then have to coordinate elsewhere.

**Community curation**
- **Distro shelf** — let a profile curate and recommend *other people's* issues (not their own), the way a real zine distro stocks zines it believes in. Non-monetary, fits the "not a marketplace" framing directly, and is a thin addition on top of the existing Profile/Watch wall.
- **Guestbook** — a public, per-profile note board (distinct from per-issue letters/comments) — an old-web and zine-culture staple (guestbooks, addresses printed in the back of a zine inviting mail) that fits the personal, address-book feel of `/u/:handle` better than another comment thread.

**Discovery**
- **"Pull from the pile"** — a random-issue button on `/explore` that simulates flipping through a stack at a zine fest, as a deliberate counterweight to the existing sort-by-new/likes/remixes — keeps discovery from tilting purely toward whatever's already popular.
- **Community tags** — free-form theme tags (diary, protest, fan-art, music...) layered on top of the five fixed vibe palettes, so people can self-organize by *content* since vibes are currently palette-only, not genre.

**Physical/digital bridge**
- **QR code on print/fold sheet** — stamp the printed fold-sheet output (`src/lib/fold.ts`) with a QR code back to the live `/z/:id` URL, mirroring how zine trades in the wild often include a link or address back to the maker.
- **Riso/print-texture finishing pass** — extend the existing vibe engine (halftone density, chromatic split) with optional misregistration and paper-grain overlays as a selectable finishing pass, reinforcing the print-zine look without a new content model.

## Round 3 (post-0.8.0) — community events, archive, and authorship

The first two rounds covered the individual-creator and one-to-one social mechanics (board, watch, mail, distro shelf, guestbook). What's left in real zine culture and untouched so far is the **collective, time-boxed, and preservation** layer — zine jams and zine libraries — plus a couple of reading/authorship mechanics that got skipped.

**Community events**
- **Zine jam** — a recurring, themed, time-boxed window (real-world model: D20 Zine Jam, Free Zine Week) where a prompt drops and anything published inside the window gets automatically tagged into that jam's collection, visible as its own lane on `/explore` or `/board`. Distinct from the always-on stream — it's a shared deadline and shared prompt, which is what makes zine jams feel like an event rather than a feed.
- **Micro-format challenges** — a constrained creation mode (one-page zine, business-card zine) offered as a jam prompt type, forcing brevity instead of the usual multi-page issue. Cheap on the existing block/page model — just a page-count cap plus a badge for completing one.

**Archive / preservation**
- **The Archive** — a community-nominated, not algorithmic, "living collection" lane distinct from the personal Distro shelf: readers can nominate an issue into the Archive, and issues with enough nominations get a permanent, no-longer-time-sensitive home there. Mirrors how real zine libraries (ZAPP, Denver Zine Library, QZAP) frame their mission as preservation and protection, not popularity — worth keeping deliberately separate from sort-by-likes so it doesn't just become "top issues" again.

**Reading & authorship**
- **Marginalia** — let a reader pin a short note to one specific block/panel instead of leaving an issue-level letter or comment, closer to how real zine readers annotate margins and mail art gets responded to in-place.
- **Pseudonym per issue** — publish under a chosen pen name distinct from your account handle, matching the long punk-zine tradition of anonymous or pseudonymous authorship (bylines are often optional or fictional in print zine culture).
- **B-side / secret page** — a hidden bonus block revealed only by a specific in-reader interaction (long-press, tap sequence), echoing the handmade-zine tradition of hidden folds and secret messages.

## Sources

- [ZINECORE App](https://apps.apple.com/us/app/zinecore/id6763522374)
- [Flipbooks AI — Zine Maker Online](https://flipbooksai.com/tools/zine-maker-online)
- [Flipsnack Online Zine Maker](https://www.flipsnack.com/ezine)
- [ZineMap — A Collaborative Map of the Global Zine Scene](https://zinemap.com/)
- [The economy of zines - Cool Schmool Zines](https://coolschmool.com/news/economy-of-zines)
- [Lisa Bowman's Exquisite Corpse Makes Connections Through the Mail](https://hyperallergic.com/754882/lisa-bowmans-exquisite-corpse-makes-connections-through-the-mail/)
- [Round-robin story — Wikipedia](https://en.wikipedia.org/wiki/Round-robin_story)
- [What is a Zine? — Sprout Distro](https://www.sproutdistro.com/about/what-is-a-zine/)
- [International Zine Month — zine trades](https://echopublishing.wordpress.com/2021/07/18/international-zine-month-2021-zine-trades/)
- [D20 Zine Jam 2026 — itch.io](https://itch.io/jam/d20-zine-jam-2026)
- [Free Zine Week 2026 — itch.io](https://itch.io/jam/free-zine-week-2026)
- [Zine Archive and Publishing Project — Wikipedia](https://en.wikipedia.org/wiki/Zine_Archive_and_Publishing_Project)
- [Zine Collection — The Seattle Public Library](https://www.spl.org/books-and-media/unique-collections/zine-collection)
