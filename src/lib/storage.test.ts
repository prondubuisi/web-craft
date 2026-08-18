import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, TOOLKIT_OFFER_KEY, loadState, normalizeState, resetState, saveState } from './storage'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
    key(index) {
      return [...data.keys()][index] ?? null
    },
  }
}

describe('normalizeState', () => {
  it('returns null for junk', () => {
    expect(normalizeState(null)).toBeNull()
    expect(normalizeState({})).toBeNull()
    expect(normalizeState({ profile: { name: 'you', remixPoints: 0, likedIds: [] } })).toBeNull()
  })

  it('fills dropsAt for published issues that lack one', () => {
    const state = normalizeState({
      profile: { name: 'you', remixPoints: 1, likedIds: [] },
      zines: [
        {
          id: '1',
          title: 'old',
          vibe: 'noir',
          blocks: [],
          owner: 'you',
          createdAt: 1,
          updatedAt: 50,
          views: 0,
          likes: 0,
          remixes: 0,
          published: true,
        },
      ],
    })
    expect(state?.zines[0]?.dropsAt).toBe(50)
    expect(state?.profile.following).toEqual([])
  })

  it('keeps drafts unscheduled', () => {
    const state = normalizeState({
      profile: { name: 'you', remixPoints: 0, likedIds: [] },
      zines: [
        {
          id: '2',
          title: 'wip',
          vibe: 'miles',
          blocks: [],
          owner: 'you',
          createdAt: 1,
          updatedAt: 2,
          views: 0,
          likes: 0,
          remixes: 0,
          published: false,
        },
      ],
    })
    expect(state?.zines[0]?.dropsAt).toBeNull()
  })
})

describe('localStorage persistence', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })
  })

  it('seeds a studio when storage is empty', () => {
    const state = loadState()
    expect(state.zines.length).toBeGreaterThan(0)
    expect(state.profile.name).toBe('you')
  })

  it('round-trips a saved studio', () => {
    const seeded = loadState()
    seeded.profile.name = 'rio'
    saveState(seeded)
    expect(localStorage.getItem(STORAGE_KEY)).toContain('rio')
    const again = loadState()
    expect(again.profile.name).toBe('rio')
    expect(again.zines).toHaveLength(seeded.zines.length)
  })

  it('reseeds after reset', () => {
    const first = loadState()
    first.profile.name = 'temp'
    saveState(first)
    const fresh = resetState()
    expect(fresh.profile.name).toBe('you')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('offers the kit once on an older saved studio', () => {
    const stale = loadState()
    stale.zines = stale.zines.filter((zine) => zine.title !== 'the kit' && zine.title !== 'scatter floor')
    saveState(stale)
    localStorage.removeItem(TOOLKIT_OFFER_KEY)
    const offered = loadState()
    expect(offered.zines.some((zine) => zine.title === 'the kit')).toBe(true)
    offered.zines = offered.zines.filter((zine) => zine.title !== 'the kit')
    saveState(offered)
    const again = loadState()
    expect(again.zines.some((zine) => zine.title === 'the kit')).toBe(false)
  })

  it('reseeds when stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    const state = loadState()
    expect(state.zines.length).toBeGreaterThan(0)
  })
})
