import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppState, Block, Profile, VibeId, Zine } from '../lib/types'
import { loadState, resetState, saveState } from '../lib/storage'
import { uid } from '../lib/id'
import { createBlock } from '../lib/widgets'
import { computeBadges } from '../lib/seed'

type Action =
  | { type: 'insert'; zine: Zine }
  | { type: 'patch'; id: string; patch: Partial<Zine> }
  | { type: 'setBlocks'; id: string; blocks: Block[] }
  | { type: 'delete'; id: string }
  | { type: 'like'; id: string }
  | { type: 'bumpRemix'; id: string }
  | { type: 'awardRemixPoint' }
  | { type: 'publish'; id: string; dropsAt: number }
  | { type: 'view'; id: string }
  | { type: 'renameProfile'; name: string }
  | { type: 'reset' }

type Store = AppState & {
  badges: ReturnType<typeof computeBadges>
  createZine: (title: string, vibe: VibeId) => string
  patchZine: (id: string, patch: Partial<Zine>) => void
  setBlocks: (id: string, blocks: Block[]) => void
  deleteZine: (id: string) => void
  likeZine: (id: string) => void
  remixZine: (id: string) => string | null
  importZine: (source: Zine) => string
  publishZine: (id: string, dropsAt?: number) => void
  recordView: (id: string) => void
  renameProfile: (name: string) => void
  resetStudio: () => void
  zineById: (id: string) => Zine | undefined
}

const Ctx = createContext<Store | null>(null)

function apply(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'insert':
      return { ...state, zines: [action.zine, ...state.zines] }
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
            ? { ...z, published: true, dropsAt: action.dropsAt, updatedAt: Date.now() }
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
      return resetState()
  }
}

export function ZineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(apply, undefined, loadState)

  useEffect(() => {
    saveState({ profile: state.profile, zines: state.zines })
  }, [state.profile, state.zines])

  const createZine = useCallback((title: string, vibe: VibeId) => {
    const zine: Zine = {
      id: uid(),
      title,
      vibe,
      blocks: [
        { id: uid(), type: 'heading', text: title, size: 'xl' },
        createBlock('hero', vibe),
        createBlock('sticker', vibe),
      ],
      owner: 'you',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      likes: 0,
      remixes: 0,
      published: false,
      dropsAt: null,
    }
    dispatch({ type: 'insert', zine })
    return zine.id
  }, [])

  const importZine = useCallback((source: Zine) => {
    const zine: Zine = {
      ...source,
      id: uid(),
      title: source.owner === 'you' ? source.title : `${source.title} (remix)`,
      owner: 'you',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      likes: 0,
      remixes: 0,
      published: false,
      dropsAt: null,
      remixedFrom: source.id,
      blocks: source.blocks.map((b) => ({ ...b, id: uid() })),
    }
    dispatch({ type: 'insert', zine })
    return zine.id
  }, [])

  const remixZine = useCallback(
    (id: string) => {
      const source = state.zines.find((z) => z.id === id)
      if (!source) return null
      const copy: Zine = {
        ...source,
        id: uid(),
        title: `${source.title} (remix)`,
        owner: 'you',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0,
        likes: 0,
        remixes: 0,
        published: false,
        remixedFrom: source.id,
        dropsAt: null,
        blocks: source.blocks.map((b) => ({ ...b, id: uid() })),
      }
      dispatch({ type: 'insert', zine: copy })
      dispatch({ type: 'bumpRemix', id: source.id })
      dispatch({ type: 'awardRemixPoint' })
      return copy.id
    },
    [state.zines],
  )

  const value = useMemo<Store>(() => {
    const badges = computeBadges(state.zines, state.profile.remixPoints)
    return {
      ...state,
      badges,
      createZine,
      patchZine: (id, patch) => dispatch({ type: 'patch', id, patch }),
      setBlocks: (id, blocks) => dispatch({ type: 'setBlocks', id, blocks }),
      deleteZine: (id) => dispatch({ type: 'delete', id }),
      likeZine: (id) => dispatch({ type: 'like', id }),
      remixZine,
      importZine,
      publishZine: (id, dropsAt) =>
        dispatch({ type: 'publish', id, dropsAt: dropsAt ?? Date.now() }),
      recordView: (id) => dispatch({ type: 'view', id }),
      renameProfile: (name) => dispatch({ type: 'renameProfile', name }),
      resetStudio: () => dispatch({ type: 'reset' }),
      zineById: (id) => state.zines.find((z) => z.id === id),
    }
  }, [state, createZine, remixZine, importZine])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useZines(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useZines must be used inside ZineProvider')
  return ctx
}

export function useProfile(): Profile {
  return useZines().profile
}
