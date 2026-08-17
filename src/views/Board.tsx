import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ComicButton, SceneLinks, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { actionError, catchBackground } from '../lib/catch'
import { useRemoteWithFallback } from '../lib/useRemote'
import { addLocalListing, loadLocalListings, removeLocalListing, swapLocalListing } from '../lib/social'
import type { ListingKind } from '../lib/types'
import { isMine, profilePath } from '../lib/zine'
import { useZines } from '../store/useZines'

const KINDS: { id: ListingKind | 'all'; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'trade', label: 'trade' },
  { id: 'collab', label: 'collab' },
  { id: 'feedback', label: 'feedback' },
]

export function Board() {
  const { session, online, profile, zines } = useZines()
  const [kind, setKind] = useState<ListingKind | 'all'>('all')
  const [body, setBody] = useState('')
  const [postKind, setPostKind] = useState<ListingKind>('trade')
  const [zineId, setZineId] = useState('')
  const [error, setError] = useState('')
  const mine = zines.filter((z) => z.published && isMine(z, session?.name)).slice(0, 12)

  const [items, setItems] = useRemoteWithFallback(
    () => api.board(kind === 'all' ? undefined : kind),
    () => loadLocalListings(),
    (data) => data.listings,
    [kind],
  )

  const visible = useMemo(
    () => (kind === 'all' ? items : items.filter((item) => item.kind === kind)),
    [items, kind],
  )

  async function post() {
    const text = body.trim()
    if (!text) return
    setError('')
    const extra = mine.find((z) => z.id === zineId)
    try {
      if (online && session) {
        const res = await api.postListing({
          kind: postKind,
          body: text,
          zineId: extra?.id,
        })
        setItems((prev) => [res.listing, ...prev.filter((item) => item.id !== res.listing.id)])
      } else {
        const listing = addLocalListing(session?.name ?? profile.name, postKind, text, {
          zineId: extra?.id,
          zineTitle: extra?.title,
        })
        setItems((prev) => [listing, ...prev])
      }
      setBody('')
    } catch (err) {
      setError(actionError(err, 'Could not post'))
    }
  }

  async function remove(id: string) {
    if (online && session) {
      await api.removeListing(id).catch(catchBackground)
      setItems((prev) => prev.filter((item) => item.id !== id))
      return
    }
    setItems(removeLocalListing(id))
  }

  async function swap(id: string) {
    if (online && session) {
      await api.swapListing(id).catch(catchBackground)
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, swapped: !item.swapped } : item)),
      )
      return
    }
    setItems(swapLocalListing(id))
  }

  const handle = session?.name ?? (profile.name === 'you' ? 'you' : profile.name)

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">MAIL SWAP · GUEST PAGES · RED PENS</div>
            <h1 className="display chroma">the board</h1>
            <p className="serif" style={{ maxWidth: 540, marginTop: 8 }}>
              Real zines move by trade, collab, and feedback. Pin a want. Answer in ink.
            </p>
            <SceneLinks here="/board" />
          </div>
        </div>

        <div className="filter-bar">
          {KINDS.map((item) => (
            <button
              key={item.id}
              className={`tray-item ${kind === item.id ? 'on' : ''}`}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          className="board-form"
          onSubmit={(e) => {
            e.preventDefault()
            void post()
          }}
        >
          <div className="filter-bar">
            {(['trade', 'collab', 'feedback'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={`tray-item ${postKind === id ? 'on' : ''}`}
                onClick={() => setPostKind(id)}
              >
                {id}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            maxLength={280}
            placeholder="i have toner. i want rain. i need a second pair of eyes."
            onChange={(e) => setBody(e.target.value)}
          />
          {mine.length ? (
            <select value={zineId} onChange={(e) => setZineId(e.target.value)} aria-label="Attach an issue">
              <option value="">no issue attached</option>
              {mine.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.title}
                </option>
              ))}
            </select>
          ) : null}
          {error ? <p className="hand">{error}</p> : null}
          <ComicButton className="pink" disabled={!body.trim()}>
            Pin it
          </ComicButton>
          {!online || !session ? <span className="meta-line">saved in this browser unless you claim a handle</span> : null}
        </form>

        <div className="board-list">
          {visible.map((item) => (
            <article key={item.id} className={`board-card ${item.kind} ${item.swapped ? 'swapped' : ''}`}>
              <div className="meta-line">
                <span className="issue-chip">{item.kind}</span>
                <Link className="owner-link" to={profilePath(item.author)}>
                  {item.author}
                </Link>
                {item.zineId ? (
                  <Link to={`/z/${item.zineId}`}>{item.zineTitle ?? 'issue'}</Link>
                ) : item.zineTitle ? (
                  <span>{item.zineTitle}</span>
                ) : null}
              </div>
              <p className="serif">{item.body}</p>
              {item.author.replace(/^@/, '') === handle || item.author === 'you' ? (
                <div className="cta-row" style={{ marginTop: 8 }}>
                  <button type="button" className="tray-item" onClick={() => void swap(item.id)}>
                    {item.swapped ? 'unswap' : 'swapped'}
                  </button>
                  <button type="button" className="tray-item" onClick={() => void remove(item.id)}>
                    pull pin
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {!visible.length ? (
          <p className="serif">
            quiet board. pin the first want. Or steal a dare from the <Link to="/explore">stream</Link>,
            sit at the <Link to="/fest">fest</Link>, or write someone from the{' '}
            <Link to="/mail">letters</Link> pile.
          </p>
        ) : null}
      </main>
    </div>
  )
}
