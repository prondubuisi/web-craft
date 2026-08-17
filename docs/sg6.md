# sg6 — Visual QA pass

_Observed: 2026-08-17, against `develop` at `1.5.7` (post `sg3`–`sg5`, post the create/make rename and cover-vibe-persistence work). Folded in as the live list after **1.5.8** (Help/scene hops). Not a feature round — `sg.md`'s freeze note still holds. Read by actually running the app: fresh Playwright/Chrome screenshots across desktop and mobile (landing, studio, editor, stream, board, help, mail, profile, fest, cork, the reader and its "More" sheet, the drop modal), then traced against source for every finding — not a code-only read._

## Summary

Five real findings, one confirmed non-issue, one open question:

| # | Where | What | Confidence |
| --- | --- | --- | --- |
| 1 | Reader + any modal | Secondary buttons render nearly invisible (cream-on-cream) | High — root-caused, reproduced twice |
| 2 | `Board.tsx` | Filter row and "post as" picker share one CSS class | High — confirmed in code |
| 3 | `Profile.tsx` | Un-penned issues show the vibe twice in the meta line | High — confirmed in code |
| 4 | `Help.tsx` | Glossary cards force a 180px minimum height regardless of content | High — confirmed in code |
| 5 | `Explore.tsx` | Lane / vibe / sort / tag filters are visually undifferentiated | Medium — real, but the fix needs a design call |
| — | Reader, noir vibe | Suspected MAIL badge legibility issue | **Not real** — re-checked, renders fine |
| — | Landing, `/mail` | First-time visitor already has 2 unread notices + a pen-pal thread | Confirmed intentional (`demoNotices()`) — a tone question, not a bug |

## 1. Secondary buttons are nearly invisible on light backgrounds

**Highest-priority finding.** `.comic-btn.ghost` (`src/styles/base.css:178-183`) is `background: transparent; color: var(--paper); border-color: var(--paper)` — cream text and border, correct only on the app's dark surfaces (Studio, Landing's hero, Cork, Help, NotFound, the topbar — confirmed every other `ghost` usage sits on one of these). But `.modal` (`src/styles/reader.css:501`) and the reader page itself both use `background: var(--paper)` — the same cream. Every `ghost` button inside those contexts renders cream-on-cream.

That's not one button:

- `Preview.tsx:335` "Print issue"
- `Preview.tsx:346` "Stuff in bag" (when not yet bagged)
- `Preview.tsx:358` **"More on this issue"** — the disclosure trigger for the entire secondary-action sheet
- `Preview.tsx:386` "Preview fold"
- `Preview.tsx:403` "Stock in distro"
- `Preview.tsx:411` "Watch this run"
- `Preview.tsx:419` "Check out"
- `DropModal.tsx:98` "Export JSON" (same `.modal` background)

Reproduced identically across two screenshots taken 300ms apart (ruling out a render-timing artifact) and again on the mobile viewport, where it's worse — several controls reduce to a barely-visible outline.

**Fix:** don't touch eight call sites — fix the root. Add two CSS custom properties (e.g. `--ghost-ink`, `--ghost-border`) defaulting to `var(--paper)` at `:root`; have `.comic-btn.ghost` reference them instead of `var(--paper)` directly; override both to `var(--ink)` inside `.zine-page` and `.modal`'s scope. One class definition, two small overrides, zero JSX changes.

## 2. Board's filter row and "post as" picker are visually identical

`Board.tsx:103` (the `ALL / TRADE / COLLAB / FEEDBACK` filter) and `Board.tsx:122` (the `TRADE / COLLAB / FEEDBACK` compose-kind picker, directly below it) both render `className="filter-bar"` — the literal same class, stacked on top of each other with no label distinguishing "filter what you see" from "choose what you're about to post." A user can plausibly click the second row expecting it to filter.

**Fix:** give the compose picker its own class (`kind-picker`) and a small label above it ("posting as"), matching the label style already used in `EditorMeta`. Same pill shape, visually quieter background so it doesn't compete with the active filter row.

