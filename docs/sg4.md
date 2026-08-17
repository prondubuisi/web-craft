# sg4 — Consolidation pass (1.5.0 opened)

_Observed: 2026-08-17, against 1.4.8. Not a feature round. sg.md freeze still holds: no new blocks, routes, badges, or notice kinds. This is the qualitative review sg2 asked for before anyone merges stores or deletes a response form._

Read from the code and the in-app glossary, not from usage analytics (there are none).

## Three piles that keep issues

| | Bag | Distro shelf | Archive |
| --- | --- | --- | --- |
| Who sees it | Only you | Anyone on your profile | The stream’s archive lane |
| Verb | Stuff in bag | Stock in distro | Nominate → (later) Check out |
| Store | `zineverse.bag.v1` + `/api/bag` | `zineverse.shelf.v1` + `/api/shelf` | noms + loans; checkout also `tuckBag` |
| Help already says | Private reading pile | A table, not a store, not your bag | Nomination, not a popularity list |

The one coupling is intentional: **checkout of an archived issue also stuffs the bag** (1.4.1). That is the only place two piles write on the same action. Do not fold shelf into bag — one is private, one is a public table. Do not fold archive into shelf — one is community preservation, one is “I stocked this on my wall.”

**Keep all three.** The glossary already separates them. The confusion is the More sheet listing Stock / Nominate / Check out as sibling buttons without the one-line distinctions Help already has.

## Five ways to answer an issue

| Form | Where | Who writes it | What it is |
| --- | --- | --- | --- |
| Dedication | Maker meta (`EditorMeta`) | The maker, before drop | “for @handle” on the reader |
| Tear-out | `/reply` block | A reader, on the page | Postcard back to the maker |
| Margin | `¶` on a panel (`Margins`) | A reader | Note on one block |
| Blurb | INK → Reviews | A reader | One line, no stars |
| Letter | INK → Comments, or `/mail` | A reader | Stays; or a private pen-pal thread |

The reader already groups blurb + letter under **INK** and says dedication and tear-out live with the maker. `/help` lists **letters** but not blurb, margin, dedication, or tear-out. That is the gap, not a need to delete forms.

**Do not merge them.** Dedication is not a response. Tear-out is a block that *sends* a postcard (mail). Blurb vs letter is one line vs a note that stays — the INK lede already says that. Margin is attached to a panel, not the issue.

## What 1.5.0 should actually do

1. **Name the missing glossary terms** (blurb, margin, dedication, tear-out) so Help matches the INK lede. No new mechanics.
2. **Leave the three piles and five forms in place** until someone has a reason stronger than “there are a lot of words.”
3. **If a More-sheet label is unclear**, point at Help — do not add a sixth verb.

Not in 1.5.0: deleting a store, combining bag and shelf, retiring tear-out, a seventh `IMPROVEMENTS` round.

## How this was read

`src/lib/social/{bag,archive,scene,ink,mail}.ts`, `useIssueSocial` (stock / nominate / checkout / bag / mailMaker), `Preview.tsx` (primary bag vs More sheet vs INK), `Help.tsx`, `STATUS.md`, `sg.md` After 1.4.8. No product behavior was changed by the observation itself.
