import { NavLink, Link } from 'react-router-dom'
import { useZines } from '../store/ZineContext'
import type { BadgeId, VibeId } from '../lib/types'
import { BADGE_META } from '../lib/seed'
import { noticeCopy } from '../lib/social'
import { VIBES } from '../lib/vibes'
import { profilePath } from '../lib/zine'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { assetUrl } from '../lib/paths'

export function Topbar() {
  const { session, online } = useZines()
  return (
    <header className="topbar">
      <Link to="/" className="brand chroma">
        ZINEVERSE
        <small>{session ? `@${session.name}` : online ? 'api live' : 'local'}</small>
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end>
          Cover
        </NavLink>
        <NavLink to="/studio">Studio</NavLink>
        <NavLink to="/explore">Stream</NavLink>
        <NavLink to="/board">Board</NavLink>
        {session ? <NavLink to={`/u/${session.name}`}>@{session.name}</NavLink> : null}
        <Inbox />
      </nav>
    </header>
  )
}

function Inbox() {
  const { notices, markNoticesRead } = useZines()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const unread = notices.filter((item) => !item.read).length

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="inbox" ref={root}>
      <button
        type="button"
        className={`inbox-btn ${unread ? 'hot' : ''}`}
        aria-expanded={open}
        aria-label={unread ? `${unread} new notices` : 'Notices'}
        onClick={() => {
          setOpen((v) => !v)
          if (!open && unread) markNoticesRead()
        }}
      >
        MAIL
        {unread ? <span className="inbox-count">{unread}</span> : null}
      </button>
      {open ? (
        <div className="inbox-panel" role="dialog" aria-label="Notices">
          <strong className="hand">the wire</strong>
          {notices.length ? (
            <ul>
              {notices.map((item) => (
                <li key={item.id} className={item.read ? '' : 'fresh'}>
                  <Link
                    to={item.zineId ? `/z/${item.zineId}` : profilePath(item.actor)}
                    onClick={() => setOpen(false)}
                  >
                    {noticeCopy(item)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="serif">quiet on this frequency.</p>
          )}
        </div>
      ) : null}
    </div>
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
