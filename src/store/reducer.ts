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
  | { type: 'replaceZines'; zines: Zine[] }
  | { type: 'mergeZines'; zines: Zine[] }

export type FullState = AppState & { online: boolean; session: Session | null }

export function apply(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'insert':
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
    case 'replaceZines':
      return { ...state, zines: action.zines }
    case 'mergeZines': {
      const map = new Map(state.zines.map((z) => [z.id, z]))
      for (const zine of action.zines) map.set(zine.id, zine)
      return { ...state, zines: [...map.values()] }
    }
  }
}
