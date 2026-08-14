import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, ComicButton, Halftone, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { BADGE_META, computeBadges } from '../lib/seed'
import type { BadgeId, GuestNote, ShelfItem, Zine } from '../lib/types'
import { addGuestNote, loadGuestNotes, loadShelf } from '../lib/social'
import { coverSrc, isDropLive, isPublicDrop, ownerHandle } from '../lib/zine'
import { useZines } from '../store/ZineContext'

const ALL_BADGES = Object.keys(BADGE_META) as BadgeId[]

export function Profile() {
  const { handle = '' } = useParams()
  const name = decodeURIComponent(handle).replace(/^@/, '').toLowerCase()
  const { zines, session, online, profile, toggleFollow } = useZines()
  const mine = session?.name.toLowerCase() === name || (!session && name === 'you')
  const [bio, setBio] = useState('')
  const [remote, setRemote] = useState<{
    name: string
    bio: string
    remixPoints: number
    createdAt: number
    followers?: number
    following?: number
    followedByMe?: boolean
    zines: Zine[]
    guestbook?: GuestNote[]
    shelf?: ShelfItem[]
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [notes, setNotes] = useState<GuestNote[]>(() => loadGuestNotes(name))
  const [guest, setGuest] = useState('')
  const [shelf, setShelf] = useState<ShelfItem[]>(() => loadShelf(name))

  useEffect(() => {
    if (!online || name === 'you') {
      setRemote(null)
      return
    }
    let cancelled = false
    void api
      .user(name)
      .then((res) => {
        if (!cancelled) {
          setRemote(res)
          setBio(res.bio)
          if (res.guestbook) setNotes(res.guestbook)
          if (res.shelf) setShelf(res.shelf)
        }
      })
      .catch(() => {
        if (!cancelled) setRemote(null)
      })
    return () => {
      cancelled = true
    }
  }, [name, online])

  useEffect(() => {
    if (online && name !== 'you') return
    setNotes(loadGuestNotes(name))
    setShelf(loadShelf(name))
  }, [name, online])

  const localIssues = zines.filter(
    (z) =>
      ownerHandle(z.owner).toLowerCase() === name &&
      (mine ? z.published : isPublicDrop(z)),
  )
  const issues = remote?.zines ?? localIssues
  const remixPoints = remote?.remixPoints ?? (mine ? profile.remixPoints : 0)
  const badges = computeBadges(remote?.zines ?? zines, remixPoints, name === 'you' ? null : name)
  const display = name === 'you' ? 'you' : `@${name}`
  const watching = remote?.followedByMe ?? profile.following.includes(name)
  const followerN = remote?.followers
  const followingN = remote?.following ?? (mine ? profile.following.length : undefined)

  async function saveBio() {
    if (!session || !mine) return
    setSaving(true)
    try {
      await api.updateMe(bio)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="profile-head">
          <div>
            <div className="issue-chip">{mine ? 'YOUR WALL' : 'CREATOR'}</div>
            <h1 className="display chroma">{display}</h1>
            <div className="badge-row">
              {ALL_BADGES.map((id) => (
                <Badge key={id} id={id} dim={!badges.includes(id)} />
              ))}
              <span className="comic-badge">{remixPoints} REMIX PTS</span>
              <span className="comic-badge">{issues.length} ISSUES</span>
              {followerN != null ? <span className="comic-badge">{followerN} FANS</span> : null}
              {followingN != null ? <span className="comic-badge">{followingN} WATCHING</span> : null}
            </div>
            {!mine && name !== 'you' ? (
              <div className="cta-row" style={{ marginTop: 12 }}>
                <ComicButton
                  className={watching ? 'ghost' : 'pink'}
                  disabled={busyFollow}
                  onClick={() => {
                    setBusyFollow(true)
                    void toggleFollow(name)
                      .then((on) => {
                        setRemote((prev) =>
                          prev
                            ? {
                                ...prev,
                                followedByMe: on,
                                followers: Math.max(0, (prev.followers ?? 0) + (on ? 1 : -1)),
                              }
                            : prev,
                        )
                      })
                      .finally(() => setBusyFollow(false))
                  }}
                >
                  {watching ? 'Watching' : 'Watch wall'}
                </ComicButton>
              </div>
            ) : null}
            {mine && session ? (
              <div className="profile-bio">
                <textarea
                  value={bio}
                  maxLength={200}
                  placeholder="a one-line manifesto"
                  onChange={(e) => setBio(e.target.value)}
                />
                <ComicButton className="small" disabled={saving} onClick={() => void saveBio()}>
                  {saved ? 'Saved' : 'Save bio'}
                </ComicButton>
              </div>
            ) : (
              <p className="serif profile-bio">
                {remote?.bio || (mine ? 'local studio — claim a handle to publish a wall.' : 'this handle left the pages blank.')}
              </p>
            )}
          </div>
        </div>

        <div className="zine-wall">
          {issues.map((z) => (
            <Link key={z.id} to={`/z/${z.id}`} className="zine-card">
              <Halftone src={coverSrc(z)} alt="" className="cover" />
              <div className="body">
                <h3>{z.title}</h3>
                <div className="meta-line">
                  <span>{z.vibe}</span>
                  <span>{isDropLive(z) ? `${z.likes} likes` : 'sealed'}</span>
                  <span>{z.remixes} remixes</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!issues.length ? (
          <p className="serif">
            No dropped issues yet.{' '}
            {mine ? <Link to="/studio">Open the studio.</Link> : null}
          </p>
        ) : null}

        {shelf.length ? (
          <section className="comments">
            <div className="issue-chip">DISTRO SHELF</div>
            <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
              stocked by {display}
            </h2>
            <div className="zine-wall">
              {shelf.map((item) => (
                <Link key={item.zineId} to={`/z/${item.zineId}`} className="zine-card">
                  <div className="body">
                    <h3>{item.title}</h3>
                    <div className="meta-line">
                      <span>{item.owner}</span>
                      <span>{item.note}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="comments" aria-label="Guestbook">
          <div className="issue-chip">GUESTBOOK</div>
          <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
            leave an address
          </h2>
          <div className="comment-list">
            {notes.map((note) => (
              <article key={note.id} className="comment">
                <div className="meta-line">
                  <Link className="owner-link" to={`/u/${note.author.replace(/^@/, '')}`}>
                    {note.author}
                  </Link>
                </div>
                <p className="serif">{note.body}</p>
              </article>
            ))}
          </div>
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault()
              const text = guest.trim()
              if (!text) return
              if (online && session) {
                void api
                  .signGuestbook(name, text)
                  .then((res) => {
                    setNotes((prev) => [res.note, ...prev])
                    setGuest('')
                  })
                  .catch(() => undefined)
                return
              }
              setNotes((prev) => [addGuestNote(name, session?.name ?? profile.name, text), ...prev])
              setGuest('')
            }}
          >
            <textarea
              value={guest}
              maxLength={200}
              placeholder="write in the back of the zine"
              onChange={(e) => setGuest(e.target.value)}
            />
            <ComicButton className="small pink">Sign it</ComicButton>
          </form>
        </section>
      </main>
    </div>
  )
}