## 3. Profile shows the vibe twice for un-penned issues

`Profile.tsx:211-212`:
```jsx
<span>{byline(z) !== z.owner ? byline(z) : z.vibe}</span>
<span>{z.vibe}</span>
```
When a zine has no distinct pen name, the fallback branch renders the vibe — then the next span renders it again. On screen: "miles　miles". `seriesLabel(z)` one line up already uses a conditionally-omitted span for the same kind of optional field.

**Fix:**
```jsx
{byline(z) !== z.owner && <span>{byline(z)}</span>}
<span>{z.vibe}</span>
```
Same idiom already used for `seriesLabel`, not a new pattern.

## 4. Help glossary wastes height on short entries

Each entry uses the shared `.comic-cell` class (`base.css:422`: `min-height: 180px`) via `Help.tsx:138`'s `className="help-entry comic-cell"`. That's sized for equal-length grid cards elsewhere, not an 18-entry list where "issue" is one sentence and "snapshot" is three. Short entries sit in a mostly-empty box; scanning the full glossary takes far more scrolling than the content needs.

**Fix:** one line — `.help-entry { min-height: auto; }` in `landing.css`, overriding `.comic-cell` just for this context. No other `.comic-cell` usage is touched.

## 5. Stream's filter row has four controls with no visual grouping

Lane (`ALL/WATCHING/JAM/ARCHIVE`, exclusive), vibe (`MILES…NOIR`, exclusive), sort (`NEW/LIKES/REMIXES`, exclusive), and tags (`#MUSIC…`, multi-select) all render as the same `tray-item` pill in one dense row (`Explore.tsx:119,128,134,140,148,157,166`) — nothing marks which buttons are mutually exclusive with which others.

**Fix, two parts, both additive:**
- Color the vibe chips using the same per-vibe palette treatment `VibePicks` already applies in the "New issue" modal (`Chrome.tsx:190-210` — background/outline tinted to `v.palette[...]` on select). Reuses an established pattern instead of inventing new copy; makes "these five are vibes" obvious at a glance.
- Group the four clusters spatially — extra margin or a thin divider between them — so the row reads as four clusters, not one long line.

This one needs a design nod before touching markup (which grouping treatment), unlike 1–4 which are precise enough to just execute.

## Not real / not a fix

- **Noir-vibe MAIL badge**: re-checked with a fresh screenshot on the `ham` vibe reader — the unread count renders clearly ("2", legible white-on-red). The earlier read was a compressed-screenshot artifact. No action.
- **First-visit unread mail**: `demoNotices()` (`src/lib/social/ink.ts:64`) deliberately seeds "@wobble liked after hours" and "@inkstain dropped midnight run" so the mailbox isn't empty on arrival — same spirit as the two seeded demo zines. Reasonable to read either way: makes the app feel alive immediately, or hands a new visitor unread clutter from strangers before they've done anything. A tone call, not a bug — flagging for a decision, not proposing a change.

## Suggested sequence

1. **Item 1** first — it's not polish, it's controls a user can't find, and the fix is a handful of CSS lines with no behavior change.
2. **Items 2–4** — each is a small, independent, precisely-scoped fix; any order, could land in one PR or three.
3. **Item 5** — needs a quick call on the grouping treatment, then it's equally mechanical.
4. **The seeded-notices question** — raise with whoever owns product tone; not blocking on anything above.

## How this was read

Live app, not just source: `npm run dev`, a throwaway Playwright script (system Chrome channel) capturing fresh screenshots at 1440×900 and 390×844 across landing, studio, editor (+ slash tray, Inspector, DropModal), stream, board, help, mail, profile, fest, cork, and the reader (+ "More" sheet, mobile). Every finding above was then traced to its exact source location and, where relevant, checked against sibling usages (every other `ghost` button, every other `comic-cell` consumer) before being written down — nothing here is a guess from a single screenshot. `sg.md` is the live list if this gets folded in.
