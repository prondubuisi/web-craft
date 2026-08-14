import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { BoardListResponse, BoardPostResponse, SwapResponse } from '../../src/lib/contract.ts'
import { getZineRow, rowToListing, type Db } from '../db.ts'
import { currentUser } from '../http.ts'

const LISTING_KINDS = new Set(['trade', 'collab', 'feedback'])

export function registerBoard(app: Hono, db: Db) {
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
    const payload: BoardListResponse = { listings: rows.map(rowToListing) }
    return c.json(payload)
  })

  app.post('/api/board', async (c) => {
    const user = currentUser(db, c)
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
    db.prepare(`INSERT INTO listings (id, user_id, zine_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
      id,
      user.id,
      zineId,
      kind,
      text,
      now,
    )
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
    const payload: BoardPostResponse = { listing: rowToListing(row) }
    return c.json(payload)
  })

  app.delete('/api/board/:id', (c) => {
    const user = currentUser(db, c)
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
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = db.prepare('SELECT user_id, swapped FROM listings WHERE id = ?').get(c.req.param('id')) as
      | { user_id: string; swapped: number }
      | undefined
    if (!row) return c.json({ error: 'missing pin' }, 404)
    if (row.user_id !== user.id) return c.json({ error: 'Not your pin' }, 403)
    const next = row.swapped ? 0 : 1
    db.prepare('UPDATE listings SET swapped = ? WHERE id = ?').run(next, c.req.param('id'))
    const payload: SwapResponse = { swapped: Boolean(next) }
    return c.json(payload)
  })
}
