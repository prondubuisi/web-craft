import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import { getZineRow, type Db } from '../db.ts'
import { currentUser } from '../http.ts'

export function registerMargins(app: Hono, db: Db) {
  app.get('/api/zines/:id/margins', (c) => {
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const rows = db
      .prepare(
        `SELECT m.*, u.name AS author_name FROM margins m JOIN users u ON u.id = m.user_id
         WHERE m.zine_id = ? ORDER BY m.created_at ASC`,
      )
      .all(row.id) as {
      id: string
      zine_id: string
      block_id: string
      body: string
      created_at: number
      author_name: string
    }[]
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
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot mark that' }, 404)
    const body = await c.req.json().catch(() => null)
    const text = String(body?.body ?? '').trim().slice(0, 160)
    const blockId = String(body?.blockId ?? '')
    if (!text || !blockId) return c.json({ error: 'Need a block and a note' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare('INSERT INTO margins (id, zine_id, block_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      row.id,
      blockId,
      user.id,
      text,
      now,
    )
    return c.json({
      note: { id, zineId: row.id, blockId, author: `@${user.name}`, body: text, createdAt: now },
    })
  })
}
