import type { Block, BlockType, VibeId } from './types'
import { createBlock, WIDGETS, type AttrId } from './widgets'

/** Harvested ink/matter/cut. Recipes combine these; retarget plants what still fits. */
export type AttrBag = {
  ink?: string
  cite?: string
  photo?: string
  tape?: string
  size?: 'xl' | 'lg' | 'md'
  tilt?: number
  density?: number
  split?: number
  style?: 'scribble' | 'speed' | 'zip'
  layout?: 'two' | 'three' | 'asymmetric'
  x?: number
  y?: number
  items?: string[]
  holes?: number[]
}

const FILLS = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)']

export function harvest(block: Block): AttrBag {
  switch (block.type) {
    case 'heading':
      return { ink: block.text, size: block.size }
    case 'sticker':
      return { ink: block.text, photo: block.src, tilt: block.rotation, x: block.x, y: block.y }
    case 'hero':
      return {
        ink: block.caption,
        photo: block.src,
        density: block.density,
        split: block.split,
        x: block.x,
        y: block.y,
      }
    case 'grid':
      return {
        items: block.panels.map((panel) => panel.text),
        photo: block.panels.find((panel) => panel.src)?.src,
        layout: block.layout,
      }
    case 'divider':
      return { style: block.style }
    case 'sfx':
      return { ink: block.word }
    case 'glitch':
      return { ink: block.text }
    case 'stack':
      return { ink: block.cards[0]?.body, items: block.cards.map((card) => card.title) }
    case 'quote':
      return { ink: block.text, cite: block.cite }
    case 'poll':
      return { ink: block.question, items: block.options }
    case 'audio':
      return { ink: block.caption, tape: block.src }
    case 'strip':
      return {
        items: block.panels.map((panel) => panel.text),
        photo: block.panels.find((panel) => panel.src)?.src,
      }
    case 'colophon':
      return { ink: block.thanks, cite: block.press }
    case 'blackout':
      return { ink: block.text, holes: block.hidden }
    case 'contents':
      return { items: block.lines.map((line) => line.label) }
    case 'insert':
      return { ink: block.text, cite: block.title }
    case 'reply':
      return { ink: block.prompt }
  }
}

export function applyBag(block: Block, bag: AttrBag): Block {
  switch (block.type) {
    case 'heading':
      return { ...block, text: bag.ink?.trim() || block.text, size: bag.size ?? block.size }
    case 'sticker':
      return {
        ...block,
        text: bag.ink?.trim() || block.text,
        src: bag.photo || block.src,
        rotation: bag.tilt ?? block.rotation,
        x: bag.x ?? block.x,
        y: bag.y ?? block.y,
      }
    case 'hero':
      return {
        ...block,
        caption: bag.ink?.trim() || block.caption,
        src: bag.photo || block.src,
        density: bag.density ?? block.density,
        split: bag.split ?? block.split,
        x: bag.x ?? block.x,
        y: bag.y ?? block.y,
      }
    case 'grid':
      return {
        ...block,
        layout: bag.layout ?? block.layout,
        panels: bag.items?.length
          ? bag.items.slice(0, 6).map((text, i) => ({
              text,
              fill: FILLS[i % 3],
              src: i === 1 ? bag.photo : undefined,
            }))
          : block.panels,
      }
    case 'divider':
      return { ...block, style: bag.style ?? block.style }
    case 'sfx':
      return { ...block, word: (bag.ink?.trim() || block.word).slice(0, 32) }
    case 'glitch':
      return { ...block, text: bag.ink?.trim() || block.text }
    case 'stack':
      return {
        ...block,
        cards: bag.items?.length
          ? bag.items.slice(0, 6).map((title, i) => ({
              title,
              body: i === 0 && bag.ink ? bag.ink : 'write on the back.',
            }))
          : block.cards,
      }
    case 'quote':
      return {
        ...block,
        text: bag.ink?.trim() || block.text,
        cite: bag.cite?.trim() || block.cite,
      }
    case 'poll':
      return {
        ...block,
        question: bag.ink?.trim() || block.question,
        options: bag.items && bag.items.length >= 2 ? bag.items.slice(0, 6) : block.options,
      }
    case 'audio':
      return {
        ...block,
        caption: bag.ink?.trim() || block.caption,
        src: bag.tape || block.src,
      }
    case 'strip':
      return {
        ...block,
        panels: bag.items?.length
          ? bag.items.slice(0, 6).map((text, i) => ({
              text,
              src: i === 1 ? bag.photo : undefined,
            }))
          : block.panels,
      }
    case 'colophon':
      return {
        ...block,
        thanks: bag.ink?.trim() || block.thanks,
        press: bag.cite?.trim() || block.press,
      }
    case 'blackout':
      return {
        ...block,
        text: bag.ink?.trim() || block.text,
        hidden: bag.holes ?? block.hidden,
      }
    case 'contents':
      return {
        ...block,
        lines: bag.items?.length ? bag.items.map((label) => ({ label })) : block.lines,
      }
    case 'insert':
      return {
        ...block,
        text: bag.ink?.trim() || block.text,
        title: bag.cite?.trim() || block.title,
      }
    case 'reply':
      return { ...block, prompt: bag.ink?.trim() || block.prompt }
  }
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
