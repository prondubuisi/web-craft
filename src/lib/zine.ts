import type { HeroBlock, StreamSort, VibeId, Zine } from './types'
import { artForVibe, VIBES } from './vibes'

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

export function isPublicDrop(zine: Zine): boolean {
  return zine.published && (zine.visibility ?? 'public') === 'public'
}

export function issuePath(zine: Pick<Zine, 'id' | 'shareKey' | 'visibility'>): string {
  const key = zine.shareKey
  if ((zine.visibility === 'unlisted' || key) && key) return `/z/${zine.id}?k=${encodeURIComponent(key)}`
  return `/z/${zine.id}`
}

export function editPath(id: string): string {
  return `/edit/${encodeURIComponent(id)}`
}

export function studioPath(opts?: { new?: boolean; vibe?: VibeId }): string {
  const q = new URLSearchParams()
  if (opts?.new) q.set('new', '1')
  if (opts?.vibe) q.set('vibe', opts.vibe)
  const qs = q.toString()
  return qs ? `/studio?${qs}` : '/studio'
}

export function isVibeId(value: string | null | undefined): value is VibeId {
  return Boolean(value && VIBES.some((v) => v.id === value))
}

/** Cover "Make an issue" lands here: `?new=1` plus an optional vibe. */
export function readStudioCreate(search: string | URLSearchParams): { create: boolean; vibe?: VibeId } {
  const q = typeof search === 'string' ? new URLSearchParams(search.replace(/^\?/, '')) : search
  const vibeRaw = q.get('vibe')
  return {
    create: q.get('new') === '1',
    vibe: isVibeId(vibeRaw) ? vibeRaw : undefined,
  }
}

export function canOpenSecret(zine: Zine, key?: string | null): boolean {
  if (!zine.shareKey) return false
  return Boolean(key && key === zine.shareKey)
}

export async function fingerprint(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`zineverse:${value}`))
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d >= 365) {
    const y = Math.floor(d / 365)
    return `${y}y ${d % 365}d`
  }
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

export function normalizeSeries(value: string | undefined | null): string | undefined {
  const next = (value ?? '').trim().slice(0, 48)
  return next || undefined
}

export function normalizeIssueNo(value: number | string | undefined | null): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value
  if (n == null || !Number.isFinite(n)) return undefined
  const i = Math.round(n)
  if (i < 1 || i > 999) return undefined
  return i
}

export function seriesLabel(zine: Pick<Zine, 'series' | 'issueNo'>): string | null {
  const series = normalizeSeries(zine.series)
  if (!series) return null
  return zine.issueNo ? `${series} #${zine.issueNo}` : series
}

export function isCapsule(zine: Pick<Zine, 'dropsAt' | 'published'>, now = Date.now()): boolean {
  if (!zine.published || !zine.dropsAt) return false
  return zine.dropsAt - now > 30 * 86400_000
}

export function wearLevel(zine: Pick<Zine, 'remixes' | 'views' | 'claimed'>): 0 | 1 | 2 {
  const score = (zine.remixes ?? 0) * 8 + Math.floor((zine.views ?? 0) / 20) + (zine.claimed ?? 0)
  if (score >= 24) return 2
  if (score >= 8) return 1
  return 0
}

export function runLabel(zine: Pick<Zine, 'editionSize' | 'claimed'>): string | null {
  if (!zine.editionSize) return null
  const taken = zine.claimed ?? 0
  if (taken >= zine.editionSize) return `out of print · ${zine.editionSize}`
  return `${taken}/${zine.editionSize}`
}

export function byline(zine: Pick<Zine, 'owner' | 'penName'>): string {
  const pen = zine.penName?.trim()
  return pen || zine.owner
}

export function filterStream(
  zines: Zine[],
  opts: {
    q?: string
    vibe?: VibeId | 'all'
    sort?: StreamSort
    following?: string[] | null
    tag?: string
    jamId?: string
    archived?: boolean
  } = {},
): Zine[] {
  const q = (opts.q ?? '').trim().toLowerCase()
  const vibe = opts.vibe && opts.vibe !== 'all' ? opts.vibe : null
  const sort = opts.sort ?? 'new'
  const watching = opts.following?.map((name) => name.replace(/^@/, '').toLowerCase()) ?? null
  const tag = opts.tag?.replace(/^#/, '').toLowerCase()
  const next = zines.filter((z) => {
    if (!isPublicDrop(z)) return false
    if (vibe && z.vibe !== vibe) return false
    if (tag && !(z.tags ?? []).includes(tag)) return false
    if (opts.jamId && z.jamId !== opts.jamId) return false
    if (opts.archived && !z.archived) return false
    if (watching) {
      if (!watching.includes(ownerHandle(z.owner).toLowerCase())) return false
    }
    if (!q) return true
    const hay =
      `${z.title} ${z.owner} ${z.penName ?? ''} ${z.vibe} ${z.series ?? ''} ${(z.tags ?? []).join(' ')}`.toLowerCase()
    return hay.includes(q)
  })
  next.sort((a, b) => {
    if (sort === 'likes') return b.likes - a.likes
    if (sort === 'remixes') return b.remixes - a.remixes
    return (b.dropsAt ?? b.updatedAt) - (a.dropsAt ?? a.updatedAt)
  })
  return next
}
