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
})
