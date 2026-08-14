import { describe, expect, it } from 'vitest'
import { demoTables, normalizeScene } from './fest'

describe('fest', () => {
  it('seeds three tables with scenes', () => {
    const tables = demoTables()
    expect(tables).toHaveLength(3)
    expect(tables.every((table) => table.scene.length > 0)).toBe(true)
  })

  it('trims a scene name', () => {
    expect(normalizeScene('  bushwick  ')).toBe('bushwick')
    expect(normalizeScene('   ')).toBeUndefined()
  })
})
