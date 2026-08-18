import { describe, expect, it } from 'vitest'
import {
  SAMPLES,
  canHoldBag,
  linkSample,
  matchSample,
  samplesFor,
  samplesForAttr,
  starterPage,
  typeForSample,
} from './samples'
import { ATTRS, WIDGETS, createBlock } from './widgets'
import { applyBag, combineBags } from './widgetLang'

describe('samples', () => {
  it('tags every scrap with a unique label, attrs, and a bag', () => {
    expect(SAMPLES.length).toBeGreaterThan(8)
    const labels = SAMPLES.map((sample) => sample.label)
    expect(new Set(labels).size).toBe(labels.length)
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

  it('ships leftover-voice scraps and a pin for the scatter floor', () => {
    expect(SAMPLES.some((s) => s.label === 'gutter notes' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'pass this' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'drop when' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'print pass' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'corner store' && s.attrs.includes('cite'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'the margin' && s.attrs.includes('cite'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'cover toc' && s.attrs.includes('set'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'corner pin' && s.attrs.includes('pin'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'vowels out' && s.attrs.includes('holes'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'rooftop' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'confession' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'stapler' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'fold sheet' && s.attrs.includes('ink'))).toBe(true)
    expect(SAMPLES.some((s) => s.label === 'kitchen table' && s.attrs.includes('cite'))).toBe(true)
  })

  it('covers every cut except tape, which has no audio file', () => {
    for (const attr of ATTRS) {
      if (attr === 'tape') {
        expect(samplesForAttr(attr)).toHaveLength(0)
        continue
      }
      expect(samplesForAttr(attr).length, attr).toBeGreaterThan(0)
    }
  })

  it('pins a sticker from a pin scrap', () => {
    const pin = SAMPLES.find((s) => s.label === 'corner pin')
    expect(pin).toBeTruthy()
    const next = applyBag(createBlock('sticker', 'ham'), pin!.bag)
    if (next.type !== 'sticker') throw new Error('expected sticker')
    expect(next.x).toBe(8)
    expect(next.y).toBe(22)
  })

  it('lists scraps for a tray cut', () => {
    expect(samplesForAttr('ink').every((s) => s.attrs.includes('ink'))).toBe(true)
    expect(samplesForAttr('photo').some((s) => s.label === 'collage')).toBe(true)
    expect(samplesForAttr('photo').some((s) => s.label === 'city')).toBe(false)
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

  it('links city ink onto every starter widget that holds ink', () => {
    const city = SAMPLES.find((s) => s.label === 'city')
    expect(city).toBeTruthy()
    const next = linkSample(starterPage('link hop', 'miles'), city!)
    const heading = next.find((b) => b.type === 'heading')
    const hero = next.find((b) => b.type === 'hero')
    const sticker = next.find((b) => b.type === 'sticker')
    if (heading?.type !== 'heading' || hero?.type !== 'hero' || sticker?.type !== 'sticker') {
      throw new Error('expected starter trio')
    }
    expect(heading.text).toBe(city!.bag.ink)
    expect(hero.caption).toBe(city!.bag.ink)
    expect(sticker.text).toBe(city!.bag.ink)
    expect(canHoldBag('heading', city!.bag)).toBe(true)
    expect(canHoldBag('divider', city!.bag)).toBe(false)
  })

  it('links a photo scrap onto photo widgets and leaves the heading', () => {
    const collage = SAMPLES.find((s) => s.label === 'collage')
    expect(collage).toBeTruthy()
    const next = linkSample(starterPage('photo hop', 'gwen'), collage!)
    const heading = next.find((b) => b.type === 'heading')
    const hero = next.find((b) => b.type === 'hero')
    const sticker = next.find((b) => b.type === 'sticker')
    if (heading?.type !== 'heading' || hero?.type !== 'hero' || sticker?.type !== 'sticker') {
      throw new Error('expected starter trio')
    }
    expect(heading.text).toBe('photo hop')
    expect(hero.src).toBe(collage!.bag.photo)
    expect(sticker.src).toBe(collage!.bag.photo)
  })

  it('plants the vibe photo and grain scrap on a new issue hero', () => {
    const [heading, hero, sticker] = starterPage('rooftop hours', 'peni')
    expect(heading?.type).toBe('heading')
    if (heading?.type !== 'heading') throw new Error('expected heading')
    expect(heading.text).toBe('rooftop hours')
    expect(sticker?.type).toBe('sticker')
    if (sticker?.type !== 'sticker') throw new Error('expected sticker')
    expect(sticker.rotation).toBe(2.4)
    if (hero?.type !== 'hero') throw new Error('expected hero')
    expect(hero.src).toBe('/art/peni.jpg')
    expect(hero.density).toBe(0.55)
    expect(hero.split).toBe(10)
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
