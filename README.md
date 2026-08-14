# Zineverse

A playful, Spider-Verse-inspired zine builder. Pages are digital collage — block-based like Notion, maximalist like a printed comic.

## Run

Live demo: https://prondubuisi.github.io/web-craft/

Installable as a standalone app on a phone (Add to Home Screen). Reader view has **Print issue**. Snapshot links stay the sharing model — there is no account or server. Everything you make lives in this browser unless you export JSON or copy a snapshot.

```bash
npm install
npm run dev
```

That starts the Vite app **and** the SQLite API (`http://127.0.0.1:8787`). Open the local URL Vite prints (usually `http://localhost:5173`). Claim a handle in the studio to sync drafts across browsers. Without the API, the site still runs locally from `localStorage`.

```bash
npm run dev:web   # frontend only
npm run dev:api   # API only
```

```bash
npm test          # unit tests
npm run lint      # oxlint
npm run build     # typecheck + production bundle
```

## What you can do

- **Cover** (`/`) — vibe switcher, widget zoo, start an issue
- **Studio** (`/studio`) — your zines, comic badges, **in my bag**, community stream
- **Editor** (`/edit/:id`) — slash commands, widget tray, undo, image upload, phone/tablet/fold frames. On a phone: `+` opens a bottom sheet, `☰` is the issue menu.
- **Stream** (`/explore`) — search, vibe filters, watching lane, community tags, **pull from the pile**
- **Board** (`/board`) — trade, collab, and feedback pins. Mail-swap culture, not a marketplace.
- **Issue** (`/z/:id`) — flip or scroll, like/remix/letters/blurbs/polls, fold-sheet print with QR, distro stock, **stuff in bag**, corpse invites, unlisted/password links
- **Profile** (`/u/:handle`) — public wall grouped by series, bio, remix badges, **Watch wall**, write a letter
- **Letters** (`/mail`) — private pen-pal threads between handles
- **The wire** (MAIL in the topbar) — likes, letters, remixes, follows, blurbs, and new drops from people you watch
- **Snapshot** (`/s#…`) — portable copy of an issue that works without the original studio

**Drop issue** publishes now or on a timer. A future drop shows a comic countdown and keeps pages sealed for everyone except the author.

**Copy snapshot link** packs the zine into the URL so it can be opened in another browser. Custom photo uploads stay local (they’re too heavy for a link); export JSON to move those.

Everything else lives in `localStorage` (`zineverse.v1`). **Reset demo** restores the seeded issues, including a sealed `midnight run` drop.

## Vibes

Miles · Gwen · Peni · Ham · Noir — palettes, not templates. Halftone density, line weight, and chromatic split ride along with the vibe.

## How state flows

`ZineProvider` holds the studio in React context. Every change writes `zineverse.v1` to `localStorage`. If the Hono API is up and you are signed in, drafts also upsert to SQLite (`server/data/zineverse.sqlite`). Publish, likes, remixes, comments, poll votes, and the sealed-drop clock are enforced on the server. A snapshot link (`/s#…`) still works without an account. The Pages build reads `VITE_API_URL` (repo Actions variable). Sessions use a Bearer token in `localStorage` so the static site can call a hosted API on another origin.

## Host the API

```bash
flyctl auth login
flyctl launch --copy-config --name zineverse-api --region iad --no-deploy
flyctl volumes create zineverse_data --region iad --size 1
flyctl deploy
```

Then set the GitHub Actions variable `VITE_API_URL` to `https://zineverse-api.fly.dev` and add secret `FLY_API_TOKEN` so later pushes redeploy.
