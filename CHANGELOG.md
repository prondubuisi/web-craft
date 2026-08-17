# Changelog

All notable changes to Zineverse live here. Versions match git tags.

## Unreleased

MAIL on the topbar closes with Escape or a close control. The phone nav wraps so Cover / Studio / Stream / Help / MAIL stay on screen.

## 1.4.6 — 2026-08-17

Remote sync drops leftover local demo copies that are not yours, so a stream fetch cannot leave two `sunday market` rows with different ids.

## 1.4.5 — 2026-08-17

Boot and sign-in merge the stream into the local list instead of replacing it. A late health/stream response no longer drops a just-imported or just-created unpublished issue. The blind `replaceZines` action is gone.

Studio JSON import and snapshot `decodeShare()` run untrusted bytes through `assertZineShape` and fail with a field-specific error instead of a bare cast.

The reducer asserts non-empty ids and unique `mergeZines` input in dev. Background API failures go through `catchBackground`; like and street-poll fall back locally if the API misses. View-level user actions (mail, board, guestbook, unlock, cutout) use `actionError` or a local fallback instead of a bare swallow.

## 1.4.4 — 2026-08-17

Store hooks live in `useZines.ts` so `ZineContext` only exports the provider. GitHub Actions use checkout/setup-node v5. Lint is clean. STATUS and sg match the 1.4.x line.

CI runs the Playwright user-story suite. Playwright starts `npm run dev` when `CI` is set; locally it still reuses a running server.

## 1.4.2 — 2026-08-17

`0003_legacy_columns` upgrades leftover Fly SQLite volumes that skipped `0001_init` (missing `series` and later zine columns). The hosted API was crash-looping on `seedSeries`.

## 1.4.1 — 2026-08-17

Auth: login/register rate limit (8 attempts / 10 minutes per handle). A new login retires other sessions for that handle. Mid-life sessions rotate on `/api/auth/me`; the client already stores a returned `token`.

`social.ts` is a barrel over bag / mail / archive / run (plus ink and scene leftovers). Checking out an archived issue also tucks it in the bag. Reader blurbs and letters sit under one INK grouping.

Playwright suite is 60 user-story tests, including cork drag, editor redo/backspace/slash filter, reader widget round-trip, board/mail/profile edge states, and nav/MAIL chrome.

## 1.4.0 — 2026-08-17

Readable slice (`sg.md`): smaller topbar, offline honesty, cover rewrite, first-visit primer, `/help` glossary, thinned reader actions. Reader social state lives in `useIssueSocial`. Shared `contract.ts` types cover the remaining `api.ts` endpoints.

Maker depth: compressed photo uploads, snapshot links refuse (instead of silently dropping) photos that will not fit, camera → cutout → sticker, optional scatter layout, DropModal/EditorMeta extracted. `0002_scatter` migration. Auth hardening still deferred.

Playwright user-story suite (`npm run test:e2e`) covers every route, every widget, and the readable-chrome regressions. Remix from the stream/reader no longer no-ops when the issue is not already in the local store. Snapshot `/s` follows hash changes. Demo `midnight run` reseals on health/stream so a long-lived API does not leave it open.

## 1.3.0 — 2026-08-14

Dedications, tear-out reply blocks, series watch, sit at a fest table, mark a board trade swapped.

## 1.2.0 — 2026-08-14

Errata slips, flyer inserts, paste cork pins into a draft, compilations, library checkout.

## 1.1.0 — 2026-08-14

Numbered limited runs, wear from circulation, time-capsule drops, postcards, corkboard.

## 1.0.0 — 2026-08-14

Fest floor, passport stamps, scene/city, blackout poetry, table of contents.

## 0.9.0 — 2026-08-14

Zine jam, micro-format challenges, the Archive, marginalia, pen name per issue, b-side fold.

## 0.8.0 — 2026-08-14

In my bag, series / issue numbers, blurbs, pen-pal mail, mini-comic strip, colophon.

## 0.7.0 — 2026-08-14

Page-flip reader, photo cutout, per-page linger stats, exquisite corpse, distro shelf, guestbook, pull from the pile, community tags, QR on the fold sheet, riso/grain finish.

## 0.6.0 — 2026-08-14

Audio / mixtape blocks, unlisted drops, optional passphrase.

## 0.5.0 — 2026-08-14

Trade / collab / feedback board, fold-and-staple print sheet.

## 0.4.0 — 2026-08-14

Watch a creator, watching lane, MAIL wire.

## 0.3.0 — 2026-08-14

Public stream, remix, sealed drops, snapshot links.

## 0.2.2 — 2026-08-14

API binds to `0.0.0.0` for container deploys.

## 0.2.1 — 2026-08-14

API / session fixes for the hosted studio.

## 0.2.0 — 2026-08-14

Optional Hono + SQLite API: claim a handle, sync drafts.

## 0.1.2 — 2026-08-14

Pages demo and PWA packaging.

## 0.1.1 — 2026-08-14

Editor and seed fixes.

## 0.1.0 — 2026-08-14

First public studio: vibes, block editor, localStorage, print issue.
