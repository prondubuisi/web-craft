import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { AuthOk, MeResponse } from '../../src/lib/contract.ts'
import { createSession, destroySession, hashPassword, validName, verifyPassword } from '../auth.ts'
import type { Db, UserRow } from '../db.ts'
import { listFollowing } from '../db.ts'
import { COOKIE, currentUser, jsonAuth, readToken } from '../http.ts'

export function registerAuth(app: Hono, db: Db) {
  app.post('/api/auth/register', async (c) => {
    const body = await c.req.json().catch(() => null)
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    if (!validName(name) || name === 'me') return c.json({ error: 'Handle must be 2–20 chars: a-z, 0-9, . _' }, 400)
    if (password.length < 8) return c.json({ error: 'Password needs 8+ characters' }, 400)
    if (db.prepare('SELECT id FROM users WHERE name = ?').get(name)) {
      return c.json({ error: 'That handle is taken' }, 409)
    }
    const { hash, salt } = hashPassword(password)
    const id = randomUUID()
    db.prepare(
      `INSERT INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at)
       VALUES (?, ?, ?, ?, 0, 'human', ?)`,
    ).run(id, name, hash, salt, Date.now())
    const token = createSession(db, id)
    const session: AuthOk = { name, remixPoints: 0, token }
    return jsonAuth(session, token)
  })

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json().catch(() => null)
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const user = db.prepare('SELECT * FROM users WHERE name = ? AND kind = ?').get(name, 'human') as UserRow | undefined
    if (!user?.password_hash || !user.password_salt) return c.json({ error: 'No studio with that handle' }, 401)
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return c.json({ error: 'Wrong password' }, 401)
    }
    const token = createSession(db, user.id)
    const session: AuthOk = { name: user.name, remixPoints: user.remix_points, token }
    return jsonAuth(session, token)
  })

  app.post('/api/auth/logout', (c) => {
    destroySession(db, readToken(c))
    c.header('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`)
    return c.json({ ok: true })
  })

  app.get('/api/auth/me', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ session: null } satisfies MeResponse)
    const liked = db.prepare('SELECT zine_id FROM likes WHERE user_id = ?').all(user.id) as { zine_id: string }[]
    const me: MeResponse = {
      session: { name: user.name },
      remixPoints: user.remix_points,
      likedIds: liked.map((row) => row.zine_id),
      following: listFollowing(db, user.id),
    }
    return c.json(me)
  })
}
