import { createContext } from 'react'
import type { Session } from '../lib/api'
import type { AppState, Block, Notice, VibeId, Zine } from '../lib/types'
import type { computeBadges } from '../lib/seed'

export type Store = AppState & {
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

export const Ctx = createContext<Store | null>(null)
