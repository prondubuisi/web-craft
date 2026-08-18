import type { Block, BlockType, ContentsBlock, VibeId } from './types'
import { artForVibe } from './vibes'
import { uid } from './id'

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
  switch (type) {
    case 'heading':
      return { id: uid(), type, text: 'new issue.', size: 'xl' }
    case 'sticker':
      return {
        id: uid(),
        type,
        text: 'this was made by a person, not a template.',
        rotation: -2,
      }
    case 'hero':
      return {
        id: uid(),
        type,
        src: artForVibe(vibe),
        caption: 'halftone density up. reality density down.',
        density: 0.4,
        split: 6,
      }
    case 'grid':
      return {
        id: uid(),
        type,
        layout: 'asymmetric',
        panels: [
          { text: 'panel one — enter', fill: 'var(--accent)' },
          { text: 'panel two — glitch', fill: 'var(--accent-2)', src: artForVibe(vibe) },
          { text: 'panel three — drop', fill: 'var(--accent-3)' },
        ],
      }
    case 'divider':
      return { id: uid(), type, style: 'speed' }
    case 'sfx':
      return { id: uid(), type, word: 'THWIP!' }
    case 'glitch':
      return { id: uid(), type, text: 'DIMENSIONAL TEAR' }
    case 'stack':
      return {
        id: uid(),
        type,
        cards: [
          { title: 'cut this out', body: 'stick it somewhere it does not belong.' },
          { title: 'misregister', body: 'if it lines up perfectly, tilt it.' },
          { title: 'print it wrong', body: 'the error is the style.' },
        ],
      }
    case 'quote':
      return {
        id: uid(),
        type,
        text: 'if it lines up perfectly, you printed it wrong.',
        cite: 'the margin',
      }
    case 'poll':
      return {
        id: uid(),
        type,
        question: 'what should the next issue smell like?',
        options: ['toner and rain', 'strawberry milk', 'wet newsprint', 'ozone'],
      }
    case 'audio':
      return {
        id: uid(),
        type,
        src: '',
        caption: 'press play. hold the note.',
      }
    case 'strip':
      return {
        id: uid(),
        type,
        panels: [
          { text: 'enter' },
          { text: 'tear', src: artForVibe(vibe) },
          { text: 'glue' },
          { text: 'leave' },
        ],
      }
    case 'colophon':
      return {
        id: uid(),
        type,
        edition: 'first printing · 40 copies',
        press: 'kitchen table riso',
        place: 'wherever the toner is cheap',
        thanks: 'to the person who mailed first',
      }
    case 'blackout':
      return {
        id: uid(),
        type,
        text: 'if the city prints itself wrong on purpose the gutter still takes notes',
        hidden: [1, 4, 6, 9],
      }
    case 'contents':
      return {
        id: uid(),
        type,
        lines: [
          { label: 'cover — enter' },
          { label: 'page two — tear' },
          { label: 'back — leave a note' },
        ],
      }
    case 'insert':
      return {
        id: uid(),
        type,
        title: 'this fell out',
        text: 'a show tonight. bring a stapler.',
      }
    case 'reply':
      return {
        id: uid(),
        type,
        prompt: 'write the maker. tear this out.',
      }
  }
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
