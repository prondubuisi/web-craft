import type { Hono } from 'hono'
import { ARCHIVE_THRESHOLD } from '../../src/lib/jam.ts'
import { dropIsLive, getZineRow, rowToZine, type Db, type ZineRow } from '../db.ts'
import { currentUser } from '../http.ts'
import { notify } from '../services/notify.ts'
import { decorateMany, nomCount } from '../services/zines.ts'

export function registerArchive(app: Hono, db: Db) {
  app.get('/api/archive', (c) => {
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
           AND (SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) >= ?
         ORDER BY (SELECT COUNT(*) FROM nominations n WHERE n.zine_id = z.id) DESC`,
      )
      .all(ARCHIVE_THRESHOLD) as ZineRow[]
    return c.json({ zines: decorateMany(db, rows.map((row) => rowToZine(row, { hideBlocks: !dropIsLive(row) }))) })
  })

  app.post('/api/zines/:id/nominate', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published || row.visibility === 'unlisted') {
      return c.json({ error: 'Cannot nominate that' }, 404)
    }
    const existing = db.prepare('SELECT 1 FROM nominations WHERE user_id = ? AND zine_id = ?').get(user.id, row.id)
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
}
