import { describe, expect, it } from 'vitest'
import { WIDGETS } from './widgets'
import { createSeed, ensureToolkitSeeds } from './seed'

describe('createSeed', () => {
  it('keeps after hours as the cover sample and adds toolkit demos', () => {
    const { zines } = createSeed()
    const mine = zines.filter((z) => z.owner === 'you')
    expect(mine.some((z) => /after hours/i.test(z.title) && z.published)).toBe(true)
    expect(mine.some((z) => z.title === 'the kit' && z.published)).toBe(true)
    expect(mine.some((z) => z.title === 'scatter floor' && z.scatter)).toBe(true)
  })

  it('walks every widget type in the kit', () => {
    const kit = createSeed().zines.find((z) => z.title === 'the kit')
    expect(kit).toBeTruthy()
    const types = new Set(kit!.blocks.map((block) => block.type))
    for (const widget of WIDGETS) {
      expect(types.has(widget.type), `kit missing /${widget.slash}`).toBe(true)
    }
    expect(kit!.includes?.some((item) => /after hours/i.test(item.title))).toBe(true)
  })

  it('offers missing toolkit issues without cloning ones already on the desk', () => {
    const stale = createSeed()
    stale.zines = stale.zines.filter((zine) => zine.title !== 'the kit' && zine.title !== 'scatter floor')
    const next = ensureToolkitSeeds(stale)
    expect(next.zines.filter((zine) => zine.title === 'the kit')).toHaveLength(1)
    expect(next.zines.filter((zine) => zine.title === 'scatter floor')).toHaveLength(1)
    expect(ensureToolkitSeeds(next).zines.filter((zine) => zine.title === 'the kit')).toHaveLength(1)
  })

  it('pins scatter floor stickers and a hero', () => {
    const floor = createSeed().zines.find((z) => z.title === 'scatter floor')
    expect(floor?.scatter).toBe(true)
    const pins = floor!.blocks.filter((b) => b.type === 'sticker' || b.type === 'hero')
    expect(pins.length).toBeGreaterThanOrEqual(2)
    expect(pins.every((b) => b.type === 'sticker' || b.type === 'hero' ? b.x !== undefined : true)).toBe(true)
  })
})
