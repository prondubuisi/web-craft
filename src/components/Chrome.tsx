import { NavLink, Link } from 'react-router-dom'
import type { BadgeId, VibeId } from '../lib/types'
import { BADGE_META } from '../lib/seed'
import { VIBES } from '../lib/vibes'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { assetUrl } from '../lib/paths'

export function Topbar() {
  return (
    <header className="topbar">
      <Link to="/" className="brand chroma">
        ZINEVERSE
        <small>issue #001</small>
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end>
          Cover
        </NavLink>
        <NavLink to="/studio">Studio</NavLink>
        <NavLink to="/explore">Stream</NavLink>
      </nav>
    </header>
  )
}

export function ComicButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`comic-btn ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ id, dim }: { id: BadgeId; dim?: boolean }) {
  const meta = BADGE_META[id]
  return (
    <span className={`comic-badge ${dim ? 'dim' : ''}`} title={meta.blurb}>
      {meta.label}
    </span>
  )
}

export function Halftone({
  src,
  alt,
  className = '',
  density,
  split,
}: {
  src: string
  alt: string
  className?: string
  density?: number
  split?: number
}) {
  return (
    <div
      className={`halftone-media ${className}`}
      style={
        {
          '--halftone': density ?? undefined,
          '--aber': split ? `${split}px` : undefined,
        } as CSSProperties
      }
    >
      <img src={assetUrl(src)} alt={alt} />
    </div>
  )
}

export function VibePicks({
  value,
  onChange,
}: {
  value: VibeId
  onChange: (id: VibeId) => void
}) {
  return (
    <div className="vibe-picks">
      {VIBES.map((v) => (
        <button
          key={v.id}
          type="button"
          className={`tray-item ${value === v.id ? 'on' : ''}`}
          onClick={() => onChange(v.id)}
          style={{
            outline: value === v.id ? '3px solid var(--ink)' : undefined,
            background: value === v.id ? v.palette[2] : '#fff',
          }}
        >
          <span className="glyph" style={{ color: v.palette[0] }}>
            ●
          </span>
          {v.name}
        </button>
      ))}
    </div>
  )
}

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="sheet-back" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab" />
        <div className="tray-head">
          <strong className="hand">{title}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
