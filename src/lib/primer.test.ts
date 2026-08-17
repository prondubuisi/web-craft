import { afterEach, describe, expect, it } from 'vitest'
import { dismissPrimer, PRIMER_KEY, primerSeen } from './primer'

function memoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

describe('primer', () => {
  afterEach(() => {
    localStorage.removeItem(PRIMER_KEY)
  })

  it('starts unseen', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
    expect(primerSeen()).toBe(false)
  })

  it('remembers dismiss', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
    dismissPrimer()
    expect(primerSeen()).toBe(true)
    expect(localStorage.getItem(PRIMER_KEY)).toBe('1')
  })
})
