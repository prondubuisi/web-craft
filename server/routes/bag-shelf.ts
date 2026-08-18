import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type {
  BagItemResponse,
  BagResponse,
  BagTuckBody,
  ClaimResponse,
  GuestNoteBody,
  GuestNoteResponse,
  GuestbookResponse,
  LoanOneResponse,
  LoansResponse,
  OkBody,
  PileResponse,
  ReviewBody,
  ReviewOneResponse,
  ReviewsResponse,
  ShelfResponse,
  ShelfStockBody,
} from '../../src/lib/contract.ts'
import { ARCHIVE_THRESHOLD } from '../../src/lib/jam.ts'
import type { VibeId } from '../../src/lib/types.ts'
import { dropIsLive, getZineRow, rowToZine, type Db, type ZineRow } from '../db.ts'
import { currentUser } from '../http.ts'
import { notify } from '../services/notify.ts'
import { claimCount, nomCount } from '../services/zines.ts'

export function registerBagShelf(app: Hono, db: Db) {
  app.get('/api/pile', (c) => {
    const row = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
           AND (z.drops_at IS NULL OR z.drops_at <= ?)
         ORDER BY RANDOM() LIMIT 1`,
      )
      .get(Date.now()) as ZineRow | undefined
    if (!row) return c.json({ error: 'empty pile' }, 404)
    const payload: PileResponse = { zine: rowToZine(row) }
    return c.json(payload)
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
    const payload: GuestbookResponse = {
      notes: rows.map((row) => ({
        id: row.id,
        author: `@${row.author_name}`,
        body: row.body,
        createdAt: row.created_at,
      })),
    }
    return c.json(payload)
  })

  app.post('/api/users/:name/guestbook', async (c) => {
    const author = currentUser(db, c)
    if (!author) return c.json({ error: 'Sign in first' }, 401)
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const host = db.prepare('SELECT id FROM users WHERE name = ?').get(name) as { id: string } | undefined
    if (!host) return c.json({ error: 'Nobody with that handle' }, 404)
    const body = (await c.req.json().catch(() => null)) as Partial<GuestNoteBody> | null
    const text = String(body?.body ?? '').trim().slice(0, 200)
    if (!text) return c.json({ error: 'Write something' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare('INSERT INTO guestbook (id, profile_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      host.id,
      author.id,
      text,
      now,
    )
    const payload: GuestNoteResponse = { note: { id, author: `@${author.name}`, body: text, createdAt: now } }
    return c.json(payload)
  })

  app.post('/api/shelf', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<ShelfStockBody> | null
    const zineId = String(body?.zineId ?? '')
    const note = String(body?.note ?? 'stocked from the pile').slice(0, 80)
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published) return c.json({ error: 'Cannot stock that' }, 404)
    db.prepare(
      `INSERT INTO shelves (user_id, zine_id, note, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO UPDATE SET note = excluded.note`,
    ).run(user.id, zineId, note, Date.now())
    const payload: ShelfResponse = {
      shelf: [{ zineId, title: zine.title, owner: `@${zine.owner_name}`, note, vibe: zine.vibe as VibeId }],
    }
    return c.json(payload)
  })

  app.delete('/api/shelf/:id', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('DELETE FROM shelves WHERE user_id = ? AND zine_id = ?').run(user.id, c.req.param('id'))
    const payload: OkBody = { ok: true }
    return c.json(payload)
  })

  app.get('/api/bag', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT b.zine_id, z.title, z.vibe, u.name AS owner_name
         FROM bags b JOIN zines z ON z.id = b.zine_id JOIN users u ON u.id = z.owner_id
         WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      )
      .all(user.id) as { zine_id: string; title: string; vibe: string; owner_name: string }[]
    const payload: BagResponse = {
      bag: rows.map((row) => ({
        zineId: row.zine_id,
        title: row.title,
        owner: `@${row.owner_name}`,
        vibe: row.vibe as VibeId,
      })),
    }
    return c.json(payload)
  })

  app.post('/api/bag', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<BagTuckBody> | null
    const zineId = String(body?.zineId ?? '')
    const zine = getZineRow(db, zineId)
    if (!zine || !zine.published) return c.json({ error: 'Cannot tuck that' }, 404)
    db.prepare(
      `INSERT INTO bags (user_id, zine_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, zine_id) DO NOTHING`,
    ).run(user.id, zineId, Date.now())
    const payload: BagItemResponse = {
      item: { zineId, title: zine.title, owner: `@${zine.owner_name}`, vibe: zine.vibe as VibeId },
    }
    return c.json(payload)
  })

  app.delete('/api/bag/:id', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('DELETE FROM bags WHERE user_id = ? AND zine_id = ?').run(user.id, c.req.param('id'))
    const payload: OkBody = { ok: true }
    return c.json(payload)
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
    const payload: ReviewsResponse = {
      reviews: rows.map((item) => ({
        id: item.id,
        zineId: item.zine_id,
        author: `@${item.author_name}`,
        body: item.body,
        createdAt: item.created_at,
      })),
    }
    return c.json(payload)
  })

  app.post('/api/zines/:id/reviews', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published) return c.json({ error: 'Cannot review that' }, 404)
    if (!dropIsLive(row) && row.owner_id !== user.id) return c.json({ error: 'Still sealed' }, 403)
    const body = (await c.req.json().catch(() => null)) as Partial<ReviewBody> | null
    const text = String(body?.body ?? '').trim().slice(0, 240)
    if (!text) return c.json({ error: 'Write a blurb' }, 400)
    const now = Date.now()
    const existing = db.prepare('SELECT id FROM reviews WHERE zine_id = ? AND user_id = ?').get(row.id, user.id) as
      | { id: string }
      | undefined
    const id = existing?.id ?? randomUUID()
    db.prepare(
      `INSERT INTO reviews (id, zine_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(zine_id, user_id) DO UPDATE SET body = excluded.body, created_at = excluded.created_at`,
    ).run(id, row.id, user.id, text, now)
    if (row.owner_id !== user.id) {
      notify(db, { recipientId: row.owner_id, actorId: user.id, kind: 'review', zineId: row.id, body: row.title })
    }
    const payload: ReviewOneResponse = {
      review: { id, zineId: row.id, author: `@${user.name}`, body: text, createdAt: now },
    }
    return c.json(payload)
  })

  app.post('/api/zines/:id/claim', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !row.published || !row.edition_size) return c.json({ error: 'Not a numbered run' }, 404)
    const existing = db.prepare('SELECT 1 FROM claims WHERE user_id = ? AND zine_id = ?').get(user.id, row.id)
    if (existing) {
      const claimed = claimCount(db, row.id)
      const payload: ClaimResponse = { claimed, mine: true, out: claimed >= row.edition_size }
      return c.json(payload)
    }
    const claimed = claimCount(db, row.id)
    if (claimed >= row.edition_size) {
      const payload: ClaimResponse = { claimed, mine: false, out: true }
      return c.json(payload)
    }
    db.prepare('INSERT INTO claims (user_id, zine_id, created_at) VALUES (?, ?, ?)').run(user.id, row.id, Date.now())
    const next = claimed + 1
    const payload: ClaimResponse = { claimed: next, mine: true, out: next >= row.edition_size }
    return c.json(payload)
  })

  app.get('/api/loans', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const now = Date.now()
    const rows = db
      .prepare(
        `SELECT l.zine_id, l.due_at, z.title FROM loans l JOIN zines z ON z.id = l.zine_id
         WHERE l.user_id = ? AND l.due_at > ? ORDER BY l.due_at`,
      )
      .all(user.id, now) as { zine_id: string; due_at: number; title: string }[]
    const payload: LoansResponse = {
      loans: rows.map((row) => ({ zineId: row.zine_id, title: row.title, dueAt: row.due_at })),
    }
    return c.json(payload)
  })

  app.post('/api/zines/:id/checkout', (c) => {
    const user = currentUser(db, c)
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
    const payload: LoanOneResponse = { loan: { zineId: row.id, title: row.title, dueAt } }
    return c.json(payload)
  })
}
