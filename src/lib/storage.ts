import type { AppState } from './types'
import { createSeed } from './seed'

export const STORAGE_KEY = 'zineverse.v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed?.zines || !parsed?.profile) return createSeed()
    return {
      profile: parsed.profile,
      zines: parsed.zines.map((z) => ({
        ...z,
        dropsAt: z.dropsAt ?? (z.published ? z.updatedAt : null),
      })),
    }
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
