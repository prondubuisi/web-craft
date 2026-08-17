import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRemote, useRemoteWithFallback } from './useRemote'

const online = { value: true }

vi.mock('../store/useZines', () => ({
  useZines: () => ({ online: online.value }),
}))

function mount<T>(fetcher: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  const seen: { data: T | null; loading: boolean; error: string | null }[] = []
  function Probe() {
    const state = useRemote(fetcher, deps, { enabled })
    seen.push(state)
    return null
  }
  act(() => {
    root.render(createElement(Probe))
  })
  return { seen, root, el }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRemote', () => {
  const trees: { root: Root; el: HTMLElement }[] = []

  afterEach(() => {
    online.value = true
    for (const tree of trees) {
      act(() => {
        tree.root.unmount()
      })
      tree.el.remove()
    }
    trees.length = 0
  })

  it('loads when online', async () => {
    const tree = mount(async () => ({ ok: true }))
    trees.push(tree)
    await flush()
    const last = tree.seen.at(-1)
    expect(last?.loading).toBe(false)
    expect(last?.data).toEqual({ ok: true })
    expect(last?.error).toBeNull()
  })

  it('skips the fetcher when offline', async () => {
    online.value = false
    const fetcher = vi.fn(async () => ({ ok: true }))
    const tree = mount(fetcher)
    trees.push(tree)
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
    expect(tree.seen.at(-1)?.data).toBeNull()
    expect(tree.seen.at(-1)?.loading).toBe(false)
  })

  it('surfaces a failed request', async () => {
    const tree = mount(async () => {
      throw new Error('board down')
    })
    trees.push(tree)
    await flush()
    expect(tree.seen.at(-1)?.error).toBe('board down')
    expect(tree.seen.at(-1)?.data).toBeNull()
  })
})

function mountFallback<T, V>(
  fetcher: () => Promise<T>,
  fallback: () => V,
  select: (data: T) => V,
  deps: unknown[] = [],
  enabled = true,
) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  const seen: V[] = []
  function Probe() {
    const [value] = useRemoteWithFallback(fetcher, fallback, select, deps, { enabled })
    seen.push(value)
    return null
  }
  act(() => {
    root.render(createElement(Probe))
  })
  return { seen, root, el }
}

describe('useRemoteWithFallback', () => {
  const trees: { root: Root; el: HTMLElement }[] = []

  afterEach(() => {
    online.value = true
    for (const tree of trees) {
      act(() => {
        tree.root.unmount()
      })
      tree.el.remove()
    }
    trees.length = 0
  })

  it('selects the remote value when online', async () => {
    const tree = mountFallback(
      async () => ({ pins: ['remote'] }),
      () => ['local'],
      (data) => data.pins,
    )
    trees.push(tree)
    await flush()
    expect(tree.seen.at(0)).toEqual(['local'])
    expect(tree.seen.at(-1)).toEqual(['remote'])
  })

  it('keeps the local fallback while offline', async () => {
    online.value = false
    const fetcher = vi.fn(async () => ({ pins: ['remote'] }))
    const tree = mountFallback(fetcher, () => ['local'], (data) => data.pins)
    trees.push(tree)
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
    expect(tree.seen.at(-1)).toEqual(['local'])
  })

  it('falls back when the request fails', async () => {
    const tree = mountFallback(
      async () => {
        throw new Error('cork down')
      },
      () => ['local'],
      (data: { pins: string[] }) => data.pins,
    )
    trees.push(tree)
    await flush()
    expect(tree.seen.at(-1)).toEqual(['local'])
  })

  it('falls back when disabled', async () => {
    const fetcher = vi.fn(async () => ({ pins: ['remote'] }))
    const tree = mountFallback(fetcher, () => ['local'], (data) => data.pins, [], false)
    trees.push(tree)
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
    expect(tree.seen.at(-1)).toEqual(['local'])
  })
})
