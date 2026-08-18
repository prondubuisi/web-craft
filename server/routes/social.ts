import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type {
  CommentBody,
  CommentOneResponse,
  CommentsResponse,
  FollowResponse,
  NoticesResponse,
  OkBody,
  PollsResponse,
  PollVoteBody,
  PollVoteResponse,
  ProfilePatchBody,
  ProfilePatchResponse,
  ProfileResponse,
  StudioMeResponse,
  WatchSeriesBody,
  WatchSeriesResponse,
} from '../../src/lib/contract.ts'
import type { Block, PollBlock, VibeId } from '../../src/lib/types.ts'
import { normalizeScene } from '../../src/lib/fest.ts'
import { dropIsLive, getZineRow, rowToComment, rowToNotice, rowToZine, type CommentRow, type Db, type UserRow, type ZineRow } from '../db.ts'
import { currentUser } from '../http.ts'
import { notify } from '../services/notify.ts'
import { accessZine, listStamps, tableFor } from '../services/zines.ts'

export function registerSocial(app: Hono, db: Db) {
  app.get('/api/users/me', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const payload: StudioMeResponse = { name: user.name, bio: user.bio ?? '', remixPoints: user.remix_points }
    return c.json(payload)
  })

  app.patch('/api/users/me', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<ProfilePatchBody> | null
    const bio = String(body?.bio ?? '').slice(0, 200)
    const scene = normalizeScene(typeof body?.scene === 'string' ? body.scene : user.scene) ?? ''
    db.prepare('UPDATE users SET bio = ?, scene = ? WHERE id = ?').run(bio, scene, user.id)
    const payload: ProfilePatchResponse = { name: user.name, bio, scene }
    return c.json(payload)
  })

  app.get('/api/users/:name', (c) => {
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as UserRow | undefined
    if (!user) return c.json({ error: 'Nobody with that handle' }, 404)
    const viewer = currentUser(db, c)
    const rows = db
      .prepare(
        `SELECT z.*, u.name AS owner_name
         FROM zines z JOIN users u ON u.id = z.owner_id
         WHERE z.owner_id = ? AND z.published = 1 AND COALESCE(z.visibility, 'public') = 'public'
         ORDER BY COALESCE(z.drops_at, z.updated_at) DESC`,
      )
      .all(user.id) as ZineRow[]
    const followers = (db.prepare('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?').get(user.id) as { n: number }).n
    const following = (db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?').get(user.id) as { n: number }).n
    const followedByMe = Boolean(
      viewer && db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(viewer.id, user.id),
    )
    const payload: ProfileResponse = {
      name: user.name,
      bio: user.bio ?? '',
      scene: user.scene ?? '',
      remixPoints: user.remix_points,
      createdAt: user.created_at,
      followers,
      following,
      followedByMe,
      zines: rows.map((row) => rowToZine(row, { hideBlocks: !dropIsLive(row) && row.owner_id !== viewer?.id })),
      guestbook: (
        db
          .prepare(
            `SELECT g.*, a.name AS author_name FROM guestbook g JOIN users a ON a.id = g.author_id
             WHERE g.profile_id = ? ORDER BY g.created_at DESC LIMIT 40`,
          )
          .all(user.id) as { id: string; body: string; created_at: number; author_name: string }[]
      ).map((row) => ({
        id: row.id,
        author: `@${row.author_name}`,
        body: row.body,
        createdAt: row.created_at,
      })),
      shelf: (
        db
          .prepare(
            `SELECT s.zine_id, s.note, z.title, z.vibe, u.name AS owner_name
             FROM shelves s JOIN zines z ON z.id = s.zine_id JOIN users u ON u.id = z.owner_id
             WHERE s.user_id = ? ORDER BY s.created_at DESC`,
          )
          .all(user.id) as { zine_id: string; note: string; title: string; vibe: string; owner_name: string }[]
      ).map((row) => ({
        zineId: row.zine_id,
        title: row.title,
        owner: `@${row.owner_name}`,
        note: row.note,
        vibe: row.vibe as VibeId,
      })),
      stamps: listStamps(db, user.id),
      table: tableFor(db, user.id),
    }
    return c.json(payload)
  })

  app.post('/api/users/:name/follow', (c) => {
    const viewer = currentUser(db, c)
    if (!viewer) return c.json({ error: 'Sign in first' }, 401)
    const name = c.req.param('name').trim().toLowerCase().replace(/^@/, '')
    const target = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as UserRow | undefined
    if (!target) return c.json({ error: 'Nobody with that handle' }, 404)
    if (target.id === viewer.id) return c.json({ error: 'You already live here' }, 400)
    const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(viewer.id, target.id)
    if (existing) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(viewer.id, target.id)
      const payload: FollowResponse = { following: false }
      return c.json(payload)
    }
    db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').run(viewer.id, target.id, Date.now())
    notify(db, { recipientId: target.id, actorId: viewer.id, kind: 'follow' })
    const payload: FollowResponse = { following: true }
    return c.json(payload)
  })

  app.get('/api/notices', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const rows = db
      .prepare(
        `SELECT n.*, a.name AS actor_name, z.title AS zine_title
         FROM notices n
         JOIN users a ON a.id = n.actor_id
         LEFT JOIN zines z ON z.id = n.zine_id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 50`,
      )
      .all(user.id) as {
      id: string
      kind: string
      actor_name: string
      zine_id: string | null
      zine_title: string | null
      body: string | null
      read: number
      created_at: number
    }[]
    const payload: NoticesResponse = { notices: rows.map(rowToNotice) }
    return c.json(payload)
  })

  app.post('/api/notices/read', (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    db.prepare('UPDATE notices SET read = 1 WHERE user_id = ?').run(user.id)
    const payload: OkBody = { ok: true }
    return c.json(payload)
  })

  app.get('/api/zines/:id/comments', (c) => {
    const user = currentUser(db, c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row) return c.json({ error: 'missing issue' }, 404)
    const gate = accessZine(row, user?.id, c.req.query('k'))
    if (!gate.ok) return c.json({ error: gate.reason }, 404)
    if (gate.sealed || gate.locked) {
      const payload: CommentsResponse = { comments: [] }
      return c.json(payload)
    }
    const rows = db
      .prepare(
        `SELECT c.*, u.name AS author_name
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.zine_id = ?
         ORDER BY c.created_at ASC`,
      )
      .all(row.id) as CommentRow[]
    const payload: CommentsResponse = { comments: rows.map(rowToComment) }
    return c.json(payload)
  })

  app.post('/api/zines/:id/comments', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ error: 'Cannot write on that issue' }, 404)
    const body = (await c.req.json().catch(() => null)) as Partial<CommentBody> | null
    const text = String(body?.body ?? '').trim().slice(0, 280)
    if (text.length < 1) return c.json({ error: 'Write something first' }, 400)
    const id = randomUUID()
    const now = Date.now()
    db.prepare('INSERT INTO comments (id, zine_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      row.id,
      user.id,
      text,
      now,
    )
    notify(db, { recipientId: row.owner_id, actorId: user.id, kind: 'comment', zineId: row.id, body: row.title })
    const payload: CommentOneResponse = {
      comment: { id, zineId: row.id, author: `@${user.name}`, body: text, createdAt: now },
    }
    return c.json(payload)
  })

  app.get('/api/zines/:id/polls', (c) => {
    const user = currentUser(db, c)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || (!row.published && row.owner_id !== user?.id)) {
      return c.json({ error: 'missing issue' }, 404)
    }
    if (row.published && !dropIsLive(row) && row.owner_id !== user?.id) {
      const payload: PollsResponse = { polls: {} }
      return c.json(payload)
    }
    const payload: PollsResponse = { polls: pollTallies(db, row, user?.id) }
    return c.json(payload)
  })

  app.post('/api/zines/:id/polls/:blockId', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const row = getZineRow(db, c.req.param('id'))
    if (!row || !dropIsLive(row)) return c.json({ error: 'Cannot vote on that' }, 404)
    const block = pollBlock(row, c.req.param('blockId'))
    if (!block) return c.json({ error: 'No poll there' }, 404)
    const body = (await c.req.json().catch(() => null)) as Partial<PollVoteBody> | null
    const option = Number(body?.option)
    if (!Number.isInteger(option) || option < 0 || option >= block.options.length) {
      return c.json({ error: 'Pick a real option' }, 400)
    }
    db.prepare(
      `INSERT INTO poll_votes (user_id, zine_id, block_id, option_idx)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, zine_id, block_id) DO UPDATE SET option_idx = excluded.option_idx`,
    ).run(user.id, row.id, block.id, option)
    const tally = pollTallies(db, row, user.id)[block.id]
    if (!tally) return c.json({ error: 'No poll there' }, 404)
    const payload: PollVoteResponse = tally
    return c.json(payload)
  })

  app.post('/api/series/watch', async (c) => {
    const user = currentUser(db, c)
    if (!user) return c.json({ error: 'Sign in first' }, 401)
    const body = (await c.req.json().catch(() => null)) as Partial<WatchSeriesBody> | null
    const series = String(body?.series ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 48)
    if (!series) return c.json({ error: 'Need a run name' }, 400)
    const existing = db.prepare('SELECT 1 FROM series_watches WHERE user_id = ? AND series = ?').get(user.id, series)
    if (existing) {
      db.prepare('DELETE FROM series_watches WHERE user_id = ? AND series = ?').run(user.id, series)
      const payload: WatchSeriesResponse = { watching: false }
      return c.json(payload)
    }
    db.prepare('INSERT INTO series_watches (user_id, series, created_at) VALUES (?, ?, ?)').run(user.id, series, Date.now())
    const payload: WatchSeriesResponse = { watching: true }
    return c.json(payload)
  })
}

function pollBlock(row: ZineRow, blockId: string): PollBlock | undefined {
  const blocks = JSON.parse(row.blocks_json) as Block[]
  const block = blocks.find((item) => item.id === blockId)
  return block?.type === 'poll' ? block : undefined
}

function pollTallies(db: Db, row: ZineRow, userId?: string) {
  const blocks = JSON.parse(row.blocks_json) as Block[]
  const votes = db
    .prepare('SELECT user_id, block_id, option_idx FROM poll_votes WHERE zine_id = ?')
    .all(row.id) as { user_id: string; block_id: string; option_idx: number }[]
  const polls: Record<string, { counts: number[]; mine: number | null }> = {}
  for (const block of blocks) {
    if (block.type !== 'poll') continue
    const counts = block.options.map(() => 0)
    let mine: number | null = null
    for (const vote of votes) {
      if (vote.block_id !== block.id) continue
      if (vote.option_idx >= 0 && vote.option_idx < counts.length) counts[vote.option_idx] += 1
      if (userId && vote.user_id === userId) mine = vote.option_idx
    }
    polls[block.id] = { counts, mine }
  }
  return polls
}
