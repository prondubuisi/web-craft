import type { Block, LookLayer, VibeId } from './types'
import { applyBag, combineBags, harvest, type AttrBag } from './widgetLang'
import { createBlock } from './widgets'

export const EYEDROP_LABEL = 'eyedropper'
export const SAMPLE_MIME = 'application/x-zine-sample'

export function looksOf(block: Block): LookLayer[] {
  return block.looks ?? []
}

export function bagKeys(bag: AttrBag): (keyof AttrBag)[] {
  return (Object.keys(bag) as (keyof AttrBag)[]).filter((key) => bag[key] !== undefined)
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function changedKeys(before: AttrBag, after: AttrBag): (keyof AttrBag)[] {
  const keys = new Set<(keyof AttrBag)>([...bagKeys(before), ...bagKeys(after)])
  return [...keys].filter((key) => !sameValue(before[key], after[key]))
}

function layerBag(layer: LookLayer): AttrBag {
  const bag = { ...layer.bag } as AttrBag
  if (!layer.overridden?.length) return bag
  for (const key of layer.overridden) {
    delete bag[key as keyof AttrBag]
  }
  return bag
}

function restoreFrom(current: AttrBag, keys: Iterable<keyof AttrBag>): AttrBag {
  const next: AttrBag = {}
  for (const key of keys) {
    const value = current[key]
    if (value !== undefined) (next as Record<string, unknown>)[key] = value
  }
  return next
}

/**
 * Rebuild `block` from a fresh widget plus `looks`, then put back anything
 * the maker overrode by hand and any field no layer in the *previous* stack
 * ever touched (uploads, typed copy that never came from a sample).
 *
 * Using the previous stack's keys is what makes "remove one of three" match
 * "never applied that one" — a field only the removed layer set reverts.
 */
export function replayLooks(block: Block, looks: LookLayer[], vibe: VibeId): Block {
  const prev = looksOf(block)
  const prevKeys = new Set(prev.flatMap((layer) => bagKeys(layer.bag as AttrBag)))
  const prevOverridden = new Set(prev.flatMap((layer) => layer.overridden ?? []))
  const current = harvest(block)
  const combined = combineBags(looks.map(layerBag))
  let next = applyBag({ ...createBlock(block.type, vibe), id: block.id }, combined)
  const keep = new Set<keyof AttrBag>()
  for (const key of bagKeys(current)) {
    if (prevOverridden.has(key) || !prevKeys.has(key)) keep.add(key)
  }
  const restored = restoreFrom(current, keep)
  if (bagKeys(restored).length) next = applyBag(next, restored)
  return { ...next, looks }
}

export function applyLook(block: Block, layer: LookLayer): Block {
  const applied = applyBag(block, layer.bag as AttrBag)
  return { ...applied, looks: [...looksOf(block), layer] }
}

export function toggleLook(block: Block, layer: LookLayer, vibe: VibeId): Block {
  const looks = looksOf(block)
  const idx = looks.findLastIndex((item) => item.label === layer.label)
  if (idx >= 0) return replayLooks(block, looks.filter((_, i) => i !== idx), vibe)
  return applyLook(block, layer)
}

export function removeLook(block: Block, index: number, vibe: VibeId): Block {
  return replayLooks(
    block,
    looksOf(block).filter((_, i) => i !== index),
    vibe,
  )
}

export function reorderLooks(block: Block, from: number, to: number, vibe: VibeId): Block {
  const looks = [...looksOf(block)]
  if (from < 0 || to < 0 || from >= looks.length || to >= looks.length || from === to) {
    return block
  }
  const [item] = looks.splice(from, 1)
  looks.splice(to, 0, item)
  return replayLooks(block, looks, vibe)
}

function looksSignature(looks: LookLayer[]): string {
  return looks.map((layer) => layer.label).join('\0')
}

/**
 * Mark stack keys the maker just hand-edited as overridden. Skips when the
 * looks list itself changed (apply / remove / reorder) so a freshly planted
 * scrap is not immediately flagged as overridden by its own fields.
 */
export function withOverrides(prev: Block, next: Block): Block {
  if (looksSignature(looksOf(prev)) !== looksSignature(looksOf(next))) return next
  const keys = changedKeys(harvest(prev), harvest(next))
  if (!keys.length) return next
  const looks = looksOf(prev).map((layer) => {
    const hit = bagKeys(layer.bag as AttrBag).filter((key) => keys.includes(key))
    if (!hit.length) return layer
    return { ...layer, overridden: [...new Set([...(layer.overridden ?? []), ...hit])] }
  })
  return { ...next, looks }
}

export function breakingLooks(prev: Block, next: Block): LookLayer[] {
  const keys = changedKeys(harvest(prev), harvest(next))
  if (!keys.length) return []
  return looksOf(prev).filter((layer) => {
    if (!layer.linked) return false
    return bagKeys(layer.bag as AttrBag).some(
      (key) => keys.includes(key) && !layer.overridden?.includes(key),
    )
  })
}

export function unlinkLooks(block: Block, layers: LookLayer[], keys: (keyof AttrBag)[]): Block {
  const labels = new Set(layers.map((layer) => layer.label))
  const looks = looksOf(block).map((layer) => {
    if (!labels.has(layer.label) || !layer.linked) return layer
    return {
      ...layer,
      linked: false,
      overridden: [...new Set([...(layer.overridden ?? []), ...keys])],
    }
  })
  return { ...block, looks }
}

function bagCovers(current: AttrBag, slim: AttrBag): boolean {
  return bagKeys(slim).every((key) => sameValue(current[key], slim[key]))
}

/** Return the same block reference when the live link is already applied. */
export function mergeLinkedLooks(block: Block, layers: LookLayer[], slim: AttrBag): Block {
  const current = harvest(block)
  const looks = [...looksOf(block)]
  let changed = !bagCovers(current, slim)
  for (const layer of layers) {
    const existing = looks.findIndex((item) => item.label === layer.label && item.linked)
    if (existing >= 0) {
      if (!sameValue(looks[existing].bag, layer.bag)) {
        looks[existing] = { ...looks[existing], bag: layer.bag, linked: true }
        changed = true
      }
    } else {
      looks.push({ ...layer, linked: true })
      changed = true
    }
  }
  if (!changed) return block
  const applied = bagCovers(current, slim) ? block : applyBag(block, slim)
  return { ...applied, looks }
}
