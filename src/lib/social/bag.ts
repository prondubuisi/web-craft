import type { BagItem } from '../types'
import { ownerKey, readJson, writeJson } from './store'

const BAG_KEY = 'zineverse.bag.v1'

export function loadBag(owner: string): BagItem[] {
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  return all[ownerKey(owner)] ?? []
}

export function tuckBag(owner: string, item: BagItem): BagItem[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  const next = [item, ...(all[key] ?? []).filter((row) => row.zineId !== item.zineId)].slice(0, 40)
  all[key] = next
  writeJson(BAG_KEY, all)
  return next
}

export function dumpBag(owner: string, zineId: string): BagItem[] {
  const key = ownerKey(owner)
  const all = readJson<Record<string, BagItem[]>>(BAG_KEY, {})
  const next = (all[key] ?? []).filter((row) => row.zineId !== zineId)
  all[key] = next
  writeJson(BAG_KEY, all)
  return next
}

export function inBag(owner: string, zineId: string): boolean {
  return loadBag(owner).some((row) => row.zineId === zineId)
}
