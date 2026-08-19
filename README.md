# Zineverse

A playful, Spider-Verse-inspired zine builder. Pages are digital collage — block-based like Notion, maximalist like a printed comic.

## Run

Live demo: https://prondubuisi.github.io/web-craft/

Installable as a standalone app on a phone (Add to Home Screen). Reader view has **Print issue**. The public Pages demo works without an account. Locally, `npm run dev` also starts the SQLite API — claim a handle to sync drafts. Snapshot links still work with no server. Without the API, everything you make lives in this browser unless you export JSON or copy a snapshot.

```bash
npm install
npm run dev
```

That starts the Vite app **and** the SQLite API (`http://127.0.0.1:8787`). Open **http://127.0.0.1:5173/** (not `localhost` — Vite is bound to IPv4). Claim a handle in the studio to sync drafts across browsers. Without the API, the **studio and issue data** still run from `localStorage`. Board, mail, jam, archive, fest, cork, bag, and the other community surfaces need the API — they do not have a full offline store.

```bash
npm run dev:web   # frontend only
npm run dev:api   # API only
```

```bash
npm run lint      # oxlint + stylelint
npm run build     # typecheck + production bundle
```

## What you can do

- **Cover** (`/`) — start an issue, vibes, a seeded sample, first-visit primer
- **Studio** (`/studio`) — your zines, comic badges, **in my bag**, community stream, corkboard
- **Help** (`/help`) — glossary for drops, bags, fests, and the rest of the vocabulary
- **Editor** (`/edit/:id`) — slash commands, widget tray, undo, image upload, phone/tablet/fold frames. On a phone: `+` opens a bottom sheet, `☰` is the issue menu.
- **Stream** (`/explore`) — search, vibe filters, watching lane, jam lane, archive lane, community tags, **pull from the pile**. Board, fest, and desk are one hop from here when the API is up.
- **Board** (`/board`) — trade, collab, and feedback pins. Mark a swap done. Mail-swap culture, not a marketplace.
- **Fest** (`/fest`) — tables on the floor, filtered by scene. Sit if you want. Not a marketplace.
- **Issue** (`/z/:id`) — flip or scroll, like/remix/letters/blurbs/polls/marginalia, fold-sheet print with QR, distro stock, **stuff in bag**, archive nominate, library checkout, b-side fold, errata, compilations, corpse invites, unlisted/password links
- **Profile** (`/u/:handle`) — public wall grouped by series, bio, scene, remix badges, passport stamps, **Watch wall**, write a letter
- **Letters** (`/mail`) — private pen-pal threads and **postcards**
- **Desk** (`/cork`) — scatter pins before they become a page
- **Jam** (`/jam/:id`) — a time-boxed prompt. Public drops that fit the format land in the pile automatically
- **The wire** (MAIL in the topbar) — likes, letters, remixes, follows, blurbs, and new drops from people you watch
- **Snapshot** (`/s#…`) — portable copy of an issue that works without the original studio

**Drop issue** publishes now or on a timer. A future drop shows a comic countdown and keeps pages sealed for everyone except the author.

**Copy snapshot link** packs the zine into the URL so it can be opened in another browser. Photos are compressed on upload. If they still will not fit the link, copy refuses instead of dropping the pictures — export JSON to move those.

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
