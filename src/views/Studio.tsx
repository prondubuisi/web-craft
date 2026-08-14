import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, ComicButton, Halftone, Modal, Topbar, VibePicks } from '../components/Chrome'
import { BADGE_META } from '../lib/seed'
import type { BadgeId, VibeId, Zine } from '../lib/types'
import { coverSrc, isDropLive, isMine } from '../lib/zine'
import { useZines } from '../store/ZineContext'

const ALL_BADGES = Object.keys(BADGE_META) as BadgeId[]

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
    signIn,
    signOut,
  } = useZines()
  const mine = zines.filter((z) => isMine(z, session?.name))
  const stream = zines.filter((z) => !isMine(z, session?.name)).slice(0, 6)
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [title, setTitle] = useState('')
  const [vibe, setVibe] = useState<VibeId>('miles')
  const navigate = useNavigate()

  function drop() {
    const id = createZine(title.trim() || 'untitled issue', vibe)
    setOpen(false)
    navigate(`/edit/${id}`)
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">
              {session
                ? `SIGNED IN · @${session.name}`
                : online
                  ? 'API LIVE · LOCAL STUDIO'
                  : 'PERSONAL STUDIO · OFFLINE'}
            </div>
            <h1 className="display chroma">your zines</h1>
            <div className="badge-row">
              {ALL_BADGES.map((id) => (
                <Badge key={id} id={id} dim={!badges.includes(id)} />
              ))}
              <span className="comic-badge">{profile.remixPoints} REMIX PTS</span>
            </div>
          </div>
          <div className="cta-row">
            <ComicButton className="pink" onClick={() => setOpen(true)}>
              Drop a new issue
            </ComicButton>
            <label className="comic-btn ghost">
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  void file.text().then((text) => {
                    try {
                      const parsed = JSON.parse(text) as Zine
                      if (!parsed?.blocks || !parsed?.title) throw new Error('not a zine')
                      const id = importZine(parsed)
                      navigate(`/edit/${id}`)
                    } catch {
                      window.alert('That file is not a Zineverse issue.')
                    }
                  })
                }}
              />
            </label>
            {session ? (
              <ComicButton className="ghost" onClick={() => void signOut()}>
                Sign out
              </ComicButton>
            ) : (
              <ComicButton className="cyan" disabled={!online} onClick={() => setAuthOpen(true)}>
                {online ? 'Claim studio' : 'API offline'}
              </ComicButton>
            )}
            {!session ? (
              <ComicButton className="ghost" onClick={() => resetStudio()}>
                Reset demo
              </ComicButton>
            ) : null}
          </div>
        </div>

        <div className="studio-layout">
          <div>
            <div className="zine-wall">
              <button className="zine-card new-issue" onClick={() => setOpen(true)}>
                + drop a zine
              </button>
              {mine.map((z) => (
                <Link key={z.id} to={`/edit/${z.id}`} className="zine-card">
                  <Halftone src={coverSrc(z)} alt="" className="cover" />
                  <div className="body">
                    <h3>{z.title}</h3>
                    <div className="meta-line">
                      <span>{z.vibe}</span>
                      <span>
                        {!z.published
                          ? 'draft'
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
            <h2 className="display" style={{ fontSize: '2.2rem', marginBottom: '0.7rem' }}>
              community stream
            </h2>
            <div className="stream">
              {stream.map((z) => (
                <Link key={z.id} to={`/z/${z.id}`} className="stream-item">
                  <Halftone src={coverSrc(z)} alt="" className="mini" />
                  <div>
                    <strong className="hand">{z.title}</strong>
                    <div className="meta-line">
                      <span>{z.owner}</span>
                      <span>{z.vibe}</span>
                    </div>
                  </div>
                  <span className="comic-btn small">open</span>
                </Link>
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
                  .catch((err: unknown) =>
                    setAuthError(err instanceof Error ? err.message : 'Could not sign in'),
                  )
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
          <VibePicks value={vibe} onChange={setVibe} />
          <ComicButton className="pink" onClick={drop}>
            Open the page
          </ComicButton>
        </Modal>
      ) : null}
    </div>
  )
}
