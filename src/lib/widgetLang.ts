import type { Block, BlockType, VibeId } from './types'
import { artForVibe } from './vibes'
import { BLOCK_RECIPES, type AttrBag } from './blockRecipes'
import { createBlock, WIDGETS, type AttrId } from './widgets'

export type { AttrBag }

export function harvest(block: Block): AttrBag {
  const recipe = BLOCK_RECIPES[block.type] as { harvest: (next: Block) => AttrBag }
  return recipe.harvest(block)
}

export function applyBag(block: Block, bag: AttrBag): Block {
  const recipe = BLOCK_RECIPES[block.type] as { apply: (next: Block, bag: AttrBag) => Block }
  return recipe.apply(block, bag)
}

/** Swap default art and default ink when the page vibe changes. Leaves maker edits. */
export function restyleForVibe(block: Block, from: VibeId, to: VibeId): Block {
  if (from === to) return block
  const before = harvest(createBlock(block.type, from))
  const after = harvest(createBlock(block.type, to))
  const current = harvest(block)
  const bag: AttrBag = {}
  if (before.ink && current.ink === before.ink && after.ink) bag.ink = after.ink
  if (before.cite && current.cite === before.cite && after.cite) bag.cite = after.cite
  let next = Object.keys(bag).length ? applyBag(block, bag) : block
  const oldArt = artForVibe(from)
  const newArt = artForVibe(to)
  if (next.type === 'hero' && next.src === oldArt) next = { ...next, src: newArt }
  if (next.type === 'sticker' && next.src === oldArt) next = { ...next, src: newArt }
  if (next.type === 'grid') {
    next = {
      ...next,
      panels: next.panels.map((panel) => (panel.src === oldArt ? { ...panel, src: newArt } : panel)),
    }
  }
  if (next.type === 'strip') {
    next = {
      ...next,
      panels: next.panels.map((panel) => (panel.src === oldArt ? { ...panel, src: newArt } : panel)),
    }
  }
  return next
}

export function restylePageForVibe(blocks: Block[], from: VibeId, to: VibeId): Block[] {
  return blocks.map((block) => restyleForVibe(block, from, to))
}

/** Merge samples left to right — a later bag's set fields win, everything else passes through. */
export function combineBags(bags: AttrBag[]): AttrBag {
  return bags.reduce<AttrBag>((combined, bag) => ({ ...combined, ...bag }), {})
}

/** Reorder panels/cards in place. Membership stays the same. */
export function shuffleKids(block: Block, rng: () => number = Math.random): Block {
  function mix<T>(list: T[]): T[] {
    const next = [...list]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(rng() * (i + 1)))
      const a = next[i]
      const b = next[j]
      next[i] = b
      next[j] = a
    }
    return next
  }
  if (block.type === 'grid') {
    return block.panels.length < 2 ? block : { ...block, panels: mix(block.panels) }
  }
  if (block.type === 'strip') {
    return block.panels.length < 2 ? block : { ...block, panels: mix(block.panels) }
  }
  if (block.type === 'stack') {
    return block.cards.length < 2 ? block : { ...block, cards: mix(block.cards) }
  }
  return block
}

/** Same id, new type. Shared ink / photo / cut / set come along. */
export function retarget(block: Block, type: BlockType, vibe: VibeId): Block {
  if (block.type === type) return block
  const next = applyBag(createBlock(type, vibe), harvest(block))
  return { ...next, id: block.id, looks: block.looks }
}

export function widgetsWithAttr(attr: AttrId) {
  return WIDGETS.filter((widget) => widget.attrs.includes(attr))
}
