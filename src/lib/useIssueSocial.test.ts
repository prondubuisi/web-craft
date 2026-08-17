import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Zine } from './types'
import { useIssueSocial } from './useIssueSocial'

const social = vi.hoisted(() => ({
  bumpPageStat: vi.fn(() => []),
  checkoutLocal: vi.fn(),
  claimLocal: vi.fn(() => ({ claimed: 1, mine: true, out: false })),
  claimState: vi.fn(() => ({ claimed: 0, mine: false, out: false })),
  dumpBag: vi.fn(),
  inBag: vi.fn(() => false),
  loadLoans: vi.fn(() => []),
  loadLocalPolls: vi.fn(() => ({ p1: { counts: [2, 0], mine: 0 } })),
  loadMargins: vi.fn(() => []),
  loadPageStats: vi.fn(() => []),
  loadSeriesWatch: vi.fn(() => []),
  nomState: vi.fn(() => ({ noms: 0, archived: false, mine: false })),
  nominateLocal: vi.fn(() => ({ noms: 1, archived: false, mine: true })),
  sendLetter: vi.fn(),
  stockShelf: vi.fn(),
  toggleSeriesWatch: vi.fn(() => ['midnight']),
  tuckBag: vi.fn(),
  voteLocalPoll: vi.fn(() => ({ counts: [1, 0], mine: 0 })),
}))

const apiMock = vi.hoisted(() => ({
  polls: vi.fn(async () => ({ polls: {} })),
  bag: vi.fn(async () => ({ bag: [] })),
  margins: vi.fn(async () => ({ notes: [] })),
  pageStats: vi.fn(async () => ({ pages: [] })),
  chainPeek: vi.fn(async () => ({ previous: [], turn: 0 })),
  votePoll: vi.fn(async () => ({ counts: [0, 1], mine: 1 })),
  pageHit: vi.fn(async () => ({})),
  dump: vi.fn(async () => ({})),
  tuck: vi.fn(async () => ({})),
  stock: vi.fn(async () => ({})),
  nominate: vi.fn(async () => ({ noms: 1, archived: false, mine: true })),
  watchSeries: vi.fn(async () => ({ watching: true })),
  checkout: vi.fn(async () => ({})),
  claim: vi.fn(async () => ({ claimed: 1, mine: true, out: false })),
  sendMail: vi.fn(async () => ({})),
  chainAdd: vi.fn(async () => ({ invite: 'next', turn: 2 })),
}))

vi.mock('./api', () => ({ api: apiMock }))
vi.mock('./social', () => social)

function issue(over: Partial<Zine> = {}): Zine {
  return {
    id: 'z1',
    title: 'midnight run',
    vibe: 'miles',
    blocks: [],
    owner: '@rio',
    createdAt: 1,
    updatedAt: 1,
    views: 0,
    likes: 0,
    remixes: 0,
    published: true,
    ...over,
  }
}

type Opts = Parameters<typeof useIssueSocial>[0]
type Api = ReturnType<typeof useIssueSocial>

function opts(over: Partial<Opts> = {}): Opts {
  const zine = 'zine' in over ? over.zine : issue()
  return {
    id: zine?.id,
    zine,
    locked: false,
    needsPass: false,
    mine: false,
    online: false,
    session: null,
    profileName: 'you',
    chainInvite: null,
    ...over,
  }
}

