import { formatTags, parseTagField } from '../lib/tags'
import { isPublicDrop } from '../lib/zine'
import type { FinishId, Zine } from '../lib/types'

export function EditorMeta({
  zine,
  zines,
  patchZine,
}: {
  zine: Zine
  zines: Zine[]
  patchZine: (id: string, patch: Partial<Zine>) => void
}) {
  const compEligible = zines.filter((item) => item.id !== zine.id && isPublicDrop(item))

  return (
    <div className="editor-meta no-print">
      <input
        value={formatTags(zine.tags)}
        placeholder="tags: diary, protest, music"
        onChange={(e) => patchZine(zine.id, { tags: parseTagField(e.target.value) })}
        aria-label="Tags"
      />
      <input
        value={zine.series ?? ''}
        placeholder="series: rooftop hours"
        onChange={(e) => patchZine(zine.id, { series: e.target.value })}
        aria-label="Series"
      />
      <input
        type="number"
        min={1}
        max={999}
        value={zine.issueNo ?? ''}
        placeholder="#"
        onChange={(e) =>
          patchZine(zine.id, { issueNo: e.target.value ? Number(e.target.value) : undefined })
        }
        aria-label="Issue number"
        style={{ minWidth: 72, width: 72 }}
      />
      <input
        value={zine.penName ?? ''}
        placeholder="pen name"
        onChange={(e) => patchZine(zine.id, { penName: e.target.value })}
        aria-label="Pen name"
      />
      <input
        value={zine.bSide ?? ''}
        placeholder="b-side (hidden fold)"
        onChange={(e) => patchZine(zine.id, { bSide: e.target.value })}
        aria-label="B-side"
      />
      <input
        value={zine.dedication ?? ''}
        placeholder="dedication (for @handle)"
        onChange={(e) => patchZine(zine.id, { dedication: e.target.value })}
        aria-label="Dedication"
      />
      <input
        value={zine.errata ?? ''}
        placeholder="errata slip"
        onChange={(e) => patchZine(zine.id, { errata: e.target.value })}
        aria-label="Errata"
      />
      <input
        type="number"
        min={0}
        max={999}
        value={zine.editionSize ?? ''}
        placeholder="run of"
        onChange={(e) =>
          patchZine(zine.id, { editionSize: e.target.value ? Number(e.target.value) : undefined })
        }
        aria-label="Edition size"
        style={{ minWidth: 80, width: 88 }}
      />
      <div className="vibe-picks">
        {(['clean', 'riso', 'grain'] as FinishId[]).map((id) => (
          <button
            key={id}
            className={`tray-item ${(zine.finish ?? 'clean') === id ? 'on' : ''}`}
            onClick={() => patchZine(zine.id, { finish: id })}
          >
            {id}
          </button>
        ))}
        <button
          className={`tray-item ${zine.scatter ? 'on' : ''}`}
          onClick={() => patchZine(zine.id, { scatter: !zine.scatter })}
        >
          scatter
        </button>
      </div>
      <div className="vibe-picks" aria-label="Compilation">
        {compEligible.slice(0, 8).map((item) => {
          const on = (zine.includes ?? []).some((row) => row.zineId === item.id)
          return (
            <button
              key={item.id}
              className={`tray-item ${on ? 'on' : ''}`}
              onClick={() => {
                const includes = on
                  ? (zine.includes ?? []).filter((row) => row.zineId !== item.id)
                  : [...(zine.includes ?? []), { zineId: item.id, title: item.title, owner: item.owner }]
                patchZine(zine.id, { includes })
              }}
            >
              + {item.title}
            </button>
          )
        })}
      </div>
      {compEligible.length > 8 ? <p className="serif">8 of {compEligible.length} public issues shown.</p> : null}
    </div>
  )
}
