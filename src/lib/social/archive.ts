import type { BagItem, Loan } from '../types'
import { ARCHIVE_THRESHOLD } from '../jam'
import { tuckBag } from './bag'
import { handleOf, ownerKey, readJson, writeJson } from './store'

const NOM_KEY = 'zineverse.noms.v1'
const LOAN_KEY = 'zineverse.loans.v1'

export const LOAN_MS = 7 * 86400_000

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

export function loadLoans(owner: string): Loan[] {
  const all = readJson<Record<string, Loan[]>>(LOAN_KEY, {})
  const now = Date.now()
  return (all[ownerKey(owner)] ?? []).filter((row) => row.dueAt > now)
}

export function checkoutLocal(
  owner: string,
  zineId: string,
  title: string,
  extra?: Pick<BagItem, 'owner' | 'vibe'>,
): Loan[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, Loan[]>>(LOAN_KEY, {})
  const now = Date.now()
  const live = (all[key] ?? []).filter((row) => row.dueAt > now)
  if (!live.some((row) => row.zineId === zineId)) {
    live.unshift({ zineId, title, dueAt: now + LOAN_MS })
  }
  all[key] = live.slice(0, 12)
  writeJson(LOAN_KEY, all)
  tuckBag(owner, { zineId, title, owner: extra?.owner ?? owner, vibe: extra?.vibe })
  return all[key]
}
