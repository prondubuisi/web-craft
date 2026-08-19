import type { Block } from './types'

/** Page-relative pin bounds shared by scatter left/top and flow translate. */
export const PIN_X = { min: 2, max: 68 } as const
export const PIN_Y = { min: 2, max: 72 } as const

export const TILT_MIN = -8
export const TILT_MAX = 8

export type PinLive = {
  id: string
  x: number
  y: number
  rotation: number
}

export function clampPin(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(PIN_X.min, Math.min(PIN_X.max, x)),
    y: Math.max(PIN_Y.min, Math.min(PIN_Y.max, y)),
  }
}

export function clampTilt(deg: number): number {
  return Math.max(TILT_MIN, Math.min(TILT_MAX, deg))
}

/** Map a pointer delta to page-percent pin, then clamp. */
export function pinFromPointer(
  originX: number,
  originY: number,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  if (pageWidth <= 0 || pageHeight <= 0) return clampPin(originX, originY)
  return clampPin(
    originX + ((clientX - startX) / pageWidth) * 100,
    originY + ((clientY - startY) / pageHeight) * 100,
  )
}

export function tiltFromPointer(cx: number, cy: number, clientX: number, clientY: number): number {
  const angle = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90
  return clampTilt(Math.round(angle * 5) / 5)
}

/** Overlay an in-flight drag onto a block without writing the store. */
export function overlayPin(block: Block, live: PinLive | null): Block {
  if (!live || live.id !== block.id) return block
  if (block.type === 'sticker') return { ...block, x: live.x, y: live.y, rotation: live.rotation }
  if (block.type === 'hero') return { ...block, x: live.x, y: live.y }
  return block
}

/** Unset pin stays at 0,0 so a fresh sticker does not jump on first paint. */
export function pinOrigin(
  block: Block,
  index: number,
  scatter: boolean,
): { x: number; y: number } {
  const x = 'x' in block ? block.x : undefined
  const y = 'y' in block ? block.y : undefined
  if (scatter) {
    return {
      x: x ?? (index % 3) * 28 + 6,
      y: y ?? Math.floor(index / 3) * 26 + 8,
    }
  }
  return { x: x ?? 0, y: y ?? 0 }
}

export function canPin(type: string): boolean {
  return type === 'sticker' || type === 'hero'
}
