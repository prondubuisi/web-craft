import { ARCHIVE_THRESHOLD } from '../../src/lib/jam.ts'
import type { Zine } from '../../src/lib/types.ts'
import { dropIsLive, type Db } from '../db.ts'

export function nomCount(db: Db, zineId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM nominations WHERE zine_id = ?').get(zineId) as { n: number }).n
}

export function claimCount(db: Db, zineId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM claims WHERE zine_id = ?').get(zineId) as { n: number }).n
}

export function decorate(db: Db, zine: Zine, viewerId?: string): Zine {
  const noms = nomCount(db, zine.id)
  const claimed = claimCount(db, zine.id)
  const claimedByMe = Boolean(
    viewerId && db.prepare('SELECT 1 FROM claims WHERE user_id = ? AND zine_id = ?').get(viewerId, zine.id),
  )
  return { ...zine, noms, archived: noms >= ARCHIVE_THRESHOLD, claimed, claimedByMe }
}

export function decorateMany(db: Db, zines: Zine[], viewerId?: string): Zine[] {
  if (!zines.length) return []
  const ids = zines.map((z) => z.id)
  const placeholders = ids.map(() => '?').join(',')
  const noms = new Map<string, number>(
    (
      db
        .prepare(`SELECT zine_id, COUNT(*) AS n FROM nominations WHERE zine_id IN (${placeholders}) GROUP BY zine_id`)
        .all(...ids) as { zine_id: string; n: number }[]
    ).map((row) => [row.zine_id, row.n]),
  )
  const claims = new Map<string, number>(
    (
      db
        .prepare(`SELECT zine_id, COUNT(*) AS n FROM claims WHERE zine_id IN (${placeholders}) GROUP BY zine_id`)
        .all(...ids) as { zine_id: string; n: number }[]
    ).map((row) => [row.zine_id, row.n]),
  )
  const claimedByMe = new Set<string>(
    viewerId
      ? (
          db
            .prepare(`SELECT zine_id FROM claims WHERE user_id = ? AND zine_id IN (${placeholders})`)
            .all(viewerId, ...ids) as { zine_id: string }[]
        ).map((row) => row.zine_id)
      : [],
  )
  return zines.map((zine) => {
    const zineNoms = noms.get(zine.id) ?? 0
    return {
      ...zine,
      noms: zineNoms,
      archived: zineNoms >= ARCHIVE_THRESHOLD,
      claimed: claims.get(zine.id) ?? 0,
      claimedByMe: claimedByMe.has(zine.id),
    }
  })
}

export function accessZine(
  row: ZineRow,
  userId: string | undefined,
  key?: string | null,
  unlocked = false,
) {
  const mine = row.owner_id === userId
  if (mine) return { ok: true as const, sealed: false, locked: false }
  const keyOk = Boolean(row.share_key && key && key === row.share_key)
  const vis = row.visibility || 'public'
  const needsPass = Boolean(row.pass_hash)
  if (!row.published) {
    if (!keyOk) return { ok: false as const, reason: 'sealed draft' }
    if (needsPass && !unlocked) return { ok: true as const, sealed: false, locked: true }
    return { ok: true as const, sealed: false, locked: false }
  }
  if (vis === 'unlisted' && !keyOk) return { ok: false as const, reason: 'missing issue' }
  if (needsPass && !unlocked) return { ok: true as const, sealed: !dropIsLive(row), locked: true }
  if (!dropIsLive(row)) return { ok: true as const, sealed: true, locked: false }
  return { ok: true as const, sealed: false, locked: false }
}

export function listStamps(db: Db, userId: string) {
  return (
    db
      .prepare(
        `SELECT s.zine_id, s.created_at, z.title, z.vibe, u.name AS owner_name
         FROM stamps s JOIN zines z ON z.id = s.zine_id JOIN users u ON u.id = z.owner_id
         WHERE s.user_id = ? ORDER BY s.created_at DESC`,
      )
      .all(userId) as { zine_id: string; created_at: number; title: string; vibe: string; owner_name: string }[]
  ).map((row) => ({
    zineId: row.zine_id,
    title: row.title,
    owner: `@${row.owner_name}`,
    vibe: row.vibe,
    createdAt: row.created_at,
  }))
}

export function tableFor(db: Db, userId: string) {
  const row = db
    .prepare(
      `SELECT t.*, u.name AS owner_name FROM fest_tables t JOIN users u ON u.id = t.user_id WHERE t.user_id = ?`,
    )
    .get(userId) as
    | { name: string; scene: string; blurb: string; zine_ids_json: string; created_at: number; owner_name: string; user_id: string }
    | undefined
  if (!row) return null
  return {
    id: row.user_id,
    owner: `@${row.owner_name}`,
    name: row.name,
    scene: row.scene,
    blurb: row.blurb,
    zineIds: JSON.parse(row.zine_ids_json || '[]') as string[],
    createdAt: row.created_at,
  }
}


