import type { AppState } from './types'
import { createSeed, ensureToolkitSeeds } from './seed'

export const STORAGE_KEY = 'zineverse.v1'
export const TOOLKIT_OFFER_KEY = 'zineverse.toolkit.v1'

export function normalizeState(parsed: unknown): AppState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const state = parsed as Partial<AppState>
  if (!Array.isArray(state.zines) || !state.profile) return null
  return {
    profile: {
      ...state.profile,
      likedIds: state.profile.likedIds ?? [],
      following: state.profile.following ?? [],
      scene: state.profile.scene,
    },
    zines: state.zines.map((z) => ({
      ...z,
      dropsAt: z.dropsAt ?? (z.published ? z.updatedAt : null),
      visibility: z.visibility ?? 'public',
      tags: z.tags ?? [],
      finish: z.finish ?? 'clean',
    })),
  }
}

function offerToolkit(state: AppState): AppState {
  try {
    if (localStorage.getItem(TOOLKIT_OFFER_KEY)) return state
    localStorage.setItem(TOOLKIT_OFFER_KEY, '1')
  } catch {
    return state
  }
  return ensureToolkitSeeds(state)
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      try {
        localStorage.setItem(TOOLKIT_OFFER_KEY, '1')
      } catch {
        /* private mode */
      }
      return createSeed()
    }
    return offerToolkit(normalizeState(JSON.parse(raw)) ?? createSeed())
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
