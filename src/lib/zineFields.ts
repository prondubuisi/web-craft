import type { CompItem, FinishId, Zine } from './types'
import { normalizeTags } from './tags'
import { normalizeIssueNo, normalizeSeries } from './zine'

export const FINISH_IDS = ['clean', 'riso', 'grain'] as const satisfies readonly FinishId[]

/** JSON column parse. Corrupt or empty text returns the fallback. */
export function parseJsonColumn<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** SQLite edition/extras columns written by PUT /api/zines/:id. */
export type EditionRow = {
  tags_json: string
  finish: string
  series: string
  issue_no: number | null
  pen_name: string
  b_side: string
  edition_size: number
  errata: string
  includes_json: string
  dedication: string
  scatter: number
}

export type EditionWrite = {
  tags: string[]
  finish: string
  series: string
  issueNo: number | null
  penName: string
  bSide: string
  editionSize: number
  errata: string
  includes: CompItem[]
  dedication: string
  scatter: boolean
}

export function editionFromRow(row: EditionRow): Pick<
  Zine,
  | 'tags'
  | 'finish'
  | 'series'
  | 'issueNo'
  | 'penName'
  | 'bSide'
  | 'editionSize'
  | 'errata'
  | 'includes'
  | 'dedication'
  | 'scatter'
> {
  return {
    tags: parseJsonColumn<string[]>(row.tags_json, []),
    finish: (FINISH_IDS as readonly string[]).includes(row.finish) ? (row.finish as FinishId) : 'clean',
    series: row.series || undefined,
    issueNo: row.issue_no ?? undefined,
    penName: row.pen_name || undefined,
    bSide: row.b_side || undefined,
    editionSize: row.edition_size || undefined,
    errata: row.errata || undefined,
    includes: parseJsonColumn<CompItem[]>(row.includes_json, []),
    dedication: row.dedication || undefined,
    scatter: Boolean(row.scatter),
  }
}

export function editionFromWrite(body: Partial<Zine>, existing?: Partial<EditionRow> | null): EditionWrite {
  const finishRaw = String(body.finish ?? '')
  return {
    tags: normalizeTags(Array.isArray(body.tags) ? body.tags : []),
    finish: (FINISH_IDS as readonly string[]).includes(finishRaw) ? finishRaw : (existing?.finish ?? 'clean'),
    series: normalizeSeries(typeof body.series === 'string' ? body.series : existing?.series) ?? '',
    issueNo: normalizeIssueNo(body.issueNo ?? existing?.issue_no) ?? null,
    penName: String(body.penName ?? existing?.pen_name ?? '').trim().slice(0, 48),
    bSide: String(body.bSide ?? existing?.b_side ?? '').trim().slice(0, 280),
    editionSize: Math.max(0, Math.min(999, Number(body.editionSize ?? existing?.edition_size ?? 0) || 0)),
    errata: String(body.errata ?? existing?.errata ?? '').trim().slice(0, 200),
    includes: Array.isArray(body.includes) ? body.includes.slice(0, 12) : [],
    dedication: String(body.dedication ?? existing?.dedication ?? '').trim().slice(0, 120),
    scatter: body.scatter ?? Boolean(existing?.scatter),
  }
}

export const EDITION_UPDATE_SQL =
  'UPDATE zines SET tags_json = ?, finish = ?, series = ?, issue_no = ?, pen_name = ?, b_side = ?, edition_size = ?, errata = ?, includes_json = ?, dedication = ?, scatter = ? WHERE id = ?'

export function editionWriteParams(edition: EditionWrite, id: string): unknown[] {
  return [
    JSON.stringify(edition.tags),
    edition.finish,
    edition.series,
    edition.issueNo,
    edition.penName,
    edition.bSide,
    edition.editionSize,
    edition.errata,
    JSON.stringify(edition.includes),
    edition.dedication,
    edition.scatter ? 1 : 0,
    id,
  ]
}
