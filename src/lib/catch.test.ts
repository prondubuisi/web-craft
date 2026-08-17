import { describe, expect, it } from 'vitest'
import { actionError, catchBackground } from './catch'

describe('catch helpers', () => {
  it('swallows a background failure', () => {
    expect(catchBackground(new Error('offline'))).toBeUndefined()
  })

  it('keeps a specific action error', () => {
    expect(actionError(new Error('handle taken'), 'Could not sign in')).toBe('handle taken')
    expect(actionError('nope', 'Could not sign in')).toBe('Could not sign in')
  })
})
