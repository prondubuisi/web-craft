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

## Suggested starting point

**Trade/collab board** and **foldable print layout** were the cheapest relative to the current architecture and most directly reinforce the "real zine culture" identity of the app. Both shipped in 0.5.0. Next cheapest: password-protected preview links, then audio blocks.

## Sources

- [ZINECORE App](https://apps.apple.com/us/app/zinecore/id6763522374)
- [Flipbooks AI — Zine Maker Online](https://flipbooksai.com/tools/zine-maker-online)
- [Flipsnack Online Zine Maker](https://www.flipsnack.com/ezine)
- [ZineMap — A Collaborative Map of the Global Zine Scene](https://zinemap.com/)
- [The economy of zines - Cool Schmool Zines](https://coolschmool.com/news/economy-of-zines)
- [International Zine Month — zine trades](https://echopublishing.wordpress.com/2021/07/18/international-zine-month-2021-zine-trades/)
