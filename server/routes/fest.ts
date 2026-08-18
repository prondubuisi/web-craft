import type { Hono } from 'hono'
import type {
  FestListResponse,
  FestTableBody,
  FestTableResponse,
  SitResponse,
  StampBody,
  StampsResponse,
} from '../../src/lib/contract.ts'
import { normalizeScene } from '../../src/lib/fest.ts'
import { getZineRow, type Db } from '../db.ts'
import { currentUser } from '../http.ts'
import { listStamps } from '../services/zines.ts'

export function registerFest(app: Hono, db: Db) {
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
    const payload: FestListResponse = {
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
    }
    return c.json(payload)
  })

  app.post('/api/fest', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<FestTableBody> | null
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
    const payload: FestTableResponse = {
      table: { id: user.id, owner: `@${user.name}`, name, scene, blurb, zineIds, createdAt: now },
    }
    return c.json(payload)
  })

  app.get('/api/stamps', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const payload: StampsResponse = { stamps: listStamps(db, user.id) }
    return c.json(payload)
  })

  app.post('/api/stamps', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<StampBody> | null
    const zineId = String(body?.zineId ?? '')
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published || zine.visibility === 'unlisted') {
      return c.json({ error: 'Cannot stamp that' }, 404)
    }
    if (zine.owner_id === user.id) {
      const payload: StampsResponse = { stamps: listStamps(db, user.id) }
      return c.json(payload)
    }
    db.prepare(
      `INSERT INTO stamps (user_id, zine_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO NOTHING`,
    ).run(user.id, zineId, Date.now())
    const payload: StampsResponse = { stamps: listStamps(db, user.id) }
    return c.json(payload)
  })

  app.post('/api/fest/:id/sit', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const tableId = c.req.param('id')
    const table = db.prepare('SELECT user_id FROM fest_tables WHERE user_id = ?').get(tableId) as
      | { user_id: string }
      | undefined
    if (!table) return c.json({ error: 'no table' }, 404)
    const existing = db.prepare('SELECT 1 FROM table_sits WHERE user_id = ? AND table_id = ?').get(user.id, tableId)
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
    const payload: SitResponse = { sitters }
    return c.json(payload)
  })
}
