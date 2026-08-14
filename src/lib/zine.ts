import type { HeroBlock, StreamSort, VibeId, Zine } from './types'
import { artForVibe } from './vibes'

export function isMine(zine: Zine, handle?: string | null): boolean {
  if (zine.owner === 'you') return true
  if (!handle) return false
  return zine.owner === handle || zine.owner === `@${handle}`
}

export function coverSrc(zine: Zine): string {
  const hero = zine.blocks.find((b): b is HeroBlock => b.type === 'hero')
  return hero?.src ?? artForVibe(zine.vibe)
}

export function isDropLive(zine: Zine, now = Date.now()): boolean {
  if (!zine.published) return false
  return !zine.dropsAt || zine.dropsAt <= now
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'issue'
}

export function ownerHandle(owner: string): string {
  return owner.replace(/^@/, '') || 'you'
}

export function profilePath(owner: string): string {
  return `/u/${encodeURIComponent(ownerHandle(owner))}`
}

export function filterStream(
  zines: Zine[],
  opts: { q?: string; vibe?: VibeId | 'all'; sort?: StreamSort } = {},
): Zine[] {
  const q = (opts.q ?? '').trim().toLowerCase()
  const vibe = opts.vibe && opts.vibe !== 'all' ? opts.vibe : null
  const sort = opts.sort ?? 'new'
  const next = zines.filter((z) => {
    if (!z.published) return false
    if (vibe && z.vibe !== vibe) return false
    if (!q) return true
    const hay = `${z.title} ${z.owner} ${z.vibe}`.toLowerCase()
    return hay.includes(q)
  })
  next.sort((a, b) => {
    if (sort === 'likes') return b.likes - a.likes
    if (sort === 'remixes') return b.remixes - a.remixes
    return (b.dropsAt ?? b.updatedAt) - (a.dropsAt ?? a.updatedAt)
  })
  return next
}
