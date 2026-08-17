import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Db, UserRow } from './db.ts'

const SESSION_MS = 1000 * 60 * 60 * 24 * 30

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): {
  hash: string
  salt: string
} {
  const hash = scryptSync(password, salt, 32).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const next = scryptSync(password, salt, 32)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken(): string {
  return randomBytes(32).toString('hex')
}

export function createSession(db: Db, userId: string): string {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  const token = newToken()
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    Date.now() + SESSION_MS,
  )
  return token
}

/** Issue a fresh token when this session is past halfway through its life. */
export function rotateSession(db: Db, token: string | undefined, now = Date.now()): string | undefined {
  if (!token) return undefined
  const hash = hashToken(token)
  const row = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(hash, now) as { user_id: string; expires_at: number } | undefined
  if (!row) return undefined
  if (row.expires_at - now > SESSION_MS / 2) return undefined
  const next = newToken()
  db.prepare('UPDATE sessions SET token_hash = ?, expires_at = ? WHERE token_hash = ?').run(
    hashToken(next),
    now + SESSION_MS,
    hash,
  )
  return next
}

export function userFromToken(db: Db, token: string | undefined): UserRow | undefined {
  if (!token) return undefined
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), Date.now()) as UserRow | undefined
  return row
}

export function destroySession(db: Db, token: string | undefined): void {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export function validName(name: string): boolean {
  return /^[a-z0-9._]{2,20}$/.test(name)
}
