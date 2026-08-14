import { describe, expect, it } from 'vitest'
import { appBasename, appHref, assetUrl } from './paths'

describe('paths', () => {
  it('uses an empty basename in local dev', () => {
    expect(appBasename()).toBe('')
  })

  it('builds an absolute app href from the current origin', () => {
    expect(appHref('/s')).toBe(`${window.location.origin}/s`)
    expect(appHref('/z/abc')).toBe(`${window.location.origin}/z/abc`)
  })
})

describe('assetUrl', () => {
  it('prefixes public art with the Vite base', () => {
    expect(assetUrl('/art/miles.jpg')).toBe('/art/miles.jpg')
  })

  it('leaves data URLs and remote URLs alone', () => {
    expect(assetUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx')
    expect(assetUrl('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg')
  })
})
