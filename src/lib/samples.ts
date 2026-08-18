import { uid } from './id'
import type { Block, BlockType, VibeId } from './types'
import { applyBag, combineBags, type AttrBag } from './widgetLang'
import { WIDGETS, createBlock, widgetByType, type AttrId } from './widgets'

export type Sample = { label: string; attrs: AttrId[]; bag: AttrBag }

/**
 * Shared scraps. Each sample is one or two cuts. The inspector shows scraps
 * that fit the selected widget; pick more than one and combineBags stacks them.
 */
export const SAMPLES: Sample[] = [
  { label: 'city', attrs: ['ink'], bag: { ink: 'the city prints itself wrong on purpose' } },
  { label: 'free page', attrs: ['ink'], bag: { ink: 'everyone gets one free page' } },
  { label: 'diary', attrs: ['ink'], bag: { ink: 'a diary nobody proofread' } },
  { label: 'skrrt', attrs: ['ink'], bag: { ink: 'SKRRT!' } },
  { label: 'signal lost', attrs: ['ink'], bag: { ink: 'SIGNAL LOST' } },
  { label: 'gutter notes', attrs: ['ink'], bag: { ink: 'the gutter still takes notes' } },
  { label: 'pass this', attrs: ['ink'], bag: { ink: 'pass this page to someone who is not here yet' } },
  { label: 'drop when', attrs: ['ink'], bag: { ink: 'drop when it feels like a page' } },
  { label: 'heading picture', attrs: ['ink'], bag: { ink: 'a heading and a picture is enough' } },
  { label: 'print pass', attrs: ['ink'], bag: { ink: 'print it. pass it.' } },
  { label: 'hold the click', attrs: ['ink'], bag: { ink: 'hold for the click. no tape loaded.' } },
  { label: 'rooftop', attrs: ['ink'], bag: { ink: 'this page is a rooftop. stay as long as you want.' } },
  { label: 'soft chaos', attrs: ['ink'], bag: { ink: 'watercolor over chrome. do not dry.' } },
  { label: 'kill-switch', attrs: ['ink'], bag: { ink: 'cute with a kill-switch.' } },
  { label: 'wobble', attrs: ['ink'], bag: { ink: 'primary colors only. opinions optional.' } },
  { label: 'confession', attrs: ['ink'], bag: { ink: 'it rained like a confession.' } },
  {
    label: 'nobody proofreads',
    attrs: ['ink', 'cite'],
    bag: { ink: 'nobody proofreads a zine and that is the point.', cite: 'the xerox machine' },
  },
  { label: 'collage', attrs: ['photo'], bag: { photo: '/art/collage-hero.jpg' } },
  { label: 'miles', attrs: ['photo'], bag: { photo: '/art/miles.jpg' } },
  { label: 'gwen', attrs: ['photo'], bag: { photo: '/art/gwen.jpg' } },
  { label: 'noir', attrs: ['photo'], bag: { photo: '/art/noir.jpg' } },
  { label: 'peni', attrs: ['photo'], bag: { photo: '/art/peni.jpg' } },
  { label: 'ham', attrs: ['photo'], bag: { photo: '/art/ham.jpg' } },
  { label: 'wake', attrs: ['set'], bag: { items: ['wake', 'wait', 'wander', 'write'] } },
  { label: 'knock', attrs: ['set'], bag: { items: ['knock', 'pause', 'nothing', 'leave'] } },
  {
    label: 'cover toc',
    attrs: ['set'],
    bag: { items: ['cover — enter', 'page — tear', 'back — leave a note'] },
  },
  {
    label: 'pick link drop',
    attrs: ['set'],
    bag: { items: ['pick a scrap', 'link the page', 'drop', 'pass the snapshot'] },
  },
  {
    label: 'b-side',
    attrs: ['set', 'ink'],
    bag: { ink: 'what should the b-side say?', items: ['nothing', 'the truth', 'a dare'] },
  },
  { label: 'xerox', attrs: ['cite'], bag: { cite: 'the xerox machine' } },
  { label: 'gutter press', attrs: ['cite'], bag: { cite: 'gutter press' } },
  { label: 'corner store', attrs: ['cite'], bag: { cite: 'the corner store' } },
  { label: 'the margin', attrs: ['cite'], bag: { cite: 'the margin' } },
  { label: 'stranger on the L', attrs: ['cite'], bag: { cite: 'a stranger on the L' } },
  { label: 'this browser', attrs: ['cite'], bag: { cite: 'this browser' } },
  { label: 'xl', attrs: ['cut'], bag: { size: 'xl' } },
  { label: 'lg', attrs: ['cut'], bag: { size: 'lg' } },
  { label: 'tilt', attrs: ['cut'], bag: { tilt: -3.2 } },
  { label: 'grain', attrs: ['cut'], bag: { density: 0.55, split: 10 } },
  { label: 'gif diff', attrs: ['cut'], bag: { density: 0.62, split: 13 } },
  { label: 'pixel bloom', attrs: ['cut'], bag: { density: 0.7, split: 5 } },
  { label: 'chroma tear', attrs: ['cut'], bag: { density: 0.18, split: 14 } },
  { label: 'static color', attrs: ['cut'], bag: { density: 0.4, split: 8 } },
  { label: 'zip', attrs: ['cut'], bag: { style: 'zip' } },
  { label: 'scribble', attrs: ['cut'], bag: { style: 'scribble' } },
  { label: 'speed', attrs: ['cut'], bag: { style: 'speed' } },
  { label: 'three', attrs: ['cut'], bag: { layout: 'three' } },
  { label: 'corner pin', attrs: ['pin'], bag: { x: 8, y: 22 } },
  { label: 'gutter pin', attrs: ['pin'], bag: { x: 52, y: 18 } },
  { label: 'floor pin', attrs: ['pin'], bag: { x: 28, y: 48 } },
  { label: 'redact', attrs: ['holes'], bag: { holes: [1, 3, 7] } },
  { label: 'blank it', attrs: ['holes'], bag: { holes: [0, 2, 4, 6] } },
  { label: 'vowels out', attrs: ['holes'], bag: { holes: [1, 4, 6, 9] } },
  { label: 'stapler', attrs: ['ink'], bag: { ink: 'bring a stapler. the corner store still has toner.' } },
  { label: 'still wet', attrs: ['ink'], bag: { ink: 'do not dry. the toner is still wet.' } },
  { label: 'fold sheet', attrs: ['ink'], bag: { ink: 'fold in half, then quarters. slit the fold.' } },
  { label: 'kitchen table', attrs: ['cite'], bag: { cite: 'kitchen table riso' } },
  {
    label: 'cut glue leave',
    attrs: ['set'],
    bag: { items: ['cut', 'glue', 'staple', 'leave'] },
  },
  { label: 'hand tilt', attrs: ['cut'], bag: { tilt: 2.4 } },
  { label: 'staple pin', attrs: ['pin'], bag: { x: 6, y: 8 } },
  { label: 'tear here', attrs: ['holes'], bag: { holes: [0, 1, 2] } },
]

