# Spec: development observed — near-total pickup, two new keyboard-a11y findings

## Status: remarkable pickup rate

Checked every open item from the last three rounds (Studio UX findings,
animation findings, sketch-scrap tagging) against the current working tree.
Nearly all of it is done, tested, and green (`tsc -b`, `npm run lint`,
`npm test` — 44/44):

| Round | Item | Status |
|---|---|---|
| Studio UX | Finding 1 — `SceneLinks here="/cork"` bug | Fixed — component removed from Studio entirely |
| Studio UX | Finding 2 — 7-button CTA row crowding | Fixed — collapsed into `StudioMore`, a proper disclosure menu |
| Studio UX | Finding 3 — badge row shows all 9 up front | Fixed — `BadgeStrip` collapses to "X/Y badges", expands on click |
| Studio UX | Finding 4 — bag empty state has no heading | Fixed — `<h2>in my bag</h2>` now always renders, empty state wrapped in `comic-cell` |
| Studio UX | Finding 5 — unconfirmed loading-state gap | **Still open**, still unconfirmed either way |
| Animation | Next step 1 — `.flip-page` missing reduced-motion | Fixed |
| Animation | Next step 2 — no transitions on look-row/rotate-handle/isolation outline | Fixed |
| Animation | Next step 3 — `.block-tools` used `display:none` (untransitionable) | Fixed — now `opacity`/`visibility`/`pointer-events`, transitioned |
| Animation | Next step 4 — appearance-stack drag-reorder has no FLIP animation | **Still open** (correctly the lowest-priority item) |
| Sketch scraps | Discoverability tags | Done, and extended — 3 more scraps added (peg bar, timing chart, coffee ring), all tagged consistently |

One commit landed since the last check (`1143cc8`) bundling misregister,
the original six sketch scraps with tags, and the slash-overlay-stuck-open
fix — plus a genuinely nice piece of follow-through: the "Sophomore Year"
workflow from two rounds ago is now `sophomore-year.zine.json` +
`scripts/sophomore-year.ts`, an importable JSON and builder script rather
than a seeded row or fake database entry — exactly the boundary I'd drawn
around not polluting `zineverse.sqlite` with fixture data, respected without
being asked to respect it specifically.

## New findings this round — keyboard accessibility on the two new disclosures

Tested `BadgeStrip` and `StudioMore` (both just-built, both using correct
ARIA — `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`"menuitem"`)
with actual keyboard-only interaction, not just a read of the markup:

**Finding A (bug) — "Import JSON" is in the menu but unreachable by Tab.**
`src/views/Studio.tsx`'s `StudioMore` panel wraps the file input in a plain
`<label role="menuitem">Import JSON<input type="file" hidden /></label>`.
Plain `<label>` elements aren't in the native tab order — only the form
control they wrap is, and that control is `hidden`. Confirmed live: opening
the menu with Enter and pressing Tab once lands directly on "Corkboard,"
skipping Import JSON entirely. A mouse user sees and can click it; a
keyboard-only user cannot reach it at all.

**Fix:** give the label `tabIndex={0}` and an `onKeyDown` that triggers the
file picker on Enter/Space (matching what a real `menuitem` needs — a click
handler alone isn't enough for a non-native-interactive element), or restructure
so the visible "Import JSON" text sits on a real `<button>` that
programmatically opens the file input via a `ref`.

**Finding B (real gap) — closing the menu doesn't return focus to its trigger.**
Confirmed live: opening `StudioMore` via Enter, then closing it via Escape,
leaves focus nowhere findable on the trigger/container — a keyboard user has
to re-tab from wherever focus landed (often back near the top of the page)
to get back to the "more" button. Standard menu-button pattern is: Escape
(or a menuitem activation) closes the panel *and* returns focus to the
button that opened it.

**Fix:** in `StudioMore`'s `onKey`/outside-click handlers
(`src/views/Studio.tsx:81-94`), call `.focus()` on the trigger button's ref
when closing via Escape (and ideally also on menuitem selection, though
selecting Corkboard navigates away so that path is moot).

**Acceptance criteria for both:** tab from `New issue` reaches `more`, Enter
opens it, every visible menu item (including Import JSON) is reachable by
further Tabs in visual order, Escape closes it and focus lands back on
`more` without needing to re-tab from elsewhere on the page.

## Carried-over, still open

1. **Finding 5** (Studio loading-state) — needs real network throttling to
   confirm before building anything; still unverified either way.
2. **Animation next step 4** (FLIP-reorder for appearance-stack drag) —
   correctly still the lowest priority, smallest surface, most effort item.
3. **Durability.** 35 changed paths sitting uncommitted again — a mix of the
   long-standing unrelated threads (stream pagination, auth hardening,
   `ZineContext`, `FoldSheet`/`Margins` fixes, still not mine to commit) and
   now-ready work from this round (3 new sketch scraps + their `vibes.ts`/
   `samples.ts` wiring, the Studio UX overhaul, the animation-polish CSS).
   Worth another scoped commit for the ready parts once Findings A/B above
   are addressed — no reason to commit a just-discovered keyboard-a11y bug
   in the same pass as fixing it elsewhere.

## Priority order

1. Findings A and B (keyboard a11y on the two new disclosures) — small,
   concrete, and these are brand-new interactive patterns, worth getting
   right before more UI leans on the same `StudioMore`/`BadgeStrip` shape.
2. Commit the ready work (sketch scraps, Studio UX, animation polish) once
   A/B land.
3. Finding 5 and animation next step 4 — both already correctly deprioritized,
   no change to that ordering.
