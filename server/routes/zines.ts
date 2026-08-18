import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type {
  ChainAddBody,
  ChainAddResponse,
  ChainPeekResponse,
  LikeResponse,
  OkBody,
  PageHitBody,
  PagesResponse,
  PublishBody,
  UnlockBody,
  ViewsResponse,
  ZineListResponse,
  ZineOneResponse,
  ZineWriteResponse,
} from '../../src/lib/contract.ts'
import type { Block, VibeId, Zine } from '../../src/lib/types.ts'
import { ARCHIVE_THRESHOLD } from '../../src/lib/jam.ts'
import { liveJam } from '../../src/lib/jam.ts'
import { assertBlocks } from '../../src/lib/shape.ts'
import { EDITION_UPDATE_SQL, editionFromWrite, editionWriteParams } from '../../src/lib/zineFields.ts'
import { verifyPassword } from '../auth.ts'
import { dropIsLive, getZineRow, rowToZine, type Db, type ZineRow } from '../db.ts'
import { currentUser, VIBES } from '../http.ts'
import { listJams } from '../services/jams.ts'
import { notify } from '../services/notify.ts'
import { publishZine } from '../services/publish.ts'
import { refreshDemoDrop } from '../community.ts'
import { accessZine, decorate, decorateMany } from '../services/zines.ts'

