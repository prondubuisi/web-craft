import { looksOf, removeLook, reorderLooks } from '../lib/looks'
import type { Block, VibeId } from '../lib/types'

export function AppearanceStack({
  block,
  vibe,
  onChange,
}: {
  block: Block
  vibe: VibeId
  onChange: (next: Block, recordHistory?: boolean) => void
}) {
  const looks = looksOf(block)
  if (!looks.length) return null

  return (
    <div className="look-stack" aria-label="appearance stack">
      <p className="serif look-hint">later scrap wins the overlapping cut. drag to reorder.</p>
      {looks.map((layer, i) => (
        <div
          key={`${layer.label}-${i}`}
          className={`look-row${layer.overridden?.length ? ' over' : ''}${layer.linked ? ' linked' : ''}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-zine-look', String(i))
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-zine-look')) e.preventDefault()
          }}
          onDrop={(e) => {
            const from = Number(e.dataTransfer.getData('application/x-zine-look'))
            if (Number.isFinite(from)) onChange(reorderLooks(block, from, i, vibe), true)
          }}
        >
          <span className="look-grip" aria-hidden>
            ≡
          </span>
          <span className="look-label">{layer.label}</span>
          {layer.linked ? <span className="look-badge">linked</span> : null}
          {layer.overridden?.length ? <span className="look-badge">overridden</span> : null}
          <button
            type="button"
            className="icon-btn"
            disabled={i === 0}
            aria-label={`Move ${layer.label} earlier`}
            onClick={() => onChange(reorderLooks(block, i, i - 1, vibe), true)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={i === looks.length - 1}
            aria-label={`Move ${layer.label} later`}
            onClick={() => onChange(reorderLooks(block, i, i + 1, vibe), true)}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove ${layer.label}`}
            onClick={() => onChange(removeLook(block, i, vibe), true)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
