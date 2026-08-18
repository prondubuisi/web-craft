import { describe, expect, it } from 'vitest'
import { editionFromRow, editionFromWrite, editionWriteParams } from './zineFields'

const row = {
  tags_json: '["diary"]',
  finish: 'riso',
  series: 'rooftop hours',
  issue_no: 2,
  pen_name: 'the gutter',
  b_side: 'secret fold',
  edition_size: 12,
  errata: 'page 1',
  includes_json: '[{"zineId":"a","title":"after hours","owner":"you"}]',
  dedication: 'for @yuzu',
  scatter: 1,
}

describe('editionFromRow', () => {
  it('maps edition columns onto zine fields', () => {
    const edition = editionFromRow(row)
    expect(edition.tags).toEqual(['diary'])
    expect(edition.finish).toBe('riso')
    expect(edition.series).toBe('rooftop hours')
    expect(edition.issueNo).toBe(2)
    expect(edition.scatter).toBe(true)
    expect(edition.includes?.[0]?.title).toBe('after hours')
  })

  it('drops empty edition strings and a zero run', () => {
    const edition = editionFromRow({
      ...row,
      finish: 'neon',
      series: '',
      pen_name: '',
      edition_size: 0,
      includes_json: '{not json',
      scatter: 0,
    })
    expect(edition.finish).toBe('clean')
    expect(edition.series).toBeUndefined()
    expect(edition.penName).toBeUndefined()
    expect(edition.editionSize).toBeUndefined()
    expect(edition.includes).toEqual([])
    expect(edition.scatter).toBe(false)
  })
})

describe('editionFromWrite', () => {
  it('clamps the same way the PUT handler did', () => {
    const edition = editionFromWrite({
      tags: ['Diary', 'diary', 'too-long-to-keep-entirely-as-one-tag'],
      finish: 'grain',
      series: '  rooftop hours  ',
      issueNo: 2,
      penName: 'x'.repeat(80),
      bSide: 'y'.repeat(400),
      editionSize: 4000,
      errata: 'z'.repeat(300),
      includes: Array.from({ length: 20 }, (_, i) => ({ zineId: String(i), title: 'n', owner: 'you' })),
      dedication: 'd'.repeat(200),
      scatter: true,
    })
    expect(edition.tags).toEqual(['diary', 'too-long-to-keep-ent'])
    expect(edition.finish).toBe('grain')
    expect(edition.series).toBe('rooftop hours')
    expect(edition.penName).toHaveLength(48)
    expect(edition.bSide).toHaveLength(280)
    expect(edition.editionSize).toBe(999)
    expect(edition.errata).toHaveLength(200)
    expect(edition.includes).toHaveLength(12)
    expect(edition.dedication).toHaveLength(120)
    expect(edition.scatter).toBe(true)
  })

  it('keeps the existing finish when the body omits one', () => {
    const edition = editionFromWrite({ title: 'x' }, { finish: 'riso', scatter: 1 })
    expect(edition.finish).toBe('riso')
    expect(edition.scatter).toBe(true)
    expect(editionWriteParams(edition, 'z1')).toHaveLength(12)
  })
})
