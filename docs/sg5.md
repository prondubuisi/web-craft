# sg5 — Finish, share, find (1.5.3)

_Observed: 2026-08-17, against 1.5.3. Not a feature round. `docs/IMPROVEMENTS.md` stays history. No new blocks, routes, badges, or notice kinds._

The file’s leftover rule: a next idea has to help someone **finish a first issue**, **share it**, or **find one other person**. Read from the cover, studio, editor, help, and e2e stories — there is still no usage analytics.

## The three paths already exist

| Path | Door | What works |
| --- | --- | --- |
| Finish | Cover “Drop a zine” / Studio “Drop a new issue” → `/edit/:id` | Empty-page hint, `/` tray, **Drop issue** publishes |
| Share | Reader + drop modal | Print, fold sheet, snapshot (refuses fat photos out loud) |
| Find one | Sample issue + Stream + Claim studio | Remix the seeded `after hours`; mail/board/fest need a handle |

Help already says **drop = publish**. Primer cell 1 says **Make an issue**. The cover and studio still label *create* as Drop. That is the lie.

## What 1.5.x should actually do

1. **Create buttons say make / new.** Cover: “Make an issue.” Studio: “New issue” / “+ new issue.” Editor **Drop issue** stays — that one is publish.
2. **Do not** add a seventh `IMPROVEMENTS` round, a wizard, or a “meet a maker” mechanic.

## How this was read

`Landing.tsx` (`start()` → `createZine`), `Studio.tsx` (same modal), `Editor.tsx` (`DropModal` / “Drop issue”), `Help.tsx` term `drop`, `primer` strip, `e2e/cover.spec.ts` + `e2e/helpers.ts`. No product noun was added.
