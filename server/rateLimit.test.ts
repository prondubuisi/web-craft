import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AUTH_MAX_ATTEMPTS,
  AUTH_WINDOW_MS,
  bumpLimit,
  clearLimit,
  clientKey,
  isLimited,
  resetLimits,
} from './rateLimit.ts'

test('clientKey lowercases the handle so attempts share a bucket', () => {
  assert.equal(clientKey('1.1.1.1', 'Maker', 'login'), clientKey('1.1.1.1', 'maker', 'login'))
})

test('isLimited trips after AUTH_MAX_ATTEMPTS in the window and clears', () => {
  resetLimits()
  const key = clientKey('10.0.0.1', 'maker', 'login')
  const now = 1_000_000
  for (let i = 0; i < AUTH_MAX_ATTEMPTS; i++) bumpLimit(key, now)
  const blocked = isLimited(key, now)
  assert.equal(blocked.limited, true)
  if (blocked.limited) assert.ok(blocked.retryAfter >= 1)
  clearLimit(key)
  assert.equal(isLimited(key, now).limited, false)
})

test('the window expiry resets the bucket', () => {
  resetLimits()
  const key = clientKey('10.0.0.2', 'maker', 'login')
  const now = 2_000_000
  for (let i = 0; i < AUTH_MAX_ATTEMPTS; i++) bumpLimit(key, now)
  assert.equal(isLimited(key, now).limited, true)
  assert.equal(isLimited(key, now + AUTH_WINDOW_MS + 1).limited, false)
})
