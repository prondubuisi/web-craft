# Zineverse

A playful, Spider-Verse-inspired zine builder. Pages are digital collage — block-based like Notion, maximalist like a printed comic.

## Run

Live demo: https://prondubuisi.github.io/web-craft/

Installable as a standalone app on a phone (Add to Home Screen). Reader view has **Print issue**. Snapshot links stay the sharing model — there is no account or server. Everything you make lives in this browser unless you export JSON or copy a snapshot.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

```bash
npm test          # unit tests
npm run lint      # oxlint
npm run build     # typecheck + production bundle
```

## What you can do

- **Cover** (`/`) — vibe switcher, widget zoo, start an issue
- **Studio** (`/studio`) — your zines, comic badges, community stream
- **Editor** (`/edit/:id`) — slash commands, widget tray, undo, image upload, phone/tablet/fold frames. On a phone: `+` opens a bottom sheet, `☰` is the issue menu.
- **Stream** (`/explore`) — published zines, scheduled **NEXT ISSUE** drops, one-click remix
- **Issue** (`/z/:id`) — reader view with like, remix, snapshot link
- **Snapshot** (`/s#…`) — portable copy of an issue that works without the original studio

**Drop issue** publishes now or on a timer. A future drop shows a comic countdown and keeps pages sealed for everyone except the author.

**Copy snapshot link** packs the zine into the URL so it can be opened in another browser. Custom photo uploads stay local (they’re too heavy for a link); export JSON to move those.

Everything else lives in `localStorage` (`zineverse.v1`). **Reset demo** restores the seeded issues, including a sealed `midnight run` drop.

## Vibes

Miles · Gwen · Peni · Ham · Noir — palettes, not templates. Halftone density, line weight, and chromatic split ride along with the vibe.

## How state flows

`ZineProvider` holds the studio in React context. Every change writes `zineverse.v1` to `localStorage`. Publish is a timestamp on the zine (`dropsAt`). A snapshot link is `encodeShare()` in the URL hash (`/s#…`), not a permissioned server object. Import/export JSON is the portable file format.
