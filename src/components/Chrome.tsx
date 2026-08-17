import { NavLink, Link } from 'react-router-dom'
import { useZines } from '../store/useZines'
import type { BadgeId, VibeId } from '../lib/types'
import { BADGE_META } from '../lib/seed'
import { noticeCopy } from '../lib/social'
import { VIBES } from '../lib/vibes'
import { profilePath } from '../lib/zine'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { assetUrl } from '../lib/paths'

export function Topbar() {
  const { session, online } = useZines()
  const status = session ? `@${session.name}` : online ? 'api live' : 'local'
  return (
    <header className="topbar">
      <Link to="/" className="brand chroma" aria-label={`Zineverse, ${status}`}>
        ZINEVERSE
        <small>{status}</small>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        <NavLink to="/" end>
          Cover
        </NavLink>
        <NavLink to="/studio">Studio</NavLink>
        <NavLink to="/explore">Stream</NavLink>
        <NavLink to="/help">Help</NavLink>
        {session ? <NavLink to="/mail">Letters</NavLink> : null}
        {session ? <NavLink to={`/u/${session.name}`}>@{session.name}</NavLink> : null}
        <Inbox />
      </nav>
    </header>
  )
}

export function LocalNote() {
  const { online } = useZines()
  if (online) return null
  return (
    <p className="local-note serif">
      Local studio. Snapshot links and print work here. Board, fest, and letters need the API.{' '}
      <Link to="/help">What do the words mean?</Link>
    </p>
  )
}

export function SceneLinks() {
  const { online, session } = useZines()
  if (!online) return null
  return (
    <div className="scene-links cta-row">
      <Link to="/cork" className="comic-btn small ghost">
        Desk
      </Link>
      <Link to="/board" className="comic-btn small ghost">
        Board
      </Link>
      <Link to="/fest" className="comic-btn small ghost">
        Fest
      </Link>
      {session ? (
        <Link to="/mail" className="comic-btn small ghost">
          Letters
        </Link>
      ) : null}
    </div>
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
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
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
          <div className="inbox-head">
            <strong className="hand">the wire</strong>
            <button type="button" className="inbox-close" onClick={() => setOpen(false)}>
              close
            </button>
          </div>
          {notices.length ? (
            <ul>
              {notices.map((item) => (
                <li key={item.id} className={item.read ? '' : 'fresh'}>
                  <Link
                    to={
                      item.kind === 'mail'
                        ? `/mail/${item.actor.replace(/^@/, '')}`
                        : item.zineId
                          ? `/z/${item.zineId}`
                          : profilePath(item.actor)
                    }
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
