import type { Letter, MailThread, VibeId } from '../types'
import { uid } from '../id'
import { handleOf, readJson, writeJson } from './store'

const MAIL_KEY = 'zineverse.mail.v1'

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
