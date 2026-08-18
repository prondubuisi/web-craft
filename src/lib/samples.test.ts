import { describe, expect, it } from 'vitest'
import { SAMPLES, matchSample, samplesFor, typeForSample } from './samples'
import { WIDGETS, createBlock } from './widgets'
import { applyBag, combineBags } from './widgetLang'

describe('samples', () => {
  it('tags every scrap with a label, attrs, and a bag', () => {
    expect(SAMPLES.length).toBeGreaterThan(8)
    for (const sample of SAMPLES) {
      expect(sample.label.length).toBeGreaterThan(0)
      expect(sample.attrs.length).toBeGreaterThan(0)
      expect(Object.keys(sample.bag).length).toBeGreaterThan(0)
    }
  })

  it('gives every widget at least two scraps that fit', () => {
    for (const widget of WIDGETS) {
      expect(samplesFor(widget.type).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('applies a fitting scrap onto a fresh block without throwing', () => {
    for (const widget of WIDGETS) {
      const block = createBlock(widget.type, 'miles')
      const next = applyBag(block, samplesFor(widget.type)[0].bag)
      expect(next.type).toBe(widget.type)
      expect(next.id).toBe(block.id)
    }
  })

  it('combines ink and photo onto a sticker', () => {
    const sticker = createBlock('sticker', 'gwen')
    const ink = SAMPLES.find((s) => s.label === 'city')
    const photo = SAMPLES.find((s) => s.label === 'collage')
    expect(ink && photo).toBeTruthy()
    const next = applyBag(sticker, combineBags([ink!.bag, photo!.bag]))
    if (next.type !== 'sticker') throw new Error('expected sticker')
    expect(next.text).toBe(ink!.bag.ink)
    expect(next.src).toBe(photo!.bag.photo)
  })

  it('slash language finds scraps by label and cut', () => {
    expect(matchSample('city').some((s) => s.label === 'city')).toBe(true)
    expect(matchSample('photo').every((s) => s.attrs.includes('photo'))).toBe(true)
  })

  it('picks a widget that can hold the whole scrap', () => {
    const photo = SAMPLES.find((s) => s.label === 'collage')
    expect(typeForSample(photo!)).toBe('sticker')
    const ink = SAMPLES.find((s) => s.label === 'city')
    expect(typeForSample(ink!)).toBe('heading')
  })

  it('combining two ink scraps keeps the later line', () => {
    const block = createBlock('heading', 'miles')
    const city = SAMPLES.find((s) => s.label === 'city')
    const free = SAMPLES.find((s) => s.label === 'free page')
    const next = applyBag(block, combineBags([city!.bag, free!.bag]))
    if (next.type === 'heading') expect(next.text).toBe(free!.bag.ink)
  })

  it('ships a spread of pixelated/color-split cut scraps for the halftone hero', () => {
    const pixelated = SAMPLES.filter((s) => s.attrs.includes('cut') && s.bag.split !== undefined)
    expect(pixelated.length).toBeGreaterThanOrEqual(4)
    for (const sample of pixelated) {
      expect(sample.bag.density).toBeGreaterThan(0)
      expect(sample.bag.density).toBeLessThanOrEqual(0.7)
      expect(sample.bag.split).toBeGreaterThan(0)
      expect(sample.bag.split).toBeLessThanOrEqual(14)
    }
  })

  it('combines a photo with a pixelated cut scrap onto one hero', () => {
    const hero = createBlock('hero', 'ham')
    const photo = SAMPLES.find((s) => s.label === 'peni')
    const pixel = SAMPLES.find((s) => s.label === 'gif diff')
    expect(photo && pixel).toBeTruthy()
    const next = applyBag(hero, combineBags([photo!.bag, pixel!.bag]))
    if (next.type !== 'hero') throw new Error('expected hero')
    expect(next.src).toBe(photo!.bag.photo)
    expect(next.density).toBe(pixel!.bag.density)
    expect(next.split).toBe(pixel!.bag.split)
  })
})
