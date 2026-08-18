import { useState } from 'react'
import type { BlockType } from '../lib/types'
import { widgetsWithAttr } from '../lib/widgetLang'
import { ATTRS, LANES, WIDGETS, type AttrId } from '../lib/widgets'

export function Tray({
  onInsert,
  onSnap,
  className = 'tray-grid',
}: {
  onInsert: (type: BlockType) => void
  onSnap: (file: File | undefined) => void
  className?: string
}) {
  const [cut, setCut] = useState<AttrId | 'all'>('all')
  const recipes = cut === 'all' ? WIDGETS : widgetsWithAttr(cut)

  return (
    <div className={className}>
      <div className="tray-attr" role="group" aria-label="cut">
        <button
          type="button"
          className={`tray-item ${cut === 'all' ? 'on' : ''}`}
          onClick={() => setCut('all')}
        >
          all
        </button>
        {ATTRS.map((attr) => (
          <button
            key={attr}
            type="button"
            className={`tray-item ${cut === attr ? 'on' : ''}`}
            onClick={() => setCut(attr)}
          >
            {attr}
          </button>
        ))}
      </div>
      {LANES.map((lane) => {
        const items = recipes.filter((w) => w.lane === lane.id)
        if (!items.length) return null
        return (
          <div key={lane.id} className="tray-lane">
            <div className="tray-lane-label">{lane.label}</div>
            {items.map((w) => (
              <button
                key={w.type}
                className="tray-item"
                title={w.attrs.join(' · ')}
                onClick={() => onInsert(w.type)}
              >
                <span className="glyph">{w.glyph}</span>
                /{w.slash}
              </button>
            ))}
          </div>
        )
      })}
      <label className="tray-item" style={{ cursor: 'pointer' }}>
        <span className="glyph">✂</span>
        snap
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            onSnap(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}
