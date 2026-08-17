import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { hashToken } from './auth.ts'
import { openDb } from './db.ts'
import { AUTH_MAX_ATTEMPTS, resetLimits } from './rateLimit.ts'

function app() {
  return createApp(openDb(':memory:'))
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>
}

async function register(client: ReturnType<typeof createApp>, name = 'rio', password = 'inkstain1') {
  const res = await client.request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })
  const body = await json(res)
  return { res, cookie: `Bearer ${String(body.token ?? '')}`, body }
}

const sample = {
  title: 'rooftop',
  vibe: 'miles',
  blocks: [{ id: '1', type: 'heading', text: 'rooftop', size: 'xl' }],
}

afterEach(() => {
  resetLimits()
})

describe('auth', () => {
  it('registers and returns a session', async () => {
    const { res, body } = await register(app())
    expect(res.status).toBe(200)
    expect(body.name).toBe('rio')
    expect(String(body.token).length).toBeGreaterThan(20)
  })

  it('rejects a short handle', async () => {
    const res = await app().request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', password: 'inkstain1' }),
    })
    expect(res.status).toBe(400)
  })

  it('rate-limits repeated failed logins', async () => {
    const client = app()
    await register(client, 'lockme', 'inkstain1')
    let last = 401
    for (let i = 0; i < AUTH_MAX_ATTEMPTS + 1; i += 1) {
      const res = await client.request('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'lockme', password: 'wrong-pass' }),
      })
      last = res.status
    }
    expect(last).toBe(429)
  })

  it('rotates the session token on a second login', async () => {
    const client = app()
    const first = await register(client, 'rotate1', 'inkstain1')
    const login = await client.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'rotate1', password: 'inkstain1' }),
    })
    const next = await json(login)
    expect(String(next.token)).not.toBe(String(first.body.token))
    const stale = await client.request('/api/auth/me', {
      headers: { authorization: first.cookie },
    })
    const staleBody = await json(stale)
    expect(staleBody.session).toBeNull()
    const fresh = await json(
      await client.request('/api/auth/me', {
        headers: { authorization: `Bearer ${String(next.token)}` },
      }),
    )
    expect((fresh.session as { name: string }).name).toBe('rotate1')
  })

  it('rotates a mid-life session on /me and retires the old token', async () => {
    const db = openDb(':memory:')
    const client = createApp(db)
    const { body, cookie } = await register(client, 'rotate2', 'inkstain1')
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(
      Date.now() + 60_000,
      hashToken(String(body.token)),
    )
    const me = await json(await client.request('/api/auth/me', { headers: { authorization: cookie } }))
    expect(me.token).toBeTruthy()
    expect(String(me.token)).not.toBe(String(body.token))
    const stale = await json(await client.request('/api/auth/me', { headers: { authorization: cookie } }))
    expect(stale.session).toBeNull()
  })
})

describe('zines', () => {
  it('hides scheduled pages from strangers', async () => {
    const client = app()
    const { cookie } = await register(client)
    await client.request('/api/zines/z1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/z1/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: cookie },
      body: JSON.stringify({ dropsAt: Date.now() + 60_000 }),
    })
    const peek = await json(await client.request('/api/zines/z1'))
    expect(peek.sealed).toBe(true)
    expect((peek.zine as { blocks: unknown[] }).blocks).toEqual([])

    const mine = await json(
      await client.request('/api/zines/z1', { headers: { authorization: cookie } }),
    )
    expect(mine.sealed).toBe(false)
    expect((mine.zine as { blocks: unknown[] }).blocks).toHaveLength(1)
  })

  it('likes and remixes on the server', async () => {
    const client = app()
    const author = await register(client, 'author1', 'strawberry1')
    expect(author.res.status).toBe(200)
    await client.request('/api/zines/live', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/live/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const reader = await register(client, 'reader1', 'cartoon99')
    const likeRes = await client.request('/api/zines/live/like', {
      method: 'POST',
      headers: { authorization: reader.cookie },
    })
    const liked = await json(likeRes)
    expect(likeRes.status, JSON.stringify(liked)).toBe(200)
    expect(liked.likes).toBe(1)
    const remix = await json(
      await client.request('/api/zines/live/remix', {
        method: 'POST',
        headers: { authorization: reader.cookie },
      }),
    )
    expect((remix.zine as { title: string }).title).toContain('remix')
    expect((remix.zine as { owner: string }).owner).toBe('@reader1')
  })
})

