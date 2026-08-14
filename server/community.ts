import { randomUUID } from 'node:crypto'
import type { Block } from '../src/lib/types.ts'
import { demoTables } from '../src/lib/fest.ts'
import { demoJams } from '../src/lib/jam.ts'
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
    seedTags(db)
    seedSeries(db)
    seedJams(db)
    seedArchive(db)
    seedFest(db)
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
    seedTags(db)
    seedSeries(db)
    seedJams(db)
    seedArchive(db)
    seedFest(db)
  })
  tx()
}

function seedFest(db: Db): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM fest_tables').get() as { n: number }).n
  if (count > 0) return
  const insert = db.prepare(
    `INSERT OR IGNORE INTO fest_tables (user_id, name, scene, blurb, zine_ids_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  for (const table of demoTables()) {
    const handle = table.owner.replace(/^@/, '')
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(handle) as { id: string } | undefined
    if (!user) continue
    const issue = db.prepare('SELECT id FROM zines WHERE owner_id = ? ORDER BY created_at DESC').get(user.id) as
      | { id: string }
      | undefined
    insert.run(
      user.id,
      table.name,
      table.scene,
      table.blurb,
      JSON.stringify(issue ? [issue.id] : []),
      table.createdAt,
    )
    db.prepare(`UPDATE users SET scene = ? WHERE id = ? AND (scene IS NULL OR scene = '')`).run(table.scene, user.id)
  }
}

function seedJams(db: Db): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO jams (id, title, prompt, format, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  for (const jam of demoJams()) {
    insert.run(jam.id, jam.title, jam.prompt, jam.format, jam.startsAt, jam.endsAt)
    db.prepare('UPDATE jams SET title = ?, prompt = ?, format = ?, starts_at = ?, ends_at = ? WHERE id = ?').run(
      jam.title,
      jam.prompt,
      jam.format,
      jam.startsAt,
      jam.endsAt,
      jam.id,
    )
  }
  const live = demoJams()[0]
  if (!live) return
  db.prepare(
    `UPDATE zines SET jam_id = ? WHERE title = 'sunday market' AND (jam_id IS NULL OR jam_id = '')`,
  ).run(live.id)
  db.prepare(
    `UPDATE zines SET pen_name = 'the gutter' WHERE title = 'issue 13' AND (pen_name IS NULL OR pen_name = '')`,
  ).run()
  db.prepare(
    `UPDATE zines SET b_side = ? WHERE title = 'sunday market' AND (b_side IS NULL OR b_side = '')`,
  ).run('booth 12 keeps the extra bows under the table.')
  db.prepare(
    `UPDATE zines SET edition_size = 40 WHERE title = 'sunday market' AND (edition_size IS NULL OR edition_size = 0)`,
  ).run()
  db.prepare(
    `UPDATE zines SET edition_size = 13 WHERE title = 'issue 13' AND (edition_size IS NULL OR edition_size = 0)`,
  ).run()
}

function seedArchive(db: Db): void {
  const issue = db.prepare(`SELECT id FROM zines WHERE title = 'issue 13'`).get() as { id: string } | undefined
  if (!issue) return
  const count = (db.prepare('SELECT COUNT(*) AS n FROM nominations WHERE zine_id = ?').get(issue.id) as { n: number }).n
  if (count > 0) return
  const insert = db.prepare('INSERT OR IGNORE INTO nominations (user_id, zine_id, created_at) VALUES (?, ?, ?)')
  for (const name of ['yuzu', 'wobble', 'rio.bytes']) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(name) as { id: string } | undefined
    if (user) insert.run(user.id, issue.id, Date.now() - 3600_000)
  }
}

function seedSeries(db: Db): void {
  const map: Record<string, { series: string; issueNo: number }> = {
    'sunday market': { series: 'booth notes', issueNo: 1 },
    'issue 13': { series: 'confession', issueNo: 13 },
    'midnight run': { series: 'confession', issueNo: 14 },
    LOUDER: { series: 'volume', issueNo: 1 },
    'dimension hop': { series: 'offset', issueNo: 1 },
  }
  const update = db.prepare(
    `UPDATE zines SET series = ?, issue_no = ? WHERE title = ? AND (series IS NULL OR series = '')`,
  )
  for (const [title, row] of Object.entries(map)) {
    update.run(row.series, row.issueNo, title)
  }
}

function seedTags(db: Db): void {
  const map: Record<string, string[]> = {
    'sunday market': ['diary', 'market'],
    'issue 13': ['protest'],
    LOUDER: ['music'],
    'dimension hop': ['fan-art'],
  }
  const update = db.prepare(
    `UPDATE zines SET tags_json = ? WHERE title = ? AND (tags_json IS NULL OR tags_json = '[]')`,
  )
  for (const [title, tags] of Object.entries(map)) {
    update.run(JSON.stringify(tags), title)
  }
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
    'issue 13': [
      {
        id: 'seed-quote-13',
        type: 'quote',
        text: 'it rained like a confession and the gutter took notes.',
        cite: 'issue zero',
      },
      {
        id: 'seed-colo-13',
        type: 'colophon',
        edition: 'thirteenth printing · still wet',
        press: 'gutter press',
        place: 'under the tracks',
        thanks: 'to whoever left the umbrella',
      },
      {
        id: 'seed-blackout-13',
        type: 'blackout',
        text: 'it rained like a confession and the gutter took notes',
        hidden: [2, 5, 8],
      },
    ],
    'sunday market': [
      {
        id: 'seed-poll-sunday',
        type: 'poll',
        question: 'what are you buying first?',
        options: ['strawberry milk', 'apology robot', 'free bow', 'a sticker that beeps'],
      },
      {
        id: 'seed-strip-sunday',
        type: 'strip',
        panels: [
          { text: 'line forms' },
          { text: 'bow acquired' },
          { text: 'milk spilled' },
          { text: 'come back next week' },
        ],
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
