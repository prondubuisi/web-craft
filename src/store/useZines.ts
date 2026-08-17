import { useContext } from 'react'
import type { Profile } from '../lib/types'
import { Ctx, type Store } from './ctx'

export function useZines(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useZines must be used inside ZineProvider')
  return ctx
}

export function useProfile(): Profile {
  return useZines().profile
}
