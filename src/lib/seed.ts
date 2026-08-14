import type { AppState, BadgeId, Zine } from './types'
import { uid } from './id'
import { isMine } from './zine'

const now = Date.now()

function zine(partial: Omit<Zine, 'id' | 'createdAt' | 'updatedAt'> & { ageHours: number }): Zine {
  const t = now - partial.ageHours * 3600 * 1000
  const { ageHours: _age, ...rest } = partial
  return {
    id: uid(),
    createdAt: t,
    updatedAt: t,
    ...rest,
    dropsAt: rest.dropsAt ?? (rest.published ? t : null),
  }
}

export const BADGE_META: Record<BadgeId, { label: string; blurb: string }> = {
  'sticker-fiend': { label: 'STICKER FIEND', blurb: 'Dropped a sticker block' },
  'panel-hopper': { label: 'PANEL HOPPER', blurb: 'Used four widget types' },
  dropped: { label: 'DROPPED', blurb: 'Published a zine' },
  remixer: { label: 'REMIXER', blurb: 'Forked someone else’s issue' },
  multiverse: { label: 'MULTIVERSE', blurb: 'Built in all five vibes' },
}

export function computeBadges(zines: Zine[], remixPoints: number, handle?: string | null): BadgeId[] {
  const owned = zines.filter((z) => isMine(z, handle))
  const badges: BadgeId[] = []
  if (owned.some((z) => z.blocks.some((b) => b.type === 'sticker'))) badges.push('sticker-fiend')
  const types = new Set(owned.flatMap((z) => z.blocks.map((b) => b.type)))
  if (types.size >= 4) badges.push('panel-hopper')
  if (owned.some((z) => z.published)) badges.push('dropped')
  if (remixPoints > 0 || owned.some((z) => z.remixedFrom)) badges.push('remixer')
  if (new Set(owned.map((z) => z.vibe)).size >= 5) badges.push('multiverse')
  return badges
}

