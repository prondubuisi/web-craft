import { describe, expect, it, vi } from 'vitest'

vi.mock('./db.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db.ts')>()
  return { ...actual, getZineRow: vi.fn(actual.getZineRow) }
})

import { createApp } from './app.ts'
import { getZineRow, openDb } from './db.ts'

const sample = {
  title: 'rooftop',
  vibe: 'miles',
  blocks: [{ id: '1', type: 'heading', text: 'rooftop', size: 'xl' }],
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>
}

/**
 * PUT /api/zines/:id writes the row synchronously (no `await` between the
 * write and the re-fetch), so this branch can't be reached through the real
 * HTTP layer — only by making the re-fetch itself report the row missing.
 */
describe('PUT /api/zines/:id — row missing after write', () => {
  it('returns 500 instead of a null zine', async () => {
    const client = createApp(openDb(':memory:'))
    const registerRes = await client.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'rio', password: 'inkstain1' }),
    })
    const { token } = await json(registerRes)
    const cookie = `Bearer ${String(token)}`

    const actual = await vi.importActual<typeof import('./db.ts')>('./db.ts')
    const spy = vi.mocked(getZineRow)
    spy.mockImplementationOnce(actual.getZineRow) // the "existing" lookup — real, row does not exist yet
    spy.mockImplementationOnce(() => undefined) // the post-write re-fetch — forced missing

    const res = await client.request('/api/zines/z1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: cookie },
      body: JSON.stringify(sample),
    })
    const body = await json(res)

    expect(res.status).toBe(500)
    expect(body.error).toBe('missing issue')
    expect(body.zine).toBeUndefined()
  })
})
