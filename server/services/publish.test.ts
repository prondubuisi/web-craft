import { describe, expect, it } from 'vitest'
import { hashPassword } from '../auth.ts'
import { getZineRow, openDb, type UserRow } from '../db.ts'
import { verifyPassword } from '../auth.ts'
import { publishZine } from './publish.ts'

function seed(db: ReturnType<typeof openDb>) {
  const owner: UserRow = {
    id: 'owner',
    name: 'rio',
    password_hash: null,
    password_salt: null,
    remix_points: 0,
    kind: 'human',
    created_at: Date.now(),
    bio: '',
    scene: '',
  }
  db.prepare(
    `INSERT INTO users (id, name, remix_points, kind, created_at) VALUES (?, ?, 0, 'human', ?)`,
  ).run(owner.id, owner.name, owner.created_at)
  db.prepare(
    `INSERT INTO zines (id, owner_id, title, vibe, blocks_json, published, created_at, updated_at)
     VALUES (?, ?, 'rooftop', 'miles', ?, 0, ?, ?)`,
  ).run('z1', owner.id, JSON.stringify([{ id: '1', type: 'heading', text: 'hi', size: 'xl' }]), Date.now(), Date.now())
  return owner
}

describe('publishZine', () => {
  it('seals a future drop', () => {
    const db = openDb(':memory:')
    const owner = seed(db)
    const row = getZineRow(db, 'z1')!
    const later = Date.now() + 60_000
    const zine = publishZine(db, owner, row, { dropsAt: later })
    expect(zine.published).toBe(true)
    expect(zine.dropsAt).toBe(later)
    expect(zine.visibility).toBe('public')
    db.close()
  })

  it('hashes a passphrase and can clear it', () => {
    const db = openDb(':memory:')
    const owner = seed(db)
    const row = getZineRow(db, 'z1')!
    publishZine(db, owner, row, { password: 'secret-ink' })
    const locked = getZineRow(db, 'z1')!
    expect(locked.pass_hash).toBeTruthy()
    expect(verifyPassword('secret-ink', locked.pass_hash!, locked.pass_salt!)).toBe(true)
    publishZine(db, owner, locked, { password: '' })
    const open = getZineRow(db, 'z1')!
    expect(open.pass_hash).toBeNull()
    db.close()
  })

  it('does not fan out drops for unlisted issues', () => {
    const db = openDb(':memory:')
    const owner = seed(db)
    db.prepare(
      `INSERT INTO users (id, name, remix_points, kind, created_at) VALUES ('fan', 'gwen', 0, 'human', ?)`,
    ).run(Date.now())
    db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').run(
      'fan',
      owner.id,
      Date.now(),
    )
    publishZine(db, owner, getZineRow(db, 'z1')!, { visibility: 'unlisted' })
    const n = (db.prepare('SELECT COUNT(*) AS n FROM notices').get() as { n: number }).n
    expect(n).toBe(0)
    db.close()
  })

  it('notifies watchers and the dedicated handle on a public drop', () => {
    const db = openDb(':memory:')
    const owner = seed(db)
    const { hash, salt } = hashPassword('inkstain1')
    db.prepare(
      `INSERT INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at)
       VALUES ('gwen', 'gwen', ?, ?, 0, 'human', ?)`,
    ).run(hash, salt, Date.now())
    db.prepare('UPDATE zines SET series = ?, dedication = ? WHERE id = ?').run('night bus', '@gwen', 'z1')
    db.prepare('INSERT INTO series_watches (user_id, series, created_at) VALUES (?, ?, ?)').run(
      'gwen',
      'night bus',
      Date.now(),
    )
    publishZine(db, owner, getZineRow(db, 'z1')!, { visibility: 'public' })
    const kinds = (db.prepare('SELECT kind FROM notices ORDER BY kind').all() as { kind: string }[]).map(
      (row) => row.kind,
    )
    expect(kinds).toEqual(['dedicate', 'series'])
    db.close()
  })
})
