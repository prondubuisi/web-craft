import type { VibeId } from './types'

export type Vibe = {
  id: VibeId
  name: string
  alias: string
  blurb: string
  art: string
  palette: [string, string, string]
}

export const VIBES: Vibe[] = [
  {
    id: 'miles',
    name: 'Miles',
    alias: 'Brooklyn graffiti comic',
    blurb: 'Neon pink, electric blue, graffiti yellow. Rooftop energy.',
    art: '/art/miles.jpg',
    palette: ['#ff2bd6', '#2de2ff', '#ffe600'],
  },
  {
    id: 'gwen',
    name: 'Gwen',
    alias: 'Watercolor punk hologram',
    blurb: 'Magenta, cyan, chrome silver. Soft chaos, hard edges.',
    art: '/art/gwen.jpg',
    palette: ['#ff4fd8', '#3cf0ff', '#d7dbe7'],
  },
  {
    id: 'peni',
    name: 'Peni',
    alias: 'Kawaii mecha pop',
    blurb: 'Pastel pink, robot white, alert red. Cute with a kill-switch.',
    art: '/art/peni.jpg',
    palette: ['#ff9ec8', '#fff7f0', '#ff3355'],
  },
  {
    id: 'ham',
    name: 'Ham',
    alias: 'Rubber-hose cartoon',
    blurb: 'Saturated primaries. Everything wobbles on purpose.',
    art: '/art/ham.jpg',
    palette: ['#ff3b30', '#ffe600', '#2f6bff'],
  },
  {
    id: 'noir',
    name: 'Noir',
    alias: 'Newsprint blood-red',
    blurb: 'Ink, paper, one violent red. Silence with a pulse.',
    art: '/art/noir.jpg',
    palette: ['#111111', '#f3efe4', '#c41212'],
  },
]

export const ART_LIBRARY = [
  '/art/miles.jpg',
  '/art/gwen.jpg',
  '/art/peni.jpg',
  '/art/ham.jpg',
  '/art/noir.jpg',
  '/art/collage-hero.jpg',
  '/art/pencil/sketch-web-corner.svg',
  '/art/pencil/sketch-storyboard.svg',
  '/art/pencil/sketch-desk.svg',
  '/art/pencil/sketch-gesture.svg',
  '/art/pencil/sketch-rooftop.svg',
  '/art/pencil/sketch-badge.svg',
]

export function vibeById(id: VibeId): Vibe {
  return VIBES.find((v) => v.id === id) ?? VIBES[0]
}

export function artForVibe(id: VibeId): string {
  return vibeById(id).art
}

/** Default ink a new widget speaks in this vibe. Used at create and when restyling. */
export const VIBE_VOICE: Record<
  VibeId,
  { sticker: string; hero: string; sfx: string; glitch: string; quote: string; cite: string }
> = {
  miles: {
    sticker: 'this page is a rooftop. stay as long as you want.',
    hero: 'the city prints itself wrong on purpose.',
    sfx: 'THWIP!',
    glitch: 'YOU ARE HERE',
    quote: 'the city prints itself wrong on purpose.',
    cite: 'a stranger on the L',
  },
  gwen: {
    sticker: 'half a song. the good half.',
    hero: 'watercolor over chrome. do not dry.',
    sfx: 'PING!',
    glitch: 'SOFT CHAOS',
    quote: 'if it lines up perfectly, you printed it wrong.',
    cite: 'the margin',
  },
  peni: {
    sticker: 'pass this page to someone who is not here yet',
    hero: 'cute with a kill-switch.',
    sfx: 'SKRRT!',
    glitch: 'SIGNAL LOST',
    quote: 'nobody proofreads a zine and that is the point.',
    cite: 'the xerox machine',
  },
  ham: {
    sticker: 'primary colors only. opinions optional.',
    hero: 'if the building is not stretching, zoom in.',
    sfx: 'POW!',
    glitch: 'OFFSET THE WORLD',
    quote: 'nobody asked for a clean layout. good.',
    cite: 'the wobble',
  },
  noir: {
    sticker: 'if you can read this, the drop already happened.',
    hero: 'it rained like a confession.',
    sfx: 'BAM!',
    glitch: 'REDACC TED',
    quote: 'it rained like a confession and the gutter took notes.',
    cite: 'issue zero',
  },
}
