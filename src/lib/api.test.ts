import { beforeEach, describe, expect, it } from 'vitest'
import { getToken, setToken } from './api'

describe('api token storage', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
        setItem: (k: string, v: string) => data.set(k, v),
        removeItem: (k: string) => data.delete(k),
      },
    })
  })

  it('round-trips a bearer token', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    setToken(null)
    expect(getToken()).toBeNull()
  })
})
