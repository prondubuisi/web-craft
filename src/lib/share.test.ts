import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare, payloadToZine, toSharePayload } from './share'
import type { Zine } from './types'

function zine(partial: Partial<Zine> = {}): Zine {
  return {
    id: 'src',
    title: 'ghost notes',
    vibe: 'gwen',
    blocks: [
      { id: 'a', type: 'heading', text: 'ghost notes', size: 'xl' },
      {
        id: 'b',
        type: 'hero',
        src: 'data:image/png;base64,abc',
        caption: 'secret photo',
        density: 0.2,
        split: 4,
      },
    ],
    owner: 'you',
    createdAt: 10,
    updatedAt: 20,
    views: 9,
    likes: 3,
    remixes: 1,
    published: true,
    dropsAt: 99,
    ...partial,
  }
}

describe('share codec', () => {
  it('round-trips a zine through encode and decode', () => {
    const token = encodeShare(zine())
    const payload = decodeShare(token)
    expect(payload?.title).toBe('ghost notes')
    expect(payload?.vibe).toBe('gwen')
    expect(payload?.dropsAt).toBe(99)
    expect(payload?.blocks).toHaveLength(2)
  })

  it('accepts a leading hash', () => {
    const token = encodeShare(zine())
    expect(decodeShare(`#${token}`)?.title).toBe('ghost notes')
  })

  it('replaces uploaded data URLs with vibe art so links stay small', () => {
    const payload = toSharePayload(zine())
    const hero = payload.blocks.find((b) => b.type === 'hero')
    expect(hero && hero.type === 'hero' ? hero.src : '').toBe('/art/gwen.jpg')
  })

  it('rejects garbage', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('not-valid')).toBeNull()
    expect(decodeShare(btoa('{"v":2,"title":"x"}'))).toBeNull()
  })

  it('builds a fresh zine from a payload', () => {
    const payload = toSharePayload(zine())
    const next = payloadToZine(payload)
    expect(next.id).not.toBe('src')
    expect(next.title).toBe('ghost notes')
    expect(next.published).toBe(true)
    expect(next.blocks[0]?.id).not.toBe('a')
  })
})
