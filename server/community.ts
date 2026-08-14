import { randomUUID } from 'node:crypto'
import { createSeed } from '../src/lib/seed.ts'
import type { Db } from './db.ts'

export function seedCommunity(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM zines').get() as { n: number }).n
  if (count > 0) return

  const state = createSeed()
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at)
     VALUES (@id, @name, NULL, NULL, 0, 'system', @created_at)`,
  )
  const insertZine = db.prepare(
    `INSERT INTO zines (id, owner_id, title, vibe, blocks_json, published, drops_at, views, likes, remixes, remixed_from, created_at, updated_at)
     VALUES (@id, @owner_id, @title, @vibe, @blocks_json, @published, @drops_at, @views, @likes, @remixes, @remixed_from, @created_at, @updated_at)`,
  )

  const tx = db.transaction(() => {
    for (const zine of state.zines.filter((z) => z.owner !== 'you')) {
      const handle = zine.owner.replace(/^@/, '')
      let user = db.prepare('SELECT id FROM users WHERE name = ?').get(handle) as
        | { id: string }
        | undefined
      if (!user) {
        const id = randomUUID()
        insertUser.run({ id, name: handle, created_at: zine.createdAt })
        user = { id }
      }
      insertZine.run({
        id: zine.id,
        owner_id: user.id,
        title: zine.title,
        vibe: zine.vibe,
        blocks_json: JSON.stringify(zine.blocks),
        published: zine.published ? 1 : 0,
        drops_at: zine.dropsAt ?? null,
        views: zine.views,
        likes: zine.likes,
        remixes: zine.remixes,
        remixed_from: zine.remixedFrom ?? null,
        created_at: zine.createdAt,
        updated_at: zine.updatedAt,
      })
    }
  })
  tx()
}
