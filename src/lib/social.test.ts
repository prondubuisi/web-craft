import { beforeEach, describe, expect, it } from 'vitest'
import {
  addLocalComment,
  addLocalListing,
  dumpBag,
  inBag,
  listThreads,
  loadBag,
  loadLocalComments,
  loadLocalListings,
  loadLocalNotices,
  loadLocalPolls,
  loadReviews,
  markLocalNoticesRead,
  noticeCopy,
  sendLetter,
  threadWith,
  tuckBag,
  upsertReview,
  voteLocalPoll,
  addMargin,
  loadMargins,
  nominateLocal,
  nomState,
  loadTables,
  upsertTable,
  loadStamps,
  stampIssue,
  claimLocal,
  loadCork,
  saveCork,
  checkoutLocal,
  loadLoans,
  toggleSeriesWatch,
  loadSeriesWatch,
  toggleSit,
  swapLocalListing,
} from './social'

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

describe('local notices', () => {
  it('seeds an inbox and marks it read', () => {
    const inbox = loadLocalNotices()
    expect(inbox.length).toBeGreaterThan(0)
    expect(noticeCopy(inbox[0]!)).toContain(inbox[0]!.actor)
    const read = markLocalNoticesRead()
    expect(read.every((item) => item.read)).toBe(true)
  })
})

describe('local board', () => {
  it('pins a trade', () => {
    const pin = addLocalListing('rio', 'trade', 'toner for rain')
    expect(pin.kind).toBe('trade')
    expect(loadLocalListings()[0]?.body).toBe('toner for rain')
  })
})

describe('bag', () => {
  it('tucks and dumps an issue', () => {
    tuckBag('you', { zineId: 'z1', title: 'sunday market', owner: '@yuzu', vibe: 'peni' })
    expect(inBag('you', 'z1')).toBe(true)
    expect(loadBag('you')).toHaveLength(1)
    dumpBag('you', 'z1')
    expect(inBag('you', 'z1')).toBe(false)
  })
})

describe('reviews', () => {
  it('replaces a previous blurb from the same author', () => {
    upsertReview('z1', 'rio', 'too much rain')
    const next = upsertReview('z1', 'rio', 'exactly enough rain')
    expect(next.body).toBe('exactly enough rain')
    expect(loadReviews('z1')).toHaveLength(1)
  })
})

describe('margins', () => {
  it('pins a note to one block', () => {
    addMargin('z1', 'b1', 'rio', 'this panel leaks')
    expect(loadMargins('z1')).toHaveLength(1)
    expect(loadMargins('z1')[0]?.blockId).toBe('b1')
  })
})

describe('archive nominations', () => {
  it('archives after the second vote', () => {
    const first = nominateLocal('you', 'z1')
    expect(first.noms).toBe(1)
    expect(first.archived).toBe(false)
    const second = nominateLocal('yuzu', 'z1')
    expect(second.archived).toBe(true)
    expect(nomState('you', 'z1').mine).toBe(true)
  })
})

describe('fest and passport', () => {
  it('seeds tables and upserts one', () => {
    expect(loadTables().length).toBeGreaterThan(0)
    const next = upsertTable({
      id: 't1',
      owner: '@you',
      name: 'my table',
      scene: 'bushwick',
      blurb: 'sit down',
      zineIds: [],
      createdAt: Date.now(),
    })
    expect(next[0]?.name).toBe('my table')
  })

  it('stamps an issue once', () => {
    stampIssue('you', { zineId: 'z1', title: 'sunday market', owner: '@yuzu', createdAt: 1 })
    stampIssue('you', { zineId: 'z1', title: 'sunday market', owner: '@yuzu', createdAt: 2 })
    expect(loadStamps('you')).toHaveLength(1)
  })
})

describe('limited run', () => {
  it('sells out at the cap', () => {
    expect(claimLocal('a', 'z9', 2).claimed).toBe(1)
    expect(claimLocal('b', 'z9', 2).out).toBe(true)
    expect(claimLocal('c', 'z9', 2).mine).toBe(false)
  })
})

describe('corkboard', () => {
  it('saves pins', () => {
    saveCork('you', [{ id: 'p1', text: 'clip', x: 20, y: 30, rotation: -4 }])
    expect(loadCork('you')[0]?.text).toBe('clip')
  })
})

describe('series watch and sits', () => {
  it('watches a run and sits a table', () => {
    expect(toggleSeriesWatch('you', 'confession')).toContain('confession')
    expect(loadSeriesWatch('you')).toContain('confession')
    expect(toggleSit('table-yuzu', 'you')).toContain('you')
  })
})

describe('swapped trades', () => {
  it('marks a pin swapped', () => {
    const pin = addLocalListing('rio', 'trade', 'toner for rain')
    expect(swapLocalListing(pin.id)[0]?.swapped).toBe(true)
    expect(loadLocalListings()[0]?.swapped).toBe(true)
  })
})

describe('library loans', () => {
  it('checks out an issue once', () => {
    const first = checkoutLocal('you', 'z1', 'issue 13')
    expect(first).toHaveLength(1)
    expect(checkoutLocal('you', 'z1', 'issue 13')).toHaveLength(1)
    expect(loadLoans('you')[0]?.title).toBe('issue 13')
  })
})

describe('pen pal mail', () => {
  it('threads letters between two handles', () => {
    sendLetter('you', '@yuzu', 'save me a bow')
    sendLetter('@yuzu', 'you', 'already packed')
    const card = sendLetter('you', '@yuzu', 'wish you were here', { postcard: true, vibe: 'peni' })
    expect(card.postcard).toBe(true)
    const thread = threadWith('you', 'yuzu')
    expect(thread.map((row) => row.body)).toContain('already packed')
    expect(listThreads('you')[0]?.handle).toBe('yuzu')
  })
})
