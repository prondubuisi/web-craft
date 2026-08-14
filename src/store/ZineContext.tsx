import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, apiHealth, type Session } from '../lib/api'
import { uid } from '../lib/id'
import { computeBadges } from '../lib/seed'
import {
  loadLocalNotices,
  loadSeriesWatch,
  loadStamps,
  markLocalNoticesRead,
  saveLocalNotices,
} from '../lib/social'
import { loadState, saveState } from '../lib/storage'
import type { AppState, Block, Notice, Profile, VibeId, Zine } from '../lib/types'
import { createBlock } from '../lib/widgets'
import { demoJams, jamForPublish } from '../lib/jam'
import { fingerprint, isMine } from '../lib/zine'
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
  remixZine: (id: string, source?: Zine) => Promise<string | null>
  importZine: (source: Zine) => string
  publishZine: (
    id: string,
    dropsAt?: number,
    opts?: { visibility?: 'public' | 'unlisted'; password?: string; shareKey?: string; chain?: boolean },
  ) => void
  recordView: (id: string) => void
  renameProfile: (name: string) => void
  resetStudio: () => void
  zineById: (id: string) => Zine | undefined
  notices: Notice[]
  signIn: (name: string, password: string, mode: 'login' | 'register') => Promise<void>
  signOut: () => Promise<void>
  toggleFollow: (handle: string) => Promise<boolean>
  markNoticesRead: () => void
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
  const [notices, setNotices] = useState<Notice[]>(() => loadLocalNotices())

  useEffect(() => {
    saveLocalNotices(notices)
  }, [notices])

  useEffect(() => {
    saveState({ profile: state.profile, zines: state.zines })
  }, [state.profile, state.zines])

  const refreshNotices = useCallback(async () => {
    if (!stateRef.current.session || !stateRef.current.online) return
    try {
      const res = await api.notices()
      setNotices(res.notices)
    } catch {
      // keep local inbox
    }
  }, [])

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
            following: me.following,
          })
          const [mine, stream] = await Promise.all([api.mine(), api.stream()])
          if (!cancelled) dispatch({ type: 'replaceZines', zines: [...mine.zines, ...stream.zines] })
          if (!cancelled) void refreshNotices()
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
        tags: [],
        finish: 'clean',
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

  const remixZine = useCallback(async (id: string, fallback?: Zine) => {
    const source = stateRef.current.zines.find((z) => z.id === id) ?? fallback
    if (!source) return null
    if (stateRef.current.session) {
      try {
        const res = await api.remix(id)
        dispatch({ type: 'insert', zine: res.zine })
        dispatch({ type: 'bumpRemix', id })
        dispatch({ type: 'awardRemixPoint' })
        return res.zine.id
      } catch {
        /* fall through to a local fork so a stream card still remixed */
      }
    }
    const handle = stateRef.current.session?.name
    const copy: Zine = {
      ...source,
      id: uid(),
      title: `${source.title} (remix)`,
      owner: handle ? `@${handle}` : 'you',
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
    queueUpsert(copy.id)
    return copy.id
  }, [queueUpsert])

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
        following: me.following,
      })
      dispatch({ type: 'replaceZines', zines: [...mine.zines, ...stream.zines] })
      void refreshNotices()
    },
    [refreshNotices],
  )

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined)
    dispatch({ type: 'setSession', session: null })
  }, [])

  const value = useMemo<Store>(() => {
    const badges = computeBadges(
      state.zines,
      state.profile.remixPoints,
      state.session?.name,
      loadStamps(state.session?.name ?? state.profile.name).length,
      0,
      loadSeriesWatch(state.session?.name ?? state.profile.name).length,
    )
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
      publishZine: (id, dropsAt, opts) => {
        const when = dropsAt ?? Date.now()
        const current = stateRef.current.zines.find((z) => z.id === id)
        const visibility = opts?.visibility ?? current?.visibility ?? 'public'
        const shareKey =
          opts?.shareKey ??
          (visibility === 'unlisted' ? current?.shareKey || uid() : current?.shareKey)
        void (async () => {
          let passHash = current?.passHash
          let hasPass = current?.hasPass
          if (opts?.password && opts.password.length >= 4) {
            passHash = await fingerprint(opts.password)
            hasPass = true
          } else if (opts?.password === '') {
            passHash = undefined
            hasPass = false
          }
          dispatch({
            type: 'publish',
            id,
            dropsAt: when,
            visibility,
            shareKey,
            hasPass,
            passHash,
          })
          if (opts?.chain) {
            dispatch({
              type: 'patch',
              id,
              patch: { chainOpen: true, chainKey: shareKey, visibility: 'unlisted' },
            })
          }
          const entered = jamForPublish(
            { blocks: current?.blocks ?? [], visibility },
            demoJams(),
            when,
          )
          if (entered && !opts?.chain) {
            dispatch({ type: 'patch', id, patch: { jamId: entered.id } })
          }
          if (state.session) {
            void api
              .publish(id, when, { visibility, password: opts?.password, chain: opts?.chain })
              .then((res) => {
                dispatch({
                  type: 'patch',
                  id,
                  patch: {
                    shareKey: res.zine.shareKey ?? shareKey,
                    visibility: res.zine.visibility ?? visibility,
                    chainKey: res.zine.chainKey,
                    chainOpen: res.zine.chainOpen,
                    jamId: res.zine.jamId,
                  },
                })
              })
              .catch(() => undefined)
          }
        })()
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
      notices,
      signIn,
      signOut,
      toggleFollow: async (handle) => {
        const name = handle.replace(/^@/, '').toLowerCase()
        if (state.session) {
          try {
            const res = await api.follow(name)
            dispatch({ type: res.following ? 'follow' : 'unfollow', handle: name })
            void refreshNotices()
            return res.following
          } catch {
            return state.profile.following.includes(name)
          }
        }
        const on = state.profile.following.includes(name)
        dispatch({ type: on ? 'unfollow' : 'follow', handle: name })
        return !on
      },
      markNoticesRead: () => {
        setNotices((prev) => prev.map((item) => ({ ...item, read: true })))
        if (state.session && state.online) void api.readNotices().catch(() => undefined)
        else markLocalNoticesRead()
      },
    }
  }, [state, notices, createZine, remixZine, importZine, queueUpsert, signIn, signOut, refreshNotices])

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
