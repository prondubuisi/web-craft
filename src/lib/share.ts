import { uid } from './id'
import { assertZineShape } from './shape'
import type { Block, VibeId, Zine } from './types'

export type SharePayload = {
  v: 1
  title: string
  vibe: VibeId
  blocks: Block[]
  owner: string
  dropsAt: number | null
}

export const SNAPSHOT_MAX_CHARS = 14_000

function encodePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function toSharePayload(zine: Zine): SharePayload {
  return {
    v: 1,
    title: zine.title,
    vibe: zine.vibe,
    owner: zine.owner,
    dropsAt: zine.dropsAt ?? null,
    blocks: zine.blocks,
  }
}

export function encodeShare(zine: Zine): string {
  return encodePayload(toSharePayload(zine))
}

export function tryEncodeShare(
  zine: Zine,
): { ok: true; token: string } | { ok: false; reason: string } {
  const token = encodeShare(zine)
  if (token.length > SNAPSHOT_MAX_CHARS) {
    return {
      ok: false,
      reason:
        'Photos are too heavy for a snapshot link. Export JSON to move them, or copy the studio link.',
    }
  }
  return { ok: true, token }
}

export function compressImage(src: string, maxEdge = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      const scale = Math.min(1, maxEdge / Math.max(w, h, 1))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not read that photo'))
    img.src = src
  })
}

export function decodeShare(raw: string): SharePayload | null {
  try {
    const trimmed = raw.replace(/^#/, '').trim()
    if (!trimmed) return null
    const pad = trimmed.length % 4 === 0 ? '' : '='.repeat(4 - (trimmed.length % 4))
    const b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const body = parsed as Record<string, unknown>
    if (body.v !== 1) return null
    const owner = typeof body.owner === 'string' && body.owner.trim() ? body.owner : 'shared'
    const zine = assertZineShape({ ...body, owner })
    return {
      v: 1,
      title: zine.title,
      vibe: zine.vibe,
      blocks: zine.blocks,
      owner: zine.owner,
      dropsAt: zine.dropsAt ?? null,
    }
  } catch {
    return null
  }
}

export function payloadToZine(payload: SharePayload): Zine {
  return {
    id: uid(),
    title: payload.title,
    vibe: payload.vibe,
    blocks: payload.blocks.map((b) => ({ ...b, id: uid() })),
    owner: payload.owner || 'shared',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    views: 0,
    likes: 0,
    remixes: 0,
    published: true,
    dropsAt: payload.dropsAt,
  }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      el.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4_000_000) {
      reject(new Error('Keep uploads under 4MB. We shrink photos before they hit the page.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export async function readImageAsDataUrl(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file)
  return compressImage(raw)
}
