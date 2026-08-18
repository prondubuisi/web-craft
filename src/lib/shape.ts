import type { Block, BlockType, VibeId, Visibility, Zine } from './types'
import { VIBES } from './vibes'
import { FINISH_IDS } from './zineFields'
import { BLOCK_RECIPES, BLOCK_TYPES } from './blockRecipes'
import { assertStringList, bool, fail, isRecord, nonempty, num, oneOf, optional, str } from './check'

const VIBE_IDS = new Set<string>(VIBES.map((v) => v.id))
const BLOCK_TYPE_SET = new Set<string>(BLOCK_TYPES)

function assertVibe(value: unknown, path = 'vibe'): VibeId {
  if (typeof value !== 'string' || !VIBE_IDS.has(value)) {
    fail(path, 'miles, gwen, peni, ham, or noir')
  }
  return value as VibeId
}

function assertBlock(value: unknown, path: string): Block {
  if (!isRecord(value)) fail(path, 'an object')
  const id = nonempty(value.id, `${path}.id`)
  const type = str(value.type, `${path}.type`)
  if (!BLOCK_TYPE_SET.has(type)) fail(`${path}.type`, 'a known widget')
  return BLOCK_RECIPES[type as BlockType].validate(value, id, path)
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
    next.finish = oneOf(raw.finish, FINISH_IDS, 'finish')
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
