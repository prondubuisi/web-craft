import type { Block } from '../lib/types'
import { assetUrl } from '../lib/paths'
import { Halftone } from './Chrome'

function Field({
  value,
  onChange,
  className,
  multiline = true,
}: {
  value: string
  onChange?: (next: string) => void
  className?: string
  multiline?: boolean
}) {
  if (!onChange) {
    return <div className={className}>{value}</div>
  }
  if (!multiline) {
    return (
      <input
        className={`ghost-field ${className ?? ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <textarea
      className={`field ${className ?? ''}`}
      value={value}
      rows={Math.max(2, value.split('\n').length)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function BlockView({
  block,
  onChange,
}: {
  block: Block
  onChange?: (next: Block) => void
}) {
  switch (block.type) {
    case 'heading':
      return (
        <Field
          className={`heading-${block.size}`}
          value={block.text}
          onChange={onChange ? (text) => onChange({ ...block, text }) : undefined}
        />
      )
    case 'sticker':
      return (
        <div className="sticker-block" style={{ transform: `rotate(${block.rotation}deg)` }}>
          <Field
            value={block.text}
            onChange={onChange ? (text) => onChange({ ...block, text }) : undefined}
          />
        </div>
      )
    case 'hero':
      return (
        <figure>
          <Halftone
            src={block.src}
            alt={block.caption}
            density={block.density}
            split={block.split}
            className="hero-shot"
          />
          <figcaption className="caption">
            <Field
              value={block.caption}
              onChange={onChange ? (caption) => onChange({ ...block, caption }) : undefined}
            />
          </figcaption>
        </figure>
      )
    case 'grid':
      return (
        <div className={`grid-block ${block.layout}`}>
          {block.panels.map((panel, i) => (
            <div key={i} className="cell" style={{ background: panel.fill }}>
              {panel.src ? <img src={assetUrl(panel.src)} alt="" /> : null}
              <span>
                <Field
                  value={panel.text}
                  multiline={false}
                  onChange={
                    onChange
                      ? (text) => {
                          const panels = block.panels.map((p, idx) =>
                            idx === i ? { ...p, text } : p,
                          )
                          onChange({ ...block, panels })
                        }
                      : undefined
                  }
                />
              </span>
            </div>
          ))}
        </div>
      )
    case 'divider':
      return (
        <div className={`divider ${block.style}`} aria-hidden>
          {block.style === 'scribble' ? (
            <svg viewBox="0 0 400 48" width="100%" height="48">
              <path
                d="M4 28 C 40 4, 70 46, 110 22 S 180 6, 220 30 300 8, 396 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          ) : null}
        </div>
      )
    case 'sfx':
      return (
        <div className="sfx-block chroma">
          <Field
            value={block.word}
            multiline={false}
            onChange={onChange ? (word) => onChange({ ...block, word }) : undefined}
          />
        </div>
      )
    case 'glitch':
      return (
        <div className="glitch-block chroma">
          <Field
            value={block.text}
            multiline={false}
            onChange={onChange ? (text) => onChange({ ...block, text }) : undefined}
          />
        </div>
      )
    case 'stack':
      return (
        <div className="stack-block">
          {block.cards.map((card, i) => (
            <article key={i} className="stack-card">
              <Field
                className="hand"
                value={card.title}
                multiline={false}
                onChange={
                  onChange
                    ? (title) => {
                        const cards = block.cards.map((c, idx) =>
                          idx === i ? { ...c, title } : c,
                        )
                        onChange({ ...block, cards })
                      }
                    : undefined
                }
              />
              <Field
                value={card.body}
                onChange={
                  onChange
                    ? (body) => {
                        const cards = block.cards.map((c, idx) =>
                          idx === i ? { ...c, body } : c,
                        )
                        onChange({ ...block, cards })
                      }
                    : undefined
                }
              />
            </article>
          ))}
        </div>
      )
  }
}
