import { describe, expect, it } from 'vitest'
import type { Zine } from './types'
import { coverSrc, formatCountdown, isDropLive, slugify } from './zine'

function zine(partial: Partial<Zine> = {}): Zine {
  return {
    id: 'z1',
    title: 'after hours',
    vibe: 'miles',
    blocks: [],
    owner: 'you',
    createdAt: 1,
    updatedAt: 2,
    views: 0,
    likes: 0,
    remixes: 0,
    published: false,
    dropsAt: null,
    ...partial,
  }
}

describe('coverSrc', () => {
  it('uses the first hero image when present', () => {
    const issue = zine({
      blocks: [
        { id: 'h', type: 'heading', text: 'hi', size: 'xl' },
        {
          id: 'hero',
          type: 'hero',
          src: '/art/noir.jpg',
          caption: 'x',
          density: 0.3,
          split: 2,
        },
      ],
    })
    expect(coverSrc(issue)).toBe('/art/noir.jpg')
  })

  it('falls back to the vibe art', () => {
    expect(coverSrc(zine({ vibe: 'gwen' }))).toBe('/art/gwen.jpg')
  })
})

describe('isDropLive', () => {
  const now = 1_000_000

  it('is false for drafts', () => {
    expect(isDropLive(zine({ published: false, dropsAt: now - 1 }), now)).toBe(false)
  })

  it('is true when published with no schedule', () => {
    expect(isDropLive(zine({ published: true, dropsAt: null }), now)).toBe(true)
  })

  it('is false before the scheduled time', () => {
    expect(isDropLive(zine({ published: true, dropsAt: now + 10 }), now)).toBe(false)
  })

  it('is true once the scheduled time arrives', () => {
    expect(isDropLive(zine({ published: true, dropsAt: now }), now)).toBe(true)
  })
})

describe('formatCountdown', () => {
  it('formats minutes and seconds', () => {
    expect(formatCountdown(125_000)).toBe('2m 05s')
  })

  it('formats hours', () => {
    expect(formatCountdown(3_661_000)).toBe('1h 1m 01s')
  })

  it('formats days', () => {
    expect(formatCountdown(90_000_000)).toBe('1d 1h 0m')
  })

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-50)).toBe('0m 00s')
  })
})

describe('slugify', () => {
  it('turns titles into file-safe slugs', () => {
    expect(slugify('After Hours / Bushwick')).toBe('after-hours-bushwick')
  })

  it('falls back when the title has no letters', () => {
    expect(slugify('!!!')).toBe('issue')
  })
})
