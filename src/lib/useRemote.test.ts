import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRemote } from './useRemote'

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
