import type { AppState } from './types'
import { createSeed } from './seed'

export const STORAGE_KEY = 'zineverse.v1'

export function normalizeState(parsed: unknown): AppState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const state = parsed as Partial<AppState>
  if (!Array.isArray(state.zines) || !state.profile) return null
  return {
    profile: {
      ...state.profile,
      likedIds: state.profile.likedIds ?? [],
      following: state.profile.following ?? [],
    },
    zines: state.zines.map((z) => ({
      ...z,
      dropsAt: z.dropsAt ?? (z.published ? z.updatedAt : null),
    })),
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    return normalizeState(JSON.parse(raw)) ?? createSeed()
  } catch {
    return createSeed()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota or private mode — keep working in memory
  }
}

export function resetState(): AppState {
  localStorage.removeItem(STORAGE_KEY)
  return createSeed()
}
