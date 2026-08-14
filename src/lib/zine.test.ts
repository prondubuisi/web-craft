import { describe, expect, it } from 'vitest'
import type { Zine } from './types'
import {
  canOpenSecret,
  coverSrc,
  filterStream,
  formatCountdown,
  isDropLive,
  isMine,
  isPublicDrop,
  issuePath,
  normalizeIssueNo,
  normalizeSeries,
  ownerHandle,
  profilePath,
  byline,
  seriesLabel,
  slugify,
} from './zine'

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

describe('isMine', () => {
  it('treats local you-owned zines as mine', () => {
    expect(isMine(zine({ owner: 'you' }), null)).toBe(true)
  })

  it('matches a signed-in handle', () => {
    expect(isMine(zine({ owner: '@rio' }), 'rio')).toBe(true)
    expect(isMine(zine({ owner: '@yuzu' }), 'rio')).toBe(false)
  })
})

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

describe('profiles', () => {
  it('strips the @ from a handle', () => {
    expect(ownerHandle('@yuzu')).toBe('yuzu')
    expect(profilePath('@yuzu')).toBe('/u/yuzu')
  })
})

describe('series', () => {
  it('normalizes a run name and issue number', () => {
    expect(normalizeSeries('  rooftop hours  ')).toBe('rooftop hours')
    expect(normalizeSeries('   ')).toBeUndefined()
    expect(normalizeIssueNo('3')).toBe(3)
    expect(normalizeIssueNo(0)).toBeUndefined()
    expect(seriesLabel({ series: 'confession', issueNo: 13 })).toBe('confession #13')
    expect(seriesLabel({ series: 'confession' })).toBe('confession')
  })

  it('prefers a pen name as the byline', () => {
    expect(byline({ owner: '@inkstain', penName: 'the gutter' })).toBe('the gutter')
    expect(byline({ owner: '@inkstain' })).toBe('@inkstain')
  })
})

describe('filterStream', () => {
  const issues = [
    zine({ id: 'a', title: 'sunday market', vibe: 'peni', owner: '@yuzu', published: true, likes: 2, remixes: 9, dropsAt: 10, series: 'booth notes' }),
    zine({ id: 'b', title: 'LOUDER', vibe: 'ham', owner: '@wobble', published: true, likes: 8, remixes: 1, dropsAt: 20 }),
    zine({ id: 'c', title: 'draft', vibe: 'miles', owner: 'you', published: false, likes: 99, remixes: 99 }),
  ]

  it('hides drafts and matches a query', () => {
    expect(filterStream(issues, { q: 'market' }).map((z) => z.id)).toEqual(['a'])
    expect(filterStream(issues, { q: 'wobble' }).map((z) => z.id)).toEqual(['b'])
    expect(filterStream(issues, { q: 'booth' }).map((z) => z.id)).toEqual(['a'])
  })

  it('filters by vibe and sorts by likes', () => {
    expect(filterStream(issues, { vibe: 'ham' }).map((z) => z.id)).toEqual(['b'])
    expect(filterStream(issues, { sort: 'likes' }).map((z) => z.id)).toEqual(['b', 'a'])
  })

  it('keeps only watched handles', () => {
    expect(filterStream(issues, { following: ['yuzu'] }).map((z) => z.id)).toEqual(['a'])
  })

  it('hides unlisted issues from the stream', () => {
    const secret = zine({
      id: 'u',
      title: 'back alley',
      published: true,
      visibility: 'unlisted',
      shareKey: 'abc',
      dropsAt: 30,
    })
    expect(isPublicDrop(secret)).toBe(false)
    expect(filterStream([...issues, secret]).map((z) => z.id)).toEqual(['b', 'a'])
    expect(canOpenSecret(secret, 'abc')).toBe(true)
    expect(canOpenSecret(secret, 'nope')).toBe(false)
    expect(issuePath(secret)).toBe('/z/u?k=abc')
  })
})
