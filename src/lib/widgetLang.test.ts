import { describe, expect, it } from 'vitest'
import { createBlock, WIDGETS } from './widgets'
import { applyBag, combineBags, harvest, restyleForVibe, restylePageForVibe, retarget, widgetsWithAttr } from './widgetLang'

describe('widgetLang', () => {
  it('retargeting to the same type is a no-op', () => {
    const block = createBlock('heading', 'miles')
    expect(retarget(block, 'heading', 'miles')).toBe(block)
  })

  it('keeps the same id and switches the type', () => {
    const block = createBlock('heading', 'miles')
    const next = retarget(block, 'quote', 'miles')
    expect(next.id).toBe(block.id)
    expect(next.type).toBe('quote')
  })

  it('carries heading text into a quote', () => {
    const block = createBlock('heading', 'miles')
    if (block.type !== 'heading') throw new Error('expected heading')
    block.text = 'a headline worth keeping'
    const next = retarget(block, 'quote', 'miles')
    if (next.type === 'quote') expect(next.text).toBe('a headline worth keeping')
  })

  it('carries a sticker photo into a halftone hero', () => {
    const block = createBlock('sticker', 'gwen')
    if (block.type !== 'sticker') throw new Error('expected sticker')
    block.src = 'data:image/png;base64,abc'
    const next = retarget(block, 'hero', 'gwen')
    if (next.type === 'hero') expect(next.src).toBe('data:image/png;base64,abc')
  })

  it('carries poll options into contents lines', () => {
    const block = createBlock('poll', 'ham')
    if (block.type !== 'poll') throw new Error('expected poll')
    block.options = ['one', 'two', 'three']
    const next = retarget(block, 'contents', 'ham')
    if (next.type === 'contents') expect(next.lines.map((line) => line.label)).toEqual(['one', 'two', 'three'])
  })

  it('falls back to fresh content when nothing harvested fits', () => {
    const block = createBlock('divider', 'noir')
    const next = retarget(block, 'audio', 'noir')
    if (next.type === 'audio') expect(next.src).toBe('')
  })

  it('drops a too-short option list rather than leaving a broken poll', () => {
    const block = createBlock('reply', 'peni')
    const next = retarget(block, 'poll', 'peni')
    if (next.type === 'poll') expect(next.options.length).toBeGreaterThanOrEqual(2)
  })

  it('harvest and applyBag round-trip every widget type without dropping the type', () => {
    for (const widget of WIDGETS) {
      const block = createBlock(widget.type, 'miles')
      const rebuilt = applyBag(block, harvest(block))
      expect(rebuilt.type).toBe(widget.type)
    }
  })

  it('widgetsWithAttr lists every recipe that carries that cut', () => {
    expect(widgetsWithAttr('photo').map((w) => w.type)).toEqual(['sticker', 'hero', 'grid', 'strip'])
    expect(widgetsWithAttr('holes').map((w) => w.type)).toEqual(['blackout'])
    expect(widgetsWithAttr('tape').map((w) => w.type)).toEqual(['audio'])
    expect(widgetsWithAttr('ink').length).toBeGreaterThan(8)
  })

  it('restyles default art and ink when the vibe changes, and leaves edits', () => {
    const hero = createBlock('hero', 'miles')
    const next = restyleForVibe(hero, 'miles', 'peni')
    if (next.type !== 'hero') throw new Error('expected hero')
    expect(next.src).toMatch(/peni/)
    expect(next.caption).toMatch(/kill-switch/)
    const edited = restyleForVibe({ ...hero, caption: 'keep this' }, 'miles', 'noir')
    if (edited.type !== 'hero') throw new Error('expected hero')
    expect(edited.caption).toBe('keep this')
    expect(edited.src).toMatch(/noir/)
    const sticker = createBlock('sticker', 'gwen')
    if (sticker.type !== 'sticker') throw new Error('expected sticker')
    sticker.src = '/art/collage-hero.jpg'
    const kept = restyleForVibe(sticker, 'gwen', 'ham')
    if (kept.type !== 'sticker') throw new Error('expected sticker')
    expect(kept.src).toBe('/art/collage-hero.jpg')
    expect(restylePageForVibe([hero], 'miles', 'miles')[0]).toBe(hero)
  })

  it('retargets every widget to every other widget without throwing', () => {
    for (const from of WIDGETS) {
      const block = createBlock(from.type, 'miles')
      for (const to of WIDGETS) {
        const next = retarget(block, to.type, 'miles')
        expect(next.type).toBe(to.type)
        expect(next.id).toBe(block.id)
      }
    }
  })

  it('combineBags is empty for no bags and passes a single bag through unchanged', () => {
    expect(combineBags([])).toEqual({})
    expect(combineBags([{ ink: 'only one' }])).toEqual({ ink: 'only one' })
  })

  it('combineBags lets a later bag override the same field', () => {
    const combined = combineBags([{ ink: 'first' }, { ink: 'second' }])
    expect(combined.ink).toBe('second')
  })

  it('combineBags merges disjoint fields from every bag', () => {
    const combined = combineBags([{ ink: 'a caption' }, { photo: '/art/miles.jpg' }, { cite: 'a voice' }])
    expect(combined).toEqual({ ink: 'a caption', photo: '/art/miles.jpg', cite: 'a voice' })
  })
})
