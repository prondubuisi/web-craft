import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'

import { cors } from 'hono/cors'
import type { Block, VibeId, Zine } from '../src/lib/types.ts'
import { createSession, destroySession, hashPassword, userFromToken, validName, verifyPassword } from './auth.ts'
import { seedCommunity } from './community.ts'
import { dropIsLive, getZineRow, rowToZine, type Db } from './db.ts'

const COOKIE = 'zv_session'
const VIBES = new Set(['miles', 'gwen', 'peni', 'ham', 'noir'])

export function createApp(db: Db) {
  seedCommunity(db)
  const app = new Hono()

  app.use(
    '/api/*',
    cors({
      origin: [
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'https://prondubuisi.github.io',
      ],
      credentials: true,
    }),
  )

  app.get('/api/health', (c) => c.json({ ok: true }))

  function readToken(c: { req: { header: (name: string) => string | undefined } }) {
    const auth = c.req.header('authorization')
    if (auth?.startsWith('Bearer ')) return auth.slice(7)
    const raw = c.req.header('cookie') ?? ''
    const match = raw.match(new RegExp(`${COOKIE}=([^;]+)`))
    return match?.[1]
  }

  function currentUser(c: { req: { header: (name: string) => string | undefined } }) {
    return userFromToken(db, readToken(c))
  }

  function sessionCookie(token: string) {
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  }

  function jsonAuth(body: unknown, token: string, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'content-type': 'application/json',
        'set-cookie': sessionCookie(token),
      },
    })
  }

  app.post('/api/auth/register', async (c) => {
    const body = await c.req.json().catch(() => null)
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    if (!validName(name)) return c.json({ error: 'Handle must be 2–20 chars: a-z, 0-9, . _' }, 400)
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
    return jsonAuth({ name, remixPoints: 0, token }, token)
  })

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json().catch(() => null)
    const name = String(body?.name ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const user = db.prepare('SELECT * FROM users WHERE name = ? AND kind = ?').get(name, 'human') as
      | import('./db.ts').UserRow
      | undefined
    if (!user?.password_hash || !user.password_salt) return c.json({ error: 'No studio with that handle' }, 401)
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return c.json({ error: 'Wrong password' }, 401)
    }
    const token = createSession(db, user.id)
    return jsonAuth({ name: user.name, remixPoints: user.remix_points, token }, token)
  })

  app.post('/api/auth/logout', (c) => {
    destroySession(db, readToken(c))
    c.header('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`)
    return c.json({ ok: true })
  })

  app.get('/api/auth/me', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ session: null })
    const liked = db
      .prepare('SELECT zine_id FROM likes WHERE user_id = ?')
      .all(user.id) as { zine_id: string }[]
    return c.json({
      session: { name: user.name },
      remixPoints: user.remix_points,
      likedIds: liked.map((row) => row.zine_id),
    })
  })

  app.get('/api/stream', (c) => {
    const user = currentUser(c)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.published = 1
         ORDER BY COALESCE(z.drops_at, z.updated_at) DESC`,
      )
      .all() as import('./db.ts').ZineRow[]
    return c.json({
      zines: rows.map((row) =>
        rowToZine(row, {
          hideBlocks: !dropIsLive(row) && row.owner_id !== user?.id,
        }),
      ),
    })
  })

  app.get('/api/zines', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.owner_id = ?
         ORDER BY z.updated_at DESC`,
      )
      .all(user.id) as import('./db.ts').ZineRow[]
    return c.json({ zines: rows.map((row) => rowToZine(row)) })
  })

  app.get('/api/zines/:id', (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const mine = row.owner_id === user?.id
    if (!row.published && !mine) return c.json({ error: 'sealed draft' }, 404)
    const live = dropIsLive(row)
    if (row.published && !live && !mine) {
      return c.json({ zine: rowToZine(row, { hideBlocks: true }), sealed: true })
    }
    return c.json({ zine: rowToZine(row), sealed: false })
  })

  app.put('/api/zines/:id', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<Zine> | null
    if (!body?.title || !body.vibe || !Array.isArray(body.blocks)) {
      return c.json({ error: 'Need title, vibe, and blocks' }, 400)
    }
    if (!VIBES.has(body.vibe)) return c.json({ error: 'Unknown vibe' }, 400)
    const id = c.req.param('id')
    const existing = getZineRow(db, id)
    if (existing && existing.owner_id !== user.id) return c.json({ error: 'Not your issue' }, 403)
    const now = Date.now()
    db.prepare(
      `INSERT INTO zines (id, owner_id, title, vibe, blocks_json, published, drops_at, views, likes, remixes, remixed_from, created_at, updated_at)
       VALUES (@id, @owner_id, @title, @vibe, @blocks_json, @published, @drops_at, @views, @likes, @remixes, @remixed_from, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         vibe = excluded.vibe,
         blocks_json = excluded.blocks_json,
         updated_at = excluded.updated_at`,
    ).run({
      id,
      owner_id: user.id,
      title: String(body.title).slice(0, 120),
      vibe: body.vibe,
      blocks_json: JSON.stringify(body.blocks as Block[]),
      published: existing?.published ?? 0,
      drops_at: existing?.drops_at ?? null,
      views: existing?.views ?? 0,
      likes: existing?.likes ?? 0,
      remixes: existing?.remixes ?? 0,
      remixed_from: existing?.remixed_from ?? body.remixedFrom ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    })
    const row = getZineRow(db, id)
    return c.json({ zine: row ? rowToZine(row) : null })
  })

  app.delete('/api/zines/:id', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    if (row.owner_id !== user.id) return c.json({ error: 'Not your issue' }, 403)
    db.prepare('DELETE FROM likes WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM zines WHERE id = ?').run(row.id)
    return c.json({ ok: true })
  })

  app.post('/api/zines/:id/publish', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || row.owner_id !== user.id) return c.json({ error: 'Not your issue' }, 403)
    const body = await c.req.json().catch(() => ({}))
    const dropsAt = Number(body?.dropsAt ?? Date.now())
    db.prepare('UPDATE zines SET published = 1, drops_at = ?, updated_at = ? WHERE id = ?').run(
      dropsAt,
      Date.now(),
      row.id,
    )
    return c.json({ zine: rowToZine(getZineRow(db, row.id)!) })
  })

  app.post('/api/zines/:id/like', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot like that' }, 404)
    const liked = db
      .prepare('SELECT 1 FROM likes WHERE user_id = ? AND zine_id = ?')
      .get(user.id, row.id)
    if (liked) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND zine_id = ?').run(user.id, row.id)
      db.prepare('UPDATE zines SET likes = MAX(likes - 1, 0) WHERE id = ?').run(row.id)
    } else {
      db.prepare('INSERT INTO likes (user_id, zine_id) VALUES (?, ?)').run(user.id, row.id)
      db.prepare('UPDATE zines SET likes = likes + 1 WHERE id = ?').run(row.id)
    }
    const next = getZineRow(db, row.id)!
    return c.json({ liked: !liked, likes: next.likes })
  })

  app.post('/api/zines/:id/view', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ views: row?.views ?? 0 })
    db.prepare('UPDATE zines SET views = views + 1 WHERE id = ?').run(row.id)
    return c.json({ views: row.views + 1 })
  })

  app.post('/api/zines/:id/remix', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot remix that' }, 404)
    const source = rowToZine(row)
    const copyId = randomUUID()
    const now = Date.now()
    const blocks = source.blocks.map((block) => ({ ...block, id: randomUUID() }))
    db.prepare(
      `INSERT INTO zines (id, owner_id, title, vibe, blocks_json, published, drops_at, views, likes, remixes, remixed_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, NULL, 0, 0, 0, ?, ?, ?)`,
    ).run(
      copyId,
      user.id,
      `${source.title} (remix)`,
      source.vibe as VibeId,
      JSON.stringify(blocks),
      row.id,
      now,
      now,
    )
    db.prepare('UPDATE zines SET remixes = remixes + 1 WHERE id = ?').run(row.id)
    db.prepare('UPDATE users SET remix_points = remix_points + 1 WHERE id = ?').run(user.id)
    const copy = getZineRow(db, copyId)!
    return c.json({ zine: rowToZine(copy) })
  })

  return app
}
