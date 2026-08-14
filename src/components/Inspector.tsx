import { assetUrl } from '../lib/paths'
import { ART_LIBRARY } from '../lib/vibes'
import { readFileAsDataUrl } from '../lib/share'
import type { Block } from '../lib/types'
import { widgetByType } from '../lib/widgets'

export function Inspector({
  block,
  onChange,
  onCommit,
}: {
  block: Block
  onChange: (next: Block, recordHistory?: boolean) => void
  onCommit?: () => void
}) {
  const meta = widgetByType(block.type)

  async function onUpload(file: File | undefined) {
    if (!file || block.type !== 'hero') return
    try {
      const src = await readFileAsDataUrl(file)
      onChange({ ...block, src }, true)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div>
      <h3 className="display" style={{ fontSize: '1.8rem' }}>
        {meta.label}
      </h3>
      <p className="serif">{meta.hint}</p>
      {block.type === 'heading' ? (
        <>
          <label>Size</label>
          <div className="vibe-picks">
            {(['xl', 'lg', 'md'] as const).map((size) => (
              <button key={size} className="tray-item" onClick={() => onChange({ ...block, size }, true)}>
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
          <label className="comic-btn small" style={{ marginTop: 10, cursor: 'pointer' }}>
            Upload photo
            <input
              type="file"
              accept="image/*"
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
                className="tray-item"
                onClick={() => onChange({ ...block, layout }, true)}
              >
                {layout}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {block.type === 'divider' ? (
        <>
          <label>Style</label>
          <div className="vibe-picks">
            {(['scribble', 'speed', 'zip'] as const).map((style) => (
              <button key={style} className="tray-item" onClick={() => onChange({ ...block, style }, true)}>
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
              <button key={word} className="tray-item" onClick={() => onChange({ ...block, word }, true)}>
                {word}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
