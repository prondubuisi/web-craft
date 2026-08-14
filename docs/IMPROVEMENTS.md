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
- **Numbered limited run** — 1.1.0 (cap copies; claim until out of print)
- **Aging / wear** — 1.1.0 (creases and a coffee ring from circulation)
- **Time capsule drop** — 1.1.0 (in a year / in a decade)
- **Postcard** — 1.1.0 (tiny card in `/mail`)
- **Corkboard** — 1.1.0 (`/cork` cutting table)
- **Errata slip** — 1.2.0 (taped correction after the drop)
- **Flyer insert** — 1.2.0 (`/insert` loose page)
- **Cork to page** — 1.2.0 (paste a pin into a draft)
- **Compilation** — 1.2.0 (stock other issues inside one)
- **Library checkout** — 1.2.0 (borrow an archived issue for a week)
- **Dedication** — 1.3.0 (for @handle on the issue)
- **Tear-out reply** — 1.3.0 (`/reply` mails the maker)
- **Series watch** — 1.3.0 (watch this run)
- **Sit at a table** — 1.3.0 (fest hangout)
- **Swapped pin** — 1.3.0 (mark a board trade done)

## Suggested starting point

Round 6 shipped in 1.3.0.

## More ideas, tied to the project's actual identity

Zineverse's own positioning (README: "mail-swap culture, not a marketplace," DIY comic-maximalist collage, Board for trades/collabs/feedback, MAIL wire, Watch wall) points toward real zine-culture mechanics rather than generic content-platform features. These build on what's already shipped instead of converging toward flipbook-SaaS territory (analytics dashboards, monetization, algorithmic feeds).

These bullets below were the original “more ideas” writeup. They shipped in 0.7.0 and are listed above. Kept for history, not as a backlog.

**Collaboration & mail culture**
- **Chain zine / exquisite corpse mode** — shipped 0.7.0.

**Community curation**
- **Distro shelf** — shipped 0.7.0.
- **Guestbook** — shipped 0.7.0.

**Discovery**
- **"Pull from the pile"** — shipped 0.7.0.
- **Community tags** — shipped 0.7.0.

**Physical/digital bridge**
- **QR code on print/fold sheet** — shipped 0.7.0.
- **Riso/print-texture finishing pass** — shipped 0.7.0.

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

## Round 4 (post-0.9.0) — scarcity, time, and the making process

Rounds 1–3 covered creation tools, one-to-one social mechanics, and collective/preservation features. What's still untouched: the **scarcity and time** dimensions real zine culture uses to make objects feel special (numbered runs, out-of-print status), the **long-timescale mail-art tradition** (time capsules), a **private one-to-one** format smaller than a full issue, and the **pre-page** part of making a zine — the cutting-table/corkboard stage before anything becomes a linear page.

**Scarcity & editions**
- **Numbered limited run** — builds on the existing series/issue numbers (0.8.0): let a creator cap an issue at N numbered copies. Once all N are claimed by readers it goes "out of print" until the creator drops a new numbered edition (a remix). Real precedent: hand-numbered riso zine editions (e.g. "200/200"), where scarcity — not paywalling — is what makes a copy feel worth keeping. Pure metadata + a counter, no payment involved, so it stays inside the existing non-commercial framing.
- **Aging / wear aesthetic** — an issue's rendering picks up creases, fading, or a coffee-ring as it accumulates remixes or circulation, purely presentational on top of the existing vibe engine (halftone/chromatic-split already ride the vibe). Mirrors how a physical zine visibly wears out from being passed hand to hand — no new content model, just a derived visual state from data already tracked (remix count).

**Long-timescale mail art**
- **Time capsule drop** — a drop scheduled far in the future (months or years out, not the near-term "NEXT ISSUE" countdown), explicitly framed as writing to future readers or your future self. Grounded directly in mail-art and zine culture, which has a long history of treating zines as literal time capsules (crowd-sourced time-capsule zine projects, "letters to my future self" as a genre). Reuses the existing sealed-drop/countdown mechanism, just with a much longer horizon and different framing copy.

**Private, small-scale mail**
- **Postcard** — a tiny, single-block object sent directly to one person's Mail inbox rather than published to the public stream — smaller and more private than even a jam micro-format zine. Fits the "mail-swap culture, not a marketplace" framing at its smallest possible scale.

**The making process**
- **Corkboard / moodboard mode** — a freeform, scatter-pin canvas for collecting clippings and inspiration before committing anything to a linear page, mirroring the actual physical process of cutting up magazines on a desk or corkboard before assembling final pages. Distinct from the Editor's linear block-and-page model — this is explicitly pre-structure.

## Sources

- [ZINECORE App](https://apps.apple.com/us/app/zinecore/id6763522374)
- [Flipbooks AI — Zine Maker Online](https://flipbooksai.com/tools/zine-maker-online)
- [Flipsnack Online Zine Maker](https://www.flipsnack.com/ezine)
- [ZineMap — A Collaborative Map of the Global Zine Scene](https://zinemap.com/)
- [The economy of zines - Cool Schmool Zines](https://coolschmool.com/news/economy-of-zines)
- [Lisa Bowman's Exquisite Corpse Makes Connections Through the Mail](https://hyperallergic.com/754882/lisa-bowmans-exquisite-corpse-makes-connections-through-the-mail/)
- [Round-robin story — Wikipedia](https://en.wikipedia.org/wiki/Round-robin_story)
- [Custom Magazine Printing — Local Artists Printing Zines as Limited Edition Works of Art](https://www.bestypeimaging.com/custom-magazine-printing-how-local-artists-are-printing-zines-as-limited-edition-works-of-art/)
- [Mail Art — ZineWiki](https://zinewiki.com/wiki/Mail_Art)
- [The Legacy of Zine Culture — Medium](https://medium.com/@jani1973/ink-rebellion-the-time-capsule-of-zine-culture-ce7a9d9b161f)
- [What is a Zine? — Sprout Distro](https://www.sproutdistro.com/about/what-is-a-zine/)
- [International Zine Month — zine trades](https://echopublishing.wordpress.com/2021/07/18/international-zine-month-2021-zine-trades/)
- [D20 Zine Jam 2026 — itch.io](https://itch.io/jam/d20-zine-jam-2026)
- [Free Zine Week 2026 — itch.io](https://itch.io/jam/free-zine-week-2026)
- [Zine Archive and Publishing Project — Wikipedia](https://en.wikipedia.org/wiki/Zine_Archive_and_Publishing_Project)
- [Zine Collection — The Seattle Public Library](https://www.spl.org/books-and-media/unique-collections/zine-collection)
