import { useEffect, useState } from 'react'
import { actionError } from '../lib/catch'
import { assetUrl } from '../lib/paths'
import { ART_LIBRARY } from '../lib/vibes'
import { cutoutImage } from '../lib/cutout'
import { canHoldBag, samplesFor } from '../lib/samples'
import { readFileAsDataUrl, readImageAsDataUrl } from '../lib/share'
import type { Block, VibeId } from '../lib/types'
import type { AttrBag } from '../lib/widgetLang'
import { applyBag, combineBags, retarget, widgetsWithAttr } from '../lib/widgetLang'
import { ATTRS, LANES, WIDGETS, contentsFrom, widgetByType, type AttrId } from '../lib/widgets'

export function Inspector({
  block,
  onChange,
  onCommit,
  onLinkBag,
  pageBlocks = [],
  vibe = 'miles',
}: {
  block: Block
  onChange: (next: Block, recordHistory?: boolean) => void
  onCommit?: () => void
  onLinkBag?: (bag: AttrBag) => void
  pageBlocks?: Block[]
  vibe?: VibeId
}) {
  const meta = widgetByType(block.type)
  const [typeCut, setTypeCut] = useState<AttrId | 'all'>('all')
  const typed = typeCut === 'all' ? WIDGETS : widgetsWithAttr(typeCut)
  const [samplePicks, setSamplePicks] = useState<number[]>([])
  const samples = samplesFor(block.type)

  useEffect(() => {
    setSamplePicks([])
  }, [block.id, block.type])

  function toggleSample(i: number) {
    const next = samplePicks.includes(i) ? samplePicks.filter((n) => n !== i) : [...samplePicks, i]
    setSamplePicks(next)
    onChange(applyBag(block, combineBags(next.map((idx) => samples[idx].bag))), true)
  }

  async function onUpload(file: File | undefined) {
    if (!file) return
    try {
      if (block.type === 'hero') {
        onChange({ ...block, src: await readImageAsDataUrl(file) }, true)
        return
      }
      if (block.type === 'sticker') {
        onChange({ ...block, src: await readImageAsDataUrl(file) }, true)
        return
      }
      if (block.type === 'audio') {
        onChange({ ...block, src: await readFileAsDataUrl(file) }, true)
      }
    } catch (err) {
      window.alert(actionError(err, 'Upload failed'))
    }
  }

  return (
    <div>
      <h3 className="display" style={{ fontSize: '1.8rem' }}>
        {meta.label}
      </h3>
      <p className="serif">{meta.hint}</p>
      <p className="meta-line">{meta.attrs.join(' · ')}</p>
      <label>Type</label>
      <div className="tray-attr" role="group" aria-label="type cut">
        <button
          type="button"
          className={`tray-item ${typeCut === 'all' ? 'on' : ''}`}
          onClick={() => setTypeCut('all')}
        >
          all
        </button>
        {ATTRS.map((attr) => (
          <button
            key={attr}
            type="button"
            className={`tray-item ${typeCut === attr ? 'on' : ''}`}
            onClick={() => setTypeCut(attr)}
          >
            {attr}
          </button>
        ))}
      </div>
      {LANES.map((lane) => {
        const list = typed.filter((widget) => widget.lane === lane.id)
        if (!list.length) return null
        return (
          <div key={lane.id} className="vibe-picks" aria-label={`${lane.label} types`}>
            {list.map((widget) => (
              <button
                key={widget.type}
                className={`tray-item ${block.type === widget.type ? 'on' : ''}`}
                title={widget.attrs.join(' · ')}
                onClick={() => onChange(retarget(block, widget.type, vibe), true)}
              >
                /{widget.slash}
              </button>
            ))}
          </div>
        )
      })}
      <label>Samples</label>
      <p className="serif">pick more than one. they stack.</p>
      {ATTRS.filter((attr) => meta.attrs.includes(attr) && samples.some((s) => s.attrs.includes(attr))).map(
        (attr) => (
          <div key={attr} className="vibe-picks" role="group" aria-label={`${attr} samples`}>
            {samples
              .map((sample, i) => ({ sample, i }))
              .filter(({ sample }) => sample.attrs.includes(attr))
              .map(({ sample, i }) => (
                <button
                  key={`${attr}-${sample.label}`}
                  className={`tray-item ${samplePicks.includes(i) ? 'on' : ''}`}
                  onClick={() => toggleSample(i)}
                >
                  {sample.label}
                </button>
              ))}
          </div>
        ),
      )}
      {samplePicks.length > 0 && onLinkBag
        ? (() => {
            const bag = combineBags(samplePicks.map((idx) => samples[idx].bag))
            const linked = pageBlocks.filter((item) => canHoldBag(item.type, bag)).length
            if (linked < 2) return null
            return (
              <button
                type="button"
                className="comic-btn small"
                style={{ marginTop: 10 }}
                aria-label="same scrap on the page"
                onClick={() => onLinkBag(bag)}
              >
                same scrap on the page · {linked}
              </button>
            )
          })()
        : null}
      {block.type === 'heading' ? (
        <>
          <label>Size</label>
          <div className="vibe-picks">
            {(['xl', 'lg', 'md'] as const).map((size) => (
              <button
                key={size}
                className={`tray-item ${block.size === size ? 'on' : ''}`}
                onClick={() => onChange({ ...block, size }, true)}
              >
                {size}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {block.type === 'sticker' ? (
        <>
          <label>Tilt {block.rotation.toFixed(1)}°</label>
          <input
            type="range"
            min={-8}
            max={8}
            step={0.2}
            value={block.rotation}
            onChange={(e) => onChange({ ...block, rotation: Number(e.target.value) }, false)}
            onPointerDown={() => onCommit?.()}
          />
          <label className="comic-btn small" style={{ marginTop: 10, cursor: 'pointer' }}>
            Snap / upload
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void onUpload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {block.src ? (
            <button
              className="tray-item"
              style={{ marginTop: 10 }}
              onClick={() => {
                void cutoutImage(block.src ?? '')
                  .then((src) => onChange({ ...block, src }, true))
                  .catch((err: unknown) => window.alert(actionError(err, 'Cutout failed')))
              }}
            >
              Cut out background
            </button>
          ) : null}
        </>
      ) : null}
      {block.type === 'hero' ? (
        <>
          <label>Halftone density</label>
          <input
            type="range"
            min={0.08}
            max={0.7}
            step={0.02}
            value={block.density}
            onChange={(e) => onChange({ ...block, density: Number(e.target.value) }, false)}
            onPointerDown={() => onCommit?.()}
          />
          <label>RGB split</label>
          <input
            type="range"
            min={0}
            max={14}
            step={1}
            value={block.split}
            onChange={(e) => onChange({ ...block, split: Number(e.target.value) }, false)}
            onPointerDown={() => onCommit?.()}
          />
          <label>Art</label>
          <div className="vibe-picks">
            {ART_LIBRARY.map((src) => (
              <button
                key={src}
                className="tray-item"
                onClick={() => onChange({ ...block, src }, true)}
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  outline: block.src === src ? '3px solid var(--ink)' : undefined,
                }}
              >
                <img
                  src={assetUrl(src)}
                  alt={src.split('/').pop() ?? 'art'}
                  style={{ height: 48, width: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
          <button
            className="tray-item"
            style={{ marginTop: 10 }}
            onClick={() => {
              void cutoutImage(block.src)
                .then((src) => onChange({ ...block, src }, true))
                .catch((err: unknown) => window.alert(actionError(err, 'Cutout failed')))
            }}
          >
            Cut out background
          </button>
          <label className="comic-btn small" style={{ marginTop: 10, cursor: 'pointer' }}>
            Upload photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void onUpload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </>
      ) : null}
      {block.type === 'grid' ? (
        <>
          <label>Layout</label>
          <div className="vibe-picks">
            {(['two', 'three', 'asymmetric'] as const).map((layout) => (
              <button
                key={layout}
                className={`tray-item ${block.layout === layout ? 'on' : ''}`}
                onClick={() => onChange({ ...block, layout }, true)}
              >
                {layout}
              </button>
            ))}
          </div>
          <label>Panels</label>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button
              className="tray-item"
              disabled={block.panels.length >= 6}
              onClick={() =>
                onChange(
                  {
                    ...block,
                    panels: [
                      ...block.panels,
                      {
                        text: `panel ${block.panels.length + 1}`,
                        fill: ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)'][
                          block.panels.length % 3
                        ],
                      },
                    ],
                  },
                  true,
                )
              }
            >
              add
            </button>
            <button
              className="tray-item"
              disabled={block.panels.length <= 2}
              onClick={() => onChange({ ...block, panels: block.panels.slice(0, -1) }, true)}
            >
              drop last
            </button>
          </div>
        </>
      ) : null}
      {block.type === 'stack' ? (
        <>
          <label>Cards</label>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button
              className="tray-item"
              disabled={block.cards.length >= 6}
              onClick={() =>
                onChange(
                  {
                    ...block,
                    cards: [
                      ...block.cards,
                      { title: `card ${block.cards.length + 1}`, body: 'write on the back.' },
                    ],
                  },
                  true,
                )
              }
            >
              add
            </button>
            <button
              className="tray-item"
              disabled={block.cards.length <= 2}
              onClick={() => onChange({ ...block, cards: block.cards.slice(0, -1) }, true)}
            >
              drop last
            </button>
          </div>
        </>
      ) : null}
      {block.type === 'divider' ? (
        <>
          <label>Style</label>
          <div className="vibe-picks">
            {(['scribble', 'speed', 'zip'] as const).map((style) => (
              <button
                key={style}
                className={`tray-item ${block.style === style ? 'on' : ''}`}
                onClick={() => onChange({ ...block, style }, true)}
              >
                {style}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {block.type === 'sfx' ? (
        <>
          <label>Burst</label>
          <div className="vibe-picks">
            {['THWIP!', 'POW!', 'BAM!', 'ZAP!', 'WHOOSH!', 'KRACK!'].map((word) => (
              <button
                key={word}
                className={`tray-item ${block.word === word ? 'on' : ''}`}
                onClick={() => onChange({ ...block, word }, true)}
              >
                {word}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {block.type === 'quote' ? (
        <>
          <label>Voice</label>
          <div className="vibe-picks">
            {['the margin', 'a stranger on the L', 'issue zero', 'your future self'].map((cite) => (
              <button
                key={cite}
                className={`tray-item ${block.cite === cite ? 'on' : ''}`}
                onClick={() => onChange({ ...block, cite }, true)}
              >
                {cite}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {block.type === 'poll' ? (
        <>
          <label>Options</label>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button
              className="tray-item"
              disabled={block.options.length >= 6}
              onClick={() =>
                onChange({ ...block, options: [...block.options, `option ${block.options.length + 1}`] }, true)
              }
            >
              add
            </button>
            <button
              className="tray-item"
              disabled={block.options.length <= 2}
              onClick={() => onChange({ ...block, options: block.options.slice(0, -1) }, true)}
            >
              drop last
            </button>
          </div>
        </>
      ) : null}
      {block.type === 'audio' ? (
        <label className="comic-btn small" style={{ marginTop: 10, cursor: 'pointer' }}>
          Upload tape
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              void onUpload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      ) : null}
      {block.type === 'strip' ? (
        <>
          <label>Panels</label>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button
              className="tray-item"
              disabled={block.panels.length >= 6}
              onClick={() =>
                onChange({ ...block, panels: [...block.panels, { text: `beat ${block.panels.length + 1}` }] }, true)
              }
            >
              add
            </button>
            <button
              className="tray-item"
              disabled={block.panels.length <= 2}
              onClick={() => onChange({ ...block, panels: block.panels.slice(0, -1) }, true)}
            >
              drop last
            </button>
          </div>
        </>
      ) : null}
      {block.type === 'blackout' ? (
        <>
          <p className="serif">Tap words on the page to redact them. The reader only sees the holes.</p>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button
              className="tray-item"
              disabled={block.hidden.length === 0}
              onClick={() => onChange({ ...block, hidden: [] }, true)}
            >
              clear holes
            </button>
            <button
              className="tray-item"
              onClick={() => {
                const n = block.text.split(/\s+/).filter(Boolean).length
                onChange({ ...block, hidden: Array.from({ length: n }, (_, i) => i) }, true)
              }}
            >
              redact all
            </button>
          </div>
        </>
      ) : null}
      {block.type === 'contents' ? (
        <div className="cta-row" style={{ marginTop: 8 }}>
          <button
            className="tray-item"
            onClick={() =>
              onChange({ ...block, lines: [...block.lines, { label: `page ${block.lines.length + 1}` }] }, true)
            }
          >
            add line
          </button>
          <button
            className="tray-item"
            disabled={block.lines.length <= 1}
            onClick={() => onChange({ ...block, lines: block.lines.slice(0, -1) }, true)}
          >
            drop last
          </button>
          <button
            className="tray-item"
            onClick={() => {
              const pulled = contentsFrom(pageBlocks.filter((row) => row.id !== block.id))
              onChange({ ...block, lines: pulled.lines }, true)
            }}
          >
            pull headings
          </button>
        </div>
      ) : null}
      {block.type === 'reply' ? (
        <p className="serif">Readers tear this out and mail you a postcard.</p>
      ) : null}
      {block.type === 'insert' ? (
        <p className="serif">This is a loose flyer. It should feel like it was never bound.</p>
      ) : null}
      {block.type === 'colophon' ? (
        <>
          <label>Press</label>
          <div className="vibe-picks">
            {['kitchen table riso', 'gutter press', 'xerox after midnight', 'a borrowed copier'].map((press) => (
              <button
                key={press}
                className={`tray-item ${block.press === press ? 'on' : ''}`}
                onClick={() => onChange({ ...block, press }, true)}
              >
                {press}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
