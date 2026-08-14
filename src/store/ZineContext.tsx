import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { api, apiHealth, type Session } from '../lib/api'
import { uid } from '../lib/id'
import { computeBadges } from '../lib/seed'
import { loadState, saveState } from '../lib/storage'
import type { AppState, Block, Profile, VibeId, Zine } from '../lib/types'
import { createBlock } from '../lib/widgets'
import { isMine } from '../lib/zine'
import { apply } from './reducer'

type Store = AppState & {
  online: boolean
  session: Session | null
  badges: ReturnType<typeof computeBadges>
  createZine: (title: string, vibe: VibeId) => string
  patchZine: (id: string, patch: Partial<Zine>) => void
  setBlocks: (id: string, blocks: Block[]) => void
  deleteZine: (id: string) => void
  likeZine: (id: string) => void
  remixZine: (id: string) => Promise<string | null>
  importZine: (source: Zine) => string
  publishZine: (id: string, dropsAt?: number) => void
  recordView: (id: string) => void
  renameProfile: (name: string) => void
  resetStudio: () => void
  zineById: (id: string) => Zine | undefined
  signIn: (name: string, password: string, mode: 'login' | 'register') => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function ZineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(apply, undefined, () => ({
    ...loadState(),
    online: false,
    session: null,
  }))
  const stateRef = useRef(state)
  stateRef.current = state
  const timers = useRef<Record<string, number>>({})

  useEffect(() => {
    saveState({ profile: state.profile, zines: state.zines })
  }, [state.profile, state.zines])

  const queueUpsert = useCallback((id: string) => {
    const { session } = stateRef.current
    if (!session) return
    window.clearTimeout(timers.current[id])
    timers.current[id] = window.setTimeout(() => {
      const zine = stateRef.current.zines.find((z) => z.id === id)
      if (zine) void api.upsert(zine).catch(() => undefined)
    }, 450)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const up = await apiHealth()
      if (cancelled) return
      dispatch({ type: 'setOnline', online: up })
      if (!up) return
      try {
        const me = await api.me()
        if (cancelled) return
        if (me.session) {
          dispatch({
            type: 'setSession',
            session: me.session,
            remixPoints: me.remixPoints,
            likedIds: me.likedIds,
          })
          const [mine, stream] = await Promise.all([api.mine(), api.stream()])
          if (!cancelled) dispatch({ type: 'replaceZines', zines: [...mine.zines, ...stream.zines] })
        } else {
          const stream = await api.stream()
          if (cancelled) return
          const localMine = stateRef.current.zines.filter((z) => isMine(z, null))
          dispatch({ type: 'replaceZines', zines: [...localMine, ...stream.zines] })
        }
      } catch {
        dispatch({ type: 'setOnline', online: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const createZine = useCallback(
    (title: string, vibe: VibeId) => {
      const handle = stateRef.current.session?.name
      const zine: Zine = {
        id: uid(),
        title,
        vibe,
        blocks: [
          { id: uid(), type: 'heading', text: title, size: 'xl' },
          createBlock('hero', vibe),
          createBlock('sticker', vibe),
        ],
        owner: handle ? `@${handle}` : 'you',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0,
        likes: 0,
        remixes: 0,
        published: false,
        dropsAt: null,
      }
      dispatch({ type: 'insert', zine })
      queueUpsert(zine.id)
      return zine.id
    },
    [queueUpsert],
  )

  const importZine = useCallback(
    (source: Zine) => {
      const handle = stateRef.current.session?.name
      const zine: Zine = {
        ...source,
        id: uid(),
        title: isMine(source, handle) ? source.title : `${source.title} (remix)`,
        owner: handle ? `@${handle}` : 'you',
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
      queueUpsert(zine.id)
      return zine.id
    },
    [queueUpsert],
  )

  const remixZine = useCallback(async (id: string) => {
    const source = stateRef.current.zines.find((z) => z.id === id)
    if (!source) return null
    if (stateRef.current.session) {
      try {
        const res = await api.remix(id)
        dispatch({ type: 'insert', zine: res.zine })
        dispatch({ type: 'bumpRemix', id })
        dispatch({ type: 'awardRemixPoint' })
        return res.zine.id
      } catch {
        return null
      }
    }
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
  }, [])

  const signIn = useCallback(
    async (name: string, password: string, mode: 'login' | 'register') => {
      if (mode === 'register') await api.register(name, password)
      else await api.login(name, password)
      const me = await api.me()
      if (!me.session) throw new Error('Session did not stick')
      const locals = stateRef.current.zines.filter((z) => isMine(z, null))
      for (const zine of locals) {
        await api.upsert({ ...zine, owner: `@${me.session.name}` })
      }
      const [mine, stream] = await Promise.all([api.mine(), api.stream()])
      dispatch({
        type: 'setSession',
        session: me.session,
        remixPoints: me.remixPoints,
        likedIds: me.likedIds,
      })
      dispatch({ type: 'replaceZines', zines: [...mine.zines, ...stream.zines] })
    },
    [],
  )

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined)
    dispatch({ type: 'setSession', session: null })
  }, [])

  const value = useMemo<Store>(() => {
    const badges = computeBadges(state.zines, state.profile.remixPoints, state.session?.name)
    return {
      ...state,
      badges,
      createZine,
      patchZine: (id, patch) => {
        dispatch({ type: 'patch', id, patch })
        queueUpsert(id)
      },
      setBlocks: (id, blocks) => {
        dispatch({ type: 'setBlocks', id, blocks })
        queueUpsert(id)
      },
      deleteZine: (id) => {
        dispatch({ type: 'delete', id })
        if (state.session) void api.remove(id).catch(() => undefined)
      },
      likeZine: (id) => {
        if (state.session) {
          void api
            .like(id)
            .then((res) => {
              const likedIds = res.liked
                ? [...new Set([...stateRef.current.profile.likedIds, id])]
                : stateRef.current.profile.likedIds.filter((x) => x !== id)
              dispatch({ type: 'patch', id, patch: { likes: res.likes } })
              dispatch({
                type: 'setSession',
                session: stateRef.current.session,
                likedIds,
              })
            })
            .catch(() => undefined)
          return
        }
        dispatch({ type: 'like', id })
      },
      remixZine,
      importZine,
      publishZine: (id, dropsAt) => {
        const when = dropsAt ?? Date.now()
        dispatch({ type: 'publish', id, dropsAt: when })
        if (state.session) void api.publish(id, when).catch(() => undefined)
      },
      recordView: (id) => {
        dispatch({ type: 'view', id })
        if (state.online) void api.view(id).catch(() => undefined)
      },
      renameProfile: (name) => dispatch({ type: 'renameProfile', name }),
      resetStudio: () => {
        if (state.session) return
        dispatch({ type: 'reset' })
      },
      zineById: (id) => state.zines.find((z) => z.id === id),
      signIn,
      signOut,
    }
  }, [state, createZine, remixZine, importZine, queueUpsert, signIn, signOut])

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
