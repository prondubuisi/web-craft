import { describe, expect, it } from 'vitest'
import { appBasename, appHref } from './paths'

describe('paths', () => {
  it('uses an empty basename in local dev', () => {
    expect(appBasename()).toBe('')
  })

  it('builds an absolute app href from the current origin', () => {
    expect(appHref('/s')).toBe(`${window.location.origin}/s`)
    expect(appHref('/z/abc')).toBe(`${window.location.origin}/z/abc`)
  })
})
