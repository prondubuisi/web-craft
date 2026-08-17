import { handleOf, ownerKey, readJson, writeJson } from './store'

const CLAIM_KEY = 'zineverse.claims.v1'
const SERIES_KEY = 'zineverse.serieswatch.v1'

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

export function loadSeriesWatch(owner: string): string[] {
  const all = readJson<Record<string, string[]>>(SERIES_KEY, {})
  return all[ownerKey(owner)] ?? []
}

export function toggleSeriesWatch(owner: string, series: string): string[] {
  const key = ownerKey(owner)
  const name = series.trim().toLowerCase()
  if (!name) return loadSeriesWatch(owner)
  const all = readJson<Record<string, string[]>>(SERIES_KEY, {})
  const prev = all[key] ?? []
  const next = prev.includes(name) ? prev.filter((row) => row !== name) : [...prev, name]
  all[key] = next
  writeJson(SERIES_KEY, all)
  return next
}
