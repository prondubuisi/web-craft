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