describe('demo drop', () => {
  it('reseals midnight run after the clock has passed', async () => {
    const db = openDb(':memory:')
    const client = createApp(db)
    db.prepare(`UPDATE zines SET drops_at = ? WHERE title = 'midnight run'`).run(Date.now() - 1000)
    await client.request('/api/health')
    const row = db.prepare(`SELECT drops_at FROM zines WHERE title = 'midnight run'`).get() as {
      drops_at: number
    }
    expect(row.drops_at).toBeGreaterThan(Date.now())
  })
})

describe('stream filters', () => {
  it('filters by vibe and query', async () => {
    const client = app()
    const author = await register(client, 'author2', 'strawberry1')
    await client.request('/api/zines/ham-one', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, title: 'LOUDER STREET', vibe: 'ham' }),
    })
    await client.request('/api/zines/ham-one/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const vibe = await json(await client.request('/api/stream?vibe=ham'))
    expect((vibe.zines as { vibe: string }[]).length).toBeGreaterThan(0)
    expect((vibe.zines as { vibe: string }[]).every((z) => z.vibe === 'ham')).toBe(true)
    const search = await json(await client.request('/api/stream?q=louder'))
    expect((search.zines as { title: string }[]).some((z) => z.title.toLowerCase().includes('louder'))).toBe(true)
  })
})

