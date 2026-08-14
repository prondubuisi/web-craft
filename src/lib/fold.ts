import type { Block, Zine } from './types'

export const FOLD_PAGES = 8

export type FoldPage = {
  n: number
  blocks: Block[]
}

export type ImposedCell = {
  page: FoldPage
  flip: boolean
}

export function paginateZine(zine: Zine, count = FOLD_PAGES): FoldPage[] {
  const pages: FoldPage[] = Array.from({ length: count }, (_, i) => ({ n: i + 1, blocks: [] }))
  const rest = [...zine.blocks]
  const cover: Block[] = []
  const heading = rest.find((block) => block.type === 'heading')
  const hero = rest.find((block) => block.type === 'hero')
  if (heading) {
    cover.push(heading)
    rest.splice(rest.indexOf(heading), 1)
  }
  if (hero) {
    cover.push(hero)
    rest.splice(rest.indexOf(hero), 1)
  }
  if (!cover.length && rest.length) cover.push(rest.shift()!)
  pages[0].blocks = cover

  if (!rest.length) return pages
  const buckets = count - 1
  const size = Math.max(1, Math.ceil(rest.length / buckets))
  rest.forEach((block, i) => {
    const slot = Math.min(buckets - 1, Math.floor(i / size))
    pages[slot + 1].blocks.push(block)
  })
  return pages
}

/** Single-sided 8-page mini-zine: 2×4 landscape grid, top row upside-down. */
export function imposeSheet(pages: FoldPage[]): ImposedCell[] {
  const byN = (n: number) => pages.find((page) => page.n === n) ?? { n, blocks: [] }
  return [
    { page: byN(5), flip: true },
    { page: byN(4), flip: true },
    { page: byN(3), flip: true },
    { page: byN(2), flip: true },
    { page: byN(6), flip: false },
    { page: byN(7), flip: false },
    { page: byN(8), flip: false },
    { page: byN(1), flip: false },
  ]
}

export function foldOrder(): number[] {
  return imposeSheet(Array.from({ length: FOLD_PAGES }, (_, i) => ({ n: i + 1, blocks: [] }))).map(
    (cell) => cell.page.n,
  )
}
