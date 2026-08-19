import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, CheckCircle, ComicButton, Halftone, LocalNote, Modal, Topbar, VibePicks } from '../components/Chrome'
import { BADGE_META } from '../lib/seed'
import { api } from '../lib/api'
import { useRemoteWithFallback } from '../lib/useRemote'
import { loadBag } from '../lib/social'
import { actionError } from '../lib/catch'
import { hasShared } from '../lib/shared'
import { pushToast } from '../lib/toast'
import { assertZineShape } from '../lib/shape'
import type { BadgeId, VibeId } from '../lib/types'
import {
  coverSrc,
  editPath,
  isDropLive,
  isMine,
  isSeededDemo,
  isToolkitSeed,
  profilePath,
  readStudioCreate,
  recalledVibe,
  rememberVibe,
  seriesLabel,
} from '../lib/zine'
import { useZines } from '../store/useZines'

const ALL_BADGES = Object.keys(BADGE_META) as BadgeId[]

const MILESTONES = [
  { key: 'made', label: 'Made an issue' },
  { key: 'shared', label: 'Shared or printed it' },
  { key: 'remixed', label: 'Remixed something' },
] as const

function BadgeStrip({ earned, points }: { earned: BadgeId[]; points: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="badge-row">
      <button
        type="button"
        className="comic-badge"
        aria-expanded={open}
        aria-controls="studio-badge-grid"
        onClick={() => setOpen((v) => !v)}
      >
        {earned.length}/{ALL_BADGES.length} badges
      </button>
      <span className="comic-badge">{points} REMIX PTS</span>
      {open ? (
        <div id="studio-badge-grid" className="badge-grid" role="list">
          {ALL_BADGES.map((id) => (
            <Badge key={id} id={id} dim={!earned.includes(id)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function StudioMore({
  session,
  apiReady,
  online,
  onImport,
  onClaim,
  onSignOut,
  onReset,
}: {
  session: { name: string } | null
  apiReady: boolean
  online: boolean
  onImport: (file: File) => void
  onClaim: () => void
  onSignOut: () => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function closeMenu(restore = true) {
    setOpen(false)
    if (restore) queueMicrotask(() => trigger.current?.focus())
  }

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) closeMenu(false)
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape' && open) {
        ev.preventDefault()
        closeMenu(true)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="studio-more" ref={root}>
      <ComicButton
        ref={trigger}
        className="ghost small"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Studio settings"
        onClick={() => setOpen((v) => !v)}
      >
        more
      </ComicButton>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onImport(file)
          closeMenu(true)
        }}
      />
      {open ? (
        <div className="studio-more-panel comic-cell" role="menu" aria-label="Studio settings">
          <ComicButton
            className="ghost small"
            role="menuitem"
            onClick={() => fileInput.current?.click()}
          >
            Import JSON
          </ComicButton>
          <Link to="/cork" className="comic-btn ghost small" role="menuitem" onClick={() => closeMenu(false)}>
            Corkboard
          </Link>
          {session ? (
            <ComicButton
              className="ghost small"
              role="menuitem"
              onClick={() => {
                closeMenu(true)
                onSignOut()
              }}
            >
              Sign out
            </ComicButton>
          ) : (
            <ComicButton
              className="ghost small"
              role="menuitem"
              disabled={!apiReady || !online}
              onClick={() => {
                closeMenu(true)
                onClaim()
              }}
            >
              {!apiReady ? 'Checking API' : online ? 'Claim studio' : 'API offline'}
            </ComicButton>
          )}
          {!session ? (
            <ComicButton
              className="ghost small"
              role="menuitem"
              onClick={() => {
                closeMenu(true)
                onReset()
              }}
            >
              Reset demo
            </ComicButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MilestoneCard({
  made,
  shared,
  remixed,
}: {
  made: boolean
  shared: boolean
  remixed: boolean
}) {
  const done = { made, shared, remixed }
  const count = Number(made) + Number(shared) + Number(remixed)
  if (count === 3) return null
  return (
    <aside className="comic-cell milestone-card" aria-label="Studio progress">
      <div className="hand milestone-title">getting started · {count}/3</div>
      <ul className="milestone-list">
        {MILESTONES.map((item) => (
          <li key={item.key} className={done[item.key] ? 'done' : ''}>
            <CheckCircle on={done[item.key]} />
            <span className="sr-only">{done[item.key] ? 'completed' : 'not completed'}</span>
            {item.label}
          </li>
        ))}
      </ul>
      <div className="milestone-bar" aria-hidden>
        <span style={{ width: `${Math.round((count / 3) * 100)}%` }} />
      </div>
    </aside>
  )
}

export function Studio() {
  const {
    zines,
    badges,
    profile,
    createZine,
    resetStudio,
    importZine,
    session,
    online,
    apiReady,
    signIn,
    signOut,
  } = useZines()
  const mine = zines.filter((z) => isMine(z, session?.name))
  const stream = zines.filter((z) => !isMine(z, session?.name)).slice(0, 6)
  const boot = readStudioCreate(typeof window === 'undefined' ? '' : window.location.search)
  const [open, setOpen] = useState(boot.create)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [title, setTitle] = useState('')
  const [vibe, setVibe] = useState<VibeId>(boot.vibe ?? recalledVibe() ?? 'miles')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    const intent = readStudioCreate(params)
    if (intent.vibe) {
      setVibe(intent.vibe)
      rememberVibe(intent.vibe)
    }
    if (intent.create) setOpen(true)
    if (intent.create || intent.vibe) setParams({}, { replace: true })
  }, [params, setParams])

  function pickVibe(next: VibeId) {
    setVibe(next)
    rememberVibe(next)
  }

  const [bag] = useRemoteWithFallback(
    () => api.bag(),
    () => loadBag(session?.name ?? profile.name),
    (data) => data.bag,
    [session?.name, profile.name],
    { enabled: Boolean(online && session) },
  )

  function drop() {
    const id = createZine(title.trim() || 'untitled issue', vibe)
    setOpen(false)
    navigate(editPath(id))
  }

  function importFile(file: File) {
    void file.text().then((text) => {
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        pushToast('That file is not a Zineverse issue.', 'error', vibe)
        return
      }
      try {
        const id = importZine(assertZineShape(raw))
        navigate(editPath(id))
      } catch (err) {
        pushToast(actionError(err, 'That file is not a Zineverse issue.'), 'error', vibe)
      }
    })
  }

  return (
    <div data-vibe={vibe}>
      <Topbar />
      <main className="studio">
        <LocalNote />
        <div className="studio-head">
          <div>
            <div className="issue-chip">
              {session
                ? `SIGNED IN · @${session.name}`
                : !apiReady
                  ? 'CHECKING THE LINE'
                  : online
                    ? 'API LIVE · LOCAL STUDIO'
                    : 'PERSONAL STUDIO · OFFLINE'}
            </div>
            <h1 className="display chroma">your zines</h1>
            <div className="studio-progress">
              <BadgeStrip earned={badges} points={profile.remixPoints} />
              <MilestoneCard made={mine.length > 0} shared={hasShared()} remixed={profile.remixPoints > 0} />
            </div>
          </div>
          <div className="studio-actions">
            <ComicButton className="pink" onClick={() => setOpen(true)}>
              New issue
            </ComicButton>
            <StudioMore
              session={session}
              apiReady={apiReady}
              online={online}
              onImport={importFile}
              onClaim={() => setAuthOpen(true)}
              onSignOut={() => void signOut()}
              onReset={resetStudio}
            />
          </div>
        </div>

        <div className="studio-layout">
          <div>
            {mine.length === 0 ? (
              <p className="serif">
                empty wall. + new issue, pull one from the <Link to="/explore">stream</Link>, or reset
                demo for the kit.
              </p>
            ) : mine.some(isSeededDemo) ? (
              <p className="serif">seeded pages sit at the end. + new issue is yours.</p>
            ) : null}
            <div className="zine-wall">
              <button className="zine-card new-issue" onClick={() => setOpen(true)}>
                + new issue
              </button>
              {[...mine]
                .sort((a, b) => Number(isSeededDemo(a)) - Number(isSeededDemo(b)))
                .map((z) => (
                <Link key={z.id} to={editPath(z.id)} className="zine-card">
                  <Halftone src={coverSrc(z)} alt="" className="cover" />
                  <div className="body">
                    <h3>{z.title}</h3>
                    <div className="meta-line">
                      {isToolkitSeed(z) ? <span>kit</span> : isSeededDemo(z) ? <span>seed</span> : null}
                      {z.remixedFrom ? <span>remix</span> : null}
                      {seriesLabel(z) ? <span>{seriesLabel(z)}</span> : null}
                      <span>{z.vibe}</span>
                      <span>
                        {!z.published
                          ? 'draft'
                          : z.visibility === 'unlisted'
                            ? 'unlisted'
                            : isDropLive(z)
                              ? 'dropped'
                              : 'scheduled'}
                      </span>
                      <span>{z.views} views</span>
                      <span>{z.likes} likes</span>
                      <span>{z.remixes} remixes</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside>
            <section className="bag-shelf">
              <h2 className="display" style={{ fontSize: '2.2rem', marginBottom: '0.7rem' }}>
                in my bag
              </h2>
              {!bag.length ? (
                <p className="serif comic-cell bag-empty">
                  your bag is empty. stuff an issue from the <Link to="/explore">stream</Link> or check
                  one out of the <Link to="/explore">archive</Link>.
                </p>
              ) : (
                <div className="stream">
                  {bag.map((item) => (
                    <article key={item.zineId} className="stream-item">
                      <div>
                        <Link to={`/z/${item.zineId}`}>
                          <strong className="hand">{item.title}</strong>
                        </Link>
                        <div className="meta-line">
                          <Link className="owner-link" to={profilePath(item.owner)}>
                            {item.owner}
                          </Link>
                          {item.vibe ? <span>{item.vibe}</span> : null}
                        </div>
                      </div>
                      <Link to={`/z/${item.zineId}`} className="comic-btn small">
                        read
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <h2 className="display" style={{ fontSize: '2.2rem', marginBottom: '0.7rem' }}>
              community stream
            </h2>
            {stream.length === 0 ? (
              <p className="serif">quiet stream. nobody near you has dropped yet.</p>
            ) : null}
            <div className="stream">
              {stream.map((z) => (
                <article key={z.id} className="stream-item">
                  <Link to={`/z/${z.id}`}>
                    <Halftone src={coverSrc(z)} alt="" className="mini" />
                  </Link>
                  <div>
                    <Link to={`/z/${z.id}`}>
                      <strong className="hand">{z.title}</strong>
                    </Link>
                    <div className="meta-line">
                      <Link className="owner-link" to={profilePath(z.owner)}>
                        {z.owner}
                      </Link>
                      <span>{z.vibe}</span>
                    </div>
                  </div>
                  <Link to={`/z/${z.id}`} className="comic-btn small">
                    open
                  </Link>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {authOpen ? (
        <Modal title={authMode === 'register' ? 'claim a handle' : 'open your studio'} onClose={() => setAuthOpen(false)}>
          <p className="serif">
            A handle is how other issues credit you. Password stays on the API. Local drafts upload when you sign in.
          </p>
          <input
            type="text"
            value={handle}
            autoComplete="username"
            placeholder="handle (rio.bytes)"
            onChange={(e) => setHandle(e.target.value)}
          />
          <input
            type="password"
            value={password}
            autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            placeholder="password (8+)"
            onChange={(e) => setPassword(e.target.value)}
          />
          {authError ? <p className="hand">{authError}</p> : null}
          <div className="cta-row" style={{ marginTop: 10 }}>
            <ComicButton
              className="pink"
              onClick={() => {
                setAuthError('')
                void signIn(handle, password, authMode)
                  .then(() => setAuthOpen(false))
                  .catch((err: unknown) => setAuthError(actionError(err, 'Could not sign in')))
              }}
            >
              {authMode === 'register' ? 'Claim it' : 'Enter'}
            </ComicButton>
            <ComicButton
              className="ghost"
              onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
            >
              {authMode === 'register' ? 'I already have one' : 'Need a handle'}
            </ComicButton>
          </div>
        </Modal>
      ) : null}

      {open ? (
        <Modal title="new issue" onClose={() => setOpen(false)}>
          <p className="serif">Pick a vibe. You can remix it later.</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="issue title"
          />
          <VibePicks value={vibe} onChange={pickVibe} />
          <ComicButton className="pink" onClick={drop}>
            Open the page
          </ComicButton>
        </Modal>
      ) : null}
    </div>
  )
}
