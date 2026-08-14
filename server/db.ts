import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Block, Comment, Listing, ListingKind, Notice, NoticeKind, VibeId, Zine } from '../src/lib/types.ts'

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
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  remix_points INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'human',
  created_at INTEGER NOT NULL,
  bio TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS zines (
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
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zine_id) REFERENCES zines(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS poll_votes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  option_idx INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id, block_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followee_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  zine_id TEXT,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  zine_id TEXT,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`

export function openDb(path = process.env.DATABASE_PATH ?? 'server/data/zineverse.sqlite'): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]
  if (!userCols.some((col) => col.name === 'bio')) {
    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''`)
  }
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

export function rowToZine(row: ZineRow, opts?: { hideBlocks?: boolean }): Zine {
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
}): Listing {
  return {
    id: row.id,
    kind: row.kind as ListingKind,
    body: row.body,
    author: row.author_name.startsWith('@') ? row.author_name : `@${row.author_name}`,
    zineId: row.zine_id ?? undefined,
    zineTitle: row.zine_title ?? undefined,
    createdAt: row.created_at,
  }
}

export function dropIsLive(row: Pick<ZineRow, 'published' | 'drops_at'>, now = Date.now()): boolean {
  if (!row.published) return false
  return row.drops_at == null || row.drops_at <= now
}

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
