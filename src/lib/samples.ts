import type { BlockType } from './types'
import type { AttrBag } from './widgetLang'
import { WIDGETS, widgetByType, type AttrId } from './widgets'

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
    label: 'b-side',
    attrs: ['set', 'ink'],
    bag: { ink: 'what should the b-side say?', items: ['nothing', 'the truth', 'a dare'] },
  },
  { label: 'xerox', attrs: ['cite'], bag: { cite: 'the xerox machine' } },
  { label: 'gutter press', attrs: ['cite'], bag: { cite: 'gutter press' } },
  { label: 'xl', attrs: ['cut'], bag: { size: 'xl' } },
  { label: 'tilt', attrs: ['cut'], bag: { tilt: -3.2 } },
  { label: 'grain', attrs: ['cut'], bag: { density: 0.55, split: 10 } },
  { label: 'gif diff', attrs: ['cut'], bag: { density: 0.62, split: 13 } },
  { label: 'pixel bloom', attrs: ['cut'], bag: { density: 0.7, split: 5 } },
  { label: 'chroma tear', attrs: ['cut'], bag: { density: 0.18, split: 14 } },
  { label: 'static color', attrs: ['cut'], bag: { density: 0.4, split: 8 } },
  { label: 'zip', attrs: ['cut'], bag: { style: 'zip' } },
  { label: 'redact', attrs: ['holes'], bag: { holes: [1, 3, 7] } },
  { label: 'blank it', attrs: ['holes'], bag: { holes: [0, 2, 4, 6] } },
]

export function samplesFor(type: BlockType): Sample[] {
  const recipe = widgetByType(type)
  return SAMPLES.filter((sample) => sample.attrs.some((attr) => recipe.attrs.includes(attr)))
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
