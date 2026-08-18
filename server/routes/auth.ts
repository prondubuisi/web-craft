import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { AuthBody, AuthOk, MeResponse, OkBody } from '../../src/lib/contract.ts'
import {
  createSession,
  destroySession,
  hashPassword,
  rotateSession,
  validName,
  verifyPassword,
} from '../auth.ts'
import type { Db, UserRow } from '../db.ts'
import { listFollowing } from '../db.ts'
import { COOKIE, currentUser, jsonAuth, readToken } from '../http.ts'
import { bumpLimit, clearLimit, clientKey, isLimited } from '../rateLimit.ts'

function requestIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'local'
  return c.req.header('x-real-ip') || 'local'
}

function tooMany(retryAfter: number) {
  return new Response(JSON.stringify({ error: 'Too many attempts. Wait a bit.' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(retryAfter),
    },
  })
}

export function registerAuth(app: Hono, db: Db) {
  app.post('/api/auth/register', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Partial<AuthBody> | null
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const key = clientKey(requestIp(c), name, 'register')
    const gate = isLimited(key)
    if (gate.limited) return tooMany(gate.retryAfter)
    if (!validName(name) || name === 'me') return c.json({ error: 'Handle must be 2–20 chars: a-z, 0-9, . _' }, 400)
    if (password.length < 8) return c.json({ error: 'Password needs 8+ characters' }, 400)
    if (db.prepare('SELECT id FROM users WHERE name = ?').get(name)) {
      bumpLimit(key)
      return c.json({ error: 'That handle is taken' }, 409)
    }
    const { hash, salt } = hashPassword(password)
    const id = randomUUID()
    db.prepare(
      `INSERT INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at)
       VALUES (?, ?, ?, ?, 0, 'human', ?)`,
    ).run(id, name, hash, salt, Date.now())
    clearLimit(key)
    const token = createSession(db, id)
    const session: AuthOk = { name, remixPoints: 0, token }
    return jsonAuth(session, token)
  })

  app.post('/api/auth/login', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Partial<AuthBody> | null
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const key = clientKey(requestIp(c), name, 'login')
    const gate = isLimited(key)
    if (gate.limited) return tooMany(gate.retryAfter)
    const user = db.prepare('SELECT * FROM users WHERE name = ? AND kind = ?').get(name, 'human') as UserRow | undefined
    if (!user?.password_hash || !user.password_salt) {
      bumpLimit(key)
      return c.json({ error: 'No studio with that handle' }, 401)
    }
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      bumpLimit(key)
      return c.json({ error: 'Wrong password' }, 401)
    }
    clearLimit(key)
    const token = createSession(db, user.id)
    const session: AuthOk = { name: user.name, remixPoints: user.remix_points, token }
    return jsonAuth(session, token)
  })

  app.post('/api/auth/logout', (c) => {
    destroySession(db, readToken(c))
    c.header('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`)
    const payload: OkBody = { ok: true }
    return c.json(payload)
  })

  app.get('/api/auth/me', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ session: null } satisfies MeResponse)
    const rotated = rotateSession(db, readToken(c))
    const liked = db.prepare('SELECT zine_id FROM likes WHERE user_id = ?').all(user.id) as { zine_id: string }[]
    const me: MeResponse = {
      session: { name: user.name },
      remixPoints: user.remix_points,
      likedIds: liked.map((row) => row.zine_id),
      following: listFollowing(db, user.id),
      ...(rotated ? { token: rotated } : {}),
    }
    if (rotated) return jsonAuth(me, rotated)
    return c.json(me)
  })
}
