import { describe, expect, it } from 'vitest'
import { demoJams, fitsJam, jamForPublish, liveJam } from './jam'

describe('jam rules', () => {
  it('treats a one-pager as six blocks or fewer', () => {
    expect(fitsJam(6, 'one')).toBe(true)
    expect(fitsJam(7, 'one')).toBe(false)
    expect(fitsJam(2, 'card')).toBe(true)
    expect(fitsJam(3, 'card')).toBe(false)
    expect(fitsJam(20, 'any')).toBe(true)
  })

  it('attaches a public short issue to the live jam', () => {
    const now = Date.now()
    const jams = demoJams(now)
    expect(liveJam(jams, now)?.id).toBe('toner-week')
    const hit = jamForPublish({ blocks: [{ id: '1' }] as never, visibility: 'public' }, jams, now)
    expect(hit?.id).toBe('toner-week')
    const skip = jamForPublish(
      { blocks: Array.from({ length: 8 }, (_, i) => ({ id: String(i) })) as never, visibility: 'public' },
      jams,
      now,
    )
    expect(skip).toBeUndefined()
  })
})
