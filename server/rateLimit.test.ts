import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTH_MAX_ATTEMPTS,
  bumpLimit,
  clearLimit,
  clientKey,
  isLimited,
  resetLimits,
} from './rateLimit.ts'

afterEach(() => {
  resetLimits()
})

describe('rateLimit', () => {
  it('keys by action, ip, and handle', () => {
    expect(clientKey('1.1.1.1', 'Rio', 'login')).toBe('login:1.1.1.1:rio')
    expect(clientKey(undefined, 'rio', 'login')).toBe('login:local:rio')
  })

  it('trips after the max failed attempts in the window', () => {
    const key = clientKey('10.0.0.1', 'rio', 'login')
    for (let i = 0; i < AUTH_MAX_ATTEMPTS; i += 1) bumpLimit(key, 1_000)
    expect(isLimited(key, 1_000).limited).toBe(true)
    const blocked = isLimited(key, 1_000)
    if (blocked.limited) expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('clears on success and after the window', () => {
    const key = clientKey('10.0.0.1', 'rio', 'login')
    for (let i = 0; i < AUTH_MAX_ATTEMPTS; i += 1) bumpLimit(key, 1_000)
    clearLimit(key)
    expect(isLimited(key, 1_000).limited).toBe(false)
    bumpLimit(key, 1_000)
    expect(isLimited(key, 1_000 + 11 * 60_000).limited).toBe(false)
  })
})
