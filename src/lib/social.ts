import type { Comment, GuestNote, Listing, ListingKind, Notice, PageStat, PollTally, ShelfItem } from './types'
import { uid } from './id'

const COMMENTS_KEY = 'zineverse.comments.v1'
const POLLS_KEY = 'zineverse.polls.v1'
const NOTICES_KEY = 'zineverse.notices.v1'
const BOARD_KEY = 'zineverse.board.v1'
const GUEST_KEY = 'zineverse.guestbook.v1'
const SHELF_KEY = 'zineverse.shelf.v1'
const PAGES_KEY = 'zineverse.pages.v1'

type PollStore = Record<string, Record<string, { votes: number[]; mine: number | null }>>

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private mode
  }
}

export function loadLocalComments(zineId: string): Comment[] {
  const all = readJson<Record<string, Comment[]>>(COMMENTS_KEY, {})
  return all[zineId] ?? []
}

export function addLocalComment(zineId: string, author: string, body: string): Comment {
  const comment: Comment = {
    id: uid(),
    zineId,
    author: author.startsWith('@') || author === 'you' ? author : `@${author}`,
    body: body.trim().slice(0, 280),
    createdAt: Date.now(),
  }
  const all = readJson<Record<string, Comment[]>>(COMMENTS_KEY, {})
  all[zineId] = [...(all[zineId] ?? []), comment]
  writeJson(COMMENTS_KEY, all)
  return comment
}

export function loadLocalPolls(zineId: string): Record<string, PollTally> {
  const store = readJson<PollStore>(POLLS_KEY, {})
  const issue = store[zineId] ?? {}
  const out: Record<string, PollTally> = {}
  for (const [blockId, row] of Object.entries(issue)) {
    out[blockId] = { counts: row.votes, mine: row.mine }
  }
  return out
}

export function voteLocalPoll(
  zineId: string,
  blockId: string,
  option: number,
  optionCount: number,
): PollTally {
  const store = readJson<PollStore>(POLLS_KEY, {})
  const issue = store[zineId] ?? {}
  const prev = issue[blockId] ?? { votes: Array.from({ length: optionCount }, () => 0), mine: null }
  const votes = Array.from({ length: optionCount }, (_, i) => prev.votes[i] ?? 0)
  if (prev.mine != null && prev.mine >= 0 && prev.mine < votes.length) {
    votes[prev.mine] = Math.max(0, votes[prev.mine] - 1)
  }
  votes[option] = (votes[option] ?? 0) + 1
  issue[blockId] = { votes, mine: option }
  store[zineId] = issue
  writeJson(POLLS_KEY, store)
  return { counts: votes, mine: option }
}

function demoNotices(): Notice[] {
  const now = Date.now()
  return [
    {
      id: 'demo-like',
      kind: 'like',
      actor: '@wobble',
      zineId: undefined,
      zineTitle: 'after hours / bushwick',
      read: false,
      createdAt: now - 40 * 60_000,
    },
    {
      id: 'demo-drop',
      kind: 'drop',
      actor: '@inkstain',
      zineTitle: 'midnight run',
      read: false,
      createdAt: now - 12 * 60_000,
    },
    {
      id: 'demo-follow',
      kind: 'follow',
      actor: '@yuzu',
      read: true,
      createdAt: now - 3 * 3600_000,
    },
  ]
}

export function loadLocalNotices(): Notice[] {
  const stored = readJson<Notice[] | null>(NOTICES_KEY, null)
  if (stored) return stored
  const seeded = demoNotices()
  writeJson(NOTICES_KEY, seeded)
  return seeded
}

export function saveLocalNotices(notices: Notice[]): void {
  writeJson(NOTICES_KEY, notices)
}

export function addLocalNotice(notice: Omit<Notice, 'id' | 'createdAt' | 'read'> & Partial<Pick<Notice, 'id' | 'read'>>): Notice {
  const next: Notice = {
    id: notice.id ?? uid(),
    kind: notice.kind,
    actor: notice.actor.startsWith('@') ? notice.actor : `@${notice.actor}`,
    zineId: notice.zineId,
    zineTitle: notice.zineTitle,
    body: notice.body,
    read: notice.read ?? false,
    createdAt: Date.now(),
  }
  const all = [next, ...loadLocalNotices()].slice(0, 50)
  writeJson(NOTICES_KEY, all)
  return next
}

export function markLocalNoticesRead(): Notice[] {
  const next = loadLocalNotices().map((item) => ({ ...item, read: true }))
  writeJson(NOTICES_KEY, next)
  return next
}

export function noticeCopy(notice: Notice): string {
  const who = notice.actor
  if (notice.kind === 'like') return `${who} stamped ${notice.zineTitle ?? 'your issue'}`
  if (notice.kind === 'comment') return `${who} inked a letter on ${notice.zineTitle ?? 'your issue'}`
  if (notice.kind === 'remix') return `${who} remixed ${notice.zineTitle ?? 'your issue'}`
  if (notice.kind === 'follow') return `${who} is watching your wall`
  return `${who} dropped ${notice.zineTitle ?? 'a new issue'}`
}

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
    author: author.startsWith('@') || author === 'you' ? author : `@${author}`,
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

function handleOf(name: string): string {
  return name.startsWith('@') || name === 'you' ? name : `@${name}`
}

export function loadGuestNotes(profile: string): GuestNote[] {
  const all = readJson<Record<string, GuestNote[]>>(GUEST_KEY, {})
  return all[profile.replace(/^@/, '')] ?? []
}

export function addGuestNote(profile: string, author: string, body: string): GuestNote {
  const note: GuestNote = {
    id: uid(),
    author: handleOf(author),
    body: body.trim().slice(0, 200),
    createdAt: Date.now(),
  }
  const key = profile.replace(/^@/, '')
  const all = readJson<Record<string, GuestNote[]>>(GUEST_KEY, {})
  all[key] = [note, ...(all[key] ?? [])].slice(0, 40)
  writeJson(GUEST_KEY, all)
  return note
}

export function loadShelf(owner: string): ShelfItem[] {
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  return all[owner.replace(/^@/, '')] ?? []
}

export function stockShelf(owner: string, item: ShelfItem): ShelfItem[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  const next = [item, ...(all[key] ?? []).filter((row) => row.zineId !== item.zineId)].slice(0, 24)
  all[key] = next
  writeJson(SHELF_KEY, all)
  return next
}

export function unstockShelf(owner: string, zineId: string): ShelfItem[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, ShelfItem[]>>(SHELF_KEY, {})
  const next = (all[key] ?? []).filter((row) => row.zineId !== zineId)
  all[key] = next
  writeJson(SHELF_KEY, all)
  return next
}

export function loadPageStats(zineId: string): PageStat[] {
  const all = readJson<Record<string, PageStat[]>>(PAGES_KEY, {})
  return all[zineId] ?? []
}

export function bumpPageStat(zineId: string, page: number, dwellMs: number): PageStat[] {
  const all = readJson<Record<string, PageStat[]>>(PAGES_KEY, {})
  const rows = all[zineId] ?? []
  const found = rows.find((row) => row.page === page)
  if (found) {
    found.views += 1
    found.dwellMs += Math.max(0, dwellMs)
  } else {
    rows.push({ page, views: 1, dwellMs: Math.max(0, dwellMs) })
  }
  all[zineId] = rows.sort((a, b) => a.page - b.page)
  writeJson(PAGES_KEY, all)
  return all[zineId]
}
