import { demoJams, fitsJam, liveJam } from '../../src/lib/jam.ts'
import type { Jam, JamFormat } from '../../src/lib/types.ts'
import type { Db } from '../db.ts'

export function listJams(db: Db): Jam[] {
  const rows = db
    .prepare('SELECT id, title, prompt, format, starts_at, ends_at FROM jams ORDER BY starts_at DESC')
    .all() as { id: string; title: string; prompt: string; format: string; starts_at: number; ends_at: number }[]
  if (!rows.length) return demoJams()
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    format: (['any', 'one', 'card'].includes(row.format) ? row.format : 'any') as JamFormat,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }))
}

export function jamForLive(db: Db, visibility: string, blockCount: number): Jam | undefined {
  if (visibility === 'unlisted') return undefined
  const jam = liveJam(listJams(db))
  if (!jam || !fitsJam(blockCount, jam.format)) return undefined
  return jam
}
