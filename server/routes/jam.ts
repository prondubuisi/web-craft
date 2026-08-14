import type { Hono } from 'hono'
import { isJamLive, liveJam } from '../../src/lib/jam.ts'
import { dropIsLive, rowToZine, type Db, type ZineRow } from '../db.ts'
import { listJams } from '../services/jams.ts'
import { decorate } from '../services/zines.ts'

export function registerJam(app: Hono, db: Db) {
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
      .all(jam.id) as ZineRow[]
    return c.json({
      jam,
      live: isJamLive(jam),
      zines: rows.map((row) => decorate(db, rowToZine(row, { hideBlocks: !dropIsLive(row) }))),
    })
  })
}
