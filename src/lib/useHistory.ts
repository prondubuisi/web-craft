import { useRef } from 'react'
import { useZines } from '../store/useZines'
import type { Block, VibeId, Zine } from './types'

export type EditorSnap = { title: string; vibe: VibeId; blocks: Block[] }

/** Undo/redo stack for the editor. Caps at 60 snaps; a new remember() drops redo. */
export function useHistory(zine: Zine) {
  const { patchZine, setBlocks } = useZines()
  const past = useRef<EditorSnap[]>([])
  const future = useRef<EditorSnap[]>([])

  function snapshot(): EditorSnap {
    return {
      title: zine.title,
      vibe: zine.vibe,
      blocks: structuredClone(zine.blocks),
    }
  }

  function remember() {
    past.current.push(snapshot())
    if (past.current.length > 60) past.current.shift()
    future.current = []
  }

  function applySnap(snap: EditorSnap) {
    patchZine(zine.id, { title: snap.title, vibe: snap.vibe })
    setBlocks(zine.id, snap.blocks)
  }

  function undo() {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(snapshot())
    applySnap(prev)
  }

  function redo() {
    const next = future.current.pop()
    if (!next) return
    past.current.push(snapshot())
    applySnap(next)
  }

  return { remember, undo, redo }
}
