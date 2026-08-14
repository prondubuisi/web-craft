import type { Comment, PollTally } from './types'
import { uid } from './id'

const COMMENTS_KEY = 'zineverse.comments.v1'
const POLLS_KEY = 'zineverse.polls.v1'

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
