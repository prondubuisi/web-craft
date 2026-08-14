import type { Zine } from './types'

export type Session = { name: string }

export type Me = {
  session: Session | null
  remixPoints?: number
  likedIds?: string[]
}

const prefix = () => (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${prefix()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `API ${res.status}`)
  return data
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${prefix()}/api/health`, {
      signal: AbortSignal.timeout(800),
    })
    return res.ok
  } catch {
    return false
  }
}

export const api = {
  me: () => req<Me>('/api/auth/me'),
  register: (name: string, password: string) =>
    req<{ name: string; remixPoints: number }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  login: (name: string, password: string) =>
    req<{ name: string; remixPoints: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  logout: () => req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
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
