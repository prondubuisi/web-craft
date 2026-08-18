import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { MailSendBody, MailSendResponse, MailThreadResponse, MailThreadsResponse } from '../../src/lib/contract.ts'
import type { VibeId } from '../../src/lib/types.ts'
import type { Db } from '../db.ts'
import { currentUser } from '../http.ts'
import { notify } from '../services/notify.ts'

export function registerMail(app: Hono, db: Db) {
  app.get('/api/mail', (c) => {
    const user = currentUser(db, c)
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
    const payload: MailThreadsResponse = { threads: [...map.values()] }
    return c.json(payload)
  })

  app.get('/api/mail/:name', (c) => {
    const user = currentUser(db, c)
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
      postcard?: number
      vibe?: string | null
    }[]
    db.prepare('UPDATE letters SET read = 1 WHERE to_id = ? AND from_id = ?').run(user.id, other.id)
    const payload: MailThreadResponse = {
      handle: other.name,
      letters: rows.map((row) => ({
        id: row.id,
        from: `@${row.from_name}`,
        to: `@${row.to_name}`,
        body: row.body,
        read: Boolean(row.read),
        createdAt: row.created_at,
        postcard: Boolean(row.postcard),
        vibe: (row.vibe ?? undefined) as VibeId | undefined,
      })),
    }
    return c.json(payload)
  })

  app.post('/api/mail', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<MailSendBody> | null
    const name = String(body?.to ?? '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
    const postcard = Boolean(body?.postcard)
    const vibe = ['miles', 'gwen', 'peni', 'ham', 'noir'].includes(String(body?.vibe ?? ''))
      ? (String(body.vibe) as VibeId)
      : undefined
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
    ).run(id, user.id, other.id, text, now, postcard ? 1 : 0, vibe ?? null)
    notify(db, {
      recipientId: other.id,
      actorId: user.id,
      kind: 'mail',
      body: postcard ? `postcard:${text.slice(0, 60)}` : text.slice(0, 80),
    })
    const payload: MailSendResponse = {
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
    }
    return c.json(payload)
  })
}