export function samplesFor(type: BlockType): Sample[] {
  const recipe = widgetByType(type)
  return SAMPLES.filter((sample) => sample.attrs.some((attr) => recipe.attrs.includes(attr)))
}

export function samplesForAttr(attr: AttrId): Sample[] {
  return SAMPLES.filter((sample) => sample.attrs.includes(attr))
}

export function matchSample(query: string): Sample[] {
  const q = query.replace(/^\//, '').toLowerCase()
  if (!q) return SAMPLES
  return SAMPLES.filter(
    (sample) => sample.label.toLowerCase().includes(q) || sample.attrs.some((attr) => attr.includes(q)),
  )
}

/** First recipe that can take every cut on the scrap. */
export function typeForSample(sample: Sample): BlockType {
  return WIDGETS.find((widget) => sample.attrs.every((attr) => widget.attrs.includes(attr)))?.type ?? 'sticker'
}

/** Cuts on this bag that a widget recipe can actually hold. */
export function bagForType(type: BlockType, bag: AttrBag): AttrBag {
  const attrs = widgetByType(type).attrs
  const next: AttrBag = {}
  if (attrs.includes('ink') && bag.ink) next.ink = bag.ink
  if (attrs.includes('cite') && bag.cite) next.cite = bag.cite
  if (attrs.includes('photo') && bag.photo) next.photo = bag.photo
  if (attrs.includes('tape') && bag.tape) next.tape = bag.tape
  if (attrs.includes('set') && bag.items) next.items = bag.items
  if (attrs.includes('holes') && bag.holes) next.holes = bag.holes
  if (attrs.includes('pin')) {
    if (bag.x !== undefined) next.x = bag.x
    if (bag.y !== undefined) next.y = bag.y
  }
  if (attrs.includes('cut')) {
    if (bag.size) next.size = bag.size
    if (bag.tilt !== undefined) next.tilt = bag.tilt
    if (bag.density !== undefined) next.density = bag.density
    if (bag.split !== undefined) next.split = bag.split
    if (bag.style) next.style = bag.style
    if (bag.layout) next.layout = bag.layout
  }
  return next
}

export function canHoldBag(type: BlockType, bag: AttrBag): boolean {
  return Object.keys(bagForType(type, bag)).length > 0
}

/** Plant a scrap on every page widget that shares a cut — no new block type. */
export function linkBag(blocks: Block[], bag: AttrBag): Block[] {
  return blocks.map((block) => {
    const slim = bagForType(block.type, bag)
    return Object.keys(slim).length ? applyBag(block, slim) : block
  })
}

export function linkSample(blocks: Block[], sample: Sample): Block[] {
  return linkBag(blocks, sample.bag)
}

/**
 * First page for Make / New issue. Keeps their title, plants the vibe photo
 * plus the grain scrap on the hero, and a hand tilt on the sticker.
 */
export function starterPage(title: string, vibe: VibeId): Block[] {
  const heading: Block = {
    id: uid(),
    type: 'heading',
    text: title.trim() || 'untitled issue',
    size: 'xl',
  }
  const photo = SAMPLES.find((sample) => sample.label === vibe) ?? SAMPLES.find((sample) => sample.label === 'collage')
  const grain = SAMPLES.find((sample) => sample.label === 'grain')
  const tilt = SAMPLES.find((sample) => sample.label === 'hand tilt')
  const hero = applyBag(
    createBlock('hero', vibe),
    combineBags([photo?.bag ?? {}, grain?.bag ?? {}]),
  )
  return [heading, hero, applyBag(createBlock('sticker', vibe), tilt?.bag ?? {})]
}
