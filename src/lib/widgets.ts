import type { Block, BlockType, VibeId } from './types'
import { artForVibe } from './vibes'
import { uid } from './id'

export type WidgetDef = {
  type: BlockType
  slash: string
  label: string
  hint: string
  glyph: string
}

export const WIDGETS: WidgetDef[] = [
  { type: 'heading', slash: 'heading', label: 'Scribble title', hint: 'Hand-drawn headline', glyph: 'Aa' },
  { type: 'sticker', slash: 'sticker', label: 'Sticker box', hint: 'Thick border, slight tilt', glyph: '▣' },
  { type: 'hero', slash: 'halftone', label: 'Halftone hero', hint: 'Image + dots + RGB split', glyph: '◉' },
  { type: 'grid', slash: 'panel', label: 'Action grid', hint: 'Comic panels with gutters', glyph: '▦' },
  { type: 'divider', slash: 'scribble', label: 'Scribble divider', hint: 'Speed lines between beats', glyph: '∿' },
  { type: 'sfx', slash: 'sfx', label: 'Sound FX', hint: 'THWIP / POW / ZAP', glyph: '!' },
  { type: 'glitch', slash: 'glitch', label: 'Glitch layer', hint: 'Misregistered emphasis', glyph: '≠' },
  { type: 'stack', slash: 'stack', label: 'Zine stack', hint: 'Overlapping scrapbook cards', glyph: '▤' },
  { type: 'quote', slash: 'quote', label: 'Pull quote', hint: 'Hand-lettered citation', glyph: '“' },
  { type: 'poll', slash: 'poll', label: 'Street poll', hint: 'Ask the stream a question', glyph: '?' },
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
  }
}

export function widgetByType(type: BlockType): WidgetDef {
  return WIDGETS.find((w) => w.type === type) ?? WIDGETS[0]
}
