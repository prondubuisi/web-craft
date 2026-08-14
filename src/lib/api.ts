import type { Comment, Notice, PollTally, StreamSort, VibeId, Zine } from './types'

export type Session = { name: string }

export type Me = {
  session: Session | null
  remixPoints?: number
  likedIds?: string[]
  following?: string[]
}

const TOKEN_KEY = 'zineverse.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode
  }
}

const prefix = () => (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${prefix()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; token?: string }
  if (data.token) setToken(data.token)
  if (!res.ok) throw new Error(data.error || `API ${res.status}`)
  return data
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${prefix()}/api/health`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export const api = {
  me: () => req<Me>('/api/auth/me'),
  register: (name: string, password: string) =>
    req<{ name: string; remixPoints: number; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  login: (name: string, password: string) =>
    req<{ name: string; remixPoints: number; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  logout: async () => {
    const result = await req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(
      () => ({ ok: true }),
    )
    setToken(null)
    return result
  },
  stream: (opts?: { q?: string; vibe?: VibeId; sort?: StreamSort; following?: boolean }) => {
    const params = new URLSearchParams()
    if (opts?.q) params.set('q', opts.q)
    if (opts?.vibe) params.set('vibe', opts.vibe)
    if (opts?.sort && opts.sort !== 'new') params.set('sort', opts.sort)
    if (opts?.following) params.set('following', '1')
    const qs = params.toString()
    return req<{ zines: Zine[] }>(`/api/stream${qs ? `?${qs}` : ''}`)
  },
  user: (name: string) =>
    req<{
      name: string
      bio: string
      remixPoints: number
      createdAt: number
      followers?: number
      following?: number
      followedByMe?: boolean
      zines: Zine[]
    }>(`/api/users/${encodeURIComponent(name)}`),
  follow: (name: string) =>
    req<{ following: boolean }>(`/api/users/${encodeURIComponent(name)}/follow`, { method: 'POST' }),
  notices: () => req<{ notices: Notice[] }>('/api/notices'),
  readNotices: () => req<{ ok: boolean }>('/api/notices/read', { method: 'POST' }),
  updateMe: (bio: string) =>
    req<{ name: string; bio: string }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio }),
    }),
  comments: (id: string) => req<{ comments: Comment[] }>(`/api/zines/${id}/comments`),
  comment: (id: string, body: string) =>
    req<{ comment: Comment }>(`/api/zines/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  polls: (id: string) => req<{ polls: Record<string, PollTally> }>(`/api/zines/${id}/polls`),
  votePoll: (id: string, blockId: string, option: number) =>
    req<PollTally>(`/api/zines/${id}/polls/${blockId}`, {
      method: 'POST',
      body: JSON.stringify({ option }),
    }),
  mine: () => req<{ zines: Zine[] }>('/api/zines'),
  get: (id: string) => req<{ zine: Zine; sealed: boolean }>(`/api/zines/${id}`),
  upsert: (zine: Zine) =>
    req<{ zine: Zine }>(`/api/zines/${zine.id}`, {
      method: 'PUT',
      body: JSON.stringify(zine),
    }),
  remove: (id: string) => req<{ ok: boolean }>(`/api/zines/${id}`, { method: 'DELETE' }),
  publish: (id: string, dropsAt: number) =>
    req<{ zine: Zine }>(`/api/zines/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ dropsAt }),
    }),
  like: (id: string) =>
    req<{ liked: boolean; likes: number }>(`/api/zines/${id}/like`, { method: 'POST' }),
  view: (id: string) => req<{ views: number }>(`/api/zines/${id}/view`, { method: 'POST' }),
  remix: (id: string) => req<{ zine: Zine }>(`/api/zines/${id}/remix`, { method: 'POST' }),
}
