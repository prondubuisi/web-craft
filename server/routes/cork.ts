import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { CorkResponse, CorkSaveBody, OkBody } from '../../src/lib/contract.ts'
import type { Db } from '../db.ts'
import { currentUser } from '../http.ts'

export function registerCork(app: Hono, db: Db) {
  app.get('/api/cork', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare('SELECT id, text, x, y, rotation, src FROM cork_pins WHERE user_id = ? ORDER BY created_at')
      .all(user.id) as { id: string; text: string; x: number; y: number; rotation: number; src: string | null }[]
    const payload: CorkResponse = {
      pins: rows.map((row) => ({
        id: row.id,
        text: row.text,
        x: row.x,
        y: row.y,
        rotation: row.rotation,
        src: row.src ?? undefined,
      })),
    }
    return c.json(payload)
  })

  app.put('/api/cork', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<CorkSaveBody> | null
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
    const payload: OkBody = { ok: true }
    return c.json(payload)
  })
}
