import { randomUUID } from 'node:crypto'
import type { NoticeKind } from '../../src/lib/types.ts'
import type { Db } from '../db.ts'

export function notify(
  db: Db,
  opts: {
    recipientId: string
    actorId: string
    kind: NoticeKind
    zineId?: string | null
    body?: string | null
  },
): void {
  if (!opts.recipientId || opts.recipientId === opts.actorId) return
  db.prepare(
    `INSERT INTO notices (id, user_id, kind, actor_id, zine_id, body, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    randomUUID(),
    opts.recipientId,
    opts.kind,
    opts.actorId,
    opts.zineId ?? null,
    opts.body ?? null,
    Date.now(),
  )
}
