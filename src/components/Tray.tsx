import { useState } from 'react'
import { samplesForAttr, type Sample } from '../lib/samples'
import type { BlockType } from '../lib/types'
import { widgetsWithAttr } from '../lib/widgetLang'
import { ATTRS, LANES, WIDGETS, type AttrId } from '../lib/widgets'

export function Tray({
  onInsert,
  onSnap,
  onPlantSample,
  onLinkSample,
  className = 'tray-grid',
}: {
  onInsert: (type: BlockType) => void
  onSnap: (file: File | undefined) => void
  onPlantSample?: (sample: Sample) => void
  onLinkSample?: (sample: Sample) => void
  className?: string
}) {
  const [attrFilter, setAttrFilter] = useState<AttrId | 'all'>('all')
  const recipes = attrFilter === 'all' ? WIDGETS : widgetsWithAttr(attrFilter)

  return (
    <div className={className}>
      <div className="tray-attr" role="group" aria-label="widget attrs">
        <button
          type="button"
          className={`tray-item ${attrFilter === 'all' ? 'on' : ''}`}
          onClick={() => setAttrFilter('all')}
        >
          all
        </button>
        {ATTRS.map((attr) => (
          <button
            key={attr}
            type="button"
            className={`tray-item ${attrFilter === attr ? 'on' : ''}`}
            onClick={() => setAttrFilter(attr)}
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
      {attrFilter !== 'all' && onPlantSample
        ? (() => {
            const scraps = samplesForAttr(attrFilter)
            if (!scraps.length) return null
            return (
              <div className="tray-lane">
                <div className="tray-lane-label">scraps</div>
                {scraps.map((sample) => (
                  <span key={sample.label} className="tray-scrap">
                    <button type="button" className="tray-item" onClick={() => onPlantSample(sample)}>
                      /{sample.label}
                    </button>
                    {onLinkSample ? (
                      <button
                        type="button"
                        className="tray-item"
                        aria-label={`same scrap on the page: ${sample.label}`}
                        onClick={() => onLinkSample(sample)}
                      >
                        page
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            )
          })()
        : null}
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
