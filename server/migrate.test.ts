import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { openDb } from './db.ts'
import { migrate } from './migrate.ts'

function tables(db: Database.Database): string[] {
  return (
    db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as { name: string }[]
  ).map((row) => row.name)
}

describe('migrate', () => {
  it('applies the baseline on a fresh database', () => {
    const db = openDb(':memory:')
    const names = tables(db)
    expect(names).toContain('users')
    expect(names).toContain('zines')
    expect(names).toContain('schema_migrations')
    const applied = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    expect(applied.map((row) => row.id)).toContain('0001_init')
    const cols = (db.prepare('PRAGMA table_info(zines)').all() as { name: string }[]).map((row) => row.name)
    expect(cols).toContain('dedication')
    expect(cols).toContain('scatter')
    db.close()
  })

  it('marks 0001 pre-applied when users already exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zv-mig-'))
    const path = join(dir, 'legacy.sqlite')
    const raw = new Database(path)
    raw.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)`)
    raw.close()
    const db = openDb(path)
    const applied = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    expect(applied.map((row) => row.id)).toEqual(['0001_init'])
    expect(tables(db)).not.toContain('zines')
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('is idempotent', () => {
    const db = openDb(':memory:')
    migrate(db)
    migrate(db)
    const applied = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    expect(applied.map((row) => row.id).sort()).toEqual(['0001_init', '0002_scatter'])
    db.close()
  })
})
