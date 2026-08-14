import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './db.ts'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

function appliedIds(db: Db): Set<string> {
  return new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((row) => row.id),
  )
}

function markApplied(db: Db, id: string): void {
  db.prepare('INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(id, Date.now())
}

function hasTable(db: Db, name: string): boolean {
  const row = db.prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) as
    | { ok: number }
    | undefined
  return Boolean(row)
}

/** Apply numbered SQL files in `server/migrations/`. Existing DBs with a users table skip 0001. */
export function migrate(db: Db): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`)

  if (hasTable(db, 'users')) markApplied(db, '0001_init')

  const applied = appliedIds(db)
  const files = readdirSync(DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()

  const apply = db.transaction((id: string, sql: string) => {
    db.exec(sql)
    markApplied(db, id)
  })

  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    if (applied.has(id)) continue
    if (id !== '0001_init' && !hasTable(db, 'zines')) continue
    apply(id, readFileSync(join(DIR, file), 'utf8'))
  }
}
