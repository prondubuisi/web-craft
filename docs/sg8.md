# sg8 — Widget features, a survey not a round

_Drafted 2026-08-18, against `develop` post-1.6.0, at the maker's explicit request for a "next wave of widget features" — and at their explicit direction that this stays a speculative catalog, not a greenlight. Same shape as `docs/IMPROVEMENTS.md`'s original rounds 1–6: survey real ideas, filter to what fits the existing model, write down why each one is or isn't worth doing — then don't do it without someone deliberately reopening this note the way `sg4`–`sg7` reopened theirs. `sg.md`'s freeze still holds: no new block types, no wizard, no "meet a maker," no SaaS, no merging bag/shelf/archive._

## What's already true

The widget system already has real depth, shipped incrementally without ever opening a "round":

- **17 block types**, unchanged since `sg1.md` said "instead of widget 18" — `src/lib/widgets.ts`.
- **3 lanes** (page / ink / bind) grouping them in the tray and inspector.
- **8 attrs** (`ink`, `photo`, `tape`, `cut`, `pin`, `set`, `cite`, `holes`) — a closed vocabulary every widget is tagged with, filterable in both the tray and the inspector's Type row.
- **`retarget`** — change a block's type in place; `harvest`/`applyBag` carry over whatever content fits (`src/lib/widgetLang.ts`).
- **Samples** — a shared scrap library (`src/lib/samples.ts`), pickable and *combinable* (`combineBags`) in the inspector, grouped by attr.

Every idea below is read against this baseline, not against a blank slate — some of it turns out to already be possible with zero new code, which is itself a finding.

## Ideas surveyed

### Would need a new block type — rejected outright

`sg1.md` already named this the highest-leverage thing to *not* do, and nothing below changes that math:

- **Video / looping-clip block.** The most-requested shape a "modern" zine tool has that this one doesn't. Still an 18th widget no matter how it's framed — new `BlockType`, new `createBlock` case, new render component, new file-size/hosting question the app has deliberately avoided (photos are already the heaviest thing it stores).
- **Voice-note-as-its-own-block**, distinct from the existing `/tape` mixtape. The `audio` type already covers "a sound," and splitting "mixtape" from "voice memo" is a taxonomy problem, not a missing capability — the honest fix, if this ever mattered, is a `sample`, not a type.
- **Map / location block.** Zero precedent anywhere in the app's model (no geo data, no external map dependency); would drag in a new external service too (see SaaS section below).

### Would need a new mechanic beyond type/attr/sample — rejected for now

These don't need a new `BlockType`, but they need a new *kind* of thing the app tracks, which is its own form of "widget 18":

- **Grouping/nesting widgets** (cluster several stickers as one draggable unit on a scatter page). Real maker-depth idea, structurally a new relationship between blocks the reducer doesn't model today — `Zine.blocks` is a flat array everywhere (editor, reader, contract types, all 27 unit test files' fixtures). Worth a dedicated note of its own someday, not a bullet here.
- **Saved custom "recipes"** — let a maker save their own sample combo (not just the built-in scraps) for reuse across issues. New persistence surface (a `localStorage` key at minimum, an API table if signed in), new UI to name/manage them. This is the shape of thing `sg4.md` already warned about ("no more `IMPROVEMENTS.md` idea rounds until the surface is supported") — a small feature that quietly becomes a fourth store next to bag/shelf/archive.
- **Cross-issue widget templates** ("start a new issue with my usual three blocks"). Same shape as the point above — real convenience, new stored-state surface.

### Would need external/generative dependencies — rejected

Consistent with `sg1.md`'s "What not to do" (no analytics dashboards, no payments, no algorithmic anything) and this session's own "no SaaS":

- **AI-generated captions/quote text.** Every sample in `samples.ts` is hand-written in the app's specific voice on purpose — the moment content is generated, "made by a person, not a template" (the sticker widget's own default text) stops being true of the app itself.
- **Auto-transcription for audio blocks.** A real external API dependency (speech-to-text), ongoing cost, and a second point of failure for something that currently works with zero network calls beyond the optional sync API.
- **Auto-enhance / background-removal-by-default for photos.** `cutoutImage` already exists as an opt-in action on hero/sticker (`Inspector.tsx`) — making it automatic removes a maker's choice for a "smarter" default nobody asked for.

### Fits the existing model, closest to being in-bounds — still not proposing it

This is the interesting category: ideas that don't need a new `BlockType` *or* a new mechanic, because the type/attr/sample system already absorbs them. Naming them here mostly to be honest that the bar isn't "impossible," it's "not now":

- **More samples.** Already the cheapest lever that exists — six new ones landed two turns ago (`gif diff`, `pixel bloom`, `chroma tear`, `static color`, `peni`, `ham`) with zero new mechanic, zero new file beyond the data itself. More could land the same way, any time, without this being "a round."
- **More attrs in the `ATTRS` union.** Structurally just as cheap as more samples — `AttrId` is a closed string union with one array (`ATTRS`) and one filter function (`widgetsWithAttr`) touching it. A new cut (e.g., `sound`, distinct from `tape`) is additive, not a new mechanic. Not proposing a specific one — just noting the ceiling here is high before anything counts as "widget 18."
- **A "combine everything that fits" one-click shuffle** on the inspector's Samples row, instead of clicking each sample individually. This is UI sugar over `combineBags`, which already does exactly this when given every matching sample's bag — arguably not a new mechanic at all, just a button. Closest thing on this whole list to "could ship without reopening anything."

## Not now

Nothing here is queued. This note exists because it was asked for, in the same spirit `docs/IMPROVEMENTS.md` was originally compiled — a record of what was considered, not a backlog. The freeze holds exactly as it did before this file existed: no new block types, no new mechanics, no external dependencies, and even the "closest to in-bounds" section stays a survey entry until someone deliberately picks one and writes a real note for it, the way `sg4`–`sg7` each did for their own scope.
