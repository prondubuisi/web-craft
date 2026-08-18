import { describe, expect, it } from 'vitest'
import { createBlock, LANES, matchWidget, WIDGETS } from './widgets'
import { harvest, retarget } from './widgetLang'

describe('widgets', () => {
  it('lists slash commands for quote and poll', () => {
    expect(WIDGETS.some((w) => w.type === 'quote' && w.slash === 'quote')).toBe(true)
    expect(WIDGETS.some((w) => w.type === 'poll' && w.slash === 'poll')).toBe(true)
  })

  it('creates a pull quote', () => {
    const block = createBlock('quote', 'noir')
    expect(block.type).toBe('quote')
    if (block.type === 'quote') {
      expect(block.text.length).toBeGreaterThan(4)
      expect(block.cite.length).toBeGreaterThan(1)
    }
  })

  it('creates a poll with at least two options', () => {
    const block = createBlock('poll', 'peni')
    expect(block.type).toBe('poll')
    if (block.type === 'poll') {
      expect(block.options.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('creates an empty mixtape block', () => {
    const block = createBlock('audio', 'miles')
    expect(block.type).toBe('audio')
    if (block.type === 'audio') expect(block.src).toBe('')
  })

  it('creates a four-panel strip', () => {
    const block = createBlock('strip', 'ham')
    expect(block.type).toBe('strip')
    if (block.type === 'strip') expect(block.panels).toHaveLength(4)
  })

  it('creates a blackout poem with redactions', () => {
    const block = createBlock('blackout', 'noir')
    expect(block.type).toBe('blackout')
    if (block.type === 'blackout') {
      expect(block.text.split(/\s+/).length).toBeGreaterThan(4)
      expect(block.hidden.length).toBeGreaterThan(0)
    }
  })

  it('creates a tear-out reply', () => {
    const block = createBlock('reply', 'gwen')
    expect(block.type).toBe('reply')
    if (block.type === 'reply') expect(block.prompt.length).toBeGreaterThan(4)
  })

  it('creates a flyer insert', () => {
    const block = createBlock('insert', 'ham')
    expect(block.type).toBe('insert')
    if (block.type === 'insert') expect(block.title.length).toBeGreaterThan(2)
  })

  it('creates a contents list', () => {
    const block = createBlock('contents', 'miles')
    expect(block.type).toBe('contents')
    if (block.type === 'contents') expect(block.lines.length).toBeGreaterThan(1)
  })

  it('creates a colophon with press and thanks', () => {
    const block = createBlock('colophon', 'noir')
    expect(block.type).toBe('colophon')
    if (block.type === 'colophon') {
      expect(block.press.length).toBeGreaterThan(2)
      expect(block.thanks.length).toBeGreaterThan(2)
    }
  })

  it('creates a scribble heading', () => {
    const block = createBlock('heading', 'miles')
    expect(block.type).toBe('heading')
    if (block.type === 'heading') expect(block.text.length).toBeGreaterThan(2)
  })

  it('creates a sticker box', () => {
    const block = createBlock('sticker', 'gwen')
    expect(block.type).toBe('sticker')
    if (block.type === 'sticker') expect(block.text.length).toBeGreaterThan(4)
  })

  it('creates a halftone hero with vibe art', () => {
    const block = createBlock('hero', 'ham')
    expect(block.type).toBe('hero')
    if (block.type === 'hero') {
      expect(block.src.length).toBeGreaterThan(0)
      expect(block.density).toBeGreaterThan(0)
    }
  })

  it('creates an action grid with three panels', () => {
    const block = createBlock('grid', 'peni')
    expect(block.type).toBe('grid')
    if (block.type === 'grid') expect(block.panels).toHaveLength(3)
  })

  it('creates a scribble divider', () => {
    const block = createBlock('divider', 'noir')
    expect(block.type).toBe('divider')
    if (block.type === 'divider') expect(block.style.length).toBeGreaterThan(0)
  })

  it('creates a sound fx block', () => {
    const block = createBlock('sfx', 'miles')
    expect(block.type).toBe('sfx')
    if (block.type === 'sfx') expect(block.word.length).toBeGreaterThan(0)
  })

  it('creates a glitch layer', () => {
    const block = createBlock('glitch', 'gwen')
    expect(block.type).toBe('glitch')
    if (block.type === 'glitch') expect(block.text.length).toBeGreaterThan(0)
  })

  it('creates a zine stack with three cards', () => {
    const block = createBlock('stack', 'ham')
    expect(block.type).toBe('stack')
    if (block.type === 'stack') expect(block.cards).toHaveLength(3)
  })

  it('creates a matching block for every widget in the tray', () => {
    for (const widget of WIDGETS) {
      const block = createBlock(widget.type, 'miles')
      expect(block.type).toBe(widget.type)
      expect(block.id.length).toBeGreaterThan(0)
    }
  })

  it('puts every widget in a named lane', () => {
    const ids = new Set(LANES.map((lane) => lane.id))
    expect(WIDGETS.every((w) => ids.has(w.lane))).toBe(true)
    for (const lane of LANES) {
      expect(WIDGETS.some((w) => w.lane === lane.id)).toBe(true)
    }
  })

  it('names at least one attribute on every recipe', () => {
    expect(WIDGETS.every((w) => w.attrs.length > 0)).toBe(true)
  })

  it('matches slash language by attribute', () => {
    expect(matchWidget('photo').map((w) => w.type)).toEqual(expect.arrayContaining(['sticker', 'hero']))
    expect(matchWidget('holes').map((w) => w.type)).toEqual(['blackout'])
    expect(matchWidget('tape').map((w) => w.type)).toEqual(['audio'])
  })
})

describe('widget language', () => {
  it('harvests ink from a heading', () => {
    const heading = createBlock('heading', 'miles')
    if (heading.type !== 'heading') throw new Error('expected heading')
    heading.text = 'after hours'
    expect(harvest(heading).ink).toBe('after hours')
  })

  it('retargets heading ink onto a sticker and a quote', () => {
    const heading = createBlock('heading', 'miles')
    if (heading.type !== 'heading') throw new Error('expected heading')
    heading.text = 'after hours / bushwick'
    const sticker = retarget(heading, 'sticker', 'miles')
    expect(sticker.id).toBe(heading.id)
    expect(sticker.type).toBe('sticker')
    if (sticker.type === 'sticker') expect(sticker.text).toBe('after hours / bushwick')
    const quote = retarget(heading, 'quote', 'noir')
    if (quote.type === 'quote') expect(quote.text).toBe('after hours / bushwick')
  })

  it('carries a photo from sticker to hero', () => {
    const sticker = createBlock('sticker', 'gwen')
    if (sticker.type !== 'sticker') throw new Error('expected sticker')
    sticker.src = '/art/gwen.jpg'
    sticker.rotation = -4
    const hero = retarget(sticker, 'hero', 'gwen')
    if (hero.type !== 'hero') throw new Error('expected hero')
    expect(hero.src).toBe('/art/gwen.jpg')
  })

  it('can retarget every type onto every other type', () => {
    for (const from of WIDGETS) {
      const block = createBlock(from.type, 'ham')
      for (const to of WIDGETS) {
        const next = retarget(block, to.type, 'ham')
        expect(next.type).toBe(to.type)
        expect(next.id).toBe(block.id)
      }
    }
  })
})