export function createSeed(): AppState {
  const mine: Zine[] = [
    zine({
      ageHours: 20,
      title: 'after hours / bushwick',
      vibe: 'miles',
      owner: 'you',
      views: 128,
      likes: 34,
      remixes: 6,
      published: true,
      blocks: [
        { id: uid(), type: 'sfx', word: 'THWIP!' },
        { id: uid(), type: 'heading', text: 'after hours / bushwick', size: 'xl' },
        {
          id: uid(),
          type: 'hero',
          src: '/art/miles.jpg',
          caption: 'the city prints itself wrong on purpose.',
          density: 0.42,
          split: 7,
        },
        {
          id: uid(),
          type: 'sticker',
          text: 'this page is a rooftop. stay as long as you want.',
          rotation: -2.4,
        },
        {
          id: uid(),
          type: 'grid',
          layout: 'asymmetric',
          panels: [
            { text: 'train delayed. good.', fill: 'var(--accent)' },
            { text: 'spray the gutter.', fill: 'var(--accent-2)', src: '/art/collage-hero.jpg' },
            { text: 'leave before sunrise.', fill: 'var(--accent-3)' },
          ],
        },
        { id: uid(), type: 'divider', style: 'speed' },
        { id: uid(), type: 'glitch', text: 'YOU ARE HERE' },
      ],
    }),
    zine({
      ageHours: 6,
      title: 'ghost notes',
      vibe: 'gwen',
      owner: 'you',
      views: 41,
      likes: 9,
      remixes: 1,
      published: false,
      blocks: [
        { id: uid(), type: 'heading', text: 'ghost notes', size: 'xl' },
        {
          id: uid(),
          type: 'sticker',
          text: 'half a song. the good half.',
          rotation: 1.8,
        },
        {
          id: uid(),
          type: 'hero',
          src: '/art/gwen.jpg',
          caption: 'watercolor over chrome. do not dry.',
          density: 0.28,
          split: 5,
        },
        { id: uid(), type: 'divider', style: 'scribble' },
      ],
    }),
  ]

  const community: Zine[] = [
    zine({
      ageHours: 8,
      title: 'sunday market',
      vibe: 'peni',
      owner: '@yuzu',
      views: 890,
      likes: 210,
      remixes: 44,
      published: true,
      blocks: [
        { id: uid(), type: 'heading', text: 'sunday market', size: 'xl' },
        { id: uid(), type: 'sfx', word: 'PING!' },
        {
          id: uid(),
          type: 'hero',
          src: '/art/peni.jpg',
          caption: 'buy a sticker. install a heart.',
          density: 0.22,
          split: 4,
        },
        {
          id: uid(),
          type: 'stack',
          cards: [
            { title: 'booth 3', body: 'handmade circuits + strawberry milk.' },
            { title: 'booth 7', body: 'robots that apologize when they bump you.' },
            { title: 'booth 12', body: 'free bows. limited dignity.' },
          ],
        },
      ],
    }),
    zine({
      ageHours: 30,
      title: 'issue 13',
      vibe: 'noir',
      owner: '@inkstain',
      views: 1402,
      likes: 388,
      remixes: 71,
      published: true,
      blocks: [
        { id: uid(), type: 'heading', text: 'issue 13', size: 'xl' },
        {
          id: uid(),
          type: 'hero',
          src: '/art/noir.jpg',
          caption: 'it rained like a confession.',
          density: 0.55,
          split: 3,
        },
        {
          id: uid(),
          type: 'sticker',
          text: 'nobody asked for a clean layout. good.',
          rotation: -1.2,
        },
        { id: uid(), type: 'glitch', text: 'REDACC TED' },
      ],
    }),
    zine({
      ageHours: 3,
      title: 'LOUDER',
      vibe: 'ham',
      owner: '@wobble',
      views: 560,
      likes: 140,
      remixes: 22,
      published: true,
      blocks: [
        { id: uid(), type: 'sfx', word: 'POW!' },
        { id: uid(), type: 'heading', text: 'LOUDER', size: 'xl' },
        {
          id: uid(),
          type: 'hero',
          src: '/art/ham.jpg',
          caption: 'if the building is not stretching, zoom in.',
          density: 0.18,
          split: 8,
        },
        { id: uid(), type: 'divider', style: 'zip' },
        {
          id: uid(),
          type: 'sticker',
          text: 'primary colors only. opinions optional.',
          rotation: 3.2,
        },
      ],
    }),
    zine({
      ageHours: 0.2,
      title: 'midnight run',
      vibe: 'noir',
      owner: '@inkstain',
      views: 12,
      likes: 3,
      remixes: 0,
      published: true,
      dropsAt: now + 15 * 60 * 1000,
      blocks: [
        { id: uid(), type: 'heading', text: 'midnight run', size: 'xl' },
        {
          id: uid(),
          type: 'hero',
          src: '/art/noir.jpg',
          caption: 'do not open until the clock lies.',
          density: 0.5,
          split: 3,
        },
        { id: uid(), type: 'glitch', text: 'NEXT ISSUE' },
        {
          id: uid(),
          type: 'sticker',
          text: 'if you can read this, the drop already happened.',
          rotation: -1.4,
        },
      ],
    }),
    zine({
      ageHours: 14,
      title: 'dimension hop',
      vibe: 'miles',
      owner: '@rio.bytes',
      views: 2204,
      likes: 612,
      remixes: 103,
      published: true,
      blocks: [
        { id: uid(), type: 'heading', text: 'dimension hop', size: 'xl' },
        { id: uid(), type: 'glitch', text: 'OFFSET THE WORLD' },
        {
          id: uid(),
          type: 'grid',
          layout: 'three',
          panels: [
            { text: 'leave', fill: 'var(--accent)' },
            { text: 'tear', fill: 'var(--accent-2)', src: '/art/miles.jpg' },
            { text: 'land', fill: 'var(--accent-3)' },
          ],
        },
        {
          id: uid(),
          type: 'hero',
          src: '/art/collage-hero.jpg',
          caption: 'collage is a transportation device.',
          density: 0.36,
          split: 9,
        },
      ],
    }),
  ]

  return {
    profile: {
      name: 'you',
      remixPoints: 6,
      likedIds: [],
    },
    zines: [...mine, ...community],
  }
}
