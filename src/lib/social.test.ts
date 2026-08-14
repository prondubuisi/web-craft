import { beforeEach, describe, expect, it } from 'vitest'
import { addLocalComment, loadLocalComments, loadLocalPolls, voteLocalPoll } from './social'

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

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
})

describe('local comments', () => {
  it('appends a note for an issue', () => {
    const note = addLocalComment('z1', 'rio', 'offset the world')
    expect(note.body).toBe('offset the world')
    expect(note.author).toBe('@rio')
    expect(loadLocalComments('z1')).toHaveLength(1)
    expect(loadLocalComments('other')).toHaveLength(0)
  })
})

describe('local polls', () => {
  it('moves a vote when the reader changes their mind', () => {
    voteLocalPoll('z1', 'p1', 0, 2)
    const next = voteLocalPoll('z1', 'p1', 1, 2)
    expect(next.counts).toEqual([0, 1])
    expect(next.mine).toBe(1)
    expect(loadLocalPolls('z1').p1?.counts).toEqual([0, 1])
  })
})
