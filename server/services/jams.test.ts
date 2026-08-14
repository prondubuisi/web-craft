import { describe, expect, it } from 'vitest'
import { openDb } from '../db.ts'
import { jamForLive, listJams } from './jams.ts'

describe('jams service', () => {
  it('falls back to the demo jam when the table is empty', () => {
    const db = openDb(':memory:')
    const jams = listJams(db)
    expect(jams.length).toBeGreaterThan(0)
    expect(jams[0]?.id).toBe('toner-week')
    db.close()
  })

  it('does not attach a jam to unlisted issues', () => {
    const db = openDb(':memory:')
    expect(jamForLive(db, 'unlisted', 1)).toBeUndefined()
    db.close()
  })

  it('matches live jam format caps', () => {
    const db = openDb(':memory:')
    const now = Date.now()
    db.prepare('INSERT INTO jams (id, title, prompt, format, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      'card-jam',
      'card',
      'tiny',
      'card',
      now - 1000,
      now + 60_000,
    )
    expect(jamForLive(db, 'public', 2)?.id).toBe('card-jam')
    expect(jamForLive(db, 'public', 3)).toBeUndefined()
    db.close()
  })
})
