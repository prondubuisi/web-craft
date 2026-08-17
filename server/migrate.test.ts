import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { openDb } from './db.ts'
import { execSql, migrate } from './migrate.ts'

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
    expect(applied.map((row) => row.id).sort()).toEqual([
      '0001_init',
      '0002_scatter',
      '0003_legacy_columns',
    ])
    expect(tables(db)).not.toContain('zines')
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('is idempotent', () => {
    const db = openDb(':memory:')
    migrate(db)
    migrate(db)
    const applied = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    expect(applied.map((row) => row.id).sort()).toEqual(['0001_init', '0002_scatter', '0003_legacy_columns'])
    db.close()
  })

  it('adds series on a leftover zines table that skipped 0001', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zv-legacy-'))
    const path = join(dir, 'prod.sqlite')
    const raw = new Database(path)
    raw.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
      CREATE TABLE zines (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        vibe TEXT NOT NULL,
        blocks_json TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 0,
        drops_at INTEGER,
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        remixes INTEGER NOT NULL DEFAULT 0,
        remixed_from TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
    raw.close()
    const db = openDb(path)
    const cols = (db.prepare('PRAGMA table_info(zines)').all() as { name: string }[]).map((row) => row.name)
    expect(cols).toContain('series')
    expect(cols).toContain('scatter')
    expect(cols).toContain('dedication')
    expect(tables(db)).toContain('nominations')
    db.prepare(`UPDATE zines SET series = ?, issue_no = ? WHERE title = ? AND (series IS NULL OR series = '')`).run(
      'confession',
      13,
      'issue 13',
    )
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('does not swallow a missing table on an unlisted migration', () => {
    const db = openDb(':memory:')
    expect(() => execSql(db, '0004_future', 'ALTER TABLE not_a_table ADD COLUMN x TEXT')).toThrow(
      /no such table/i,
    )
    db.close()
  })

  it('still ignores leftover duplicate columns on 0003 only', () => {
    const db = openDb(':memory:')
    execSql(db, '0003_legacy_columns', 'ALTER TABLE zines ADD COLUMN series TEXT NOT NULL DEFAULT ""')
    execSql(db, '0002_scatter', 'ALTER TABLE missing ADD COLUMN scatter INTEGER')
    db.close()
  })
})
