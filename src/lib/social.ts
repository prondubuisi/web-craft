import type {
  BagItem,
  Comment,
  CorkPin,
  GuestNote,
  Loan,
  Letter,
  Listing,
  ListingKind,
  MailThread,
  MarginNote,
  Notice,
  PageStat,
  PollTally,
  Review,
  ShelfItem,
  FestTable,
  Stamp,
  VibeId,
} from './types'
import { demoTables } from './fest'
import { ARCHIVE_THRESHOLD } from './jam'
import { uid } from './id'

const COMMENTS_KEY = 'zineverse.comments.v1'
const POLLS_KEY = 'zineverse.polls.v1'
const NOTICES_KEY = 'zineverse.notices.v1'
const BOARD_KEY = 'zineverse.board.v1'
const GUEST_KEY = 'zineverse.guestbook.v1'
const SHELF_KEY = 'zineverse.shelf.v1'
const PAGES_KEY = 'zineverse.pages.v1'
const BAG_KEY = 'zineverse.bag.v1'
const REVIEW_KEY = 'zineverse.reviews.v1'
const MAIL_KEY = 'zineverse.mail.v1'
const MARGIN_KEY = 'zineverse.margins.v1'
const NOM_KEY = 'zineverse.noms.v1'
const FEST_KEY = 'zineverse.fest.v1'
const STAMP_KEY = 'zineverse.stamps.v1'
const CLAIM_KEY = 'zineverse.claims.v1'
const CORK_KEY = 'zineverse.cork.v1'
const LOAN_KEY = 'zineverse.loans.v1'
const SERIES_KEY = 'zineverse.serieswatch.v1'
const SIT_KEY = 'zineverse.sits.v1'

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
  if (notice.kind === 'review') return `${who} blurb'd ${notice.zineTitle ?? 'your issue'}`
  if (notice.kind === 'mail') {
    return notice.body?.startsWith('postcard:')
      ? `${who} mailed you a postcard`
      : `${who} sent you a letter`
  }
  if (notice.kind === 'archive') return `${who} nominated ${notice.zineTitle ?? 'your issue'} for the archive`
  if (notice.kind === 'dedicate') return `${who} dedicated ${notice.zineTitle ?? 'an issue'} to you`
  if (notice.kind === 'series') return `${who} dropped the next ${notice.body ?? 'issue'} in a run you watch`
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

