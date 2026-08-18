import type { Block, BlockType, VibeId } from './types'
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

/** Merge samples left to right — a later bag's set fields win, everything else passes through. */
export function combineBags(bags: AttrBag[]): AttrBag {
  return bags.reduce<AttrBag>((combined, bag) => ({ ...combined, ...bag }), {})
}

/** Same id, new type. Shared ink / photo / cut / set come along. */
export function retarget(block: Block, type: BlockType, vibe: VibeId): Block {
  if (block.type === type) return block
  const next = applyBag(createBlock(type, vibe), harvest(block))
  return { ...next, id: block.id }
}

export function widgetsWithAttr(attr: AttrId) {
  return WIDGETS.filter((widget) => widget.attrs.includes(attr))
}
