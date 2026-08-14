import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'

import { cors } from 'hono/cors'
import type { Block, PollBlock, VibeId, Zine } from '../src/lib/types.ts'
import { normalizeTags } from '../src/lib/tags.ts'
import { demoJams, fitsJam, isJamLive, liveJam, ARCHIVE_THRESHOLD } from '../src/lib/jam.ts'
import type { Jam, JamFormat } from '../src/lib/types.ts'
import { normalizeScene } from '../src/lib/fest.ts'
import { normalizeIssueNo, normalizeSeries } from '../src/lib/zine.ts'
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

function nomCount(db: Db, zineId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM nominations WHERE zine_id = ?').get(zineId) as { n: number }).n
}

function claimCount(db: Db, zineId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM claims WHERE zine_id = ?').get(zineId) as { n: number }).n
}

function decorate(db: Db, zine: Zine, viewerId?: string): Zine {
  const noms = nomCount(db, zine.id)
  const claimed = claimCount(db, zine.id)
  const claimedByMe = Boolean(
    viewerId && db.prepare('SELECT 1 FROM claims WHERE user_id = ? AND zine_id = ?').get(viewerId, zine.id),
  )
  return { ...zine, noms, archived: noms >= ARCHIVE_THRESHOLD, claimed, claimedByMe }
}

function jamForLive(db: Db, visibility: string, blockCount: number): Jam | undefined {
  if (visibility === 'unlisted') return undefined
  const jam = liveJam(listJams(db))
  if (!jam || !fitsJam(blockCount, jam.format)) return undefined
  return jam
}

function listStamps(db: Db, userId: string) {
  return (
    db
      .prepare(
        `SELECT s.zine_id, s.created_at, z.title, z.vibe, u.name AS owner_name
         FROM stamps s JOIN zines z ON z.id = s.zine_id JOIN users u ON u.id = z.owner_id
         WHERE s.user_id = ? ORDER BY s.created_at DESC`,
      )
      .all(userId) as { zine_id: string; created_at: number; title: string; vibe: string; owner_name: string }[]
  ).map((row) => ({
    zineId: row.zine_id,
    title: row.title,
    owner: `@${row.owner_name}`,
    vibe: row.vibe,
    createdAt: row.created_at,
  }))
}

function tableFor(db: Db, userId: string) {
  const row = db
    .prepare(
      `SELECT t.*, u.name AS owner_name FROM fest_tables t JOIN users u ON u.id = t.user_id WHERE t.user_id = ?`,
    )
    .get(userId) as
    | { name: string; scene: string; blurb: string; zine_ids_json: string; created_at: number; owner_name: string; user_id: string }
    | undefined
  if (!row) return null
  return {
    id: row.user_id,
    owner: `@${row.owner_name}`,
    name: row.name,
    scene: row.scene,
    blurb: row.blurb,
    zineIds: JSON.parse(row.zine_ids_json || '[]') as string[],
    createdAt: row.created_at,
  }
}

