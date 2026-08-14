import { describe, expect, it } from 'vitest'
import { foldOrder, imposeSheet, paginateZine } from './fold'
import type { Zine } from './types'

function issue(blocks: Zine['blocks']): Zine {
  return {
    id: 'z',
    title: 'after hours',
    vibe: 'miles',
    blocks,
    owner: 'you',
    createdAt: 1,
    updatedAt: 1,
    views: 0,
    likes: 0,
    remixes: 0,
    published: true,
  }
}

describe('paginateZine', () => {
  it('puts heading and hero on page 1 and spreads the rest', () => {
    const pages = paginateZine(
      issue([
        { id: 'h', type: 'heading', text: 'after hours', size: 'xl' },
        { id: 'hero', type: 'hero', src: '/art/miles.jpg', caption: 'x', density: 0.3, split: 2 },
        { id: 's', type: 'sticker', text: 'stay', rotation: 1 },
        { id: 'q', type: 'quote', text: 'rain', cite: 'gutter' },
        { id: 'g', type: 'glitch', text: 'TEAR' },
      ]),
    )
    expect(pages).toHaveLength(8)
    expect(pages[0]?.blocks.map((b) => b.type)).toEqual(['heading', 'hero'])
    const used = pages.flatMap((p) => p.blocks.map((b) => b.id))
    expect(used).toEqual(['h', 'hero', 's', 'q', 'g'])
    expect(pages.slice(1).some((p) => p.blocks.length > 0)).toBe(true)
  })
})

describe('imposeSheet', () => {
  it('uses the classic 8-page one-sheet order', () => {
    expect(foldOrder()).toEqual([5, 4, 3, 2, 6, 7, 8, 1])
  })

  it('flips only the top row', () => {
    const cells = imposeSheet(Array.from({ length: 8 }, (_, i) => ({ n: i + 1, blocks: [] })))
    expect(cells.slice(0, 4).every((c) => c.flip)).toBe(true)
    expect(cells.slice(4).every((c) => !c.flip)).toBe(true)
  })
})
