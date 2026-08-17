import type { Session } from '../lib/api'
import { resetState } from '../lib/storage'
import type { AppState, Block, Visibility, Zine } from '../lib/types'

export type Action =
  | { type: 'insert'; zine: Zine }
  | { type: 'patch'; id: string; patch: Partial<Zine> }
  | { type: 'setBlocks'; id: string; blocks: Block[] }
  | { type: 'delete'; id: string }
  | { type: 'like'; id: string }
  | { type: 'bumpRemix'; id: string }
  | { type: 'awardRemixPoint' }
  | {
      type: 'publish'
      id: string
      dropsAt: number
      visibility?: Visibility
      shareKey?: string
      hasPass?: boolean
      passHash?: string
    }
  | { type: 'view'; id: string }
  | { type: 'renameProfile'; name: string }
  | { type: 'reset' }
  | { type: 'setOnline'; online: boolean }
  | { type: 'setSession'; session: Session | null; remixPoints?: number; likedIds?: string[]; following?: string[] }
  | { type: 'follow'; handle: string }
  | { type: 'unfollow'; handle: string }
  | { type: 'mergeZines'; zines: Zine[] }

export type FullState = AppState & { online: boolean; session: Session | null }

function assertDev(ok: boolean, message: string): void {
  if (import.meta.env.DEV && !ok) throw new Error(`reducer: ${message}`)
}

function checkAction(action: Action): void {
  if (action.type === 'insert') {
    assertDev(Boolean(action.zine.id.trim()), 'insert zine is missing an id')
    return
  }
  if (action.type === 'mergeZines') {
    const ids = action.zines.map((zine) => zine.id)
    assertDev(
      ids.every((id) => Boolean(id.trim())),
      'mergeZines zine is missing an id',
    )
    assertDev(new Set(ids).size === ids.length, 'mergeZines incoming list has a duplicate id')
    return
  }
  if ('id' in action) assertDev(Boolean(action.id.trim()), `${action.type} is missing an id`)
}

function checkState(next: FullState, action: Action): void {
  const ids = next.zines.map((zine) => zine.id)
  assertDev(
    ids.every((id) => Boolean(id.trim())),
    `${action.type} left a zine without an id`,
  )
  assertDev(new Set(ids).size === ids.length, `${action.type} left duplicate zine ids`)
}

export function apply(state: FullState, action: Action): FullState {
  checkAction(action)
  const next = reduce(state, action)
  checkState(next, action)
  return next
}

function reduce(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'insert':
      // Upsert: same id replaces, so a local fork cannot collide into two rows.
      return { ...state, zines: [action.zine, ...state.zines.filter((z) => z.id !== action.zine.id)] }
    case 'patch':
      return {
        ...state,
        zines: state.zines.map((z) =>
          z.id === action.id ? { ...z, ...action.patch, updatedAt: Date.now() } : z,
        ),
      }
    case 'setBlocks':
      return {
        ...state,
        zines: state.zines.map((z) =>
          z.id === action.id ? { ...z, blocks: action.blocks, updatedAt: Date.now() } : z,
        ),
      }
    case 'delete':
      return { ...state, zines: state.zines.filter((z) => z.id !== action.id) }
    case 'like': {
      const already = state.profile.likedIds.includes(action.id)
      const likedIds = already
        ? state.profile.likedIds.filter((id) => id !== action.id)
        : [...state.profile.likedIds, action.id]
      return {
        ...state,
        profile: { ...state.profile, likedIds },
        zines: state.zines.map((z) =>
          z.id === action.id ? { ...z, likes: Math.max(0, z.likes + (already ? -1 : 1)) } : z,
        ),
      }
    }
    case 'bumpRemix':
      return {
        ...state,
        zines: state.zines.map((z) =>
          z.id === action.id ? { ...z, remixes: z.remixes + 1 } : z,
        ),
      }
    case 'awardRemixPoint':
      return {
        ...state,
        profile: { ...state.profile, remixPoints: state.profile.remixPoints + 1 },
      }
    case 'publish':
      return {
        ...state,
        zines: state.zines.map((z) =>
          z.id === action.id
            ? {
                ...z,
                published: true,
                dropsAt: action.dropsAt,
                updatedAt: Date.now(),
                visibility: action.visibility ?? z.visibility ?? 'public',
                shareKey: action.shareKey ?? z.shareKey,
                hasPass: action.hasPass ?? z.hasPass,
                passHash: action.passHash ?? z.passHash,
              }
            : z,
        ),
      }
    case 'view':
      return {
        ...state,
        zines: state.zines.map((z) => (z.id === action.id ? { ...z, views: z.views + 1 } : z)),
      }
    case 'renameProfile':
      return { ...state, profile: { ...state.profile, name: action.name } }
    case 'reset':
      return { ...resetState(), online: state.online, session: state.session }
    case 'setOnline':
      return { ...state, online: action.online }
    case 'setSession':
      return {
        ...state,
        session: action.session,
        profile: {
          ...state.profile,
          name: action.session?.name ?? state.profile.name,
          remixPoints: action.remixPoints ?? state.profile.remixPoints,
          likedIds: action.likedIds ?? state.profile.likedIds,
          following: action.following ?? state.profile.following,
        },
      }
    case 'follow': {
      const handle = action.handle.replace(/^@/, '').toLowerCase()
      if (state.profile.following.includes(handle)) return state
      return {
        ...state,
        profile: { ...state.profile, following: [...state.profile.following, handle] },
      }
    }
    case 'unfollow': {
      const handle = action.handle.replace(/^@/, '').toLowerCase()
      return {
        ...state,
        profile: {
          ...state.profile,
          following: state.profile.following.filter((name) => name !== handle),
        },
      }
    }
    case 'mergeZines': {
      const map = new Map(state.zines.map((z) => [z.id, z]))
      for (const zine of action.zines) map.set(zine.id, zine)
      return { ...state, zines: [...map.values()] }
    }
  }
}
