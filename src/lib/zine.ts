import type { HeroBlock, Zine } from './types'
import { artForVibe } from './vibes'

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
