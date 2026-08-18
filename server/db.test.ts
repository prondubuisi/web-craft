import { describe, expect, it } from 'vitest'
import { parseJsonColumn } from './db'

describe('parseJsonColumn', () => {
  it('returns parsed JSON when the column is valid', () => {
    expect(parseJsonColumn<string[]>('["diary"]', [])).toEqual(['diary'])
    expect(parseJsonColumn('{"zineId":"a"}', null)).toEqual({ zineId: 'a' })
  })

  it('returns the fallback on empty or corrupt text', () => {
    expect(parseJsonColumn('', [])).toEqual([])
    expect(parseJsonColumn('{not json', [])).toEqual([])
    expect(parseJsonColumn('null', [])).toBeNull()
  })
})
