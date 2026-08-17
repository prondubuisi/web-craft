import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Block, Zine } from './types'
import { useHistory } from './useHistory'

function issue(over: Partial<Zine> = {}): Zine {
  return {
    id: 'z1',
    title: 'one',
    vibe: 'miles',
    blocks: [{ id: 'b1', type: 'heading', text: 'hi', size: 'md' }],
    owner: 'you',
    createdAt: 1,
    updatedAt: 1,
    views: 0,
    likes: 0,
    remixes: 0,
    published: false,
    ...over,
  }
}

const store = {
  zine: issue(),
  patchZine: vi.fn((id: string, patch: Partial<Zine>) => {
    if (id !== store.zine.id) return
    Object.assign(store.zine, patch)
  }),
  setBlocks: vi.fn((id: string, blocks: Block[]) => {
    if (id !== store.zine.id) return
    store.zine.blocks = blocks
  }),
}

vi.mock('../store/useZines', () => ({
  useZines: () => ({
    patchZine: store.patchZine,
    setBlocks: store.setBlocks,
  }),
}))

type Api = ReturnType<typeof useHistory>

function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  const api: { current: Api | null } = { current: null }
  function Probe() {
    api.current = useHistory(store.zine)
    return null
  }
  function paint() {
    act(() => {
      root.render(createElement(Probe))
    })
  }
  paint()
  return { api, root, el, paint }
}

describe('useHistory', () => {
  const trees: { root: Root; el: HTMLElement }[] = []

  afterEach(() => {
    store.zine = issue()
    store.patchZine.mockClear()
    store.setBlocks.mockClear()
    for (const tree of trees) {
      act(() => {
        tree.root.unmount()
      })
      tree.el.remove()
    }
    trees.length = 0
  })

  it('undo restores the remembered snap', () => {
    const tree = mount()
    trees.push(tree)
    tree.api.current?.remember()
    store.zine = issue({
      title: 'two',
      blocks: [{ id: 'b2', type: 'heading', text: 'later', size: 'lg' }],
    })
    tree.paint()
    act(() => {
      tree.api.current?.undo()
    })
    expect(store.zine.title).toBe('one')
    expect(store.zine.blocks).toEqual([{ id: 'b1', type: 'heading', text: 'hi', size: 'md' }])
  })

  it('redo restores the state undo left', () => {
    const tree = mount()
    trees.push(tree)
    tree.api.current?.remember()
    store.zine = issue({ title: 'two' })
    tree.paint()
    act(() => {
      tree.api.current?.undo()
    })
    tree.paint()
    act(() => {
      tree.api.current?.redo()
    })
    expect(store.zine.title).toBe('two')
  })

  it('remember after undo drops redo', () => {
    const tree = mount()
    trees.push(tree)
    tree.api.current?.remember()
    store.zine = issue({ title: 'two' })
    tree.paint()
    act(() => {
      tree.api.current?.undo()
    })
    tree.paint()
    tree.api.current?.remember()
    store.zine = issue({ title: 'three' })
    tree.paint()
    store.patchZine.mockClear()
    store.setBlocks.mockClear()
    act(() => {
      tree.api.current?.redo()
    })
    expect(store.zine.title).toBe('three')
    expect(store.patchZine).not.toHaveBeenCalled()
    expect(store.setBlocks).not.toHaveBeenCalled()
  })

  it('undo is a no-op with an empty stack', () => {
    const tree = mount()
    trees.push(tree)
    act(() => {
      tree.api.current?.undo()
    })
    expect(store.patchZine).not.toHaveBeenCalled()
    expect(store.setBlocks).not.toHaveBeenCalled()
  })
})
