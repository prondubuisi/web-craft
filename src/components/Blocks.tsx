import type { Block, PollTally } from '../lib/types'
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
  poll,
  onVote,
}: {
  block: Block
  onChange?: (next: Block) => void
  poll?: PollTally
  onVote?: (option: number) => void
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
    case 'quote':
      return (
        <blockquote className="quote-block">
          <Field
            className="quote-text"
            value={block.text}
            onChange={onChange ? (text) => onChange({ ...block, text }) : undefined}
          />
          <cite>
            <Field
              className="hand"
              value={block.cite}
              multiline={false}
              onChange={onChange ? (cite) => onChange({ ...block, cite }) : undefined}
            />
          </cite>
        </blockquote>
      )
    case 'poll': {
      const counts = poll?.counts ?? block.options.map(() => 0)
      const total = counts.reduce((sum, n) => sum + n, 0)
      return (
        <div className="poll-block">
          <div className="issue-chip">STREET POLL</div>
          <Field
            className="hand poll-q"
            value={block.question}
            onChange={onChange ? (question) => onChange({ ...block, question }) : undefined}
          />
          <div className="poll-opts">
            {block.options.map((option, i) => {
              const n = counts[i] ?? 0
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              const mine = poll?.mine === i
              if (onChange) {
                return (
                  <Field
                    key={i}
                    className="poll-edit"
                    value={option}
                    multiline={false}
                    onChange={(text) => {
                      const options = block.options.map((o, idx) => (idx === i ? text : o))
                      onChange({ ...block, options })
                    }}
                  />
                )
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={`poll-opt ${mine ? 'on' : ''}`}
                  onClick={() => onVote?.(i)}
                  disabled={!onVote}
                >
                  <span className="poll-bar" style={{ width: `${pct}%` }} />
                  <span className="poll-label">{option}</span>
                  <span className="poll-n">{total ? `${pct}%` : '—'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    case 'audio':
      return (
        <figure className="audio-block">
          <div className="issue-chip">MIXTAPE</div>
          {block.src ? (
            <audio controls src={block.src} preload="metadata">
              Your browser skipped the tape.
            </audio>
          ) : (
            <p className="hand">no tape loaded. upload one in the inspector.</p>
          )}
          <figcaption className="caption">
            <Field
              value={block.caption}
              onChange={onChange ? (caption) => onChange({ ...block, caption }) : undefined}
            />
          </figcaption>
        </figure>
      )
    case 'strip':
      return (
        <div className="strip-block" aria-label="Mini comic">
          {block.panels.map((panel, i) => (
            <div key={i} className="strip-cell">
              {panel.src ? <img src={assetUrl(panel.src)} alt="" /> : null}
              <Field
                value={panel.text}
                multiline={false}
                onChange={
                  onChange
                    ? (text) => {
                        const panels = block.panels.map((p, idx) => (idx === i ? { ...p, text } : p))
                        onChange({ ...block, panels })
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )
    case 'colophon':
      return (
        <aside className="colophon-block">
          <div className="issue-chip">COLOPHON</div>
          <dl>
            <div>
              <dt className="hand">edition</dt>
              <dd>
                <Field
                  value={block.edition}
                  multiline={false}
                  onChange={onChange ? (edition) => onChange({ ...block, edition }) : undefined}
                />
              </dd>
            </div>
            <div>
              <dt className="hand">press</dt>
              <dd>
                <Field
                  value={block.press}
                  multiline={false}
                  onChange={onChange ? (press) => onChange({ ...block, press }) : undefined}
                />
              </dd>
            </div>
            <div>
              <dt className="hand">place</dt>
              <dd>
                <Field
                  value={block.place}
                  multiline={false}
                  onChange={onChange ? (place) => onChange({ ...block, place }) : undefined}
                />
              </dd>
            </div>
            <div>
              <dt className="hand">thanks</dt>
              <dd>
                <Field
                  value={block.thanks}
                  onChange={onChange ? (thanks) => onChange({ ...block, thanks }) : undefined}
                />
              </dd>
            </div>
          </dl>
        </aside>
      )
    case 'blackout': {
      const words = block.text.split(/\s+/).filter(Boolean)
      return (
        <div className="blackout-block">
          <div className="issue-chip">BLACKOUT</div>
          {onChange ? (
            <Field
              value={block.text}
              onChange={(text) => onChange({ ...block, text, hidden: block.hidden.filter((i) => i < text.split(/\s+/).length) })}
            />
          ) : null}
          <p className="blackout-poem">
            {words.map((word, i) => {
              const hid = block.hidden.includes(i)
              if (onChange) {
                return (
                  <button
                    key={`${word}-${i}`}
                    type="button"
                    className={`blackout-word ${hid ? 'hid' : ''}`}
                    onClick={() => {
                      const hidden = hid ? block.hidden.filter((n) => n !== i) : [...block.hidden, i]
                      onChange({ ...block, hidden })
                    }}
                  >
                    {word}
                  </button>
                )
              }
              return (
                <span key={`${word}-${i}`} className={`blackout-word ${hid ? 'hid' : ''}`}>
                  {hid ? '████' : word}
                </span>
              )
            })}
          </p>
        </div>
      )
    }
    case 'contents':
      return (
        <nav className="contents-block" aria-label="Contents">
          <div className="issue-chip">CONTENTS</div>
          <ol>
            {block.lines.map((line, i) => (
              <li key={i}>
                <Field
                  value={line.label}
                  multiline={false}
                  onChange={
                    onChange
                      ? (label) => {
                          const lines = block.lines.map((row, idx) => (idx === i ? { ...row, label } : row))
                          onChange({ ...block, lines })
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ol>
        </nav>
      )
    case 'insert':
      return (
        <aside className="insert-block">
          <div className="issue-chip">IT FELL OUT</div>
          <Field
            className="hand"
            value={block.title}
            multiline={false}
            onChange={onChange ? (title) => onChange({ ...block, title }) : undefined}
          />
          <Field
            value={block.text}
            onChange={onChange ? (text) => onChange({ ...block, text }) : undefined}
          />
        </aside>
      )
  }
}
