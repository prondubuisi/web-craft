import { uid } from './id'
import { applyLook, mergeLinkedLooks } from './looks'
import type { Block, BlockType, LookLayer, VibeId } from './types'
import { applyBag, type AttrBag } from './widgetLang'
import { WIDGETS, createBlock, widgetByType, type AttrId } from './widgets'

export type Sample = { label: string; attrs: AttrId[]; bag: AttrBag; tags?: string[] }

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
  { label: 'web corner', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-web-corner.svg' }, tags: ['sketch', 'pencil', 'internship'] },
  { label: 'storyboard', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-storyboard.svg' }, tags: ['sketch', 'pencil', 'internship'] },
  { label: 'lightbox desk', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-desk.svg' }, tags: ['sketch', 'pencil', 'internship'] },
  { label: 'gesture study', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-gesture.svg' }, tags: ['sketch', 'pencil', 'internship'] },
  { label: 'rooftop skyline', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-rooftop.svg' }, tags: ['sketch', 'pencil', 'internship'] },
  { label: 'intern badge', attrs: ['photo'], bag: { photo: '/art/pencil/sketch-badge.svg' }, tags: ['sketch', 'pencil', 'internship'] },
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
  { label: 'xl', attrs: ['trim'], bag: { size: 'xl' } },
  { label: 'lg', attrs: ['trim'], bag: { size: 'lg' } },
  { label: 'tilt', attrs: ['trim'], bag: { tilt: -3.2 } },
  { label: 'grain', attrs: ['trim'], bag: { density: 0.55, split: 10 } },
  { label: 'gif diff', attrs: ['trim'], bag: { density: 0.62, split: 13 } },
  { label: 'pixel bloom', attrs: ['trim'], bag: { density: 0.7, split: 5 } },
  { label: 'chroma tear', attrs: ['trim'], bag: { density: 0.18, split: 14 } },
  { label: 'static color', attrs: ['trim'], bag: { density: 0.4, split: 8 } },
  { label: 'zip', attrs: ['trim'], bag: { style: 'zip' } },
  { label: 'scribble', attrs: ['trim'], bag: { style: 'scribble' } },
  { label: 'speed', attrs: ['trim'], bag: { style: 'speed' } },
  { label: 'three', attrs: ['trim'], bag: { layout: 'three' } },
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
  { label: 'hand tilt', attrs: ['trim'], bag: { tilt: 2.4 } },
  { label: 'staple pin', attrs: ['pin'], bag: { x: 6, y: 8 } },
  { label: 'tear here', attrs: ['holes'], bag: { holes: [0, 1, 2] } },
  { label: 'pow', attrs: ['ink'], bag: { ink: 'POW!' } },
  { label: 'bam', attrs: ['ink'], bag: { ink: 'BAM!' } },
  { label: 'zap', attrs: ['ink'], bag: { ink: 'ZAP!' } },
  { label: 'offset', attrs: ['ink'], bag: { ink: 'OFFSET THE WORLD' } },
  { label: 'mail it back', attrs: ['ink'], bag: { ink: 'tear this out. mail it back to the desk.' } },
  {
    label: 'gutter took notes',
    attrs: ['ink', 'cite'],
    bag: { ink: 'the gutter took notes. i took the L home.', cite: 'issue 13' },
  },
  {
    label: 'this fell out',
    attrs: ['cite', 'ink'],
    bag: { cite: 'this fell out', ink: 'a show tonight. bring a stapler.' },
  },
  { label: 'four beats', attrs: ['set'], bag: { items: ['enter', 'tear', 'glue', 'leave'] } },
  {
    label: 'street ask',
    attrs: ['ink', 'set'],
    bag: { ink: 'what still prints?', items: ['one cheap copy', 'no bleed', 'the gutter'] },
  },
  {
    label: 'desk pile',
    attrs: ['set'],
    bag: { items: ['the kit', 'scatter floor', 'after hours', 'ghost notes'] },
  },
  { label: 'last words', attrs: ['holes'], bag: { holes: [8, 9, 10, 11] } },
  { label: 'asymmetric', attrs: ['trim'], bag: { layout: 'asymmetric' } },
  { label: 'two-up', attrs: ['trim'], bag: { layout: 'two' } },
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
    (sample) =>
      sample.label.toLowerCase().includes(q) ||
      sample.attrs.some((attr) => attr.includes(q)) ||
      sample.tags?.some((tag) => tag.toLowerCase().includes(q)),
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
  if (attrs.includes('trim')) {
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
export function linkBag(blocks: Block[], bag: AttrBag, live?: LookLayer[]): Block[] {
  return blocks.map((block) => {
    const slim = bagForType(block.type, bag)
    if (!Object.keys(slim).length) return block
    if (live?.length) return mergeLinkedLooks(block, live, slim)
    return applyBag(block, slim)
  })
}

export function linkSample(blocks: Block[], sample: Sample): Block[] {
  return linkBag(blocks, sample.bag)
}

export type Rng = () => number

export function pickN<T>(items: T[], n: number, rng: Rng = Math.random): T[] {
  const pool = [...items]
  const out: T[] = []
  const want = Math.max(0, Math.min(n, pool.length))
  while (out.length < want) {
    const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

function pickOne<T>(items: T[], rng: Rng): T | undefined {
  return pickN(items, 1, rng)[0]
}

/** Two or three scraps that this widget can actually hold. Later still wins. */
export function pickMisregister(type: BlockType, count = 3, rng: Rng = Math.random): LookLayer[] {
  const pool = samplesFor(type).filter((sample) => canHoldBag(type, sample.bag))
  return pickN(pool, Math.min(3, Math.max(2, count)), rng).map((sample) => ({
    label: sample.label,
    bag: bagForType(type, sample.bag),
  }))
}

export function misregisterBlock(block: Block, rng: Rng = Math.random): Block {
  return pickMisregister(block.type, 3, rng).reduce((next, layer) => applyLook(next, layer), block)
}

export function misregisterPage(blocks: Block[], rng: Rng = Math.random): Block[] {
  return blocks.map((block) => misregisterBlock(block, rng))
}

/**
 * First page for Make / New issue. Keeps their title and the vibe photo so
 * the issue still belongs to the vibe they picked; the trim, tilt, and
 * sticker ink come from the scrap library so two new issues are not twins.
 */
export function starterPage(title: string, vibe: VibeId, rng: Rng = Math.random): Block[] {
  const heading: Block = {
    id: uid(),
    type: 'heading',
    text: title.trim() || 'untitled issue',
    size: 'xl',
  }
  const photo = SAMPLES.find((sample) => sample.label === vibe) ?? SAMPLES.find((sample) => sample.label === 'collage')
  const trim = pickOne(
    samplesForAttr('trim').filter((sample) => sample.bag.density !== undefined || sample.bag.split !== undefined),
    rng,
  )
  const tilt = pickOne(
    samplesForAttr('trim').filter((sample) => sample.bag.tilt !== undefined),
    rng,
  )
  const ink = pickOne(samplesForAttr('ink'), rng)
  const pin = rng() < 0.45 ? pickOne(samplesForAttr('pin'), rng) : undefined

  let hero = createBlock('hero', vibe)
  if (photo) hero = applyLook(hero, { label: photo.label, bag: bagForType('hero', photo.bag) })
  if (trim) hero = applyLook(hero, { label: trim.label, bag: bagForType('hero', trim.bag) })

  let sticker = createBlock('sticker', vibe)
  if (ink) sticker = applyLook(sticker, { label: ink.label, bag: bagForType('sticker', ink.bag) })
  if (tilt) sticker = applyLook(sticker, { label: tilt.label, bag: bagForType('sticker', tilt.bag) })
  if (pin) sticker = applyLook(sticker, { label: pin.label, bag: bagForType('sticker', pin.bag) })

  return [heading, hero, sticker]
}
