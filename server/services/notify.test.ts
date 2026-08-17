import { describe, expect, it } from 'vitest'
import { openDb } from '../db.ts'
import { notify } from './notify.ts'

function user(db: ReturnType<typeof openDb>, name: string) {
  db.prepare(
    `INSERT INTO users (id, name, remix_points, kind, created_at) VALUES (?, ?, 0, 'human', ?)`,
  ).run(name, name, Date.now())
  return name
}

describe('notify', () => {
  it('skips self-notices', () => {
    const db = openDb(':memory:')
    const id = user(db, 'rio')
    notify(db, { recipientId: id, actorId: id, kind: 'like' })
    const n = (db.prepare('SELECT COUNT(*) AS n FROM notices').get() as { n: number }).n
    expect(n).toBe(0)
    db.close()
  })

  it('writes a notice for another user', () => {
    const db = openDb(':memory:')
    const rio = user(db, 'rio')
    const gwen = user(db, 'gwen')
    notify(db, { recipientId: gwen, actorId: rio, kind: 'follow', body: 'hey' })
    const row = db.prepare('SELECT user_id, kind, body FROM notices').get() as {
      user_id: string
      kind: string
      body: string
    }
    expect(row.user_id).toBe(gwen)
    expect(row.kind).toBe('follow')
    expect(row.body).toBe('hey')
    db.close()
  })
})
