import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useZines } from '../store/useZines'
import type { BadgeId, VibeId } from '../lib/types'
import { BADGE_META } from '../lib/seed'
import { dismissPrimer, primerSeen } from '../lib/primer'
import { noticeCopy } from '../lib/social'
import { VIBES, vibeById } from '../lib/vibes'
import { profilePath, rememberVibe, studioPath } from '../lib/zine'
import { useEffect, useRef, useState, forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { assetUrl } from '../lib/paths'

export function Topbar() {
  const { session, online, apiReady } = useZines()
  const status = session ? `@${session.name}` : !apiReady ? 'checking' : online ? 'api live' : 'local'
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
  const { online, apiReady } = useZines()
  if (!apiReady || online) return null
  return (
    <p className="local-note serif">
      Local studio. Snapshot links and print work here. Board, fest, and letters need the API.{' '}
      <Link to="/help">What do the words mean?</Link>
    </p>
  )
}

/** Greets a visitor who arrived cold on a shared issue/snapshot link — not the Cover page,
 * which is the only other place onboarding happens. Reuses the Cover primer's dismiss flag,
 * so seeing one counts as seeing the other. */
export function OnboardBanner({ vibe }: { vibe?: VibeId }) {
  const [show, setShow] = useState(() => !primerSeen())
  const [picked, setPicked] = useState<VibeId>(vibe ?? 'miles')
  const navigate = useNavigate()
  useEffect(() => {
    if (vibe) setPicked(vibe)
  }, [vibe])
  if (!show) return null
  const current = vibeById(picked)
  return (
    <aside className="comic-cell onboard-banner" aria-label="New here">
      <div className="kicker">FIRST TIME?</div>
      <p className="serif">
        This page is one issue of <strong>Zineverse</strong>, a zine studio — not a website
        builder. Tap a vibe to preview it, then make your own.
      </p>
      <div className="vibe-swatches" role="group" aria-label="Pick a vibe">
        {VIBES.map((v) => {
          const on = picked === v.id
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              aria-label={v.name}
              className={`vibe-swatch ${on ? 'on' : ''}`}
              onClick={() => setPicked(v.id)}
              style={{ background: v.id === 'noir' ? v.palette[2] : v.palette[0], borderColor: on ? 'var(--ink)' : 'transparent' }}
            />
          )
        })}
        <span className="vibe-swatch-name hand">
          {current.name} — {current.alias}
        </span>
      </div>
      <div className="cta-row">
        <ComicButton
          className="small"
          onClick={() => {
            dismissPrimer()
            rememberVibe(picked)
            navigate(studioPath({ new: true, vibe: picked }))
          }}
        >
          Make it in {current.name}
        </ComicButton>
        <ComicButton
          className="small ghost"
          onClick={() => {
            dismissPrimer()
            setShow(false)
          }}
        >
          Dismiss
        </ComicButton>
      </div>
    </aside>
  )
}

export function SceneLinks({ here }: { here?: string } = {}) {
  const { online, apiReady, session } = useZines()
  if (!apiReady || !online) return null
  const items = [
    { to: '/explore', label: 'Stream' },
    { to: '/cork', label: 'Desk' },
    { to: '/board', label: 'Board' },
    { to: '/fest', label: 'Fest' },
    ...(session ? [{ to: '/mail', label: 'Letters' }] : []),
  ].filter((item) => item.to !== here)
  if (!items.length) return null
  return (
    <div className="scene-links cta-row">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className="comic-btn small ghost">
          {item.label}
        </Link>
      ))}
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
            <p className="serif">
              quiet on this frequency.{' '}
              <Link to="/explore" onClick={() => setOpen(false)}>
                like an issue
              </Link>{' '}
              or{' '}
              <Link to="/mail" onClick={() => setOpen(false)}>
                write a letter
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function CheckCircle({ on }: { on: boolean }) {
  return (
    <svg className="check-circle" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill={on ? 'var(--accent-3)' : 'none'}
        stroke={on ? 'var(--ink)' : 'currentColor'}
        strokeWidth="2"
      />
    </svg>
  )
}

export const ComicButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function ComicButton({ children, className = '', ...props }, ref) {
    return (
      <button ref={ref} className={`comic-btn ${className}`} {...props}>
        {children}
      </button>
    )
  },
)

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
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
