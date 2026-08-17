import { describe, expect, it } from 'vitest'
import type { Zine } from '../lib/types'
import { apply, type FullState } from './reducer'

function issue(partial: Partial<Zine> = {}): Zine {
  return {
    id: 'z1',
    title: 'draft',
    vibe: 'miles',
    blocks: [],
    owner: 'you',
    createdAt: 1,
    updatedAt: 1,
    views: 0,
    likes: 0,
    remixes: 0,
    published: false,
    dropsAt: null,
    ...partial,
  }
}

function state(partial: Partial<FullState> = {}): FullState {
  return {
    online: false,
    session: null,
    profile: { name: 'you', remixPoints: 0, likedIds: [], following: [] },
    zines: [issue()],
    ...partial,
  }
}

describe('apply', () => {
  it('inserts at the front and replaces the same id', () => {
    const next = apply(state(), { type: 'insert', zine: issue({ id: 'z2', title: 'new' }) })
    expect(next.zines.map((z) => z.id)).toEqual(['z2', 'z1'])
    const replaced = apply(next, { type: 'insert', zine: issue({ id: 'z2', title: 'again' }) })
    expect(replaced.zines.filter((z) => z.id === 'z2')).toHaveLength(1)
    expect(replaced.zines[0]?.title).toBe('again')
  })

  it('toggles likes and the liked id list', () => {
    const liked = apply(state(), { type: 'like', id: 'z1' })
    expect(liked.zines[0]?.likes).toBe(1)
    expect(liked.profile.likedIds).toEqual(['z1'])
    const unliked = apply(liked, { type: 'like', id: 'z1' })
    expect(unliked.zines[0]?.likes).toBe(0)
    expect(unliked.profile.likedIds).toEqual([])
  })

  it('publishes with a drop time', () => {
    const next = apply(state(), { type: 'publish', id: 'z1', dropsAt: 99 })
    expect(next.zines[0]?.published).toBe(true)
    expect(next.zines[0]?.dropsAt).toBe(99)
  })

  it('merges remote zines by id and keeps local extras', () => {
    const next = apply(state(), {
      type: 'mergeZines',
      zines: [issue({ id: 'z1', title: 'server' }), issue({ id: 'z3', title: 'stream' })],
    })
    expect(next.zines.find((z) => z.id === 'z1')?.title).toBe('server')
    expect(next.zines.map((z) => z.id)).toEqual(['z1', 'z3'])

    const withLocal = apply(state({ zines: [issue({ id: 'local', title: 'imported scrap' })] }), {
      type: 'mergeZines',
      zines: [issue({ id: 'remote', title: 'sunday market' })],
    })
    expect(withLocal.zines.map((z) => z.id)).toEqual(['local', 'remote'])
    expect(withLocal.zines.find((z) => z.id === 'local')?.title).toBe('imported scrap')

    const dropped = apply(
      state({ zines: [issue({ id: 'seed-clone', title: 'sunday market', owner: '@yuzu', published: true })] }),
      { type: 'mergeZines', zines: [issue({ id: 'remote', title: 'sunday market', owner: '@yuzu' })] },
    )
    expect(dropped.zines.map((z) => z.id)).toEqual(['remote'])
  })

  it('sets a session without dropping remix points unless told', () => {
    const base = state({ profile: { name: 'you', remixPoints: 4, likedIds: ['a'], following: ['yuzu'] } })
    const next = apply(base, { type: 'setSession', session: { name: 'rio' } })
    expect(next.session?.name).toBe('rio')
    expect(next.profile.remixPoints).toBe(4)
    expect(next.profile.likedIds).toEqual(['a'])
    expect(next.profile.following).toEqual(['yuzu'])
  })

  it('rejects empty ids and duplicate merge input in dev', () => {
    expect(() => apply(state(), { type: 'insert', zine: issue({ id: '' }) })).toThrow(/missing an id/)
    expect(() => apply(state(), { type: 'patch', id: '', patch: { title: 'x' } })).toThrow(/missing an id/)
    expect(() =>
      apply(state(), {
        type: 'mergeZines',
        zines: [issue({ id: 'dup' }), issue({ id: 'dup', title: 'other' })],
      }),
    ).toThrow(/duplicate id/)
  })

  it('follows and unfollows a handle once', () => {
    const watched = apply(state(), { type: 'follow', handle: '@Yuzu' })
    expect(watched.profile.following).toEqual(['yuzu'])
    const again = apply(watched, { type: 'follow', handle: 'yuzu' })
    expect(again.profile.following).toEqual(['yuzu'])
    const off = apply(again, { type: 'unfollow', handle: 'yuzu' })
    expect(off.profile.following).toEqual([])
  })
})