describe('social', () => {
  it('serves a public profile and accepts comments', async () => {
    const client = app()
    const author = await register(client, 'author3', 'strawberry1')
    await client.request('/api/zines/talk', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/talk/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    await client.request('/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ bio: 'rooftop hours only' }),
    })
    const profile = await json(await client.request('/api/users/author3'))
    expect(profile.bio).toBe('rooftop hours only')
    expect((profile.zines as unknown[]).length).toBe(1)

    const reader = await register(client, 'reader3', 'cartoon99')
    const posted = await client.request('/api/zines/talk/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ body: 'the gutter took notes.' }),
    })
    expect(posted.status).toBe(200)
    const wall = await json(await client.request('/api/zines/talk/comments'))
    expect((wall.comments as { body: string }[])[0]?.body).toBe('the gutter took notes.')
  })

  it('counts poll votes and lets a reader change theirs', async () => {
    const client = app()
    const author = await register(client, 'author4', 'strawberry1')
    const poll = {
      title: 'vote issue',
      vibe: 'peni',
      blocks: [
        {
          id: 'p1',
          type: 'poll',
          question: 'milk or toner?',
          options: ['milk', 'toner'],
        },
      ],
    }
    await client.request('/api/zines/vote-me', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(poll),
    })
    await client.request('/api/zines/vote-me/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const reader = await register(client, 'reader4', 'cartoon99')
    const first = await json(
      await client.request('/api/zines/vote-me/polls/p1', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: reader.cookie },
        body: JSON.stringify({ option: 0 }),
      }),
    )
    expect(first.counts).toEqual([1, 0])
    expect(first.mine).toBe(0)
    const second = await json(
      await client.request('/api/zines/vote-me/polls/p1', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: reader.cookie },
        body: JSON.stringify({ option: 1 }),
      }),
    )
    expect(second.counts).toEqual([0, 1])
    expect(second.mine).toBe(1)
  })

  it('follows a wall and notifies the author on like', async () => {
    const client = app()
    const author = await register(client, 'author5', 'strawberry1')
    await client.request('/api/zines/watched', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/watched/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const fan = await register(client, 'reader5', 'cartoon99')
    const follow = await json(
      await client.request('/api/users/author5/follow', {
        method: 'POST',
        headers: { authorization: fan.cookie },
      }),
    )
    expect(follow.following).toBe(true)
    const profile = await json(await client.request('/api/users/author5', { headers: { authorization: fan.cookie } }))
    expect(profile.followedByMe).toBe(true)
    expect(profile.followers).toBe(1)

    await client.request('/api/zines/watched/like', {
      method: 'POST',
      headers: { authorization: fan.cookie },
    })
    const mail = await json(await client.request('/api/notices', { headers: { authorization: author.cookie } }))
    expect((mail.notices as { kind: string }[]).some((n) => n.kind === 'like')).toBe(true)
    expect((mail.notices as { kind: string }[]).some((n) => n.kind === 'follow')).toBe(true)

    const watching = await json(
      await client.request('/api/stream?following=1', { headers: { authorization: fan.cookie } }),
    )
    expect((watching.zines as { title: string }[]).some((z) => z.title === 'rooftop')).toBe(true)
  })

  it('pins a trade to the board', async () => {
    const client = app()
    const author = await register(client, 'trader1', 'strawberry1')
    await client.request('/api/zines/swap', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/swap/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const posted = await client.request('/api/board', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ kind: 'trade', body: 'rooftop for rain pages', zineId: 'swap' }),
    })
    expect(posted.status).toBe(200)
    const board = await json(await client.request('/api/board?kind=trade'))
    expect((board.listings as { body: string }[]).some((row) => row.body.includes('rooftop'))).toBe(true)
  })

  it('hides unlisted issues without the secret key', async () => {
    const client = app()
    const author = await register(client, 'ghost1', 'strawberry1')
    await client.request('/api/zines/alley', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    const pub = await json(
      await client.request('/api/zines/alley/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: author.cookie },
        body: JSON.stringify({ dropsAt: Date.now() - 1, visibility: 'unlisted', password: 'rain4you' }),
      }),
    )
    const key = (pub.zine as { shareKey: string }).shareKey
    expect(key.length).toBeGreaterThan(4)
    const stream = await json(await client.request('/api/stream'))
    expect((stream.zines as { id: string }[]).some((z) => z.id === 'alley')).toBe(false)
    const denied = await client.request('/api/zines/alley')
    expect(denied.status).toBe(404)
    const peek = await json(await client.request(`/api/zines/alley?k=${key}`))
    expect(peek.locked).toBe(true)
    const open = await json(
      await client.request('/api/zines/alley/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'rain4you', k: key }),
      }),
    )
    expect((open.zine as { title: string }).title).toBe('rooftop')
    expect(((open.zine as { blocks: unknown[] }).blocks ?? []).length).toBeGreaterThan(0)
  })

  it('pulls from the pile and signs a guestbook', async () => {
    const client = app()
    const author = await register(client, 'piler1', 'strawberry1')
    await client.request('/api/zines/live-pile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, title: 'pile bait', tags: ['diary'] }),
    })
    await client.request('/api/zines/live-pile/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const pile = await json(await client.request('/api/pile'))
    expect((pile.zine as { title: string }).title).toBeTruthy()
    const tagged = await json(await client.request('/api/stream?tag=diary'))
    expect((tagged.zines as { title: string }[]).some((z) => z.title === 'pile bait')).toBe(true)
    const guest = await register(client, 'guest99', 'cartoon99')
    const signed = await client.request('/api/users/piler1/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: guest.cookie },
      body: JSON.stringify({ body: 'write me back' }),
    })
    expect(signed.status).toBe(200)
  })

  it('saves a series, tucks a bag, takes a blurb, and mails a letter', async () => {
    const client = app()
    const author = await register(client, 'author8', 'strawberry1')
    await client.request('/api/zines/run-one', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, title: 'run one', series: 'rooftop hours', issueNo: 1 }),
    })
    await client.request('/api/zines/run-one/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const saved = await json(await client.request('/api/zines/run-one', { headers: { authorization: author.cookie } }))
    expect((saved.zine as { series: string }).series).toBe('rooftop hours')
    expect((saved.zine as { issueNo: number }).issueNo).toBe(1)
    const found = await json(await client.request('/api/stream?q=rooftop'))
    expect((found.zines as { title: string }[]).some((z) => z.title === 'run one')).toBe(true)

    const reader = await register(client, 'reader8', 'cartoon99')
    const tucked = await client.request('/api/bag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ zineId: 'run-one' }),
    })
    expect(tucked.status).toBe(200)
    const bag = await json(await client.request('/api/bag', { headers: { authorization: reader.cookie } }))
    expect((bag.bag as { zineId: string }[]).some((row) => row.zineId === 'run-one')).toBe(true)

    const blurb = await client.request('/api/zines/run-one/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ body: 'too much rain. perfect.' }),
    })
    expect(blurb.status).toBe(200)
    const wall = await json(await client.request('/api/zines/run-one/reviews'))
    expect((wall.reviews as { body: string }[])[0]?.body).toContain('too much rain')

    const mailed = await client.request('/api/mail', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ to: 'author8', body: 'save me issue two' }),
    })
    expect(mailed.status).toBe(200)
    const inbox = await json(await client.request('/api/mail', { headers: { authorization: author.cookie } }))
    expect((inbox.threads as { handle: string }[]).some((row) => row.handle === 'reader8')).toBe(true)
    const thread = await json(
      await client.request('/api/mail/reader8', { headers: { authorization: author.cookie } }),
    )
    expect((thread.letters as { body: string }[]).some((row) => row.body.includes('issue two'))).toBe(true)
  })

  it('enters a live jam, takes a margin, and archives by nomination', async () => {
    const client = app()
    const author = await register(client, 'author9', 'strawberry1')
    await client.request('/api/zines/short-one', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({
        title: 'cheap copy',
        vibe: 'noir',
        penName: 'redacted',
        bSide: 'look under the staple',
        blocks: [
          { id: '1', type: 'heading', text: 'cheap copy', size: 'xl' },
          { id: '2', type: 'sticker', text: 'no bleed', rotation: 0 },
        ],
      }),
    })
    const pub = await json(
      await client.request('/api/zines/short-one/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: author.cookie },
        body: JSON.stringify({ dropsAt: Date.now() - 1 }),
      }),
    )
    expect((pub.zine as { jamId?: string }).jamId).toBe('toner-week')
    expect((pub.zine as { penName?: string }).penName).toBe('redacted')
    const jams = await json(await client.request('/api/jams'))
    expect((jams.live as { id: string }).id).toBe('toner-week')
    const jamLane = await json(await client.request('/api/stream?jam=1'))
    expect((jamLane.zines as { title: string }[]).some((z) => z.title === 'cheap copy')).toBe(true)

    const reader = await register(client, 'reader9', 'cartoon99')
    const margin = await client.request('/api/zines/short-one/margins', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ blockId: '2', body: 'this sticker peels' }),
    })
    expect(margin.status).toBe(200)
    const nom1 = await json(
      await client.request('/api/zines/short-one/nominate', {
        method: 'POST',
        headers: { authorization: reader.cookie },
      }),
    )
    expect(nom1.noms).toBe(1)
    const fan = await register(client, 'fan9xx', 'cartoon99')
    const nom2 = await json(
      await client.request('/api/zines/short-one/nominate', {
        method: 'POST',
        headers: { authorization: fan.cookie },
      }),
    )
    expect(nom2.archived).toBe(true)
    const archive = await json(await client.request('/api/archive'))
    expect((archive.zines as { title: string }[]).some((z) => z.title === 'cheap copy')).toBe(true)
  })

  it('sets a fest table and stamps an issue', async () => {
    const client = app()
    const author = await register(client, 'author0', 'strawberry1')
    await client.request('/api/zines/fest-one', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify(sample),
    })
    await client.request('/api/zines/fest-one/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const table = await client.request('/api/fest', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ name: 'booth zero', scene: 'bushwick', blurb: 'sit down', zineIds: ['fest-one'] }),
    })
    expect(table.status).toBe(200)
    const floor = await json(await client.request('/api/fest'))
    expect((floor.tables as { name: string }[]).some((row) => row.name === 'booth zero')).toBe(true)
    const reader = await register(client, 'reader0', 'cartoon99')
    const stamped = await json(
      await client.request('/api/stamps', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: reader.cookie },
        body: JSON.stringify({ zineId: 'fest-one' }),
      }),
    )
    expect((stamped.stamps as { zineId: string }[]).some((row) => row.zineId === 'fest-one')).toBe(true)
    await client.request('/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: reader.cookie },
      body: JSON.stringify({ bio: 'walking the floor', scene: 'bushwick' }),
    })
    const wall = await json(await client.request('/api/users/reader0'))
    expect(wall.scene).toBe('bushwick')
  })

  it('numbers a run, mails a postcard, and pins the corkboard', async () => {
    const client = app()
    const author = await register(client, 'printer1', 'strawberry1')
    await client.request('/api/zines/ltd', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, editionSize: 2 }),
    })
    await client.request('/api/zines/ltd/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const a = await register(client, 'claimera', 'cartoon99')
    const first = await json(
      await client.request('/api/zines/ltd/claim', { method: 'POST', headers: { authorization: a.cookie } }),
    )
    expect(first.claimed).toBe(1)
    const b = await register(client, 'claimerb', 'cartoon99')
    const second = await json(
      await client.request('/api/zines/ltd/claim', { method: 'POST', headers: { authorization: b.cookie } }),
    )
    expect(second.out).toBe(true)
    const card = await client.request('/api/mail', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: a.cookie },
      body: JSON.stringify({ to: 'printer1', body: 'wish you were here', postcard: true, vibe: 'noir' }),
    })
    expect(card.status).toBe(200)
    const cork = await client.request('/api/cork', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: a.cookie },
      body: JSON.stringify({ pins: [{ id: 'p1', text: 'clip this', x: 20, y: 30, rotation: -3 }] }),
    })
    expect(cork.status).toBe(200)
    const desk = await json(await client.request('/api/cork', { headers: { authorization: a.cookie } }))
    expect((desk.pins as { text: string }[])[0]?.text).toBe('clip this')
  })

  it('saves errata, stocks a compilation, and checks out an archived issue', async () => {
    const client = app()
    const author = await register(client, 'binder1', 'strawberry1')
    await client.request('/api/zines/inner', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, title: 'inner pages' }),
    })
    await client.request('/api/zines/inner/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    await client.request('/api/zines/comp', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({
        ...sample,
        title: 'the binder',
        errata: 'page 1 was wet',
        includes: [{ zineId: 'inner', title: 'inner pages', owner: '@binder1' }],
      }),
    })
    await client.request('/api/zines/comp/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const saved = await json(await client.request('/api/zines/comp', { headers: { authorization: author.cookie } }))
    expect((saved.zine as { errata: string }).errata).toBe('page 1 was wet')
    expect((saved.zine as { includes: { title: string }[] }).includes[0]?.title).toBe('inner pages')
    const fan = await register(client, 'loaner1', 'cartoon99')
    await client.request('/api/zines/comp/nominate', { method: 'POST', headers: { authorization: fan.cookie } })
    const other = await register(client, 'loaner2', 'cartoon99')
    await client.request('/api/zines/comp/nominate', { method: 'POST', headers: { authorization: other.cookie } })
    const loan = await client.request('/api/zines/comp/checkout', {
      method: 'POST',
      headers: { authorization: fan.cookie },
    })
    expect(loan.status).toBe(200)
  })

  it('watches a run, sits a table, and marks a trade swapped', async () => {
    const client = app()
    const author = await register(client, 'runner1', 'strawberry1')
    await client.request('/api/zines/run-a', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ ...sample, title: 'run a', series: 'night bus', dedication: 'for @fanrun1' }),
    })
    await client.request('/api/fest', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ name: 'night table', scene: 'platform', blurb: 'sit' }),
    })
    const fan = await register(client, 'fanrun1', 'cartoon99')
    const watch = await json(
      await client.request('/api/series/watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: fan.cookie },
        body: JSON.stringify({ series: 'night bus' }),
      }),
    )
    expect(watch.watching).toBe(true)
    const floor = await json(await client.request('/api/fest'))
    const tableId = (floor.tables as { id: string; owner: string }[]).find((row) => row.owner === '@runner1')?.id
    const sit = await json(
      await client.request(`/api/fest/${tableId}/sit`, {
        method: 'POST',
        headers: { authorization: fan.cookie },
      }),
    )
    expect((sit.sitters as string[]).some((name) => name.includes('fanrun1'))).toBe(true)
    await client.request('/api/zines/run-a/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: author.cookie },
      body: JSON.stringify({ dropsAt: Date.now() - 1 }),
    })
    const mail = await json(await client.request('/api/notices', { headers: { authorization: fan.cookie } }))
    expect((mail.notices as { kind: string }[]).some((n) => n.kind === 'series' || n.kind === 'dedicate')).toBe(
      true,
    )
    const pin = await json(
      await client.request('/api/board', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: author.cookie },
        body: JSON.stringify({ kind: 'trade', body: 'night bus for rain' }),
      }),
    )
    const swapped = await json(
      await client.request(`/api/board/${(pin.listing as { id: string }).id}/swap`, {
        method: 'POST',
        headers: { authorization: author.cookie },
      }),
    )
    expect(swapped.swapped).toBe(true)
  })
})
