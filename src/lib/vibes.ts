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
]

export function vibeById(id: VibeId): Vibe {
  return VIBES.find((v) => v.id === id) ?? VIBES[0]
}

export function artForVibe(id: VibeId): string {
  return vibeById(id).art
}
