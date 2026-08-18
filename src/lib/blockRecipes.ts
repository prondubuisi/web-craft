import type { Block, BlockType, VibeId } from './types'
import { artForVibe } from './vibes'
import {
  assertNumberList,
  assertStringList,
  fail,
  isRecord,
  num,
  oneOf,
  optional,
  str,
} from './check'

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

type Recipe<T extends Block> = {
  create: (vibe: VibeId) => Omit<T, 'id'>
  harvest: (block: T) => AttrBag
  apply: (block: T, bag: AttrBag) => T
  validate: (raw: Record<string, unknown>, id: string, path: string) => T
}

export const BLOCK_RECIPES: { [K in BlockType]: Recipe<Extract<Block, { type: K }>> } = {
  heading: {
    create: () => ({ type: 'heading', text: 'new issue.', size: 'xl' }),
    harvest: (block) => ({ ink: block.text, size: block.size }),
    apply: (block, bag) => ({ ...block, text: bag.ink?.trim() || block.text, size: bag.size ?? block.size }),
    validate: (raw, id, path) => ({
      id,
      type: 'heading',
      text: str(raw.text, `${path}.text`),
      size: oneOf(raw.size, ['xl', 'lg', 'md'] as const, `${path}.size`),
    }),
  },
  sticker: {
    create: () => ({
      type: 'sticker',
      text: 'this was made by a person, not a template.',
      rotation: -2,
    }),
    harvest: (block) => ({ ink: block.text, photo: block.src, tilt: block.rotation, x: block.x, y: block.y }),
    apply: (block, bag) => ({
      ...block,
      text: bag.ink?.trim() || block.text,
      src: bag.photo || block.src,
      rotation: bag.tilt ?? block.rotation,
      x: bag.x ?? block.x,
      y: bag.y ?? block.y,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'sticker',
      text: str(raw.text, `${path}.text`),
      rotation: num(raw.rotation, `${path}.rotation`),
      src: optional(raw.src, `${path}.src`, str),
      x: optional(raw.x, `${path}.x`, num),
      y: optional(raw.y, `${path}.y`, num),
    }),
  },
  hero: {
    create: (vibe) => ({
      type: 'hero',
      src: artForVibe(vibe),
      caption: 'halftone density up. reality density down.',
      density: 0.4,
      split: 6,
    }),
    harvest: (block) => ({
      ink: block.caption,
      photo: block.src,
      density: block.density,
      split: block.split,
      x: block.x,
      y: block.y,
    }),
    apply: (block, bag) => ({
      ...block,
      caption: bag.ink?.trim() || block.caption,
      src: bag.photo || block.src,
      density: bag.density ?? block.density,
      split: bag.split ?? block.split,
      x: bag.x ?? block.x,
      y: bag.y ?? block.y,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'hero',
      src: str(raw.src, `${path}.src`),
      caption: str(raw.caption, `${path}.caption`),
      density: num(raw.density, `${path}.density`),
      split: num(raw.split, `${path}.split`),
      x: optional(raw.x, `${path}.x`, num),
      y: optional(raw.y, `${path}.y`, num),
    }),
  },
  grid: {
    create: (vibe) => ({
      type: 'grid',
      layout: 'asymmetric',
      panels: [
        { text: 'panel one — enter', fill: 'var(--accent)' },
        { text: 'panel two — glitch', fill: 'var(--accent-2)', src: artForVibe(vibe) },
        { text: 'panel three — drop', fill: 'var(--accent-3)' },
      ],
    }),
    harvest: (block) => ({
      items: block.panels.map((panel) => panel.text),
      photo: block.panels.find((panel) => panel.src)?.src,
      layout: block.layout,
    }),
    apply: (block, bag) => ({
      ...block,
      layout: bag.layout ?? block.layout,
      panels: bag.items?.length
        ? bag.items.slice(0, 6).map((text, i) => ({
            text,
            fill: FILLS[i % 3],
            src: i === 1 ? bag.photo : undefined,
          }))
        : block.panels,
    }),
    validate: (raw, id, path) => {
      if (!Array.isArray(raw.panels)) fail(`${path}.panels`, 'an array')
      return {
        id,
        type: 'grid',
        layout: oneOf(raw.layout, ['two', 'three', 'asymmetric'] as const, `${path}.layout`),
        panels: raw.panels.map((panel, i) => {
          const p = `${path}.panels[${i}]`
          if (!isRecord(panel)) fail(p, 'an object')
          return {
            text: str(panel.text, `${p}.text`),
            fill: str(panel.fill, `${p}.fill`),
            src: optional(panel.src, `${p}.src`, str),
          }
        }),
      }
    },
  },
  divider: {
    create: () => ({ type: 'divider', style: 'speed' }),
    harvest: (block) => ({ style: block.style }),
    apply: (block, bag) => ({ ...block, style: bag.style ?? block.style }),
    validate: (raw, id, path) => ({
      id,
      type: 'divider',
      style: oneOf(raw.style, ['scribble', 'speed', 'zip'] as const, `${path}.style`),
    }),
  },
  sfx: {
    create: () => ({ type: 'sfx', word: 'THWIP!' }),
    harvest: (block) => ({ ink: block.word }),
    apply: (block, bag) => ({ ...block, word: (bag.ink?.trim() || block.word).slice(0, 32) }),
    validate: (raw, id, path) => ({ id, type: 'sfx', word: str(raw.word, `${path}.word`) }),
  },
  glitch: {
    create: () => ({ type: 'glitch', text: 'DIMENSIONAL TEAR' }),
    harvest: (block) => ({ ink: block.text }),
    apply: (block, bag) => ({ ...block, text: bag.ink?.trim() || block.text }),
    validate: (raw, id, path) => ({ id, type: 'glitch', text: str(raw.text, `${path}.text`) }),
  },
  stack: {
    create: () => ({
      type: 'stack',
      cards: [
        { title: 'cut this out', body: 'stick it somewhere it does not belong.' },
        { title: 'misregister', body: 'if it lines up perfectly, tilt it.' },
        { title: 'print it wrong', body: 'the error is the style.' },
      ],
    }),
    harvest: (block) => ({ ink: block.cards[0]?.body, items: block.cards.map((card) => card.title) }),
    apply: (block, bag) => ({
      ...block,
      cards: bag.items?.length
        ? bag.items.slice(0, 6).map((title, i) => ({
            title,
            body: i === 0 && bag.ink ? bag.ink : 'write on the back.',
          }))
        : block.cards,
    }),
    validate: (raw, id, path) => {
      if (!Array.isArray(raw.cards)) fail(`${path}.cards`, 'an array')
      return {
        id,
        type: 'stack',
        cards: raw.cards.map((card, i) => {
          const p = `${path}.cards[${i}]`
          if (!isRecord(card)) fail(p, 'an object')
          return { title: str(card.title, `${p}.title`), body: str(card.body, `${p}.body`) }
        }),
      }
    },
  },
  quote: {
    create: () => ({
      type: 'quote',
      text: 'if it lines up perfectly, you printed it wrong.',
      cite: 'the margin',
    }),
    harvest: (block) => ({ ink: block.text, cite: block.cite }),
    apply: (block, bag) => ({
      ...block,
      text: bag.ink?.trim() || block.text,
      cite: bag.cite?.trim() || block.cite,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'quote',
      text: str(raw.text, `${path}.text`),
      cite: str(raw.cite, `${path}.cite`),
    }),
  },
  poll: {
    create: () => ({
      type: 'poll',
      question: 'what should the next issue smell like?',
      options: ['toner and rain', 'strawberry milk', 'wet newsprint', 'ozone'],
    }),
    harvest: (block) => ({ ink: block.question, items: block.options }),
    apply: (block, bag) => ({
      ...block,
      question: bag.ink?.trim() || block.question,
      options: bag.items && bag.items.length >= 2 ? bag.items.slice(0, 6) : block.options,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'poll',
      question: str(raw.question, `${path}.question`),
      options: assertStringList(raw.options, `${path}.options`),
    }),
  },
  audio: {
    create: () => ({ type: 'audio', src: '', caption: 'press play. hold the note.' }),
    harvest: (block) => ({ ink: block.caption, tape: block.src }),
    apply: (block, bag) => ({
      ...block,
      caption: bag.ink?.trim() || block.caption,
      src: bag.tape || block.src,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'audio',
      src: str(raw.src, `${path}.src`),
      caption: str(raw.caption, `${path}.caption`),
    }),
  },
  strip: {
    create: (vibe) => ({
      type: 'strip',
      panels: [
        { text: 'enter' },
        { text: 'tear', src: artForVibe(vibe) },
        { text: 'glue' },
        { text: 'leave' },
      ],
    }),
    harvest: (block) => ({
      items: block.panels.map((panel) => panel.text),
      photo: block.panels.find((panel) => panel.src)?.src,
    }),
    apply: (block, bag) => ({
      ...block,
      panels: bag.items?.length
        ? bag.items.slice(0, 6).map((text, i) => ({
            text,
            src: i === 1 ? bag.photo : undefined,
          }))
        : block.panels,
    }),
    validate: (raw, id, path) => {
      if (!Array.isArray(raw.panels)) fail(`${path}.panels`, 'an array')
      return {
        id,
        type: 'strip',
        panels: raw.panels.map((panel, i) => {
          const p = `${path}.panels[${i}]`
          if (!isRecord(panel)) fail(p, 'an object')
          return { text: str(panel.text, `${p}.text`), src: optional(panel.src, `${p}.src`, str) }
        }),
      }
    },
  },
  colophon: {
    create: () => ({
      type: 'colophon',
      edition: 'first printing · 40 copies',
      press: 'kitchen table riso',
      place: 'wherever the toner is cheap',
      thanks: 'to the person who mailed first',
    }),
    harvest: (block) => ({ ink: block.thanks, cite: block.press }),
    apply: (block, bag) => ({
      ...block,
      thanks: bag.ink?.trim() || block.thanks,
      press: bag.cite?.trim() || block.press,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'colophon',
      edition: str(raw.edition, `${path}.edition`),
      press: str(raw.press, `${path}.press`),
      place: str(raw.place, `${path}.place`),
      thanks: str(raw.thanks, `${path}.thanks`),
    }),
  },
  blackout: {
    create: () => ({
      type: 'blackout',
      text: 'if the city prints itself wrong on purpose the gutter still takes notes',
      hidden: [1, 4, 6, 9],
    }),
    harvest: (block) => ({ ink: block.text, holes: block.hidden }),
    apply: (block, bag) => ({
      ...block,
      text: bag.ink?.trim() || block.text,
      hidden: bag.holes ?? block.hidden,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'blackout',
      text: str(raw.text, `${path}.text`),
      hidden: assertNumberList(raw.hidden, `${path}.hidden`),
    }),
  },
  contents: {
    create: () => ({
      type: 'contents',
      lines: [
        { label: 'cover — enter' },
        { label: 'page two — tear' },
        { label: 'back — leave a note' },
      ],
    }),
    harvest: (block) => ({ items: block.lines.map((line) => line.label) }),
    apply: (block, bag) => ({
      ...block,
      lines: bag.items?.length ? bag.items.map((label) => ({ label })) : block.lines,
    }),
    validate: (raw, id, path) => {
      if (!Array.isArray(raw.lines)) fail(`${path}.lines`, 'an array')
      return {
        id,
        type: 'contents',
        lines: raw.lines.map((line, i) => {
          const p = `${path}.lines[${i}]`
          if (!isRecord(line)) fail(p, 'an object')
          return { label: str(line.label, `${p}.label`) }
        }),
      }
    },
  },
  insert: {
    create: () => ({
      type: 'insert',
      title: 'this fell out',
      text: 'a show tonight. bring a stapler.',
    }),
    harvest: (block) => ({ ink: block.text, cite: block.title }),
    apply: (block, bag) => ({
      ...block,
      text: bag.ink?.trim() || block.text,
      title: bag.cite?.trim() || block.title,
    }),
    validate: (raw, id, path) => ({
      id,
      type: 'insert',
      title: str(raw.title, `${path}.title`),
      text: str(raw.text, `${path}.text`),
    }),
  },
  reply: {
    create: () => ({ type: 'reply', prompt: 'write the maker. tear this out.' }),
    harvest: (block) => ({ ink: block.prompt }),
    apply: (block, bag) => ({ ...block, prompt: bag.ink?.trim() || block.prompt }),
    validate: (raw, id, path) => ({ id, type: 'reply', prompt: str(raw.prompt, `${path}.prompt`) }),
  },
}

export const BLOCK_TYPES = Object.keys(BLOCK_RECIPES) as BlockType[]
