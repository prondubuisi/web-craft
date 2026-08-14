import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { openDb } from './db.ts'

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
})