function listJams(db: Db): Jam[] {
  const rows = db
    .prepare('SELECT id, title, prompt, format, starts_at, ends_at FROM jams ORDER BY starts_at DESC')
    .all() as { id: string; title: string; prompt: string; format: string; starts_at: number; ends_at: number }[]
  if (!rows.length) return demoJams()
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    format: (['any', 'one', 'card'].includes(row.format) ? row.format : 'any') as JamFormat,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }))
}

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
    const where = [`z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'`]
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
    const tag = (c.req.query('tag') ?? '').replace(/^#/, '').toLowerCase()
    if (tag) {
      where.push(`z.tags_json LIKE ?`)
      params.push(`%"${tag}"%`)
    }
    if (c.req.query('jam') === '1') {
      const jam = liveJam(listJams(db))
      if (!jam) return c.json({ zines: [] })
      where.push('z.jam_id = ?')
      params.push(jam.id)
    }
    if (c.req.query('archive') === '1') {
      where.push(
        `(SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) >= ${ARCHIVE_THRESHOLD}`,
      )
    }
    if (q) {
      where.push(
        '(LOWER(z.title) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(z.vibe) LIKE ? OR LOWER(COALESCE(z.series, \'\')) LIKE ? OR LOWER(COALESCE(z.pen_name, \'\')) LIKE ?)',
      )
      const like = `%${q.replace(/[%_]/g, '')}%`
      params.push(like, like, like, like, like)
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
        decorate(
          db,
          rowToZine(row, {
            hideBlocks: !dropIsLive(row) && row.owner_id !== user?.id,
          }),
        ),
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
    return c.json({ zines: rows.map((row) => rowToZine(row, { includeSecret: true })) })
  })

  function accessZine(
    row: import('./db.ts').ZineRow,
    userId: string | undefined,
    key?: string | null,
    unlocked = false,
  ) {
    const mine = row.owner_id === userId
    if (mine) return { ok: true as const, sealed: false, locked: false }
    const keyOk = Boolean(row.share_key && key && key === row.share_key)
    const vis = row.visibility || 'public'
    const needsPass = Boolean(row.pass_hash)
    if (!row.published) {
      if (!keyOk) return { ok: false as const, reason: 'sealed draft' }
      if (needsPass && !unlocked) return { ok: true as const, sealed: false, locked: true }
      return { ok: true as const, sealed: false, locked: false }
    }
    if (vis === 'unlisted' && !keyOk) return { ok: false as const, reason: 'missing issue' }
    if (needsPass && !unlocked) return { ok: true as const, sealed: !dropIsLive(row), locked: true }
    if (!dropIsLive(row)) return { ok: true as const, sealed: true, locked: false }
    return { ok: true as const, sealed: false, locked: false }
  }

  app.get('/api/zines/:id', (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const gate = accessZine(row, user?.id, c.req.query('k'))
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    const hide = gate.sealed || gate.locked
    return c.json({
      zine: decorate(db, rowToZine(row, { hideBlocks: hide, includeSecret: row.owner_id === user?.id })),
      sealed: gate.sealed,
      locked: gate.locked,
    })
  })

  app.post('/api/zines/:id/unlock', async (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const body = await c.req.json().catch(() => null)
    const key = String(body?.k ?? c.req.query('k') ?? '')
    const password = String(body?.password ?? '')
    const gate = accessZine(row, user?.id, key, false)
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    if (!row.pass_hash || !row.pass_salt) {
      return c.json({ zine: rowToZine(row, { includeSecret: row.owner_id === user?.id }), sealed: !dropIsLive(row), locked: false })
    }
    if (!verifyPassword(password, row.pass_hash, row.pass_salt)) {
      return c.json({ error: 'Wrong passphrase' }, 401)
    }
    const live = dropIsLive(row) || row.owner_id === user?.id || Boolean(row.share_key && key === row.share_key && !row.published)
    const draftOk = !row.published && row.share_key === key
    return c.json({
      zine: rowToZine(row, {
        hideBlocks: row.published && !dropIsLive(row) && row.owner_id !== user?.id,
        includeSecret: row.owner_id === user?.id,
      }),
      sealed: row.published && !dropIsLive(row) && row.owner_id !== user?.id,
      locked: false,
      draft: draftOk,
      live,
    })
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
    const tags = normalizeTags(Array.isArray(body.tags) ? body.tags : [])
    const finish = ['clean', 'riso', 'grain'].includes(String(body.finish ?? ''))
      ? String(body.finish)
      : (existing?.finish ?? 'clean')
    const series = normalizeSeries(typeof body.series === 'string' ? body.series : existing?.series) ?? ''
    const issueNo = normalizeIssueNo(body.issueNo ?? existing?.issue_no) ?? null
    const penName = String(body.penName ?? existing?.pen_name ?? '').trim().slice(0, 48)
    const bSide = String(body.bSide ?? existing?.b_side ?? '').trim().slice(0, 280)
    const editionSize = Math.max(0, Math.min(999, Number(body.editionSize ?? existing?.edition_size ?? 0) || 0))
    const errata = String(body.errata ?? existing?.errata ?? '').trim().slice(0, 200)
    const includes = Array.isArray(body.includes) ? body.includes.slice(0, 12) : []
    const dedication = String(body.dedication ?? existing?.dedication ?? '').trim().slice(0, 120)
    db.prepare(
      'UPDATE zines SET tags_json = ?, finish = ?, series = ?, issue_no = ?, pen_name = ?, b_side = ?, edition_size = ?, errata = ?, includes_json = ?, dedication = ? WHERE id = ?',
    ).run(
      JSON.stringify(tags),
      finish,
      series,
      issueNo,
      penName,
      bSide,
      editionSize,
      errata,
      JSON.stringify(includes),
      dedication,
      id,
    )
    const row = getZineRow(db, id)
    return c.json({ zine: row ? rowToZine(row, { includeSecret: true }) : null })
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
    db.prepare('DELETE FROM page_stats WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM shelves WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM bags WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM reviews WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM nominations WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM margins WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM stamps WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM claims WHERE zine_id = ?').run(row.id)
    db.prepare('DELETE FROM loans WHERE zine_id = ?').run(row.id)
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
    const visibility = body?.visibility === 'unlisted' ? 'unlisted' : 'public'
    const shareKey =
      visibility === 'unlisted' ? (row.share_key || randomUUID().replace(/-/g, '').slice(0, 16)) : row.share_key
    let passHash = row.pass_hash
    let passSalt = row.pass_salt
    const password = typeof body?.password === 'string' ? body.password : undefined
    if (password && password.length >= 4) {
      const hashed = hashPassword(password)
      passHash = hashed.hash
      passSalt = hashed.salt
    } else if (password === '') {
      passHash = null
      passSalt = null
    }
    const chain = Boolean(body?.chain)
    const vis = chain ? 'unlisted' : visibility
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const jam = jamForLive(db, vis, blocks.length)
    db.prepare(
      `UPDATE zines SET published = 1, drops_at = ?, visibility = ?, share_key = ?, pass_hash = ?, pass_salt = ?, chain_open = ?, chain_key = ?, jam_id = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      dropsAt,
      vis,
      shareKey,
      passHash,
      passSalt,
      chain ? 1 : row.chain_open,
      chain ? shareKey : row.chain_key,
      jam?.id ?? row.jam_id,
      Date.now(),
      row.id,
    )
    const followers =
      visibility === 'public'
        ? (db.prepare('SELECT follower_id FROM follows WHERE followee_id = ?').all(user.id) as {
            follower_id: string
          }[])
        : []
    for (const fan of followers) {
      notify(db, {
        recipientId: fan.follower_id,
        actorId: user.id,
        kind: 'drop',
        zineId: row.id,
        body: row.title,
      })
    }
    const fresh = getZineRow(db, row.id)!
    if (visibility === 'public' && fresh.series) {
      const series = fresh.series.trim().toLowerCase()
      const watchers = db
        .prepare('SELECT user_id FROM series_watches WHERE series = ? AND user_id != ?')
        .all(series, user.id) as { user_id: string }[]
      for (const watcher of watchers) {
        notify(db, {
          recipientId: watcher.user_id,
          actorId: user.id,
          kind: 'series',
          zineId: fresh.id,
          body: fresh.series,
        })
      }
    }
    const mention = (fresh.dedication || '').match(/@([a-z0-9._-]+)/i)
    if (mention) {
      const dest = db.prepare('SELECT id FROM users WHERE name = ?').get(mention[1]!.toLowerCase()) as
        | { id: string }
        | undefined
      if (dest) {
        notify(db, {
          recipientId: dest.id,
          actorId: user.id,
          kind: 'dedicate',
          zineId: fresh.id,
          body: fresh.title,
        })
      }
    }
    return c.json({ zine: rowToZine(fresh, { includeSecret: true }) })
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
    const scene = normalizeScene(typeof body?.scene === 'string' ? body.scene : user.scene) ?? ''
    db.prepare('UPDATE users SET bio = ?, scene = ? WHERE id = ?').run(bio, scene, user.id)
    return c.json({ name: user.name, bio, scene })
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
         WHERE z.owner_id = ? AND z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
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
      scene: user.scene ?? '',
      remixPoints: user.remix_points,
      createdAt: user.created_at,
      followers,
      following,
      followedByMe,
      zines: rows.map((row) =>
        rowToZine(row, { hideBlocks: !dropIsLive(row) && row.owner_id !== viewer?.id }),
      ),
      guestbook: (
        db
          .prepare(
            `SELECT g.*, a.name AS author_name FROM guestbook g JOIN users a ON a.id = g.author_id
             WHERE g.profile_id = ? ORDER BY g.created_at DESC LIMIT 40`,
          )
          .all(user.id) as { id: string; body: string; created_at: number; author_name: string }[]
      ).map((row) => ({
        id: row.id,
        author: `@${row.author_name}`,
        body: row.body,
        createdAt: row.created_at,
      })),
      shelf: (
        db
          .prepare(
            `SELECT s.zine_id, s.note, z.title, z.vibe, u.name AS owner_name
             FROM shelves s JOIN zines z ON z.id = s.zine_id JOIN users u ON u.id = z.owner_id
             WHERE s.user_id = ? ORDER BY s.created_at DESC`,
          )
          .all(user.id) as {
          zine_id: string
          note: string
          title: string
          vibe: string
          owner_name: string
        }[]
      ).map((row) => ({
        zineId: row.zine_id,
        title: row.title,
        owner: `@${row.owner_name}`,
        note: row.note,
        vibe: row.vibe,
      })),
      stamps: listStamps(db, user.id),
      table: tableFor(db, user.id),
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
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const gate = accessZine(row, user?.id, c.req.query('k'))
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    if (gate.sealed || gate.locked) {
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

  app.post('/api/board/:id/swap', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = db.prepare('SELECT user_id, swapped FROM listings WHERE id = ?').get(c.req.param('id')) as
      | { user_id: string; swapped: number }
      | undefined
    if (!row) return c.json({ error: 'missing pin' }, 404)
    if (row.user_id !== user.id) return c.json({ error: 'Not your pin' }, 403)
    const next = row.swapped ? 0 : 1
    db.prepare('UPDATE listings SET swapped = ? WHERE id = ?').run(next, c.req.param('id'))
    return c.json({ swapped: Boolean(next) })
  })

  app.get('/api/pile', (c) => {
    const row = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
           AND (z.drops_at IS NULL OR z.drops_at <= ?)
         ORDER BY RANDOM() LIMIT 1`,
      )
      .get(Date.now()) as import('./db.ts').ZineRow | undefined
    if (!row) return c.json({ error: 'empty pile' }, 404)
    return c.json({ zine: rowToZine(row) })
  })

  app.get('/api/users/:name/guestbook', (c) => {
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(name) as { id: string } | undefined
    if (!user) return c.json({ error: 'Nobody with that handle' }, 404)
    const rows = db
      .prepare(
        `SELECT g.*, a.name AS author_name FROM guestbook g JOIN users a ON a.id = g.author_id
         WHERE g.profile_id = ? ORDER BY g.created_at DESC LIMIT 40`,
      )
      .all(user.id) as { id: string; body: string; created_at: number; author_name: string }[]
    return c.json({
      notes: rows.map((row) => ({
        id: row.id,
        author: `@${row.author_name}`,
        body: row.body,
        createdAt: row.created_at,
      })),
    })
  })

  app.post('/api/users/:name/guestbook', async (c) => {
    const author = currentUser(c)
    if (!author) return c.json({ error: 'Sign in first' }, 401)
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const host = db.prepare('SELECT id FROM users WHERE name = ?').get(name) as { id: string } | undefined
    if (!host) return c.json({ error: 'Nobody with that handle' }, 404)
    const body = await c.req.json().catch(() => null)
    const text = String(body?.body ?? '').trim().slice(0, 200)
    if (!text) return c.json({ error: 'Write something' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      'INSERT INTO guestbook (id, profile_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, host.id, author.id, text, now)
    return c.json({ note: { id, author: `@${author.name}`, body: text, createdAt: now } })
  })

  app.post('/api/shelf', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const zineId = String(body?.zineId ?? '')
    const note = String(body?.note ?? 'stocked from the pile').slice(0, 80)
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published) return c.json({ error: 'Cannot stock that' }, 404)
    db.prepare(
      `INSERT INTO shelves (user_id, zine_id, note, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO UPDATE SET note = excluded.note`,
    ).run(user.id, zineId, note, Date.now())
    return c.json({ shelf: [{ zineId, title: zine.title, owner: `@${zine.owner_name}`, note, vibe: zine.vibe }] })
  })

  app.delete('/api/shelf/:id', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('DELETE FROM shelves WHERE user_id = ? AND zine_id = ?').run(user.id, c.req.param('id'))
    return c.json({ ok: true })
  })

  app.get('/api/zines/:id/pages', (c) => {
    const user = currentUser(c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    if (row.owner_id !== user?.id) return c.json({ pages: [] })
    const pages = db
      .prepare('SELECT page, views, dwell_ms FROM page_stats WHERE zine_id = ? ORDER BY page')
      .all(row.id) as { page: number; views: number; dwell_ms: number }[]
    return c.json({
      pages: pages.map((p) => ({ page: p.page, views: p.views, dwellMs: p.dwell_ms })),
    })
  })

  app.post('/api/zines/:id/pages', async (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ ok: true })
    const body = await c.req.json().catch(() => null)
    const page = Number(body?.page)
    const dwell = Math.max(0, Math.min(120000, Number(body?.dwellMs ?? 0)))
    if (!Number.isInteger(page) || page < 1 || page > 12) return c.json({ ok: true })
    db.prepare(
      `INSERT INTO page_stats (zine_id, page, views, dwell_ms) VALUES (?, ?, 1, ?)
       ON CONFLICT(zine_id, page) DO UPDATE SET views = views + 1, dwell_ms = dwell_ms + excluded.dwell_ms`,
    ).run(row.id, page, dwell)
    return c.json({ ok: true })
  })

  app.get('/api/zines/:id/chain', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.chain_open || row.chain_key !== c.req.query('invite')) {
      return c.json({ error: 'that corpse is closed' }, 404)
    }
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const previous = blocks.slice(-2)
    return c.json({ previous, turn: blocks.length })
  })

  app.post('/api/zines/:id/chain', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    const body = await c.req.json().catch(() => null)
    const invite = String(body?.invite ?? '')
    if (!row || !row.chain_open || row.chain_key !== invite) {
      return c.json({ error: 'that corpse is closed' }, 404)
    }
    const extra = Array.isArray(body?.blocks) ? (body.blocks as Block[]) : []
    if (!extra.length) return c.json({ error: 'Add a page' }, 400)
    const blocks = [...(JSON.parse(row.blocks_json) as Block[]), ...extra.map((b) => ({ ...b, id: randomUUID() }))]
    const nextInvite = randomUUID().replace(/-/g, '').slice(0, 16)
    db.prepare('UPDATE zines SET blocks_json = ?, chain_key = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(blocks),
      nextInvite,
      Date.now(),
      row.id,
    )
    return c.json({ invite: nextInvite, turn: blocks.length })
  })

  app.get('/api/bag', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT b.zine_id, z.title, z.vibe, u.name AS owner_name
         FROM bags b JOIN zines z ON z.id = b.zine_id JOIN users u ON u.id = z.owner_id
         WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      )
      .all(user.id) as { zine_id: string; title: string; vibe: string; owner_name: string }[]
    return c.json({
      bag: rows.map((row) => ({
        zineId: row.zine_id,
        title: row.title,
        owner: `@${row.owner_name}`,
        vibe: row.vibe,
      })),
    })
  })

  app.post('/api/bag', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const zineId = String(body?.zineId ?? '')
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published) return c.json({ error: 'Cannot tuck that' }, 404)
    db.prepare(
      `INSERT INTO bags (user_id, zine_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO NOTHING`,
    ).run(user.id, zineId, Date.now())
    return c.json({
      item: { zineId, title: zine.title, owner: `@${zine.owner_name}`, vibe: zine.vibe },
    })
  })

  app.delete('/api/bag/:id', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('DELETE FROM bags WHERE user_id = ? AND zine_id = ?').run(user.id, c.req.param('id'))
    return c.json({ ok: true })
  })

  app.get('/api/zines/:id/reviews', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const rows = db
      .prepare(
        `SELECT r.*, u.name AS author_name FROM reviews r JOIN users u ON u.id = r.user_id
         WHERE r.zine_id = ? ORDER BY r.created_at DESC`,
      )
      .all(row.id) as { id: string; zine_id: string; body: string; created_at: number; author_name: string }[]
    return c.json({
      reviews: rows.map((item) => ({
        id: item.id,
        zineId: item.zine_id,
        author: `@${item.author_name}`,
        body: item.body,
        createdAt: item.created_at,
      })),
    })
  })

  app.post('/api/zines/:id/reviews', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot review that' }, 404)
    if (!dropIsLive(row) && row.owner_id !== user.id) return c.json({ error: 'Still sealed' }, 403)
    const body = await c.req.json().catch(() => null)
    const text = String(body?.body ?? '').trim().slice(0, 240)
    if (!text) return c.json({ error: 'Write a blurb' }, 400)
    const now = Date.now()
    const existing = db
      .prepare('SELECT id FROM reviews WHERE zine_id = ? AND user_id = ?')
      .get(row.id, user.id) as { id: string } | undefined
    const id = existing?.id ?? randomUUID()
    db.prepare(
      `INSERT INTO reviews (id, zine_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(zine_id, user_id) DO UPDATE SET body = excluded.body, created_at = excluded.created_at`,
    ).run(id, row.id, user.id, text, now)
    if (row.owner_id !== user.id) {
      notify(db, {
        recipientId: row.owner_id,
        actorId: user.id,
        kind: 'review',
        zineId: row.id,
        body: row.title,
      })
    }
    return c.json({
      review: { id, zineId: row.id, author: `@${user.name}`, body: text, createdAt: now },
    })
  })

  app.get('/api/mail', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT l.*, f.name AS from_name, t.name AS to_name
         FROM letters l JOIN users f ON f.id = l.from_id JOIN users t ON t.id = l.to_id
         WHERE l.from_id = ? OR l.to_id = ?
         ORDER BY l.created_at DESC LIMIT 200`,
      )
      .all(user.id, user.id) as {
      id: string
      from_id: string
      to_id: string
      body: string
      read: number
      created_at: number
      from_name: string
      to_name: string
    }[]
    const map = new Map<
      string,
      { handle: string; last: { id: string; from: string; to: string; body: string; read: boolean; createdAt: number }; unread: number }
    >()
    for (const row of rows) {
      const other = row.from_id === user.id ? row.to_name : row.from_name
      const key = other.toLowerCase()
      const letter = {
        id: row.id,
        from: `@${row.from_name}`,
        to: `@${row.to_name}`,
        body: row.body,
        read: Boolean(row.read),
        createdAt: row.created_at,
      }
      const prev = map.get(key)
      if (!prev) {
        map.set(key, {
          handle: other,
          last: letter,
          unread: row.to_id === user.id && !row.read ? 1 : 0,
        })
      } else if (row.to_id === user.id && !row.read) {
        prev.unread += 1
      }
    }
    return c.json({ threads: [...map.values()] })
  })

  app.get('/api/mail/:name', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const other = db.prepare('SELECT id, name FROM users WHERE name = ?').get(name) as
      | { id: string; name: string }
      | undefined
    if (!other) return c.json({ error: 'Nobody with that handle' }, 404)
    const rows = db
      .prepare(
        `SELECT l.*, f.name AS from_name, t.name AS to_name
         FROM letters l JOIN users f ON f.id = l.from_id JOIN users t ON t.id = l.to_id
         WHERE (l.from_id = ? AND l.to_id = ?) OR (l.from_id = ? AND l.to_id = ?)
         ORDER BY l.created_at ASC`,
      )
      .all(user.id, other.id, other.id, user.id) as {
      id: string
      from_id: string
      to_id: string
      body: string
      read: number
      created_at: number
      from_name: string
      to_name: string
    }[]
    db.prepare('UPDATE letters SET read = 1 WHERE to_id = ? AND from_id = ?').run(user.id, other.id)
    return c.json({
      handle: other.name,
      letters: rows.map((row) => ({
        id: row.id,
        from: `@${row.from_name}`,
        to: `@${row.to_name}`,
        body: row.body,
        read: Boolean(row.read),
        createdAt: row.created_at,
        postcard: Boolean((row as { postcard?: number }).postcard),
        vibe: (row as { vibe?: string | null }).vibe ?? undefined,
      })),
    })
  })

  app.post('/api/mail', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const name = String(body?.to ?? '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
    const postcard = Boolean(body?.postcard)
    const vibe = ['miles', 'gwen', 'peni', 'ham', 'noir'].includes(String(body?.vibe ?? ''))
      ? String(body.vibe)
      : null
    const text = String(body?.body ?? '')
      .trim()
      .slice(0, postcard ? 140 : 400)
    if (!text) return c.json({ error: 'Write a letter' }, 400)
    const other = db.prepare('SELECT id, name FROM users WHERE name = ?').get(name) as
      | { id: string; name: string }
      | undefined
    if (!other) return c.json({ error: 'Nobody with that handle' }, 404)
    if (other.id === user.id) return c.json({ error: 'Mail yourself on paper' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      'INSERT INTO letters (id, from_id, to_id, body, read, created_at, postcard, vibe) VALUES (?, ?, ?, ?, 0, ?, ?, ?)',
    ).run(id, user.id, other.id, text, now, postcard ? 1 : 0, vibe)
    notify(db, {
      recipientId: other.id,
      actorId: user.id,
      kind: 'mail',
      body: postcard ? `postcard:${text.slice(0, 60)}` : text.slice(0, 80),
    })
    return c.json({
      letter: {
        id,
        from: `@${user.name}`,
        to: `@${other.name}`,
        body: text,
        read: false,
        createdAt: now,
        postcard,
        vibe,
      },
    })
  })

  app.get('/api/jams', (c) => {
    return c.json({ jams: listJams(db), live: liveJam(listJams(db)) ?? null })
  })

  app.get('/api/jams/:id', (c) => {
    const jam = listJams(db).find((item) => item.id === c.req.param('id'))
    if (!jam) return c.json({ error: 'no jam' }, 404)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.jam_id = ? AND z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
         ORDER BY COALESCE(z.drops_at, z.updated_at) DESC`,
      )
      .all(jam.id) as import('./db.ts').ZineRow[]
    return c.json({
      jam,
      live: isJamLive(jam),
      zines: rows.map((row) => decorate(db, rowToZine(row, { hideBlocks: !dropIsLive(row) }))),
    })
  })

  app.get('/api/archive', (c) => {
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
           AND (SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) >= ?
         ORDER BY (SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) DESC`,
      )
      .all(ARCHIVE_THRESHOLD) as import('./db.ts').ZineRow[]
    return c.json({ zines: rows.map((row) => decorate(db, rowToZine(row, { hideBlocks: !dropIsLive(row) }))) })
  })

  app.post('/api/zines/:id/nominate', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published || row.visibility === 'unlisted') {
      return c.json({ error: 'Cannot nominate that' }, 404)
    }
    const existing = db
      .prepare('SELECT 1 FROM nominations WHERE user_id = ? AND zine_id = ?')
      .get(user.id, row.id)
    if (existing) {
      db.prepare('DELETE FROM nominations WHERE user_id = ? AND zine_id = ?').run(user.id, row.id)
    } else {
      db.prepare('INSERT INTO nominations (user_id, zine_id, created_at) VALUES (?, ?, ?)').run(
        user.id,
        row.id,
        Date.now(),
      )
      if (row.owner_id !== user.id) {
        notify(db, {
          recipientId: row.owner_id,
          actorId: user.id,
          kind: 'archive',
          zineId: row.id,
          body: row.title,
        })
      }
    }
    const noms = nomCount(db, row.id)
    return c.json({ noms, archived: noms >= ARCHIVE_THRESHOLD, mine: !existing })
  })

  app.get('/api/zines/:id/margins', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const rows = db
      .prepare(
        `SELECT m.*, u.name AS author_name FROM margins m JOIN users u ON u.id = m.user_id
         WHERE m.zine_id = ? ORDER BY m.created_at ASC`,
      )
      .all(row.id) as { id: string; zine_id: string; block_id: string; body: string; created_at: number; author_name: string }[]
    return c.json({
      notes: rows.map((item) => ({
        id: item.id,
        zineId: item.zine_id,
        blockId: item.block_id,
        author: `@${item.author_name}`,
        body: item.body,
        createdAt: item.created_at,
      })),
    })
  })

  app.post('/api/zines/:id/margins', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot mark that' }, 404)
    const body = await c.req.json().catch(() => null)
    const text = String(body?.body ?? '').trim().slice(0, 160)
    const blockId = String(body?.blockId ?? '')
    if (!text || !blockId) return c.json({ error: 'Need a block and a note' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      'INSERT INTO margins (id, zine_id, block_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, row.id, blockId, user.id, text, now)
    return c.json({
      note: { id, zineId: row.id, blockId, author: `@${user.name}`, body: text, createdAt: now },
    })
  })

  app.get('/api/fest', (c) => {
    const rows = db
      .prepare(
        `SELECT t.*, u.name AS owner_name FROM fest_tables t JOIN users u ON u.id = t.user_id
         ORDER BY t.created_at DESC`,
      )
      .all() as {
      user_id: string
      name: string
      scene: string
      blurb: string
      zine_ids_json: string
      created_at: number
      owner_name: string
    }[]
    return c.json({
      tables: rows.map((row) => ({
        id: row.user_id,
        owner: `@${row.owner_name}`,
        name: row.name,
        scene: row.scene,
        blurb: row.blurb,
        zineIds: JSON.parse(row.zine_ids_json || '[]') as string[],
        createdAt: row.created_at,
        sitters: (
          db
            .prepare(
              `SELECT u.name FROM table_sits s JOIN users u ON u.id = s.user_id WHERE s.table_id = ? ORDER BY s.created_at`,
            )
            .all(row.user_id) as { name: string }[]
        ).map((item) => `@${item.name}`),
      })),
    })
  })

  app.post('/api/fest', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const name = String(body?.name ?? '').trim().slice(0, 48) || `${user.name}'s table`
    const scene = normalizeScene(body?.scene) ?? ''
    const blurb = String(body?.blurb ?? '').trim().slice(0, 200)
    const zineIds = Array.isArray(body?.zineIds) ? (body.zineIds as string[]).slice(0, 8) : []
    const now = Date.now()
    db.prepare(
      `INSERT INTO fest_tables (user_id, name, scene, blurb, zine_ids_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, scene = excluded.scene,
         blurb = excluded.blurb, zine_ids_json = excluded.zine_ids_json`,
    ).run(user.id, name, scene, blurb, JSON.stringify(zineIds), now)
    if (scene) {
      db.prepare(`UPDATE users SET scene = ? WHERE id = ? AND (scene IS NULL OR scene = '')`).run(scene, user.id)
    }
    return c.json({
      table: { id: user.id, owner: `@${user.name}`, name, scene, blurb, zineIds, createdAt: now },
    })
  })

  app.get('/api/stamps', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    return c.json({ stamps: listStamps(db, user.id) })
  })

  app.post('/api/stamps', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const zineId = String(body?.zineId ?? '')
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published || zine.visibility === 'unlisted') {
      return c.json({ error: 'Cannot stamp that' }, 404)
    }
    if (zine.owner_id === user.id) return c.json({ stamps: listStamps(db, user.id) })
    db.prepare(
      `INSERT INTO stamps (user_id, zine_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO NOTHING`,
    ).run(user.id, zineId, Date.now())
    return c.json({ stamps: listStamps(db, user.id) })
  })

  app.post('/api/zines/:id/claim', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published || !row.edition_size) return c.json({ error: 'Not a numbered run' }, 404)
    const existing = db.prepare('SELECT 1 FROM claims WHERE user_id = ? AND zine_id = ?').get(user.id, row.id)
    if (existing) {
      const claimed = claimCount(db, row.id)
      return c.json({ claimed, mine: true, out: claimed >= row.edition_size })
    }
    const claimed = claimCount(db, row.id)
    if (claimed >= row.edition_size) return c.json({ claimed, mine: false, out: true })
    db.prepare('INSERT INTO claims (user_id, zine_id, created_at) VALUES (?, ?, ?)').run(user.id, row.id, Date.now())
    const next = claimed + 1
    return c.json({ claimed: next, mine: true, out: next >= row.edition_size })
  })

  app.get('/api/cork', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare('SELECT id, text, x, y, rotation, src FROM cork_pins WHERE user_id = ? ORDER BY created_at')
      .all(user.id) as { id: string; text: string; x: number; y: number; rotation: number; src: string | null }[]
    return c.json({
      pins: rows.map((row) => ({
        id: row.id,
        text: row.text,
        x: row.x,
        y: row.y,
        rotation: row.rotation,
        src: row.src ?? undefined,
      })),
    })
  })

  app.put('/api/cork', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const pins = Array.isArray(body?.pins) ? body.pins : []
    db.prepare('DELETE FROM cork_pins WHERE user_id = ?').run(user.id)
    const insert = db.prepare(
      'INSERT INTO cork_pins (id, user_id, text, x, y, rotation, src, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    const now = Date.now()
    for (const pin of pins.slice(0, 40)) {
      insert.run(
        String(pin.id || randomUUID()),
        user.id,
        String(pin.text ?? '').slice(0, 160),
        Math.max(0, Math.min(100, Number(pin.x) || 0)),
        Math.max(0, Math.min(100, Number(pin.y) || 0)),
        Number(pin.rotation) || 0,
        pin.src ? String(pin.src).slice(0, 2000) : null,
        now,
      )
    }
    return c.json({ ok: true })
  })

  app.get('/api/loans', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const now = Date.now()
    const rows = db
      .prepare(
        `SELECT l.zine_id, l.due_at, z.title FROM loans l JOIN zines z ON z.id = l.zine_id
         WHERE l.user_id = ? AND l.due_at > ? ORDER BY l.due_at`,
      )
      .all(user.id, now) as { zine_id: string; due_at: number; title: string }[]
    return c.json({
      loans: rows.map((row) => ({ zineId: row.zine_id, title: row.title, dueAt: row.due_at })),
    })
  })

  app.post('/api/zines/:id/checkout', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot check that out' }, 404)
    const noms = nomCount(db, row.id)
    if (noms < ARCHIVE_THRESHOLD) return c.json({ error: 'Not in the archive' }, 400)
    const dueAt = Date.now() + 7 * 86400_000
    db.prepare(
      `INSERT INTO loans (user_id, zine_id, due_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO UPDATE SET due_at = excluded.due_at`,
    ).run(user.id, row.id, dueAt)
    return c.json({ loan: { zineId: row.id, title: row.title, dueAt } })
  })

  app.post('/api/series/watch', async (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = await c.req.json().catch(() => null)
    const series = String(body?.series ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 48)
    if (!series) return c.json({ error: 'Need a run name' }, 400)
    const existing = db
      .prepare('SELECT 1 FROM series_watches WHERE user_id = ? AND series = ?')
      .get(user.id, series)
    if (existing) {
      db.prepare('DELETE FROM series_watches WHERE user_id = ? AND series = ?').run(user.id, series)
      return c.json({ watching: false })
    }
    db.prepare('INSERT INTO series_watches (user_id, series, created_at) VALUES (?, ?, ?)').run(
      user.id,
      series,
      Date.now(),
    )
    return c.json({ watching: true })
  })

  app.post('/api/fest/:id/sit', (c) => {
    const user = currentUser(c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const tableId = c.req.param('id')
    const table = db.prepare('SELECT user_id FROM fest_tables WHERE user_id = ?').get(tableId) as
      | { user_id: string }
      | undefined
    if (!table) return c.json({ error: 'no table' }, 404)
    const existing = db
      .prepare('SELECT 1 FROM table_sits WHERE user_id = ? AND table_id = ?')
      .get(user.id, tableId)
    if (existing) {
      db.prepare('DELETE FROM table_sits WHERE user_id = ? AND table_id = ?').run(user.id, tableId)
    } else {
      db.prepare('INSERT INTO table_sits (user_id, table_id, created_at) VALUES (?, ?, ?)').run(
        user.id,
        tableId,
        Date.now(),
      )
    }
    const sitters = (
      db
        .prepare(
          `SELECT u.name FROM table_sits s JOIN users u ON u.id = s.user_id WHERE s.table_id = ? ORDER BY s.created_at`,
        )
        .all(tableId) as { name: string }[]
    ).map((row) => `@${row.name}`)
    return c.json({ sitters })
  })

  return app
}
