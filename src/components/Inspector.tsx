import { useRef, useState } from 'react'
import { AppearanceStack } from './AppearanceStack'
import { SampleTray } from './SampleTray'
import { actionError } from '../lib/catch'
import { pushToast } from '../lib/toast'
import { applyLook, EYEDROP_LABEL, looksOf, toggleLook } from '../lib/looks'
import { assetUrl } from '../lib/paths'
import { ART_LIBRARY } from '../lib/vibes'
import { cutoutImage } from '../lib/cutout'
import { bagForType, canHoldBag, misregisterBlock, samplesFor, type Sample } from '../lib/samples'
import { readFileAsDataUrl, readImageAsDataUrl } from '../lib/share'
import type { Block, LookLayer, VibeId } from '../lib/types'
import type { AttrBag } from '../lib/widgetLang'
import { applyBag, combineBags, retarget, shuffleKids, widgetsWithAttr } from '../lib/widgetLang'
import { ATTRS, LANES, WIDGETS, contentsFrom, widgetByType, type AttrId } from '../lib/widgets'

export type Eyedropper = { on: boolean; bag: AttrBag | null }
export type SubSel = { kind: 'panel' | 'card'; index: number }

export function Inspector({
  block,
  onChange,
  onCommit,
  onLinkBag,
  pageBlocks = [],
  vibe = 'miles',
  eyedropper,
  onEyedropper,
  onPreview,
  subSel,
  pickup,
}: {
  block: Block
  onChange: (next: Block, recordHistory?: boolean) => void
  onCommit?: () => void
  onLinkBag?: (bag: AttrBag, live?: LookLayer[]) => void
  pageBlocks?: Block[]
  vibe?: VibeId
  eyedropper?: Eyedropper
  onEyedropper?: (next: Eyedropper) => void
  onPreview?: (bag: AttrBag | null) => void
  subSel?: SubSel | null
  pickup?: AttrBag | null
}) {
  const meta = widgetByType(block.type)
  // Async work (uploads, cutouts) can resolve after the user has edited other
  // fields on this same block; reading blockRef.current at resolve-time (instead
  // of closing over the `block` prop from the render that kicked off the async
  // call) avoids clobbering those in-flight edits with a stale snapshot.
  const blockRef = useRef(block)
  blockRef.current = block
  const [typeAttr, setTypeAttr] = useState<AttrId | 'all'>('all')
  const typed = typeAttr === 'all' ? WIDGETS : widgetsWithAttr(typeAttr)
  const [sampleQuery, setSampleQuery] = useState('')
  const [liveLink, setLiveLink] = useState(false)
  const samples = samplesFor(block.type)
  const looks = looksOf(block)
  const activeLabels = looks.map((layer) => layer.label)

  function plantSample(sample: (typeof samples)[number]) {
    const layer: LookLayer = { label: sample.label, bag: bagForType(block.type, sample.bag) }
    onChange(toggleLook(block, layer, vibe), true)
  }

  function combineAll() {
    const bags = samples.map((sample) => bagForType(block.type, sample.bag))
    let next = applyBag(block, combineBags(bags))
    const extra: LookLayer[] = samples.map((sample, i) => ({ label: sample.label, bag: bags[i] }))
    onChange({ ...next, looks: [...looks, ...extra] }, true)
  }

  function misregister() {
    onChange(misregisterBlock(block), true)
  }

  const pickupSample: Sample | null =
    pickup && Object.keys(bagForType(block.type, pickup)).length
      ? { label: EYEDROP_LABEL, attrs: meta.attrs, bag: pickup }
      : null

  async function onUpload(file: File | undefined) {
    if (!file) return
    try {
      if (block.type === 'hero') {
        const src = await readImageAsDataUrl(file)
        const current = blockRef.current
        onChange(current.type === 'hero' ? { ...current, src } : { ...block, src }, true)
        return
      }
      if (block.type === 'sticker') {
        const src = await readImageAsDataUrl(file)
        const current = blockRef.current
        onChange(current.type === 'sticker' ? { ...current, src } : { ...block, src }, true)
        return
      }
      if (block.type === 'audio') {
        const src = await readFileAsDataUrl(file)
        const current = blockRef.current
        onChange(current.type === 'audio' ? { ...current, src } : { ...block, src }, true)
      }
    } catch (err) {
      pushToast(actionError(err, 'Upload failed'), 'error', vibe)
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
      <div className="tray-attr" role="group" aria-label="widget attrs">
        <button
          type="button"
          className={`tray-item ${typeAttr === 'all' ? 'on' : ''}`}
          onClick={() => setTypeAttr('all')}
        >
          all
        </button>
        {ATTRS.map((attr) => (
          <button
            key={attr}
            type="button"
            className={`tray-item ${typeAttr === attr ? 'on' : ''}`}
            onClick={() => setTypeAttr(attr)}
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
      <div className="samples-head">
        <label>Samples</label>
        {onEyedropper ? (
          <button
            type="button"
            className={`tray-item eyedrop-btn${eyedropper?.on ? ' on' : ''}`}
            aria-pressed={eyedropper?.on ?? false}
            aria-label="Eyedropper"
            onClick={() => onEyedropper(eyedropper?.on ? { on: false, bag: null } : { on: true, bag: null })}
          >
            eyedropper
          </button>
        ) : null}
      </div>
      <p className="serif">
        {eyedropper?.on
          ? eyedropper.bag
            ? 'click a block on the page to paint this look. escape cancels.'
            : 'click a block on the page to pick up its look.'
          : 'pick more than one. they stack. hover a scrap to preview. misregister rolls three.'}
      </p>
      <AppearanceStack block={block} vibe={vibe} onChange={onChange} />
      <div className="cta-row" style={{ marginBottom: 8 }}>
        {samples.length > 1 ? (
          <button
            type="button"
            className="comic-btn small"
            onClick={misregister}
            title="Roll two or three scraps onto this block"
          >
            misregister
          </button>
        ) : null}
        {samples.length > 1 ? (
          <button type="button" className="comic-btn small" onClick={combineAll}>
            combine every scrap that fits
          </button>
        ) : null}
      </div>
      <SampleTray
        samples={samples}
        pickup={pickupSample}
        activeLabels={activeLabels}
        query={sampleQuery}
        onQuery={setSampleQuery}
        onToggle={(sample) => {
          if (sample.label === EYEDROP_LABEL) {
            onChange(applyLook(block, { label: EYEDROP_LABEL, bag: bagForType(block.type, sample.bag) }), true)
            return
          }
          plantSample(sample)
        }}
        onPreview={(bag) => onPreview?.(bag)}
      />
      {looks.length > 0 && onLinkBag
        ? (() => {
            const bag = combineBags(looks.map((layer) => layer.bag as AttrBag))
            const linked = pageBlocks.filter((item) => canHoldBag(item.type, bag)).length
            if (linked < 2) return null
            return (
              <div className="link-row">
                <label className="link-flag">
                  <input
                    type="checkbox"
                    checked={liveLink}
                    onChange={(e) => setLiveLink(e.target.checked)}
                  />
                  link across page
                </label>
                <button
                  type="button"
                  className="comic-btn small"
                  aria-label="same scrap on the page"
                  onClick={() =>
                    onLinkBag(
                      bag,
                      liveLink
                        ? looks.map((layer) => ({ ...layer, linked: true }))
                        : undefined,
                    )
                  }
                >
                  same scrap on the page · {linked}
                </button>
              </div>
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
                  .then((src) => {
                    const current = blockRef.current
                    onChange(current.type === 'sticker' ? { ...current, src } : { ...block, src }, true)
                  })
                  .catch((err: unknown) => pushToast(actionError(err, 'Cutout failed'), 'error', vibe))
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
                .then((src) => {
                  const current = blockRef.current
                  onChange(current.type === 'hero' ? { ...current, src } : { ...block, src }, true)
                })
                .catch((err: unknown) => pushToast(actionError(err, 'Cutout failed'), 'error', vibe))
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
            <button
              className="tray-item"
              disabled={block.panels.length < 2}
              onClick={() => onChange(shuffleKids(block), true)}
            >
              shuffle
            </button>
          </div>
          {subSel?.kind === 'panel' && block.panels[subSel.index] ? (
            <>
              <label>Panel {subSel.index + 1}</label>
              <input
                className="sample-filter"
                value={block.panels[subSel.index].text}
                onChange={(e) => {
                  const text = e.target.value
                  const panels = block.panels.map((panel, i) =>
                    i === subSel.index ? { ...panel, text } : panel,
                  )
                  onChange({ ...block, panels }, false)
                }}
                onPointerDown={() => onCommit?.()}
              />
              <div className="vibe-picks">
                {['var(--accent)', 'var(--accent-2)', 'var(--accent-3)'].map((fill) => (
                  <button
                    key={fill}
                    type="button"
                    className={`tray-item ${block.panels[subSel.index].fill === fill ? 'on' : ''}`}
                    onClick={() => {
                      const panels = block.panels.map((panel, i) =>
                        i === subSel.index ? { ...panel, fill } : panel,
                      )
                      onChange({ ...block, panels }, true)
                    }}
                  >
                    {fill.replace('var(--', '').replace(')', '')}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="serif">click a panel on the page to edit it.</p>
          )}
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
            <button
              className="tray-item"
              disabled={block.cards.length < 2}
              onClick={() => onChange(shuffleKids(block), true)}
            >
              shuffle
            </button>
          </div>
          {subSel?.kind === 'card' && block.cards[subSel.index] ? (
            <>
              <label>Card {subSel.index + 1}</label>
              <input
                className="sample-filter"
                value={block.cards[subSel.index].title}
                onChange={(e) => {
                  const title = e.target.value
                  const cards = block.cards.map((card, i) =>
                    i === subSel.index ? { ...card, title } : card,
                  )
                  onChange({ ...block, cards }, false)
                }}
                onPointerDown={() => onCommit?.()}
              />
              <textarea
                className="sample-filter"
                rows={3}
                value={block.cards[subSel.index].body}
                onChange={(e) => {
                  const body = e.target.value
                  const cards = block.cards.map((card, i) =>
                    i === subSel.index ? { ...card, body } : card,
                  )
                  onChange({ ...block, cards }, false)
                }}
                onPointerDown={() => onCommit?.()}
              />
            </>
          ) : (
            <p className="serif">click a card on the page to edit it.</p>
          )}
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
            <button
              className="tray-item"
              disabled={block.panels.length < 2}
              onClick={() => onChange(shuffleKids(block), true)}
            >
              shuffle
            </button>
          </div>
          {subSel?.kind === 'panel' && block.panels[subSel.index] ? (
            <>
              <label>Beat {subSel.index + 1}</label>
              <input
                className="sample-filter"
                value={block.panels[subSel.index].text}
                onChange={(e) => {
                  const text = e.target.value
                  const panels = block.panels.map((panel, i) =>
                    i === subSel.index ? { ...panel, text } : panel,
                  )
                  onChange({ ...block, panels }, false)
                }}
                onPointerDown={() => onCommit?.()}
              />
            </>
          ) : (
            <p className="serif">click a beat on the page to edit it.</p>
          )}
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
