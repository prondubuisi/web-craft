import type { Block, BlockType, ContentsBlock, VibeId } from './types'
import { uid } from './id'
import { BLOCK_RECIPES } from './blockRecipes'

export type WidgetLane = 'page' | 'ink' | 'bind'

/** Shared cuts of a widget. Recipes in the tray are combinations of these. */
export type AttrId = 'ink' | 'photo' | 'tape' | 'cut' | 'pin' | 'set' | 'cite' | 'holes'

export const ATTRS: AttrId[] = ['ink', 'photo', 'tape', 'cut', 'pin', 'set', 'cite', 'holes']

export type WidgetDef = {
  type: BlockType
  slash: string
  label: string
  hint: string
  glyph: string
  lane: WidgetLane
  attrs: AttrId[]
}

export const LANES: { id: WidgetLane; label: string }[] = [
  { id: 'page', label: 'page' },
  { id: 'ink', label: 'ink' },
  { id: 'bind', label: 'bind' },
]

export const WIDGETS: WidgetDef[] = [
  { type: 'heading', slash: 'heading', label: 'Scribble title', hint: 'Hand-drawn headline', glyph: 'Aa', lane: 'page', attrs: ['ink', 'cut'] },
  { type: 'sticker', slash: 'sticker', label: 'Sticker box', hint: 'Thick border, slight tilt', glyph: '▣', lane: 'page', attrs: ['ink', 'photo', 'cut', 'pin'] },
  { type: 'hero', slash: 'halftone', label: 'Halftone hero', hint: 'Image + dots + RGB split', glyph: '◉', lane: 'page', attrs: ['ink', 'photo', 'cut', 'pin'] },
  { type: 'grid', slash: 'panel', label: 'Action grid', hint: 'Comic panels with gutters', glyph: '▦', lane: 'page', attrs: ['set', 'cut', 'photo'] },
  { type: 'divider', slash: 'scribble', label: 'Scribble divider', hint: 'Speed lines between beats', glyph: '∿', lane: 'page', attrs: ['cut'] },
  { type: 'stack', slash: 'stack', label: 'Zine stack', hint: 'Overlapping scrapbook cards', glyph: '▤', lane: 'page', attrs: ['set', 'ink'] },
  { type: 'strip', slash: 'strip', label: 'Mini comic', hint: 'Four panels in a row', glyph: '▮', lane: 'page', attrs: ['set', 'photo'] },
  { type: 'sfx', slash: 'sfx', label: 'Sound FX', hint: 'THWIP / POW / ZAP', glyph: '!', lane: 'ink', attrs: ['ink'] },
  { type: 'glitch', slash: 'glitch', label: 'Glitch layer', hint: 'Misregistered emphasis', glyph: '≠', lane: 'ink', attrs: ['ink'] },
  { type: 'quote', slash: 'quote', label: 'Pull quote', hint: 'Hand-lettered citation', glyph: '“', lane: 'ink', attrs: ['ink', 'cite'] },
  { type: 'poll', slash: 'poll', label: 'Street poll', hint: 'Ask the stream a question', glyph: '?', lane: 'ink', attrs: ['ink', 'set'] },
  { type: 'audio', slash: 'tape', label: 'Mixtape', hint: 'Voice memo or a 10-second hook', glyph: '♪', lane: 'ink', attrs: ['ink', 'tape'] },
  { type: 'blackout', slash: 'blackout', label: 'Blackout', hint: 'Redact a found poem', glyph: '█', lane: 'ink', attrs: ['ink', 'holes'] },
  { type: 'colophon', slash: 'colophon', label: 'Colophon', hint: 'Edition, press, thanks', glyph: '¶', lane: 'bind', attrs: ['ink', 'cite'] },
  { type: 'contents', slash: 'toc', label: 'Contents', hint: 'Hand-lettered table of contents', glyph: '≡', lane: 'bind', attrs: ['set'] },
  { type: 'insert', slash: 'insert', label: 'Flyer insert', hint: 'A loose page that falls out', glyph: '✉', lane: 'bind', attrs: ['ink', 'cite'] },
  { type: 'reply', slash: 'reply', label: 'Tear-out', hint: 'Mail the maker from the page', glyph: '↩', lane: 'bind', attrs: ['ink'] },
]

export function createBlock(type: BlockType, vibe: VibeId): Block {
  return { id: uid(), ...BLOCK_RECIPES[type].create(vibe) } as Block
}

export function widgetByType(type: BlockType): WidgetDef {
  return WIDGETS.find((w) => w.type === type) ?? WIDGETS[0]
}

export function matchWidget(query: string): WidgetDef[] {
  const q = query.replace(/^\//, '').toLowerCase()
  return WIDGETS.filter(
    (w) =>
      w.slash.includes(q) ||
      w.label.toLowerCase().includes(q) ||
      w.type.includes(q) ||
      w.attrs.some((attr) => attr.includes(q)),
  )
}

export function contentsFrom(blocks: Block[]): ContentsBlock {
  const lines = blocks
    .filter((block): block is Extract<Block, { type: 'heading' }> => block.type === 'heading')
    .map((block) => ({ label: block.text.trim() || 'untitled' }))
  return {
    id: uid(),
    type: 'contents',
    lines: lines.length ? lines : [{ label: 'cover — still blank' }],
  }
}