export function registerZines(app: Hono, db: Db) {
  app.get('/api/stream', (c) => {
    refreshDemoDrop(db)
    const user = currentUser(db, c)
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
        const payload: ZineListResponse = { zines: [] }
        return c.json(payload)
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
      if (!jam) {
        const payload: ZineListResponse = { zines: [] }
        return c.json(payload)
      }
      where.push('z.jam_id = ?')
      params.push(jam.id)
    }
    if (c.req.query('archive') === '1') {
      where.push(`(SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) >= ${ARCHIVE_THRESHOLD}`)
    }
    if (q) {
      where.push(
        "(LOWER(z.title) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(z.vibe) LIKE ? OR LOWER(COALESCE(z.series, '')) LIKE ? OR LOWER(COALESCE(z.pen_name, '')) LIKE ?)",
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
      .all(...params) as ZineRow[]
    const payload: ZineListResponse = {
      zines: decorateMany(
        db,
        rows.map((row) => rowToZine(row, { hideBlocks: !dropIsLive(row) && row.owner_id !== user?.id })),
        user?.id,
      ),
    }
    return c.json(payload)
  })

  app.get('/api/zines', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.owner_id = ?
         ORDER BY z.updated_at DESC`,
      )
      .all(user.id) as ZineRow[]
    const payload: ZineListResponse = { zines: rows.map((row) => rowToZine(row, { includeSecret: true })) }
    return c.json(payload)
  })

  app.get('/api/zines/:id', (c) => {
    const user = currentUser(db, c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const gate = accessZine(row, user?.id, c.req.query('k'))
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    const hide = gate.sealed || gate.locked
    const payload: ZineOneResponse = {
      zine: decorate(db, rowToZine(row, { hideBlocks: hide, includeSecret: row.owner_id === user?.id })),
      sealed: gate.sealed,
      locked: gate.locked,
    }
    return c.json(payload)
  })

  app.post('/api/zines/:id/unlock', async (c) => {
    const user = currentUser(db, c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const body = (await c.req.json().catch(() => null)) as Partial<UnlockBody> | null
    const key = String(body?.k ?? c.req.query('k') ?? '')
    const password = String(body?.password ?? '')
    const gate = accessZine(row, user?.id, key, false)
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    if (!row.pass_hash || !row.pass_salt) {
      const payload: ZineOneResponse = {
        zine: rowToZine(row, { includeSecret: row.owner_id === user?.id }),
        sealed: !dropIsLive(row),
        locked: false,
      }
      return c.json(payload)
    }
    if (!verifyPassword(password, row.pass_hash, row.pass_salt)) {
      return c.json({ error: 'Wrong passphrase' }, 401)
    }
    const live = dropIsLive(row) || row.owner_id === user?.id || Boolean(row.share_key && key === row.share_key && !row.published)
    const draftOk = !row.published && row.share_key === key
    const payload: ZineOneResponse = {
      zine: rowToZine(row, {
        hideBlocks: row.published && !dropIsLive(row) && row.owner_id !== user?.id,
        includeSecret: row.owner_id === user?.id,
      }),
      sealed: row.published && !dropIsLive(row) && row.owner_id !== user?.id,
      locked: false,
      draft: draftOk,
      live,
    }
    return c.json(payload)
  })

  app.put('/api/zines/:id', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<Zine> | null
    if (!body?.title || !body.vibe || !Array.isArray(body.blocks)) {
      return c.json({ error: 'Need title, vibe, and blocks' }, 400)
    }
    if (!VIBES.has(body.vibe)) return c.json({ error: 'Unknown vibe' }, 400)
    let blocks: Block[]
    try {
      blocks = assertBlocks(body.blocks)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Bad blocks' }, 400)
    }
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
      blocks_json: JSON.stringify(blocks),
      published: existing?.published ?? 0,
      drops_at: existing?.drops_at ?? null,
      views: existing?.views ?? 0,
      likes: existing?.likes ?? 0,
      remixes: existing?.remixes ?? 0,
      remixed_from: existing?.remixed_from ?? body.remixedFrom ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    })
    const edition = editionFromWrite(body, existing)
    db.prepare(EDITION_UPDATE_SQL).run(...editionWriteParams(edition, id))
    const row = getZineRow(db, id)
    if (!row) return c.json({ error: 'missing issue' }, 500)
    const payload: ZineWriteResponse = { zine: rowToZine(row, { includeSecret: true }) }
    return c.json(payload)
  })

  app.delete('/api/zines/:id', (c) => {
    const user = currentUser(db, c)
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
    const payload: OkBody = { ok: true }
    return c.json(payload)
  })

  app.post('/api/zines/:id/publish', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || row.owner_id !== user.id) return c.json({ error: 'Not your issue' }, 403)
    const body = ((await c.req.json().catch(() => ({}))) ?? {}) as PublishBody
    const payload: ZineWriteResponse = { zine: publishZine(db, user, row, body) }
    return c.json(payload)
  })

  app.post('/api/zines/:id/like', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot like that' }, 404)
    const liked = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND zine_id = ?').get(user.id, row.id)
    if (liked) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND zine_id = ?').run(user.id, row.id)
      db.prepare('UPDATE zines SET likes = MAX(likes - 1, 0) WHERE id = ?').run(row.id)
    } else {
      db.prepare('INSERT INTO likes (user_id, zine_id) VALUES (?, ?)').run(user.id, row.id)
      db.prepare('UPDATE zines SET likes = likes + 1 WHERE id = ?').run(row.id)
      notify(db, { recipientId: row.owner_id, actorId: user.id, kind: 'like', zineId: row.id, body: row.title })
    }
    const next = getZineRow(db, row.id)!
    const payload: LikeResponse = { liked: !liked, likes: next.likes }
    return c.json(payload)
  })

  app.post('/api/zines/:id/view', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) {
      const payload: ViewsResponse = { views: row?.views ?? 0 }
      return c.json(payload)
    }
    db.prepare('UPDATE zines SET views = views + 1 WHERE id = ?').run(row.id)
    const payload: ViewsResponse = { views: row.views + 1 }
    return c.json(payload)
  })

  app.post('/api/zines/:id/remix', (c) => {
    const user = currentUser(db, c)
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
    ).run(copyId, user.id, `${source.title} (remix)`, source.vibe as VibeId, JSON.stringify(blocks), row.id, now, now)
    db.prepare('UPDATE zines SET remixes = remixes + 1 WHERE id = ?').run(row.id)
    db.prepare('UPDATE users SET remix_points = remix_points + 1 WHERE id = ?').run(user.id)
    notify(db, { recipientId: row.owner_id, actorId: user.id, kind: 'remix', zineId: row.id, body: source.title })
    const copy = getZineRow(db, copyId)!
    const payload: ZineWriteResponse = { zine: rowToZine(copy) }
    return c.json(payload)
  })

  app.get('/api/zines/:id/pages', (c) => {
    const user = currentUser(db, c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    if (row.owner_id !== user?.id) {
      const payload: PagesResponse = { pages: [] }
      return c.json(payload)
    }
    const pages = db
      .prepare('SELECT page, views, dwell_ms FROM page_stats WHERE zine_id = ? ORDER BY page')
      .all(row.id) as { page: number; views: number; dwell_ms: number }[]
    const payload: PagesResponse = {
      pages: pages.map((p) => ({ page: p.page, views: p.views, dwellMs: p.dwell_ms })),
    }
    return c.json(payload)
  })

  app.post('/api/zines/:id/pages', async (c) => {
    const row = getZineRow(db, c.req.param('id'))
    const ok: OkBody = { ok: true }
    if (!row || !dropIsLive(row)) return c.json(ok)
    const body = (await c.req.json().catch(() => null)) as Partial<PageHitBody> | null
    const page = Number(body?.page)
    const dwell = Math.max(0, Math.min(120000, Number(body?.dwellMs ?? 0)))
    if (!Number.isInteger(page) || page < 1 || page > 12) return c.json(ok)
    db.prepare(
      `INSERT INTO page_stats (zine_id, page, views, dwell_ms) VALUES (?, ?, 1, ?)
       ON CONFLICT(zine_id, page) DO UPDATE SET views = views + 1, dwell_ms = dwell_ms + excluded.dwell_ms`,
    ).run(row.id, page, dwell)
    return c.json(ok)
  })

  app.get('/api/zines/:id/chain', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.chain_open || row.chain_key !== c.req.query('invite')) {
      return c.json({ error: 'that corpse is closed' }, 404)
    }
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const previous = blocks.slice(-2)
    const payload: ChainPeekResponse = { previous, turn: blocks.length }
    return c.json(payload)
  })

  app.post('/api/zines/:id/chain', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    const body = (await c.req.json().catch(() => null)) as Partial<ChainAddBody> | null
    const invite = String(body?.invite ?? '')
    if (!row || !row.chain_open || row.chain_key !== invite) {
      return c.json({ error: 'that corpse is closed' }, 404)
    }
    let extra: Block[] = []
    if (Array.isArray(body?.blocks)) {
      try {
        extra = assertBlocks(body.blocks)
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Bad blocks' }, 400)
      }
    }
    if (!extra.length) return c.json({ error: 'Add a page' }, 400)
    const blocks = [...(JSON.parse(row.blocks_json) as Block[]), ...extra.map((b) => ({ ...b, id: randomUUID() }))]
    const nextInvite = randomUUID().replace(/-/g, '').slice(0, 16)
    db.prepare('UPDATE zines SET blocks_json = ?, chain_key = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(blocks),
      nextInvite,
      Date.now(),
      row.id,
    )
    const payload: ChainAddResponse = { invite: nextInvite, turn: blocks.length }
    return c.json(payload)
  })
}
