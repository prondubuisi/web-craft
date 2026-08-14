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
  const token = newToken()
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    Date.now() + SESSION_MS,
  )
  return token
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