export function swapLocalListing(id: string): Listing[] {
  const next = loadLocalListings().map((item) =>
    item.id === id ? { ...item, swapped: !item.swapped } : item,
  )
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

export function loadBag(owner: string): BagItem[] {
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  return all[owner.replace(/^@/, '')] ?? []
}

export function tuckBag(owner: string, item: BagItem): BagItem[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  const next = [item, ...(all[key] ?? []).filter((row) => row.zineId !== item.zineId)].slice(0, 40)
  all[key] = next
  writeJson(BAG_KEY, all)
  return next
}

export function dumpBag(owner: string, zineId: string): BagItem[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  const next = (all[key] ?? []).filter((row) => row.zineId !== zineId)
  all[key] = next
  writeJson(BAG_KEY, all)
  return next
}

export function inBag(owner: string, zineId: string): boolean {
  return loadBag(owner).some((row) => row.zineId === zineId)
}

export function loadReviews(zineId: string): Review[] {
  const all = readJson<Record<string, Review[]>>(REVIEW_KEY, {})
  return all[zineId] ?? []
}

export function upsertReview(zineId: string, author: string, body: string): Review {
  const review: Review = {
    id: uid(),
    zineId,
    author: handleOf(author),
    body: body.trim().slice(0, 240),
    createdAt: Date.now(),
  }
  const all = readJson<Record<string, Review[]>>(REVIEW_KEY, {})
  const rest = (all[zineId] ?? []).filter((row) => row.author !== review.author)
  all[zineId] = [review, ...rest].slice(0, 40)
  writeJson(REVIEW_KEY, all)
  return review
}

function demoLetters(): Letter[] {
  const now = Date.now()
  return [
    {
      id: 'mail-1',
      from: '@yuzu',
      to: 'you',
      body: 'booth 12 still has bows if you mail first.',
      read: false,
      createdAt: now - 2 * 3600_000,
    },
    {
      id: 'mail-2',
      from: 'you',
      to: '@yuzu',
      body: 'sending sunday stickers. save me a bow.',
      read: true,
      createdAt: now - 90 * 60_000,
    },
  ]
}

export function loadLetters(): Letter[] {
  const stored = readJson<Letter[] | null>(MAIL_KEY, null)
  if (stored) return stored
  const seeded = demoLetters()
  writeJson(MAIL_KEY, seeded)
  return seeded
}

export function sendLetter(
  from: string,
  to: string,
  body: string,
  extra?: { postcard?: boolean; vibe?: VibeId },
): Letter {
  const letter: Letter = {
    id: uid(),
    from: handleOf(from),
    to: handleOf(to),
    body: body.trim().slice(0, extra?.postcard ? 140 : 400),
    read: false,
    createdAt: Date.now(),
    postcard: extra?.postcard,
    vibe: extra?.vibe,
  }
  writeJson(MAIL_KEY, [letter, ...loadLetters()].slice(0, 120))
  return letter
}

function samePerson(a: string, b: string): boolean {
  return a.replace(/^@/, '').toLowerCase() === b.replace(/^@/, '').toLowerCase()
}

export function threadWith(me: string, other: string): Letter[] {
  return loadLetters()
    .filter(
      (row) =>
        (samePerson(row.from, me) && samePerson(row.to, other)) ||
        (samePerson(row.from, other) && samePerson(row.to, me)),
    )
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function listThreads(me: string): MailThread[] {
  const mine = loadLetters().filter((row) => samePerson(row.from, me) || samePerson(row.to, me))
  const map = new Map<string, Letter[]>()
  for (const letter of mine) {
    const other = samePerson(letter.from, me) ? letter.to : letter.from
    const key = other.replace(/^@/, '').toLowerCase()
    map.set(key, [...(map.get(key) ?? []), letter])
  }
  return [...map.entries()]
    .map(([handle, rows]) => {
      const last = rows.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      return {
        handle,
        last,
        unread: rows.filter((row) => samePerson(row.to, me) && !row.read).length,
      }
    })
    .sort((a, b) => b.last.createdAt - a.last.createdAt)
}

export function markThreadRead(me: string, other: string): Letter[] {
  const next = loadLetters().map((row) =>
    samePerson(row.to, me) && samePerson(row.from, other) ? { ...row, read: true } : row,
  )
  writeJson(MAIL_KEY, next)
  return next
}

export function loadMargins(zineId: string): MarginNote[] {
  const all = readJson<Record<string, MarginNote[]>>(MARGIN_KEY, {})
  return all[zineId] ?? []
}

export function addMargin(zineId: string, blockId: string, author: string, body: string): MarginNote {
  const note: MarginNote = {
    id: uid(),
    zineId,
    blockId,
    author: handleOf(author),
    body: body.trim().slice(0, 160),
    createdAt: Date.now(),
  }
  const all = readJson<Record<string, MarginNote[]>>(MARGIN_KEY, {})
  all[zineId] = [...(all[zineId] ?? []), note].slice(-80)
  writeJson(MARGIN_KEY, all)
  return note
}

export function loadNoms(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(NOM_KEY, {})
}

export function nominateLocal(owner: string, zineId: string): { noms: number; archived: boolean; mine: boolean } {
  const who = handleOf(owner)
  const all = loadNoms()
  const voters = all[zineId] ?? []
  const mine = voters.includes(who)
  const next = mine ? voters.filter((name) => name !== who) : [...voters, who]
  all[zineId] = next
  writeJson(NOM_KEY, all)
  return { noms: next.length, archived: next.length >= ARCHIVE_THRESHOLD, mine: !mine }
}

export function nomState(owner: string, zineId: string): { noms: number; archived: boolean; mine: boolean } {
  const voters = loadNoms()[zineId] ?? []
  const who = handleOf(owner)
  return { noms: voters.length, archived: voters.length >= ARCHIVE_THRESHOLD, mine: voters.includes(who) }
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
  return all[owner.replace(/^@/, '')] ?? []
}

export function stampIssue(owner: string, stamp: Stamp): Stamp[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, Stamp[]>>(STAMP_KEY, {})
  const prev = all[key] ?? []
  if (prev.some((row) => row.zineId === stamp.zineId)) return prev
  const next = [stamp, ...prev].slice(0, 48)
  all[key] = next
  writeJson(STAMP_KEY, all)
  return next
}

export function claimLocal(
  owner: string,
  zineId: string,
  editionSize: number,
): { claimed: number; mine: boolean; out: boolean } {
  const who = handleOf(owner)
  const all = readJson<Record<string, string[]>>(CLAIM_KEY, {})
  const holders = all[zineId] ?? []
  if (holders.includes(who)) {
    return { claimed: holders.length, mine: true, out: holders.length >= editionSize }
  }
  if (holders.length >= editionSize) {
    return { claimed: holders.length, mine: false, out: true }
  }
  const next = [...holders, who]
  all[zineId] = next
  writeJson(CLAIM_KEY, all)
  return { claimed: next.length, mine: true, out: next.length >= editionSize }
}

export function claimState(owner: string, zineId: string, editionSize = 0) {
  const holders = readJson<Record<string, string[]>>(CLAIM_KEY, {})[zineId] ?? []
  return {
    claimed: holders.length,
    mine: holders.includes(handleOf(owner)),
    out: editionSize > 0 && holders.length >= editionSize,
  }
}

export function loadCork(owner: string): CorkPin[] {
  const all = readJson<Record<string, CorkPin[]>>(CORK_KEY, {})
  return all[owner.replace(/^@/, '')] ?? []
}

export function saveCork(owner: string, pins: CorkPin[]): CorkPin[] {
  const all = readJson<Record<string, CorkPin[]>>(CORK_KEY, {})
  all[owner.replace(/^@/, '')] = pins.slice(0, 40)
  writeJson(CORK_KEY, all)
  return all[owner.replace(/^@/, '')]
}

export const LOAN_MS = 7 * 86400_000

export function loadLoans(owner: string): Loan[] {
  const all = readJson<Record<string, Loan[]>>(LOAN_KEY, {})
  const now = Date.now()
  return (all[owner.replace(/^@/, '')] ?? []).filter((row) => row.dueAt > now)
}

export function loadSeriesWatch(owner: string): string[] {
  const all = readJson<Record<string, string[]>>(SERIES_KEY, {})
  return all[owner.replace(/^@/, '')] ?? []
}

export function toggleSeriesWatch(owner: string, series: string): string[] {
  const key = owner.replace(/^@/, '')
  const name = series.trim().toLowerCase()
  if (!name) return loadSeriesWatch(owner)
  const all = readJson<Record<string, string[]>>(SERIES_KEY, {})
  const prev = all[key] ?? []
  const next = prev.includes(name) ? prev.filter((row) => row !== name) : [...prev, name]
  all[key] = next
  writeJson(SERIES_KEY, all)
  return next
}

export function loadSits(tableId: string): string[] {
  const all = readJson<Record<string, string[]>>(SIT_KEY, {})
  return all[tableId] ?? []
}

export function toggleSit(tableId: string, who: string): string[] {
  const handle = who.startsWith('@') || who === 'you' ? who : `@${who}`
  const all = readJson<Record<string, string[]>>(SIT_KEY, {})
  const prev = all[tableId] ?? []
  const next = prev.includes(handle) ? prev.filter((row) => row !== handle) : [...prev, handle]
  all[tableId] = next
  writeJson(SIT_KEY, all)
  return next
}

export function checkoutLocal(owner: string, zineId: string, title: string): Loan[] {
  const key = owner.replace(/^@/, '')
  const all = readJson<Record<string, Loan[]>>(LOAN_KEY, {})
  const now = Date.now()
  const live = (all[key] ?? []).filter((row) => row.dueAt > now)
  if (live.some((row) => row.zineId === zineId)) {
    all[key] = live
    writeJson(LOAN_KEY, all)
    return live
  }
  const next = [{ zineId, title, dueAt: now + LOAN_MS }, ...live].slice(0, 12)
  all[key] = next
  writeJson(LOAN_KEY, all)
  return next
}
