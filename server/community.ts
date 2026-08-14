import { randomUUID } from 'node:crypto'
import type { Block } from '../src/lib/types.ts'
import { createSeed } from '../src/lib/seed.ts'
import type { Db } from './db.ts'

const BIOS: Record<string, string> = {
  yuzu: 'sunday markets, apology robots, strawberry milk.',
  inkstain: 'it rained like a confession.',
  wobble: 'if the building is not stretching, zoom in.',
  'rio.bytes': 'collage is a transportation device.',
}

export function seedCommunity(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM zines').get() as { n: number }).n
  if (count > 0) {
    seedLetters(db)
    seedBios(db)
    enrichWidgets(db)
    refreshDemoDrop(db)
    seedFollows(db)
    seedBoard(db)
    return
  }

  const state = createSeed()
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at, bio)
     VALUES (@id, @name, NULL, NULL, 0, 'system', @created_at, @bio)`,
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
        insertUser.run({
          id,
          name: handle,
          created_at: zine.createdAt,
          bio: BIOS[handle] ?? '',
        })
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

    seedLetters(db)
    seedBios(db)
    enrichWidgets(db)
    refreshDemoDrop(db)
    seedFollows(db)
    seedBoard(db)
  })
  tx()
}

function seedBoard(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM listings').get() as { n: number }).n
  if (count > 0) return
  const pins: { from: string; kind: string; title: string; body: string }[] = [
    {
      from: 'wobble',
      kind: 'trade',
      title: 'sunday market',
      body: 'sunday market stickers for your ham pages. i mail first.',
    },
    {
      from: 'yuzu',
      kind: 'collab',
      title: 'sunday market',
      body: 'need a guest panel for booth 12. robots that apologize preferred.',
    },
    {
      from: 'inkstain',
      kind: 'feedback',
      title: 'issue 13',
      body: 'issue 13 — too much rain or not enough?',
    },
    {
      from: 'rio.bytes',
      kind: 'trade',
      title: 'dimension hop',
      body: 'dimension hop for anything that glitches on purpose.',
    },
  ]
  const insert = db.prepare(
    `INSERT INTO listings (id, user_id, zine_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  pins.forEach((pin, i) => {
    const author = db.prepare('SELECT id FROM users WHERE name = ?').get(pin.from) as { id: string } | undefined
    const issue = db.prepare('SELECT id FROM zines WHERE title = ?').get(pin.title) as { id: string } | undefined
    if (!author) return
    insert.run(randomUUID(), author.id, issue?.id ?? null, pin.kind, pin.body, Date.now() - (i + 1) * 3600_000)
  })
}

function seedFollows(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM follows').get() as { n: number }).n
  if (count > 0) return
  const pairs = [
    ['rio.bytes', 'yuzu'],
    ['rio.bytes', 'inkstain'],
    ['wobble', 'yuzu'],
    ['yuzu', 'inkstain'],
    ['inkstain', 'rio.bytes'],
  ]
  const insert = db.prepare(
    `INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)`,
  )
  for (const [from, to] of pairs) {
    const a = db.prepare('SELECT id FROM users WHERE name = ?').get(from) as { id: string } | undefined
    const b = db.prepare('SELECT id FROM users WHERE name = ?').get(to) as { id: string } | undefined
    if (!a || !b) continue
    insert.run(a.id, b.id, Date.now() - 3600_000)
  }
}

function refreshDemoDrop(db: Db): void {
  const row = db.prepare(`SELECT id, drops_at FROM zines WHERE title = 'midnight run'`).get() as
    | { id: string; drops_at: number | null }
    | undefined
  if (!row?.drops_at || row.drops_at > Date.now()) return
  db.prepare('UPDATE zines SET drops_at = ? WHERE id = ?').run(Date.now() + 15 * 60 * 1000, row.id)
}

function seedBios(db: Db): void {
  const update = db.prepare(`UPDATE users SET bio = ? WHERE name = ? AND (bio IS NULL OR bio = '')`)
  for (const [name, bio] of Object.entries(BIOS)) {
    update.run(bio, name)
  }
}

function enrichWidgets(db: Db): void {
  const rows = db.prepare('SELECT id, title, blocks_json FROM zines').all() as {
    id: string
    title: string
    blocks_json: string
  }[]
  const extras: Record<string, Block[]> = {
    'sunday market': [
      {
        id: 'seed-poll-sunday',
        type: 'poll',
        question: 'what are you buying first?',
        options: ['strawberry milk', 'apology robot', 'free bow', 'a sticker that beeps'],
      },
    ],
    'issue 13': [
      {
        id: 'seed-quote-13',
        type: 'quote',
        text: 'it rained like a confession and the gutter took notes.',
        cite: 'issue zero',
      },
    ],
  }
  const save = db.prepare('UPDATE zines SET blocks_json = ? WHERE id = ?')
  for (const row of rows) {
    const extra = extras[row.title]
    if (!extra) continue
    const blocks = JSON.parse(row.blocks_json) as Block[]
    const types = new Set(blocks.map((block) => block.type))
    const next = [...blocks]
    for (const block of extra) {
      if (!types.has(block.type)) next.push(block)
    }
    if (next.length !== blocks.length) save.run(JSON.stringify(next), row.id)
  }
}

function seedLetters(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM comments').get() as { n: number }).n
  if (count > 0) return
  const letters: { from: string; title: string; body: string }[] = [
    { from: 'wobble', title: 'sunday market', body: 'booth 7 sold out of apologies. iconic.' },
    { from: 'rio.bytes', title: 'issue 13', body: 'the gutter took notes. i took the L home.' },
    { from: 'yuzu', title: 'LOUDER', body: 'primary colors only. agreed. louder.' },
    { from: 'inkstain', title: 'dimension hop', body: 'offset the world, then print it twice.' },
  ]
  const insert = db.prepare(
    `INSERT INTO comments (id, zine_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
  for (const letter of letters) {
    const author = db.prepare('SELECT id FROM users WHERE name = ?').get(letter.from) as
      | { id: string }
      | undefined
    const issue = db.prepare('SELECT id FROM zines WHERE title = ?').get(letter.title) as
      | { id: string }
      | undefined
    if (!author || !issue) continue
    insert.run(randomUUID(), issue.id, author.id, letter.body, Date.now() - 3600_000)
  }
}
