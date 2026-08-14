import type { Block, VibeId, Zine } from './types'
import { artForVibe } from './vibes'
import { uid } from './id'

export type SharePayload = {
  v: 1
  title: string
  vibe: VibeId
  blocks: Block[]
  owner: string
  dropsAt: number | null
}

function portableBlock(block: Block, vibe: VibeId): Block {
  if (block.type === 'hero' && block.src.startsWith('data:')) {
    return { ...block, src: artForVibe(vibe) }
  }
  if (block.type === 'grid') {
    return {
      ...block,
      panels: block.panels.map((p) =>
        p.src?.startsWith('data:') ? { ...p, src: artForVibe(vibe) } : p,
      ),
    }
  }
  return block
}

export function toSharePayload(zine: Zine): SharePayload {
  return {
    v: 1,
    title: zine.title,
    vibe: zine.vibe,
    owner: zine.owner,
    dropsAt: zine.dropsAt ?? null,
    blocks: zine.blocks.map((b) => portableBlock(b, zine.vibe)),
  }
}

export function encodeShare(zine: Zine): string {
  const json = JSON.stringify(toSharePayload(zine))
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeShare(raw: string): SharePayload | null {
  try {
    const trimmed = raw.replace(/^#/, '').trim()
    if (!trimmed) return null
    const pad = trimmed.length % 4 === 0 ? '' : '='.repeat(4 - (trimmed.length % 4))
    const b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SharePayload
    if (parsed?.v !== 1 || !parsed.title || !parsed.blocks) return null
    return parsed
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
    if (file.size > 1_600_000) {
      reject(new Error('Keep uploads under 1.5MB so the page stays light.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}
