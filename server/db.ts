import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import type { Block, Comment, FinishId, Listing, ListingKind, Notice, NoticeKind, VibeId, Zine } from '../src/lib/types.ts'
import { migrate } from './migrate.ts'

export type Db = Database.Database

export type UserRow = {
  id: string
  name: string
  password_hash: string | null
  password_salt: string | null
  remix_points: number
  kind: 'human' | 'system'
  created_at: number
  bio: string
  scene: string
}

export type CommentRow = {
  id: string
  zine_id: string
  user_id: string
  body: string
  created_at: number
  author_name: string
}

export type ZineRow = {
  id: string
  owner_id: string
  owner_name: string
  title: string
  vibe: string
  blocks_json: string
  published: number
  drops_at: number | null
  views: number
  likes: number
  remixes: number
  remixed_from: string | null
  created_at: number
  updated_at: number
  visibility: string
  share_key: string | null
  pass_hash: string | null
  pass_salt: string | null
  tags_json: string
  finish: string
  chain_key: string | null
  chain_open: number
  series: string
  issue_no: number | null
  pen_name: string
  jam_id: string | null
  b_side: string
  edition_size: number
  errata: string
  includes_json: string
  dedication: string
}

export function openDb(path = process.env.DATABASE_PATH ?? 'server/data/zineverse.sqlite'): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    zineId: row.zine_id,
    author: row.author_name.startsWith('@') ? row.author_name : `@${row.author_name}`,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function rowToZine(row: ZineRow, opts?: { hideBlocks?: boolean; includeSecret?: boolean }): Zine {
  return {
    id: row.id,
    title: row.title,
    vibe: row.vibe as VibeId,
    blocks: opts?.hideBlocks ? [] : (JSON.parse(row.blocks_json) as Block[]),
    owner: row.owner_name.startsWith('@') ? row.owner_name : `@${row.owner_name}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: row.views,
    likes: row.likes,
    remixes: row.remixes,
    published: Boolean(row.published),
    dropsAt: row.drops_at,
    remixedFrom: row.remixed_from ?? undefined,
    visibility: row.visibility === 'unlisted' ? 'unlisted' : 'public',
    hasPass: Boolean(row.pass_hash),
    shareKey: opts?.includeSecret ? (row.share_key ?? undefined) : undefined,
    tags: (() => {
      try {
        return JSON.parse(row.tags_json || '[]') as string[]
      } catch {
        return []
      }
    })(),
    finish: (['clean', 'riso', 'grain'].includes(row.finish) ? row.finish : 'clean') as FinishId,
    chainOpen: Boolean(row.chain_open),
    chainKey: opts?.includeSecret ? (row.chain_key ?? undefined) : undefined,
    series: row.series || undefined,
    issueNo: row.issue_no ?? undefined,
    penName: row.pen_name || undefined,
    jamId: row.jam_id ?? undefined,
    bSide: row.b_side || undefined,
    editionSize: row.edition_size || undefined,
    errata: row.errata || undefined,
    dedication: row.dedication || undefined,
    includes: (() => {
      try {
        return JSON.parse(row.includes_json || '[]') as { zineId: string; title: string; owner: string }[]
      } catch {
        return []
      }
    })(),
  }
}

export function getZineRow(db: Db, id: string): ZineRow | undefined {
  return db
    .prepare(
      `SELECT z.*, u.name AS owner_name
       FROM zines z JOIN users u ON u.id = z.owner_id
       WHERE z.id = ?`,
    )
    .get(id) as ZineRow | undefined
}

export function rowToListing(row: {
  id: string
  kind: string
  body: string
  created_at: number
  author_name: string
  zine_id: string | null
  zine_title: string | null
  swapped?: number
}): Listing {
  return {
    id: row.id,
    kind: row.kind as ListingKind,
    body: row.body,
    author: row.author_name.startsWith('@') ? row.author_name : `@${row.author_name}`,
    zineId: row.zine_id ?? undefined,
    zineTitle: row.zine_title ?? undefined,
    createdAt: row.created_at,
    swapped: Boolean(row.swapped),
  }
}

export function dropIsLive(row: Pick<ZineRow, 'published' | 'drops_at'>, now = Date.now()): boolean {
  if (!row.published) return false
  return row.drops_at == null || row.drops_at <= now
}

export function listFollowing(db: Db, userId: string): string[] {
  return (
    db
      .prepare(
        `SELECT u.name FROM follows f JOIN users u ON u.id = f.followee_id
         WHERE f.follower_id = ? ORDER BY u.name`,
      )
      .all(userId) as { name: string }[]
  ).map((row) => row.name)
}

export function rowToNotice(row: {
  id: string
  kind: string
  actor_name: string
  zine_id: string | null
  zine_title: string | null
  body: string | null
  read: number
  created_at: number
}): Notice {
  return {
    id: row.id,
    kind: row.kind as NoticeKind,
    actor: row.actor_name.startsWith('@') ? row.actor_name : `@${row.actor_name}`,
    zineId: row.zine_id ?? undefined,
    zineTitle: row.zine_title ?? undefined,
    body: row.body ?? undefined,
    read: Boolean(row.read),
    createdAt: row.created_at,
  }
}
