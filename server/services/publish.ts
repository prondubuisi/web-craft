import { randomUUID } from 'node:crypto'
import type { PublishBody } from '../../src/lib/contract.ts'
import type { Block, Zine } from '../../src/lib/types.ts'
import { hashPassword } from '../auth.ts'
import { getZineRow, rowToZine, type Db, type UserRow, type ZineRow } from '../db.ts'
import { jamForLive } from './jams.ts'
import { notify } from './notify.ts'

export type PublishInput = PublishBody

export function publishZine(db: Db, user: UserRow, row: ZineRow, input: PublishBody): Zine {
  const dropsAt = Number(input.dropsAt ?? Date.now())
  const visibility = input.visibility === 'unlisted' ? 'unlisted' : 'public'
  const shareKey =
    visibility === 'unlisted' ? (row.share_key || randomUUID().replace(/-/g, '').slice(0, 16)) : row.share_key
  let passHash = row.pass_hash
  let passSalt = row.pass_salt
  const password = typeof input.password === 'string' ? input.password : undefined
  if (password && password.length >= 4) {
    const hashed = hashPassword(password)
    passHash = hashed.hash
    passSalt = hashed.salt
  } else if (password === '') {
    passHash = null
    passSalt = null
  }
  const chain = Boolean(input.chain)
  const vis = chain ? 'unlisted' : visibility
  const blocks = JSON.parse(row.blocks_json) as Block[]
  const jam = jamForLive(db, vis, blocks.length)
  db.prepare(
    `UPDATE zines SET published = 1, drops_at = ?, visibility = ?, share_key = ?, pass_hash = ?, pass_salt = ?, chain_open = ?, chain_key = ?, jam_id = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    dropsAt,
    vis,
    shareKey,
    passHash,
    passSalt,
    chain ? 1 : row.chain_open,
    chain ? shareKey : row.chain_key,
    jam?.id ?? row.jam_id,
    Date.now(),
    row.id,
  )
  const followers =
    visibility === 'public'
      ? (db.prepare('SELECT follower_id FROM follows WHERE followee_id = ?').all(user.id) as {
          follower_id: string
        }[])
      : []
  for (const fan of followers) {
    notify(db, {
      recipientId: fan.follower_id,
      actorId: user.id,
      kind: 'drop',
      zineId: row.id,
      body: row.title,
    })
  }
  const fresh = getZineRow(db, row.id)!
  if (visibility === 'public' && fresh.series) {
    const series = fresh.series.trim().toLowerCase()
    const watchers = db
      .prepare('SELECT user_id FROM series_watches WHERE series = ? AND user_id != ?')
      .all(series, user.id) as { user_id: string }[]
    for (const watcher of watchers) {
      notify(db, {
        recipientId: watcher.user_id,
        actorId: user.id,
        kind: 'series',
        zineId: fresh.id,
        body: fresh.series,
      })
    }
  }
  const mention = (fresh.dedication || '').match(/@([a-z0-9._-]+)/i)
  if (mention) {
    const dest = db.prepare('SELECT id FROM users WHERE name = ?').get(mention[1]!.toLowerCase()) as
      | { id: string }
      | undefined
    if (dest) {
      notify(db, {
        recipientId: dest.id,
        actorId: user.id,
        kind: 'dedicate',
        zineId: fresh.id,
        body: fresh.title,
      })
    }
  }
  return rowToZine(fresh, { includeSecret: true })
}
