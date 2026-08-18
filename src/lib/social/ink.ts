import type { Comment, GuestNote, MarginNote, Notice, PageStat, PollTally, Review } from '../types'
import { uid } from '../id'
import { handleOf, ownerKey, readJson, writeJson } from './store'

const COMMENTS_KEY = 'zineverse.comments.v1'
const POLLS_KEY = 'zineverse.polls.v1'
const NOTICES_KEY = 'zineverse.notices.v1'
const GUEST_KEY = 'zineverse.guestbook.v1'
const PAGES_KEY = 'zineverse.pages.v1'
const REVIEW_KEY = 'zineverse.reviews.v1'
const MARGIN_KEY = 'zineverse.margins.v1'

type PollStore = Record<string, Record<string, { votes: number[]; mine: number | null }>>

export function loadLocalComments(zineId: string): Comment[] {
  const all = readJson<Record<string, Comment[]>>(COMMENTS_KEY, {})
  return all[zineId] ?? []
}

export function addLocalComment(zineId: string, author: string, body: string): Comment {
  const comment: Comment = {
    id: uid(),
    zineId,
    author: handleOf(author),
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
      read: true,
      createdAt: now - 40 * 60_000,
    },
    {
      id: 'demo-drop',
      kind: 'drop',
      actor: '@inkstain',
      zineTitle: 'midnight run',
      read: true,
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

export function addLocalNotice(
  notice: Omit<Notice, 'id' | 'createdAt' | 'read'> & Partial<Pick<Notice, 'id' | 'read'>>,
): Notice {
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

export function loadGuestNotes(profile: string): GuestNote[] {
  const all = readJson<Record<string, GuestNote[]>>(GUEST_KEY, {})
  return all[ownerKey(profile)] ?? []
}

export function addGuestNote(profile: string, author: string, body: string): GuestNote {
  const note: GuestNote = {
    id: uid(),
    author: handleOf(author),
    body: body.trim().slice(0, 200),
    createdAt: Date.now(),
  }
  const key = ownerKey(profile)
  const all = readJson<Record<string, GuestNote[]>>(GUEST_KEY, {})
  all[key] = [note, ...(all[key] ?? [])].slice(0, 40)
  writeJson(GUEST_KEY, all)
  return note
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
