import { userFromToken } from './auth.ts'
import type { Db, UserRow } from './db.ts'

export const COOKIE = 'zv_session'
export const VIBES = new Set(['miles', 'gwen', 'peni', 'ham', 'noir'])

export type RequestLike = { req: { header: (name: string) => string | undefined } }

export function readToken(c: RequestLike): string | undefined {
  const auth = c.req.header('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const raw = c.req.header('cookie') ?? ''
  const match = raw.match(new RegExp(`${COOKIE}=([^;]+)`))
  return match?.[1]
}

export function currentUser(db: Db, c: RequestLike): UserRow | undefined {
  return userFromToken(db, readToken(c))
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure; SameSite=None' : '; SameSite=Lax'
  return `${COOKIE}=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}${secure}`
}

export function jsonAuth(body: unknown, token: string, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'set-cookie': sessionCookie(token),
    },
  })
}
