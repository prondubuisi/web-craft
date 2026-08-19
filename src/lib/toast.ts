import { useSyncExternalStore } from 'react'
import type { VibeId } from './types'

export type ToastAction = { label: string; href: string }

export type Toast = {
  id: string
  message: string
  detail?: string
  tone: 'success' | 'error' | 'milestone'
  vibe?: VibeId
  action?: ToastAction
}

let toasts: Toast[] = []
const listeners = new Set<() => void>()
const timers: Record<string, number> = {}

function emit() {
  for (const listener of listeners) listener()
}

export function pushToast(
  message: string,
  tone: Toast['tone'] = 'success',
  vibe?: VibeId,
  action?: ToastAction,
  detail?: string,
) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, message, detail, tone, vibe, action }]
  emit()
  timers[id] = window.setTimeout(() => dismissToast(id), tone === 'milestone' ? 5600 : 3600)
}

export function dismissToast(id: string) {
  window.clearTimeout(timers[id])
  delete timers[id]
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => toasts,
    () => toasts,
  )
}
