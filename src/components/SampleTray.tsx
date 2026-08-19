import { useRef } from 'react'
import { SAMPLE_MIME } from '../lib/looks'
import { assetUrl } from '../lib/paths'
import { matchSample, type Sample } from '../lib/samples'
import type { AttrBag } from '../lib/widgetLang'
import { ATTRS } from '../lib/widgets'

function SampleThumb({ sample }: { sample: Sample }) {
  const attr = sample.attrs[0]
  if (attr === 'photo' && sample.bag.photo) {
    return <img className="sample-thumb-img" src={assetUrl(sample.bag.photo)} alt="" />
  }
  if (attr === 'ink' && sample.bag.ink) {
    return <span className="sample-thumb-ink">{sample.bag.ink.slice(0, 22)}</span>
  }
  if (attr === 'pin') {
    return (
      <span className="sample-thumb-pin-wrap" aria-hidden>
        <span
          className="sample-thumb-pin"
          style={{ left: `${sample.bag.x ?? 50}%`, top: `${sample.bag.y ?? 50}%` }}
        />
      </span>
    )
  }
  if (attr === 'trim') {
    return (
      <span
        className="sample-thumb-trim"
        style={{ transform: `rotate(${sample.bag.tilt ?? 0}deg)` }}
        aria-hidden
      />
    )
  }
  if (attr === 'cite') return <span className="sample-thumb-mark">“”</span>
  if (attr === 'set') return <span className="sample-thumb-mark">{sample.bag.items?.length ?? 0}</span>
  if (attr === 'holes') return <span className="sample-thumb-mark">█</span>
  if (attr === 'tape') return <span className="sample-thumb-mark">♪</span>
  return <span className="sample-thumb-mark">{sample.label.slice(0, 2)}</span>
}

export function SampleTray({
  samples,
  activeLabels,
  query,
  onQuery,
  onToggle,
  onPreview,
}: {
  samples: Sample[]
  activeLabels: string[]
  query: string
  onQuery: (next: string) => void
  onToggle: (sample: Sample) => void
  onPreview: (bag: AttrBag | null) => void
}) {
  const press = useRef(0)
  const held = useRef(false)
  const hits = query.trim()
    ? matchSample(query).filter((sample) => samples.some((row) => row.label === sample.label))
    : samples

  function previewOn(sample: Sample) {
    onPreview(sample.bag)
  }

  function previewOff() {
    window.clearTimeout(press.current)
    onPreview(null)
  }

  return (
    <div className="sample-tray-wrap">
      <input
        className="sample-filter"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="filter scraps — try pin"
        aria-label="Filter samples"
      />
      {ATTRS.filter((attr) => hits.some((sample) => sample.attrs.includes(attr))).map((attr) => (
        <div key={attr} className="sample-tray" role="group" aria-label={`${attr} samples`}>
          {hits
            .filter((sample) => sample.attrs.includes(attr))
            .map((sample) => (
              <button
                key={`${attr}-${sample.label}`}
                type="button"
                className={`sample-swatch${activeLabels.includes(sample.label) ? ' on' : ''}`}
                title={sample.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(SAMPLE_MIME, sample.label)
                  e.dataTransfer.effectAllowed = 'copy'
                  onPreview(null)
                }}
                onMouseEnter={() => previewOn(sample)}
                onMouseLeave={previewOff}
                onPointerDown={(e) => {
                  if (e.pointerType !== 'touch') return
                  held.current = false
                  press.current = window.setTimeout(() => {
                    held.current = true
                    previewOn(sample)
                  }, 420)
                }}
                onPointerUp={previewOff}
                onPointerCancel={previewOff}
                onClick={(e) => {
                  if (held.current) {
                    held.current = false
                    e.preventDefault()
                    return
                  }
                  onToggle(sample)
                }}
              >
                <span className="sample-thumb">
                  <SampleThumb sample={sample} />
                </span>
                <span className="sample-swatch-label">{sample.label}</span>
              </button>
            ))}
        </div>
      ))}
    </div>
  )
}
