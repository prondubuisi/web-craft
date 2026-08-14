import type { Zine } from './types'

export type Session = { name: string }

export type Me = {
  session: Session | null
  remixPoints?: number
  likedIds?: string[]
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
  stream: () => req<{ zines: Zine[] }>('/api/stream'),
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
