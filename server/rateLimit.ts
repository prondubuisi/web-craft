export const AUTH_WINDOW_MS = 10 * 60_000
export const AUTH_MAX_ATTEMPTS = 8

type Bucket = { n: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function clientKey(ip: string | undefined, name: string, action: string): string {
  return `${action}:${ip || 'local'}:${name.trim().toLowerCase()}`
}

export function isLimited(key: string, now = Date.now()): { limited: false } | { limited: true; retryAfter: number } {
  const hit = buckets.get(key)
  if (!hit || hit.resetAt <= now) return { limited: false }
  if (hit.n >= AUTH_MAX_ATTEMPTS) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) }
  }
  return { limited: false }
}

export function bumpLimit(key: string, now = Date.now()): void {
  const hit = buckets.get(key)
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { n: 1, resetAt: now + AUTH_WINDOW_MS })
    return
  }
  hit.n += 1
}

export function clearLimit(key: string): void {
  buckets.delete(key)
}

/** Test helper. */
export function resetLimits(): void {
  buckets.clear()
}
