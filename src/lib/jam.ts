import type { Jam, JamFormat, Zine } from './types'

export const ARCHIVE_THRESHOLD = 2

export function jamCap(format: JamFormat): number | null {
  if (format === 'card') return 2
  if (format === 'one') return 6
  return null
}

export function fitsJam(blockCount: number, format: JamFormat): boolean {
  const cap = jamCap(format)
  return cap == null || blockCount <= cap
}

export function isJamLive(jam: Pick<Jam, 'startsAt' | 'endsAt'>, now = Date.now()): boolean {
  return jam.startsAt <= now && now <= jam.endsAt
}

export function demoJams(now = Date.now()): Jam[] {
  return [
    {
      id: 'toner-week',
      title: 'toner week',
      prompt: 'one cheap copy. no bleed. what still prints?',
      format: 'one',
      startsAt: now - 2 * 86400_000,
      endsAt: now + 12 * 86400_000,
    },
  ]
}

export function liveJam(jams: Jam[], now = Date.now()): Jam | undefined {
  return jams.find((jam) => isJamLive(jam, now))
}

export function jamForPublish(
  zine: Pick<Zine, 'blocks' | 'visibility'>,
  jams: Jam[],
  now = Date.now(),
): Jam | undefined {
  if ((zine.visibility ?? 'public') === 'unlisted') return undefined
  const jam = liveJam(jams, now)
  if (!jam || !fitsJam(zine.blocks.length, jam.format)) return undefined
  return jam
}

export function formatHint(format: JamFormat): string {
  if (format === 'card') return 'business-card · 2 blocks max'
  if (format === 'one') return 'one-pager · 6 blocks max'
  return 'any length'
}
