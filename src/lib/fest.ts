import type { FestTable } from './types'

export function demoTables(): FestTable[] {
  const now = Date.now()
  return [
    {
      id: 'table-yuzu',
      owner: '@yuzu',
      name: 'booth 12',
      scene: 'bushwick',
      blurb: 'apology robots and strawberry milk. sit if you want.',
      zineIds: [],
      createdAt: now - 5 * 3600_000,
    },
    {
      id: 'table-ink',
      owner: '@inkstain',
      name: 'gutter press',
      scene: 'under the tracks',
      blurb: 'issue 13 is wet. take a napkin.',
      zineIds: [],
      createdAt: now - 3 * 3600_000,
    },
    {
      id: 'table-wobble',
      owner: '@wobble',
      name: 'LOUDER',
      scene: 'wherever the building stretches',
      blurb: 'primary colors only. opinions optional.',
      zineIds: [],
      createdAt: now - 40 * 60_000,
    },
  ]
}

export function normalizeScene(value: string | undefined | null): string | undefined {
  const next = (value ?? '').trim().slice(0, 48)
  return next || undefined
}
