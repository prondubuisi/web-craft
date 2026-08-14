import { describe, expect, it } from 'vitest'
import { formatTags, normalizeTags } from './tags'

describe('normalizeTags', () => {
  it('slugs, dedupes, and caps at five', () => {
    expect(normalizeTags('Diary, diary, PROTEST, fan-art, music, extra')).toEqual([
      'diary',
      'protest',
      'fan-art',
      'music',
      'extra',
    ].slice(0, 5))
    expect(normalizeTags(['#Rain', 'rain', '??'])).toEqual(['rain'])
    expect(formatTags(['diary', 'music'])).toBe('diary, music')
  })
})
