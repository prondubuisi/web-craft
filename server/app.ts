import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'

import { cors } from 'hono/cors'
import type { Block, PollBlock, VibeId, Zine } from '../src/lib/types.ts'
import { createSession, destroySession, hashPassword, userFromToken, validName, verifyPassword } from './auth.ts'
import { seedCommunity } from './community.ts'
import {
  dropIsLive,
  getZineRow,
  listFollowing,
  notify,
  rowToComment,
  rowToListing,
  rowToNotice,
  rowToZine,
  type Db,
} from './db.ts'

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
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
    const secure = process.env.NODE_ENV === 'production' ? '; Secure; SameSite=None' : '; SameSite=Lax'
    return `${COOKIE}=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}${secure}`
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
      following: listFollowing(db, user.id),
    })
  })

  app.get('/api/stream', (c) => {
    const user = currentUser(c)
    const q = (c.req.query('q') ?? '').trim().toLowerCase()
    const vibe = c.req.query('vibe') ?? ''
    const sort = c.req.query('sort') ?? 'new'
    const where = ['z.published = 1']
    const params: unknown[] = []
    if (VIBES.has(vibe)) {
      where.push('z.vibe = ?')
      params.push(vibe)
    }
    if (c.req.query('following') === '1') {
      if (!user) {
        return c.json({ zines: [] })
      }
      where.push('z.owner_id IN (SELECT followee_id FROM follows WHERE follower_id = ?)')
      params.push(user.id)
    }
    if (q) {
      where.push('(LOWER(z.title) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(z.vibe) LIKE ?)')
      const like = `%${q.replace(/[%_]/g, '')}%`
      params.push(like, like, like)
    }
    const order =
      sort === 'likes'
        ? 'z.likes DESC, z.updated_at DESC'
        : sort === 'remixes'
          ? 'z.remixes DESC, z.updated_at DESC'
          : 'COALESCE(z.drops_at, z.updated_at) DESC'
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE ${where.join(' AND ')}
         ORDER BY ${order}`,
      )
      .all(...params) as import('./db.ts').ZineRow[]
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
    db.prepare('DELETE FROM comments WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM poll_votes WHERE zine_id = ?').run(row.id)
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
    const followers = db
      .prepare('SELECT follower_id FROM follows WHERE followee_id = ?')
      .all(user.id) as { follower_id: string }[]
    for (const fan of followers) {
      notify(db, {
        recipientId: fan.follower_id,
        actorId: user.id,
        kind: 'drop',
        zineId: row.id,
        body: row.title,
      })
    }
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
      notify(db, {
        recipientId: row.owner_id,
        actorId: user.id,
        kind: 'like',
        zineId: row.id,
        body: row.title,
      })
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
    notify(db, {
      recipientId: row.owner_id,
      actorId: user.id,
      kind: 'remix',
      zineId: row.id,
      body: source.title,
    })
    const copy = getZineRow(db, copyId)!
    return c.json({ zine: rowToZine(copy) })
  })

  app.get('/api/users/me', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    return c.json({ name: user.name, bio: user.bio ?? '', remixPoints: user.remix_points })
  })

  app.patch('/api/users/me', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const bio = String(body?.bio ?? '').slice(0, 200)
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, user.id)
    return c.json({ name: user.name, bio })
  })

  app.get('/api/users/:name', (c) => {
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as
      | import('./db.ts').UserRow
      | undefined
    if (!user) return c.json({ error: 'Nobody with that handle' }, 404)
    const viewer = currentUser(c)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.owner_id = ? AND z.published = 1
         ORDER BY COALESCE(z.drops_at, z.updated_at) DESC`,
      )
      .all(user.id) as import('./db.ts').ZineRow[]
    const followers = (
      db.prepare('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?').get(user.id) as { n: number }
    ).n
    const following = (
      db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?').get(user.id) as { n: number }
    ).n
    const followedByMe = Boolean(
      viewer &&
        db
          .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?')
          .get(viewer.id, user.id),
    )
    return c.json({
      name: user.name,
      bio: user.bio ?? '',
      remixPoints: user.remix_points,
      createdAt: user.created_at,
      followers,
      following,
      followedByMe,
      zines: rows.map((row) =>
        rowToZine(row, { hideBlocks: !dropIsLive(row) && row.owner_id !== viewer?.id }),
      ),
    })
  })

  app.post('/api/users/:name/follow', (c) => {
    const viewer = currentUser(c)
    if (!viewer) return c.json({ error: 'Sign in first' }, 401)
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const target = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as
      | import('./db.ts').UserRow
      | undefined
    if (!target) return c.json({ error: 'Nobody with that handle' }, 404)
    if (target.id === viewer.id) return c.json({ error: 'You already live here' }, 400)
    const existing = db
      .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?')
      .get(viewer.id, target.id)
    if (existing) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(viewer.id, target.id)
      return c.json({ following: false })
    }
    db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').run(
      viewer.id,
      target.id,
      Date.now(),
    )
    notify(db, { recipientId: target.id, actorId: viewer.id, kind: 'follow' })
    return c.json({ following: true })
  })

  app.get('/api/notices', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT n.*, a.name AS actor_name, z.title AS zine_title
         FROM notices n
         JOIN users a ON a.id = n.actor_id
         LEFT JOIN zines z ON z.id = n.zine_id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 50`,
      )
      .all(user.id) as {
      id: string
      kind: string
      actor_name: string
      zine_id: string | null
      zine_title: string | null
      body: string | null
      read: number
      created_at: number
    }[]
    return c.json({ notices: rows.map(rowToNotice) })
  })

  app.post('/api/notices/read', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('UPDATE notices SET read = 1 WHERE user_id = ?').run(user.id)
    return c.json({ ok: true })
  })

  app.get('/api/zines/:id/comments', (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || (!row.published && row.owner_id !== user?.id)) {
      return c.json({ error: 'missing issue' }, 404)
    }
    if (row.published && !dropIsLive(row) && row.owner_id !== user?.id) {
      return c.json({ comments: [] })
    }
    const rows = db
      .prepare(
        `SELECT c.*, u.name AS author_name
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.zine_id = ?
         ORDER BY c.created_at ASC`,
      )
      .all(row.id) as import('./db.ts').CommentRow[]
    return c.json({ comments: rows.map(rowToComment) })
  })

  app.post('/api/zines/:id/comments', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ error: 'Cannot write on that issue' }, 404)
    const body = await c.req.json().catch(() => null)
    const text = String(body?.body ?? '').trim().slice(0, 280)
    if (text.length < 1) return c.json({ error: 'Write something first' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare('INSERT INTO comments (id, zine_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      row.id,
      user.id,
      text,
      now,
    )
    notify(db, {
      recipientId: row.owner_id,
      actorId: user.id,
      kind: 'comment',
      zineId: row.id,
      body: row.title,
    })
    return c.json({
      comment: {
        id,
        zineId: row.id,
        author: `@${user.name}`,
        body: text,
        createdAt: now,
      },
    })
  })

  function pollBlock(row: import('./db.ts').ZineRow, blockId: string): PollBlock | undefined {
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const block = blocks.find((item) => item.id === blockId)
    return block?.type === 'poll' ? block : undefined
  }

  function pollTallies(row: import('./db.ts').ZineRow, userId?: string) {
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const votes = db
      .prepare('SELECT user_id, block_id, option_idx FROM poll_votes WHERE zine_id = ?')
      .all(row.id) as { user_id: string; block_id: string; option_idx: number }[]
    const polls: Record<string, { counts: number[]; mine: number | null }> = {}
    for (const block of blocks) {
      if (block.type !== 'poll') continue
      const counts = block.options.map(() => 0)
      let mine: number | null = null
      for (const vote of votes) {
        if (vote.block_id !== block.id) continue
        if (vote.option_idx >= 0 && vote.option_idx < counts.length) counts[vote.option_idx] += 1
        if (userId && vote.user_id === userId) mine = vote.option_idx
      }
      polls[block.id] = { counts, mine }
    }
    return polls
  }

  app.get('/api/zines/:id/polls', (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || (!row.published && row.owner_id !== user?.id)) {
      return c.json({ error: 'missing issue' }, 404)
    }
    if (row.published && !dropIsLive(row) && row.owner_id !== user?.id) {
      return c.json({ polls: {} })
    }
    return c.json({ polls: pollTallies(row, user?.id) })
  })

  app.post('/api/zines/:id/polls/:blockId', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ error: 'Cannot vote on that' }, 404)
    const block = pollBlock(row, c.req.param('blockId'))
    if (!block) return c.json({ error: 'No poll there' }, 404)
    const body = await c.req.json().catch(() => null)
    const option = Number(body?.option)
    if (!Number.isInteger(option) || option < 0 || option >= block.options.length) {
      return c.json({ error: 'Pick a real option' }, 400)
    }
    db.prepare(
      `INSERT INTO poll_votes (user_id, zine_id, block_id, option_idx)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, zine_id, block_id) DO UPDATE SET option_idx = excluded.option_idx`,
    ).run(user.id, row.id, block.id, option)
    return c.json(pollTallies(row, user.id)[block.id])
  })

  const LISTING_KINDS = new Set(['trade', 'collab', 'feedback'])

  app.get('/api/board', (c) => {
    const kind = c.req.query('kind') ?? ''
    const where = LISTING_KINDS.has(kind) ? 'WHERE l.kind = ?' : ''
    const params = LISTING_KINDS.has(kind) ? [kind] : []
    const rows = db
      .prepare(
        `SELECT l.*, u.name AS author_name, z.title AS zine_title
         FROM listings l
         JOIN users u ON u.id = l.user_id
         LEFT JOIN zines z ON z.id = l.zine_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT 80`,
      )
      .all(...params) as {
      id: string
      kind: string
      body: string
      created_at: number
      author_name: string
      zine_id: string | null
      zine_title: string | null
    }[]
    return c.json({ listings: rows.map(rowToListing) })
  })

  app.post('/api/board', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const kind = String(body?.kind ?? '')
    const text = String(body?.body ?? '').trim().slice(0, 280)
    if (!LISTING_KINDS.has(kind)) return c.json({ error: 'Pick trade, collab, or feedback' }, 400)
    if (text.length < 1) return c.json({ error: 'Write a want first' }, 400)
    const zineId = body?.zineId ? String(body.zineId) : null
    if (zineId) {
      const zine = getZineRow(db, zineId)
      if (!zine || (!zine.published && zine.owner_id !== user.id)) {
        return c.json({ error: 'Unknown issue' }, 404)
      }
    }
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      `INSERT INTO listings (id, user_id, zine_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, user.id, zineId, kind, text, now)
    const row = db
      .prepare(
        `SELECT l.*, u.name AS author_name, z.title AS zine_title
         FROM listings l
         JOIN users u ON u.id = l.user_id
         LEFT JOIN zines z ON z.id = l.zine_id
         WHERE l.id = ?`,
      )
      .get(id) as {
      id: string
      kind: string
      body: string
      created_at: number
      author_name: string
      zine_id: string | null
      zine_title: string | null
    }
    return c.json({ listing: rowToListing(row) })
  })

  app.delete('/api/board/:id', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(c.req.param('id')) as
      | { user_id: string }
      | undefined
    if (!row) return c.json({ error: 'missing pin' }, 404)
    if (row.user_id !== user.id) return c.json({ error: 'Not your pin' }, 403)
    db.prepare('DELETE FROM listings WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })

  return app
}
