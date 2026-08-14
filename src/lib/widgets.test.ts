import { describe, expect, it } from 'vitest'
import { createBlock, WIDGETS } from './widgets'

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
})
