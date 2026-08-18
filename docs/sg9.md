# sg9 — Data model abstractions for maintainability

_Drafted 2026-08-18, against `develop` post-1.6.0, at the maker's request. Internal architecture, not a product feature — doesn't touch `sg.md`'s freeze. Read from the actual data-path code (`types.ts`, `db.ts`, `widgets.ts`, `widgetLang.ts`, `shape.ts`, `contract.ts`, `server/routes/zines.ts`), not from vibes. Three findings, ordered by leverage and risk, smallest first. **§1–3 shipped.**

## What's already done — not proposing these again

- **`Zine` metadata is already grouped.** `sg1.md:146` asked for this in 1.4.0 (commit `b062fb4`): `Zine = ZineCore & ZinePublish & ZineEdition & ZineExtras`, 35 fields across 4 intersection types instead of one flat 35-field object. Still flat *at runtime* (`zine.chainKey`, not `zine.extras.chainKey`) — that was a deliberate type-level-only grouping, not a data-shape change, and changing it now would touch every read site in the app for no clear correctness win. Not proposing that.
- **`contract.ts` is already complete.** Every current `/api` route has a named request/response type (`sg.md`, `docs/STATUS.md`).
- **A schema library was already evaluated and rejected.** `docs/sg3.md:59`: *"Don't adopt `zod` or any schema library for two validation call sites — write the narrow check by hand."* That decision was made when 2 call sites existed. The finding below (§1) shows the real surface is now 4 near-identical switches doing the same kind of per-type work — but the fix here is a hand-written table, not a dependency, so it doesn't reopen that decision, it just finally acts on the duplication `sg3` was looking at before it had grown this large.

## 1. Four independent switches re-encode the same 17 block types — shipped

`src/lib/blockRecipes.ts` is the table. `createBlock`, `harvest`, `applyBag`, and `assertBlock` look up `create` / `harvest` / `apply` / `validate`. Shared throw helpers live in `src/lib/check.ts`. Existing widget/shape/sample/API tests were not rewritten.

Was:

`createBlock` (`src/lib/widgets.ts:48–167`, ~120 lines), `harvest` (`src/lib/widgetLang.ts:24–75`), `applyBag` (`widgetLang.ts:77–182`), and `assertBlock` (`src/lib/shape.ts:90–231`) each `switch` over `BlockType` and each independently re-states the same per-type field knowledge. `hero`'s `src`/`caption`/`density`/`split`/`x`/`y`, for instance, is written out separately in all four places. Add a field to `HeroBlock` and it's easy to update three of the four and silently miss the fourth — the exact failure mode `sg3`'s safety pass (`mergeZines`/`assertZineShape`, 1.4.5) was written to catch elsewhere in the data path.

**Proposal:** one table-driven block definition per type, alongside the existing `WidgetDef` (`widgets.ts`) which already describes each type generically (`slash`/`label`/`hint`/`glyph`/`lane`/`attrs`) — this isn't a new pattern for the codebase, it's extending one that's already there:

```ts
type BlockRecipe<T extends Block> = {
  create: (vibe: VibeId) => Omit<T, 'id'>
  harvest: (block: T) => AttrBag
  apply: (block: T, bag: AttrBag) => T
  validate: (raw: unknown) => T // the current per-case body of assertBlock
}
```

`createBlock`, `harvest`, `applyBag`, and `assertBlock` each become a one-line lookup into this table instead of a 17-case switch. TypeScript's discriminated-union narrowing still has to happen *somewhere* — this doesn't remove that requirement, it consolidates the 4 places currently doing it into 1.

**Scope/risk:** the largest of the three items — 4 files, ~68 case-bodies to migrate (17 types × 4 functions) without changing behavior. Do it **one function at a time**, not as one commit: `assertBlock` first (pure validation, easiest to verify against the existing `shape.test.ts` coverage), then `harvest`, then `applyBag`, then `createBlock` last (the one every other block-creation path — samples, retarget, the tray — depends on).

## 2. Three hand-written copies of "what a Zine's edition/extras fields are" — shipped

`src/lib/zineFields.ts` is the edition list. `editionFromRow` feeds `rowToZine`. `editionFromWrite` + `EDITION_UPDATE_SQL` is the PUT extras update. `assertZineShape` extras still fail-fast on import (claimed, noms, archive stay there); finish ids come from `FINISH_IDS`. `parseJsonColumn` lives next to those readers.

Was:

`ZineRow`/`rowToZine` (`server/db.ts:30–129`), the `PUT /api/zines/:id` handler's own re-derivation of tags/finish/series/issueNo/penName/bSide/editionSize/errata/includes/dedication/scatter — with its own defaulting and clamping, e.g. `Math.max(0, Math.min(999, …))` for `editionSize` (`server/routes/zines.ts:208–236`) — and `assertZineShape`'s `extras()` (`shape.ts:238`) are three independent hand-written definitions of the same field list.

**Proposal:** one field-descriptor list — name, DB column, parse/normalize function, default — that drives the DB row mapping (read), the PUT handler's write-time clamping, and shape validation, instead of three copies. Smaller and more contained than §1: touches `server/db.ts` and one route handler, not four files across client and server.

## 3. Repeated JSON-column parsing — shipped

`tags_json` and `includes_json` used the same try/catch-empty-array block in `rowToZine`. `parseJsonColumn` in `server/db.ts` is that helper. `blocks_json` still `JSON.parse`s loud — a corrupt page should not become an empty issue.

Shipped helper:

```ts
function parseJsonColumn<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
```

## Suggested sequence

1. **§3** first — **shipped.** `parseJsonColumn` for tags and includes. Blocks stay loud.
2. **§2** next — **shipped.** `zineFields.ts` is the edition read/write list.
3. **§1** last — **shipped.** `BLOCK_RECIPES` in `blockRecipes.ts`. Existing widget/shape/sample/API tests stay the check.

## Verification

Every function this note touches already has direct unit coverage. The rule for each step: migrate one function, run its existing test file, confirm it's still 100% green with *zero* test edits (a passing suite that needed test changes to pass means behavior moved, which isn't the goal here) — then the full check suite (lint/unit/build/e2e) before moving to the next function or item.

## Not proposed here

- Runtime-nesting `Zine`'s already-grouped fields (changing `zine.chainKey` to `zine.extras.chainKey`) — the 1.4.0 grouping was deliberately type-level only; a runtime shape change touches every read site for no correctness benefit.
- Block grouping/nesting (clustering scatter-page stickers as one unit) — a real, different idea, already named and explicitly deferred to its own future note in `docs/sg8.md`'s "would need a new mechanic" section. Not part of this note's scope.
- Any schema-validation library — see "What's already done" above.

## How this was read

`src/lib/types.ts` (`Zine`, `Block`), `server/db.ts` (`ZineRow`, `rowToZine`/`rowToComment`/`rowToListing`/`rowToNotice`), `src/store/reducer.ts` and `src/store/ZineContext.tsx` (`patchZine`, `mergeZines`), `src/lib/widgets.ts` and `src/lib/widgetLang.ts` (`createBlock`/`harvest`/`applyBag`), `src/lib/shape.ts` (`assertBlock`/`assertZineShape`), `src/lib/contract.ts`, `server/routes/zines.ts`, and `sg1.md` / `docs/sg3.md` / `docs/sg8.md` / `docs/STATUS.md` to confirm what was already shipped or already decided against. No product behavior was changed by the observation itself.
