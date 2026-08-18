# sg7 — Studio enjoyment pass

_Observed: 2026-08-18, against `develop` post-1.6.0. **Shipped.** Not a feature round — `sg.md`'s freeze note still holds: no new blocks, routes, badges, or notice kinds. No wizard, no "meet a maker," no SaaS, no merging bag/shelf/archive — all explicitly off the table. This is copy and CSS only: two silent empty states, one dead hover, and one un-animated overlay pair, all on `/studio`, all confirmed in code before being written down here._

## Summary

| # | Where | What | Confidence |
| --- | --- | --- | --- |
| 1 | `Studio.tsx` zine wall | An empty wall (`mine.length === 0`) shows only the `+ new issue` tile — no words | **Shipped** — empty-wall line |
| 2 | `Studio.tsx` community stream | An empty stream renders a bare `&lt;div className="stream"&gt;` — no words | **Shipped** — quiet-stream line |
| 3 | `.stream-item` (`base.css`) | Zero hover/transition on a fully clickable card, while its sibling `.zine-card` has one | **Shipped** — background + border hover |
| 4 | `.modal` / `.sheet` (`reader.css`) | Every modal and bottom sheet appears and disappears instantly — no `transition` anywhere in either block | **Shipped** — fade-in / rise-in / sheet-up + reduced-motion |

Zineverse already has a voice and a motion idiom — this pass just finishes applying both to `/studio`, which sg6's visual QA pass didn't touch.

## 1. An empty zine wall says nothing

`Studio.tsx:162–165` renders the `+ new issue` tile unconditionally, then `mine.map(...)` (166). There is no `mine.length === 0` branch. A brand-new local studio, or a signed-in one where every issue was deleted, shows a striped tile and nothing else — no orientation, no invitation.

This is inconsistent with the rest of the same file: the bag's empty state already has a line in the house voice (`Studio.tsx:195–198`): *"your bag is empty. stuff an issue from the stream or check one out of the archive."*

**Fix:** one conditional line above or beside the wall, same construction as the bag copy:

```tsx
{mine.length === 0 ? (
  <p className="serif">empty wall. + new issue, or pull one in from the stream.</p>
) : null}
```

No new component, no new state — `mine` is already computed.

## 2. An empty community stream says nothing

`Studio.tsx:229–230` renders `&lt;div className="stream"&gt;{stream.map(...)}&lt;/div&gt;` with no zero-result branch. Offline, or on a fresh API with nobody else posting yet, this section is just a heading over blank space.

The app already has a template for this exact situation — `Inbox`'s empty state (`Chrome.tsx:132–142`): *"quiet on this frequency."* — terse, one wry line, matches the reader's own empty-lane copy elsewhere in the app (`docs/sg6.md`'s "Not issues" section already treats this idiom as settled house style).

**Fix:** same shape, own line so it doesn't repeat Inbox's exact wording:

```tsx
{stream.length === 0 ? <p className="serif">quiet stream. nobody near you has dropped yet.</p> : null}
```

## 3. `.stream-item` gives no sign it's clickable

`base.css:553–561` styles `.stream-item` with a background, border, and grid layout — no `:hover`, no `transition`. Compare `.zine-card` (`base.css:488–496`), which is the *exact* card type "mine" wall issues use and already has `transition: transform 160ms var(--ease)` plus a `:hover { translateY(-8px) rotate(0) }` lift (`503–505`). Every `.stream-item` is a link to someone else's issue; right now it looks static next to a wall of cards that visibly react to the cursor.

**Fix:** a lighter touch than the full lift — these are someone else's issues, not yours, and shouldn't visually compete with the wall's affordance:

```css
.stream-item {
  transition: background-color 140ms var(--ease), border-color 140ms var(--ease);
}
.stream-item:hover {
  background: color-mix(in oklab, var(--panel) 78%, black);
  border-color: var(--accent-2);
}
```

The exact hover treatment is a small design call (background shift vs. a border tint vs. something else) — the finding and the need for *some* affordance aren't in question, only which one.

## 4. Modals and sheets have no entrance or exit

`reader.css:559–578` (`.modal-back`, `.modal`) and `reader.css:642–663` (`.sheet-back`, `.sheet`) — neither block has a `transition` or `animation` property. Every modal in the app (claim handle, new issue, drop) and every mobile bottom sheet (widget tray, inspect, issue menu) pops in and out with zero motion, while buttons and zine cards both already have hover/press feedback. These are the two most-used overlay surfaces in the whole app and they're the only interactive surfaces left with no motion at all.

**Fix:** a cheap fade + rise, and — importantly — extend the *existing* reduced-motion carve-out (`base.css:567–575`, currently `.glitch-block, .comic-btn, .zine-card, .vibe-card`) to cover the new transitions so this doesn't regress accessibility:

```css
.modal-back { animation: fade-in 140ms var(--ease); }
.modal { animation: rise-in 160ms var(--ease); }
.sheet-back { animation: fade-in 140ms var(--ease); }
.sheet { animation: sheet-up 180ms var(--ease); }
```

```css
@media (prefers-reduced-motion: reduce) {
  .glitch-block,
  .comic-btn,
  .zine-card,
  .vibe-card,
  .modal-back,
  .modal,
  .sheet-back,
  .sheet {
    animation: none;
    transition: none;
  }
}
```

Keyframes follow the app's existing two (`flip-in`/`flip-back` in `reader.css:57,61`) as the pattern to match, not a new animation vocabulary.

## Not proposed here

Deliberately left out, per the standing freeze restated at the top of this note:
- No onboarding wizard, no "meet a maker," no matchmaking of any kind.
- No usage analytics — there still isn't any; this whole pass was read from the running app (Cover, Studio, Editor, Help) and the e2e suite, the same method sg6 used, not from data that doesn't exist.
- No merging bag / shelf / archive, no SaaS surface, no seventh `IMPROVEMENTS.md` round.
- The `+ new issue` tile's striped background (`base.css:529–546`) already reads as a distinct visual treatment on inspection — not filed as a finding, since nothing in the code or the running app showed it failing.

## Suggested sequence

1. **Items 1–2** — pure copy, zero risk, land together in one pass.
2. **Item 3** — needs one small call (which hover treatment), then it's mechanical.
3. **Item 4** — the only item touching more than one file conceptually (CSS + the reduced-motion query); do it as one change so the accessibility carve-out never ships without the animation it's guarding.

## How this was read

`src/views/Studio.tsx` in full, `src/components/Chrome.tsx` (`ComicButton`, `Badge`, `VibePicks`, `Modal`, `BottomSheet`, `Inbox`), `src/styles/base.css` and `src/styles/reader.css` for every Studio-adjacent class, `src/lib/primer.ts` and the editor's empty-page hint for voice precedent, and `sg.md` / `docs/sg4.md` / `docs/sg5.md` / `docs/sg6.md` / `docs/STATUS.md` to confirm none of this was already proposed, shipped, or rejected. No product behavior was changed by the observation itself.
