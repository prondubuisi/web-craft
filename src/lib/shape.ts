import type {
  Block,
  BlockType,
  FinishId,
  VibeId,
  Visibility,
  Zine,
} from './types'
import { VIBES } from './vibes'

const VIBE_IDS = new Set<string>(VIBES.map((v) => v.id))
const BLOCK_TYPES = new Set<string>([
  'heading',
  'sticker',
  'hero',
  'grid',
  'divider',
  'sfx',
  'glitch',
  'stack',
  'quote',
  'poll',
  'audio',
  'strip',
  'colophon',
  'blackout',
  'contents',
  'insert',
  'reply',
])

function fail(path: string, expected: string): never {
  throw new Error(`${path} must be ${expected}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'a string')
  return value
}

function nonempty(value: unknown, path: string): string {
  const next = str(value, path)
  if (!next.trim()) fail(path, 'a non-empty string')
  return next
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'a finite number')
  return value
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'a boolean')
  return value
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(path, allowed.join(', '))
  }
  return value as T
}

function optional<T>(value: unknown, path: string, read: (next: unknown, path: string) => T): T | undefined {
  if (value === undefined) return undefined
  return read(value, path)
}

function assertVibe(value: unknown, path = 'vibe'): VibeId {
  if (typeof value !== 'string' || !VIBE_IDS.has(value)) {
    fail(path, 'miles, gwen, peni, ham, or noir')
  }
  return value as VibeId
}

function assertStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, 'an array of strings')
  return value.map((item, i) => str(item, `${path}[${i}]`))
}

function assertNumberList(value: unknown, path: string): number[] {
  if (!Array.isArray(value)) fail(path, 'an array of numbers')
  return value.map((item, i) => num(item, `${path}[${i}]`))
}

function assertBlock(value: unknown, path: string): Block {
  if (!isRecord(value)) fail(path, 'an object')
  const id = nonempty(value.id, `${path}.id`)
  const type = str(value.type, `${path}.type`)
  if (!BLOCK_TYPES.has(type)) fail(`${path}.type`, 'a known widget')
  const kind = type as BlockType
  switch (kind) {
    case 'heading':
      return {
        id,
        type: kind,
        text: str(value.text, `${path}.text`),
        size: oneOf(value.size, ['xl', 'lg', 'md'] as const, `${path}.size`),
      }
    case 'sticker':
      return {
        id,
        type: kind,
        text: str(value.text, `${path}.text`),
        rotation: num(value.rotation, `${path}.rotation`),
        src: optional(value.src, `${path}.src`, str),
        x: optional(value.x, `${path}.x`, num),
        y: optional(value.y, `${path}.y`, num),
      }
    case 'hero':
      return {
        id,
        type: kind,
        src: str(value.src, `${path}.src`),
        caption: str(value.caption, `${path}.caption`),
        density: num(value.density, `${path}.density`),
        split: num(value.split, `${path}.split`),
        x: optional(value.x, `${path}.x`, num),
        y: optional(value.y, `${path}.y`, num),
      }
    case 'grid':
      if (!Array.isArray(value.panels)) fail(`${path}.panels`, 'an array')
      return {
        id,
        type: kind,
        layout: oneOf(value.layout, ['two', 'three', 'asymmetric'] as const, `${path}.layout`),
        panels: value.panels.map((panel, i) => {
          const p = `${path}.panels[${i}]`
          if (!isRecord(panel)) fail(p, 'an object')
          return {
            text: str(panel.text, `${p}.text`),
            fill: str(panel.fill, `${p}.fill`),
            src: optional(panel.src, `${p}.src`, str),
          }
        }),
      }
    case 'divider':
      return {
        id,
        type: kind,
        style: oneOf(value.style, ['scribble', 'speed', 'zip'] as const, `${path}.style`),
      }
    case 'sfx':
      return { id, type: kind, word: str(value.word, `${path}.word`) }
    case 'glitch':
      return { id, type: kind, text: str(value.text, `${path}.text`) }
    case 'stack':
      if (!Array.isArray(value.cards)) fail(`${path}.cards`, 'an array')
      return {
        id,
        type: kind,
        cards: value.cards.map((card, i) => {
          const p = `${path}.cards[${i}]`
          if (!isRecord(card)) fail(p, 'an object')
          return { title: str(card.title, `${p}.title`), body: str(card.body, `${p}.body`) }
        }),
      }
    case 'quote':
      return {
        id,
        type: kind,
        text: str(value.text, `${path}.text`),
        cite: str(value.cite, `${path}.cite`),
      }
    case 'poll':
      return {
        id,
        type: kind,
        question: str(value.question, `${path}.question`),
        options: assertStringList(value.options, `${path}.options`),
      }
    case 'audio':
      return {
        id,
        type: kind,
        src: str(value.src, `${path}.src`),
        caption: str(value.caption, `${path}.caption`),
      }
    case 'strip':
      if (!Array.isArray(value.panels)) fail(`${path}.panels`, 'an array')
      return {
        id,
        type: kind,
        panels: value.panels.map((panel, i) => {
          const p = `${path}.panels[${i}]`
          if (!isRecord(panel)) fail(p, 'an object')
          return { text: str(panel.text, `${p}.text`), src: optional(panel.src, `${p}.src`, str) }
        }),
      }
    case 'colophon':
      return {
        id,
        type: kind,
        edition: str(value.edition, `${path}.edition`),
        press: str(value.press, `${path}.press`),
        place: str(value.place, `${path}.place`),
        thanks: str(value.thanks, `${path}.thanks`),
      }
    case 'blackout':
      return {
        id,
        type: kind,
        text: str(value.text, `${path}.text`),
        hidden: assertNumberList(value.hidden, `${path}.hidden`),
      }
    case 'contents':
      if (!Array.isArray(value.lines)) fail(`${path}.lines`, 'an array')
      return {
        id,
        type: kind,
        lines: value.lines.map((line, i) => {
          const p = `${path}.lines[${i}]`
          if (!isRecord(line)) fail(p, 'an object')
          return { label: str(line.label, `${p}.label`) }
        }),
      }
    case 'insert':
      return {
        id,
        type: kind,
        title: str(value.title, `${path}.title`),
        text: str(value.text, `${path}.text`),
      }
    case 'reply':
      return { id, type: kind, prompt: str(value.prompt, `${path}.prompt`) }
  }
}

export function assertBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) fail('blocks', 'an array')
  return value.map((block, i) => assertBlock(block, `blocks[${i}]`))
}

function extras(raw: Record<string, unknown>): Partial<Zine> {
  const next: Partial<Zine> = {}
  if ('remixedFrom' in raw) next.remixedFrom = str(raw.remixedFrom, 'remixedFrom')
  if ('visibility' in raw) {
    next.visibility = oneOf(raw.visibility, ['public', 'unlisted'] as const satisfies readonly Visibility[], 'visibility')
  }
  if ('shareKey' in raw) next.shareKey = str(raw.shareKey, 'shareKey')
  if ('hasPass' in raw) next.hasPass = bool(raw.hasPass, 'hasPass')
  if ('passHash' in raw) next.passHash = str(raw.passHash, 'passHash')
  if ('tags' in raw) next.tags = assertStringList(raw.tags, 'tags')
  if ('finish' in raw) {
    next.finish = oneOf(raw.finish, ['clean', 'riso', 'grain'] as const satisfies readonly FinishId[], 'finish')
  }
  if ('series' in raw) next.series = str(raw.series, 'series')
  if ('issueNo' in raw) next.issueNo = num(raw.issueNo, 'issueNo')
  if ('penName' in raw) next.penName = str(raw.penName, 'penName')
  if ('editionSize' in raw) next.editionSize = num(raw.editionSize, 'editionSize')
  if ('claimed' in raw) next.claimed = num(raw.claimed, 'claimed')
  if ('claimedByMe' in raw) next.claimedByMe = bool(raw.claimedByMe, 'claimedByMe')
  if ('chainKey' in raw) next.chainKey = str(raw.chainKey, 'chainKey')
  if ('chainOpen' in raw) next.chainOpen = bool(raw.chainOpen, 'chainOpen')
  if ('jamId' in raw) next.jamId = str(raw.jamId, 'jamId')
  if ('bSide' in raw) next.bSide = str(raw.bSide, 'bSide')
  if ('noms' in raw) next.noms = num(raw.noms, 'noms')
  if ('archived' in raw) next.archived = bool(raw.archived, 'archived')
  if ('errata' in raw) next.errata = str(raw.errata, 'errata')
  if ('dedication' in raw) next.dedication = str(raw.dedication, 'dedication')
  if ('scatter' in raw) next.scatter = bool(raw.scatter, 'scatter')
  if ('includes' in raw) {
    if (!Array.isArray(raw.includes)) fail('includes', 'an array')
    next.includes = raw.includes.map((item, i) => {
      const p = `includes[${i}]`
      if (!isRecord(item)) fail(p, 'an object')
      return {
        zineId: nonempty(item.zineId, `${p}.zineId`),
        title: str(item.title, `${p}.title`),
        owner: str(item.owner, `${p}.owner`),
      }
    })
  }
  return next
}

/** Runtime check for untrusted JSON (studio import and snapshot hashes). */
export function assertZineShape(value: unknown): Zine {
  if (!isRecord(value)) fail('issue', 'an object')
  const dropsAt =
    value.dropsAt === undefined || value.dropsAt === null ? (value.dropsAt ?? null) : num(value.dropsAt, 'dropsAt')
  return {
    ...extras(value),
    id: optional(value.id, 'id', nonempty) ?? '',
    title: nonempty(value.title, 'title'),
    vibe: assertVibe(value.vibe),
    blocks: assertBlocks(value.blocks),
    owner: optional(value.owner, 'owner', nonempty) ?? 'you',
    createdAt: optional(value.createdAt, 'createdAt', num) ?? 0,
    updatedAt: optional(value.updatedAt, 'updatedAt', num) ?? 0,
    views: optional(value.views, 'views', num) ?? 0,
    likes: optional(value.likes, 'likes', num) ?? 0,
    remixes: optional(value.remixes, 'remixes', num) ?? 0,
    published: optional(value.published, 'published', bool) ?? false,
    dropsAt,
  }
}
