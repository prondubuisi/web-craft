import type { CorkPin, FestTable, Listing, ListingKind, ShelfItem, Stamp } from '../types'
import { demoTables } from '../fest'
import { uid } from '../id'
import { handleOf, ownerKey, readJson, writeJson } from './store'

const BOARD_KEY = 'zineverse.board.v1'
const SHELF_KEY = 'zineverse.shelf.v1'
const FEST_KEY = 'zineverse.fest.v1'
const STAMP_KEY = 'zineverse.stamps.v1'
const CORK_KEY = 'zineverse.cork.v1'
const SIT_KEY = 'zineverse.sits.v1'

function demoListings(): Listing[] {
  const now = Date.now()
  return [
    {
      id: 'list-1',
      author: '@wobble',
      kind: 'trade',
      body: 'sunday market stickers for your ham pages. i mail first.',
      zineTitle: 'sunday market',
      createdAt: now - 5 * 3600_000,
    },
    {
      id: 'list-2',
      author: '@yuzu',
      kind: 'collab',
      body: 'need a guest panel for booth 12. robots that apologize preferred.',
      zineTitle: 'sunday market',
      createdAt: now - 3 * 3600_000,
    },
    {
      id: 'list-3',
      author: '@inkstain',
      kind: 'feedback',
      body: 'issue 13 — too much rain or not enough?',
      zineTitle: 'issue 13',
      createdAt: now - 90 * 60_000,
    },
    {
      id: 'list-4',
      author: '@rio.bytes',
      kind: 'trade',
      body: 'dimension hop for anything that glitches on purpose.',
      zineTitle: 'dimension hop',
      createdAt: now - 40 * 60_000,
    },
  ]
}

export function loadLocalListings(): Listing[] {
  const stored = readJson<Listing[] | null>(BOARD_KEY, null)
  if (stored) return stored
  const seeded = demoListings()
  writeJson(BOARD_KEY, seeded)
  return seeded
}

export function addLocalListing(
  author: string,
  kind: ListingKind,
  body: string,
  extra?: { zineId?: string; zineTitle?: string },
): Listing {
  const listing: Listing = {
    id: uid(),
    author: handleOf(author),
    kind,
    body: body.trim().slice(0, 280),
    zineId: extra?.zineId,
    zineTitle: extra?.zineTitle,
    createdAt: Date.now(),
  }
  writeJson(BOARD_KEY, [listing, ...loadLocalListings()])
  return listing
}

export function removeLocalListing(id: string): Listing[] {
  const next = loadLocalListings().filter((item) => item.id !== id)
  writeJson(BOARD_KEY, next)
  return next
}

export function swapLocalListing(id: string): Listing[] {
  const next = loadLocalListings().map((item) =>
    item.id === id ? { ...item, swapped: !item.swapped } : item,
  )
  writeJson(BOARD_KEY, next)
  return next
}

export function loadShelf(owner: string): ShelfItem[] {
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  return all[ownerKey(owner)] ?? []
}

export function stockShelf(owner: string, item: ShelfItem): ShelfItem[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  const next = [item, ...(all[key] ?? []).filter((row) => row.zineId !== item.zineId)].slice(0, 24)
  all[key] = next
  writeJson(SHELF_KEY, all)
  return next
}

export function unstockShelf(owner: string, zineId: string): ShelfItem[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  const next = (all[key] ?? []).filter((row) => row.zineId !== zineId)
  all[key] = next
  writeJson(SHELF_KEY, all)
  return next
}

export function loadTables(): FestTable[] {
  const stored = readJson<FestTable[] | null>(FEST_KEY, null)
  if (stored) return stored
  const seeded = demoTables()
  writeJson(FEST_KEY, seeded)
  return seeded
}

export function upsertTable(table: FestTable): FestTable[] {
  const next = [table, ...loadTables().filter((row) => row.owner !== table.owner && row.id !== table.id)]
  writeJson(FEST_KEY, next)
  return next
}

export function loadStamps(owner: string): Stamp[] {
  const all = readJson<Record<string, Stamp[]>>(STAMP_KEY, {})
  return all[ownerKey(owner)] ?? []
}

export function stampIssue(owner: string, stamp: Stamp): Stamp[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, Stamp[]>>(STAMP_KEY, {})
  const prev = all[key] ?? []
  if (prev.some((row) => row.zineId === stamp.zineId)) return prev
  const next = [stamp, ...prev].slice(0, 48)
  all[key] = next
  writeJson(STAMP_KEY, all)
  return next
}

export function loadCork(owner: string): CorkPin[] {
  const all = readJson<Record<string, CorkPin[]>>(CORK_KEY, {})
  return all[ownerKey(owner)] ?? []
}

export function saveCork(owner: string, pins: CorkPin[]): CorkPin[] {
  const all = readJson<Record<string, CorkPin[]>>(CORK_KEY, {})
  all[ownerKey(owner)] = pins.slice(0, 40)
  writeJson(CORK_KEY, all)
  return all[ownerKey(owner)]
}

export function loadSits(tableId: string): string[] {
  const all = readJson<Record<string, string[]>>(SIT_KEY, {})
  return all[tableId] ?? []
}

export function toggleSit(tableId: string, who: string): string[] {
  const handle = handleOf(who)
  const all = readJson<Record<string, string[]>>(SIT_KEY, {})
  const prev = all[tableId] ?? []
  const next = prev.includes(handle) ? prev.filter((row) => row !== handle) : [...prev, handle]
  all[tableId] = next
  writeJson(SIT_KEY, all)
  return next
}