function mount(initial: Opts = opts()) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  const seen: Api[] = []
  function Probe() {
    seen.push(useIssueSocial(initial))
    return null
  }
  act(() => {
    root.render(createElement(Probe))
  })
  return { seen, last: () => seen.at(-1)!, root, el }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useIssueSocial', () => {
  const trees: { root: Root; el: HTMLElement }[] = []

  afterEach(() => {
    vi.clearAllMocks()
    apiMock.polls.mockResolvedValue({ polls: {} })
    apiMock.bag.mockResolvedValue({ bag: [] })
    apiMock.margins.mockResolvedValue({ notes: [] })
    apiMock.pageStats.mockResolvedValue({ pages: [] })
    apiMock.chainPeek.mockResolvedValue({ previous: [], turn: 0 })
    apiMock.votePoll.mockResolvedValue({ counts: [0, 1], mine: 1 })
    apiMock.nominate.mockResolvedValue({ noms: 1, archived: false, mine: true })
    apiMock.sendMail.mockResolvedValue({})
    social.loadLocalPolls.mockReturnValue({ p1: { counts: [2, 0], mine: 0 } })
    social.inBag.mockReturnValue(false)
    social.nomState.mockReturnValue({ noms: 0, archived: false, mine: false })
    social.nominateLocal.mockReturnValue({ noms: 1, archived: false, mine: true })
    social.voteLocalPoll.mockReturnValue({ counts: [1, 0], mine: 0 })
    social.claimLocal.mockReturnValue({ claimed: 1, mine: true, out: false })
    social.toggleSeriesWatch.mockReturnValue(['midnight'])
    social.loadLoans.mockReturnValue([])
    social.loadSeriesWatch.mockReturnValue([])
    social.claimState.mockReturnValue({ claimed: 0, mine: false, out: false })
    for (const tree of trees) {
      act(() => {
        tree.root.unmount()
      })
      tree.el.remove()
    }
    trees.length = 0
  })

  it('loads local polls when the issue is not remote-social', async () => {
    const tree = mount(opts({ online: false }))
    trees.push(tree)
    await flush()
    expect(apiMock.polls).not.toHaveBeenCalled()
    expect(tree.last().polls).toEqual({ p1: { counts: [2, 0], mine: 0 } })
    expect(tree.last().remoteSocial).toBe(false)
  })

  it('loads remote polls for a published issue that is not yours', async () => {
    apiMock.polls.mockResolvedValue({ polls: { p1: { counts: [4, 1], mine: 1 } } })
    const tree = mount(opts({ online: true }))
    trees.push(tree)
    await flush()
    expect(apiMock.polls).toHaveBeenCalledWith('z1')
    expect(tree.last().polls).toEqual({ p1: { counts: [4, 1], mine: 1 } })
    expect(tree.last().remoteSocial).toBe(true)
  })

  it('falls back to local polls when the remote fetch fails', async () => {
    apiMock.polls.mockRejectedValue(new Error('polls down'))
    const tree = mount(opts({ online: true }))
    trees.push(tree)
    await flush()
    expect(tree.last().polls).toEqual({ p1: { counts: [2, 0], mine: 0 } })
  })

  it('skips poll and margin fetches when the issue is locked', async () => {
    const tree = mount(opts({ online: true, locked: true }))
    trees.push(tree)
    await flush()
    expect(apiMock.polls).not.toHaveBeenCalled()
    expect(apiMock.margins).not.toHaveBeenCalled()
  })

  it('reads bag membership from the API when signed in', async () => {
    apiMock.bag.mockResolvedValue({ bag: [{ zineId: 'z1', title: 'midnight run' }] })
    const tree = mount(opts({ online: true, session: { name: 'gwen' } }))
    trees.push(tree)
    await flush()
    expect(apiMock.bag).toHaveBeenCalled()
    expect(tree.last().bagged).toBe(true)
  })

  it('reads bag membership locally when offline', async () => {
    social.inBag.mockReturnValue(true)
    const tree = mount()
    trees.push(tree)
    await flush()
    expect(apiMock.bag).not.toHaveBeenCalled()
    expect(social.inBag).toHaveBeenCalledWith('you', 'z1')
    expect(tree.last().bagged).toBe(true)
  })

  it('tuck then dump go through local bag and the API when signed in', async () => {
    apiMock.bag.mockResolvedValue({ bag: [] })
    apiMock.tuck.mockResolvedValue({})
    apiMock.dump.mockResolvedValue({})
    const tree = mount(opts({ online: true, session: { name: 'gwen' } }))
    trees.push(tree)
    await flush()
    act(() => {
      tree.last().toggleBag()
    })
    expect(social.tuckBag).toHaveBeenCalled()
    expect(apiMock.tuck).toHaveBeenCalledWith('z1')
    expect(tree.last().bagged).toBe(true)
    act(() => {
      tree.last().toggleBag()
    })
    expect(social.dumpBag).toHaveBeenCalledWith('gwen', 'z1')
    expect(apiMock.dump).toHaveBeenCalledWith('z1')
    expect(tree.last().bagged).toBe(false)
  })

  it('votes locally when offline', () => {
    const tree = mount()
    trees.push(tree)
    act(() => {
      tree.last().vote('p1', 0, 2)
    })
    expect(social.voteLocalPoll).toHaveBeenCalledWith('z1', 'p1', 0, 2)
    expect(apiMock.votePoll).not.toHaveBeenCalled()
    expect(tree.last().polls.p1).toEqual({ counts: [1, 0], mine: 0 })
  })

  it('falls back to a local vote when the API misses', async () => {
    apiMock.polls.mockResolvedValue({ polls: {} })
    apiMock.votePoll.mockRejectedValue(new Error('vote down'))
    const tree = mount(opts({ online: true, session: { name: 'gwen' } }))
    trees.push(tree)
    await flush()
    act(() => {
      tree.last().vote('p1', 1, 2)
    })
    await flush()
    expect(apiMock.votePoll).toHaveBeenCalledWith('z1', 'p1', 1)
    expect(social.voteLocalPoll).toHaveBeenCalledWith('z1', 'p1', 1, 2)
    expect(tree.last().polls.p1).toEqual({ counts: [1, 0], mine: 0 })
  })

  it('nominates locally when offline and remotely when signed in', async () => {
    const offline = mount()
    trees.push(offline)
    act(() => {
      offline.last().nominate()
    })
    expect(social.nominateLocal).toHaveBeenCalledWith('you', 'z1')
    expect(offline.last().archive).toEqual({ noms: 1, archived: false, mine: true })

    apiMock.nominate.mockResolvedValue({ noms: 3, archived: true, mine: true })
    const online = mount(opts({ online: true, session: { name: 'gwen' } }))
    trees.push(online)
    await flush()
    act(() => {
      online.last().nominate()
    })
    await flush()
    expect(apiMock.nominate).toHaveBeenCalledWith('z1')
    expect(online.last().archive).toEqual({ noms: 3, archived: true, mine: true })
  })

  it('claims a limited run locally when offline', () => {
    const tree = mount(opts({ zine: issue({ editionSize: 12 }) }))
    trees.push(tree)
    act(() => {
      tree.last().claim()
    })
    expect(social.claimLocal).toHaveBeenCalledWith('you', 'z1', 12)
    expect(apiMock.claim).not.toHaveBeenCalled()
    expect(tree.last().run).toEqual({ claimed: 1, mine: true, out: false })
  })

  it('folds a postcard locally when the maker is you', () => {
    const tree = mount(opts({ zine: issue({ owner: 'you' }) }))
    trees.push(tree)
    act(() => {
      tree.last().mailMaker('nice issue')
    })
    expect(social.sendLetter).toHaveBeenCalled()
    expect(apiMock.sendMail).not.toHaveBeenCalled()
    expect(tree.last().mailNote).toBe('postcard folded.')
  })

  it('mails a postcard when signed in and folds when the API misses', async () => {
    apiMock.sendMail.mockResolvedValue({})
    const tree = mount(opts({ online: true, session: { name: 'gwen' } }))
    trees.push(tree)
    await flush()
    act(() => {
      tree.last().mailMaker('nice issue')
    })
    await flush()
    expect(apiMock.sendMail).toHaveBeenCalledWith('rio', 'nice issue', { postcard: true, vibe: 'miles' })
    expect(tree.last().mailNote).toBe('postcard mailed.')

    apiMock.sendMail.mockRejectedValue(new Error('mail down'))
    act(() => {
      tree.last().mailMaker('again')
    })
    await flush()
    expect(social.sendLetter).toHaveBeenCalled()
    expect(tree.last().mailNote).toBe('postcard folded.')
  })

  it('checkouts tuck the bag and refuse a corpse pass while offline', () => {
    const tree = mount(opts({ chainInvite: 'inv1' }))
    trees.push(tree)
    act(() => {
      tree.last().checkout()
      tree.last().passCorpse()
    })
    expect(social.checkoutLocal).toHaveBeenCalled()
    expect(tree.last().loaned).toBe(true)
    expect(tree.last().bagged).toBe(true)
    expect(apiMock.chainAdd).not.toHaveBeenCalled()
    expect(tree.last().chainMsg).toBe('claim a handle to pass the corpse on the API')
  })
})
