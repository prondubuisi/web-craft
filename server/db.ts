import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Block, Comment, FinishId, Listing, ListingKind, Notice, NoticeKind, VibeId, Zine } from '../src/lib/types.ts'

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
  bio TEXT NOT NULL DEFAULT '',
  scene TEXT NOT NULL DEFAULT ''
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
  visibility TEXT NOT NULL DEFAULT 'public',
  share_key TEXT,
  pass_hash TEXT,
  pass_salt TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  finish TEXT NOT NULL DEFAULT 'clean',
  chain_key TEXT,
  chain_open INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  issue_no INTEGER,
  pen_name TEXT NOT NULL DEFAULT '',
  jam_id TEXT,
  b_side TEXT NOT NULL DEFAULT '',
  edition_size INTEGER NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS guestbook (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES users(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS shelves (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS page_stats (
  zine_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  dwell_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (zine_id, page),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS bags (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (zine_id, user_id),
  FOREIGN KEY (zine_id) REFERENCES zines(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  postcard INTEGER NOT NULL DEFAULT 0,
  vibe TEXT,
  FOREIGN KEY (from_id) REFERENCES users(id),
  FOREIGN KEY (to_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS claims (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS cork_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  rotation REAL NOT NULL DEFAULT 0,
  src TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS jams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'any',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS nominations (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS fest_tables (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scene TEXT NOT NULL DEFAULT '',
  blurb TEXT NOT NULL DEFAULT '',
  zine_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS stamps (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS margins (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zine_id) REFERENCES zines(id),
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
  if (!userCols.some((col) => col.name === 'scene')) {
    db.exec(`ALTER TABLE users ADD COLUMN scene TEXT NOT NULL DEFAULT ''`)
  }
  const zineCols = db.prepare(`PRAGMA table_info(zines)`).all() as { name: string }[]
  const zineNames = new Set(zineCols.map((col) => col.name))
  if (!zineNames.has('visibility')) db.exec(`ALTER TABLE zines ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'`)
  if (!zineNames.has('share_key')) db.exec(`ALTER TABLE zines ADD COLUMN share_key TEXT`)
  if (!zineNames.has('pass_hash')) db.exec(`ALTER TABLE zines ADD COLUMN pass_hash TEXT`)
  if (!zineNames.has('pass_salt')) db.exec(`ALTER TABLE zines ADD COLUMN pass_salt TEXT`)
  if (!zineNames.has('tags_json')) db.exec(`ALTER TABLE zines ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'`)
  if (!zineNames.has('finish')) db.exec(`ALTER TABLE zines ADD COLUMN finish TEXT NOT NULL DEFAULT 'clean'`)
  if (!zineNames.has('chain_key')) db.exec(`ALTER TABLE zines ADD COLUMN chain_key TEXT`)
  if (!zineNames.has('chain_open')) db.exec(`ALTER TABLE zines ADD COLUMN chain_open INTEGER NOT NULL DEFAULT 0`)
  if (!zineNames.has('series')) db.exec(`ALTER TABLE zines ADD COLUMN series TEXT NOT NULL DEFAULT ''`)
  if (!zineNames.has('issue_no')) db.exec(`ALTER TABLE zines ADD COLUMN issue_no INTEGER`)
  if (!zineNames.has('pen_name')) db.exec(`ALTER TABLE zines ADD COLUMN pen_name TEXT NOT NULL DEFAULT ''`)
  if (!zineNames.has('jam_id')) db.exec(`ALTER TABLE zines ADD COLUMN jam_id TEXT`)
  if (!zineNames.has('b_side')) db.exec(`ALTER TABLE zines ADD COLUMN b_side TEXT NOT NULL DEFAULT ''`)
  if (!zineNames.has('edition_size')) db.exec(`ALTER TABLE zines ADD COLUMN edition_size INTEGER NOT NULL DEFAULT 0`)
  const letterCols = db.prepare(`PRAGMA table_info(letters)`).all() as { name: string }[]
  const letterNames = new Set(letterCols.map((col) => col.name))
  if (!letterNames.has('postcard')) db.exec(`ALTER TABLE letters ADD COLUMN postcard INTEGER NOT NULL DEFAULT 0`)
  if (!letterNames.has('vibe')) db.exec(`ALTER TABLE letters ADD COLUMN vibe TEXT`)
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
