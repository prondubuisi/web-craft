import type { Block, BlockType, ContentsBlock, VibeId } from './types'
import { uid } from './id'
import { BLOCK_RECIPES } from './blockRecipes'

export type WidgetLane = 'page' | 'ink' | 'bind'

/** Shared cuts of a widget. Recipes in the tray are combinations of these. */
export type AttrId = 'ink' | 'photo' | 'tape' | 'trim' | 'pin' | 'set' | 'cite' | 'holes'

export const ATTRS: AttrId[] = ['ink', 'photo', 'tape', 'trim', 'pin', 'set', 'cite', 'holes']

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
  { type: 'heading', slash: 'heading', label: 'Scribble title', hint: 'The issue title. Not a burst (sfx) and not a pull quote.', glyph: 'Aa', lane: 'page', attrs: ['ink', 'trim'] },
  { type: 'sticker', slash: 'sticker', label: 'Sticker box', hint: 'A scrap with tilt and pin. Hero is the full-bleed photo.', glyph: '▣', lane: 'page', attrs: ['ink', 'photo', 'trim', 'pin'] },
  { type: 'hero', slash: 'halftone', label: 'Halftone hero', hint: 'Full-bleed photo + dots. Sticker is the boxed scrap.', glyph: '◉', lane: 'page', attrs: ['ink', 'photo', 'trim', 'pin'] },
  { type: 'grid', slash: 'panel', label: 'Action grid', hint: 'Gutters, fills, layout. Strip is one row. Stack is cards.', glyph: '▦', lane: 'page', attrs: ['set', 'trim', 'photo'] },
  { type: 'divider', slash: 'scribble', label: 'Scribble divider', hint: 'A beat between blocks. Not a title.', glyph: '∿', lane: 'page', attrs: ['trim'] },
  { type: 'stack', slash: 'stack', label: 'Zine stack', hint: 'Overlapping cards with backs. Not a panel grid.', glyph: '▤', lane: 'page', attrs: ['set', 'ink'] },
  { type: 'strip', slash: 'strip', label: 'Mini comic', hint: 'One row of beats. Grid if you need gutters and layout.', glyph: '▮', lane: 'page', attrs: ['set', 'photo'] },
  { type: 'sfx', slash: 'sfx', label: 'Sound FX', hint: 'One burst: THWIP / POW. Glitch is a whole line.', glyph: '!', lane: 'ink', attrs: ['ink'] },
  { type: 'glitch', slash: 'glitch', label: 'Glitch layer', hint: 'A misregistered sentence. Sfx is the one-word burst.', glyph: '≠', lane: 'ink', attrs: ['ink'] },
  { type: 'quote', slash: 'quote', label: 'Pull quote', hint: 'A line + cite on the page. Colophon is press; insert is a flyer.', glyph: '“', lane: 'ink', attrs: ['ink', 'cite'] },
  { type: 'poll', slash: 'poll', label: 'Street poll', hint: 'Ask the stream. Not a contents list.', glyph: '?', lane: 'ink', attrs: ['ink', 'set'] },
  { type: 'audio', slash: 'tape', label: 'Mixtape', hint: 'Voice memo or a 10-second hook. The only tape cut.', glyph: '♪', lane: 'ink', attrs: ['ink', 'tape'] },
  { type: 'blackout', slash: 'blackout', label: 'Blackout', hint: 'Redact a found poem. Holes, not a heading.', glyph: '█', lane: 'ink', attrs: ['ink', 'holes'] },
  { type: 'colophon', slash: 'colophon', label: 'Colophon', hint: 'Edition, press, thanks. Not a pull quote.', glyph: '¶', lane: 'bind', attrs: ['ink', 'cite'] },
  { type: 'contents', slash: 'toc', label: 'Contents', hint: 'A list of headings. Poll is a question.', glyph: '≡', lane: 'bind', attrs: ['set'] },
  { type: 'insert', slash: 'insert', label: 'Flyer insert', hint: 'A loose flyer. Quote stays bound; reply mails out.', glyph: '✉', lane: 'bind', attrs: ['ink', 'cite'] },
  { type: 'reply', slash: 'reply', label: 'Tear-out', hint: 'Postcard back to the maker. Letters live under INK.', glyph: '↩', lane: 'bind', attrs: ['ink'] },
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
