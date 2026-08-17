import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, ComicButton, Halftone, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { useRemote } from '../lib/useRemote'
import { BADGE_META, computeBadges } from '../lib/seed'
import type { BadgeId, FestTable, GuestNote, Loan, ShelfItem, Stamp, Zine } from '../lib/types'
import {
  addGuestNote,
  loadGuestNotes,
  loadLoans,
  loadSeriesWatch,
  loadShelf,
  loadStamps,
  loadTables,
} from '../lib/social'
import { byline, coverSrc, isDropLive, isPublicDrop, ownerHandle, seriesLabel } from '../lib/zine'
import { useZines } from '../store/useZines'

const ALL_BADGES = Object.keys(BADGE_META) as BadgeId[]

function groupBySeries(issues: Zine[]): { name: string; issues: Zine[] }[] {
  const map = new Map<string, Zine[]>()
  for (const issue of issues) {
    const name = issue.series?.trim() || 'singles'
    map.set(name, [...(map.get(name) ?? []), issue])
  }
  return [...map.entries()]
    .map(([name, rows]) => ({
      name,
      issues: [...rows].sort((a, b) => (a.issueNo ?? 0) - (b.issueNo ?? 0)),
    }))
    .sort((a, b) => {
      if (a.name === 'singles') return 1
      if (b.name === 'singles') return -1
      return a.name.localeCompare(b.name)
    })
}

export function Profile() {
  const { handle = '' } = useParams()
  const name = decodeURIComponent(handle).replace(/^@/, '').toLowerCase()
  const { zines, session, online, profile, toggleFollow } = useZines()
  const mine = session?.name.toLowerCase() === name || (!session && name === 'you')
  const [bio, setBio] = useState('')
  const [scene, setScene] = useState(profile.scene ?? '')
  const [stamps, setStamps] = useState<Stamp[]>(() => loadStamps(name))
  const [loans, setLoans] = useState<Loan[]>(() => loadLoans(name))
  const [table, setTable] = useState<FestTable | null>(
    () => loadTables().find((row) => row.owner.replace(/^@/, '') === name) ?? null,
  )
  const [remote, setRemote] = useState<{
    name: string
    bio: string
    scene?: string
    remixPoints: number
    createdAt: number
    followers?: number
    following?: number
    followedByMe?: boolean
    zines: Zine[]
    guestbook?: GuestNote[]
    shelf?: ShelfItem[]
    stamps?: Stamp[]
    table?: FestTable | null
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [notes, setNotes] = useState<GuestNote[]>(() => loadGuestNotes(name))
  const [guest, setGuest] = useState('')
  const [shelf, setShelf] = useState<ShelfItem[]>(() => loadShelf(name))

  const remoteUser = useRemote(() => api.user(name), [name], { enabled: online && name !== 'you' })
  const remoteLoans = useRemote(() => api.loans(), [name, session?.name], {
    enabled: Boolean(online && mine && session && name !== 'you'),
  })
  useEffect(() => {
    if (!online || name === 'you' || remoteUser.error) {
      setRemote(null)
      return
    }
    if (!remoteUser.data) return
    const res = remoteUser.data
    setRemote(res)
    setBio(res.bio)
    setScene(res.scene ?? '')
    if (res.guestbook) setNotes(res.guestbook)
    if (res.shelf) setShelf(res.shelf)
    if (res.stamps) setStamps(res.stamps)
    if (res.table !== undefined) setTable(res.table ?? null)
  }, [name, online, remoteUser.data, remoteUser.error])
  useEffect(() => {
    if (!online || !mine || !session || name === 'you' || remoteLoans.error) {
      if (!online || name === 'you') setLoans(loadLoans(name))
      return
    }
    if (remoteLoans.data) setLoans(remoteLoans.data.loans)
  }, [name, online, mine, session, remoteLoans.data, remoteLoans.error])

  useEffect(() => {
    if (online && name !== 'you') return
    setNotes(loadGuestNotes(name))
    setShelf(loadShelf(name))
    setStamps(loadStamps(name))
    setLoans(loadLoans(name))
    setTable(loadTables().find((row) => row.owner.replace(/^@/, '') === name) ?? null)
  }, [name, online])

  const localIssues = zines.filter(
    (z) =>
      ownerHandle(z.owner).toLowerCase() === name &&
      (mine ? z.published : isPublicDrop(z)),
  )
  const issues = remote?.zines ?? localIssues
  const remixPoints = remote?.remixPoints ?? (mine ? profile.remixPoints : 0)
  const badges = computeBadges(
    remote?.zines ?? zines,
    remixPoints,
    name === 'you' ? null : name,
    stamps.length,
    0,
    loadSeriesWatch(name).length,
  )
  const display = name === 'you' ? 'you' : `@${name}`
  const watching = remote?.followedByMe ?? profile.following.includes(name)
  const followerN = remote?.followers
  const followingN = remote?.following ?? (mine ? profile.following.length : undefined)

  async function saveBio() {
    if (!session || !mine) return
    setSaving(true)
    try {
      await api.updateMe(bio, scene)
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
                <Link to={`/mail/${encodeURIComponent(name)}`} className="comic-btn cyan">
                  Write a letter
                </Link>
              </div>
            ) : null}
            {mine && session ? (
              <div className="profile-bio">
                <input
                  value={scene}
                  maxLength={48}
                  placeholder="scene / city"
                  onChange={(e) => setScene(e.target.value)}
                />
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
                {scene || remote?.scene ? <span className="issue-chip">{scene || remote?.scene}</span> : null}{' '}
                {remote?.bio || (mine ? 'local studio — claim a handle to publish a wall.' : 'this handle left the pages blank.')}
              </p>
            )}
          </div>
        </div>

        {groupBySeries(issues).map((group) => (
          <section key={group.name} className="series-group">
            {group.name !== 'singles' ? (
              <div className="issue-chip" style={{ margin: '0.4rem 0 0.7rem' }}>
                {group.name}
              </div>
            ) : null}
            <div className="zine-wall">
              {group.issues.map((z) => (
                <Link key={z.id} to={`/z/${z.id}`} className="zine-card">
                  <Halftone src={coverSrc(z)} alt="" className="cover" />
                  <div className="body">
                    <h3>{z.title}</h3>
                    <div className="meta-line">
                      {seriesLabel(z) ? <span>{seriesLabel(z)}</span> : null}
                      <span>{byline(z) !== z.owner ? byline(z) : z.vibe}</span>
                      <span>{z.vibe}</span>
                      <span>{isDropLive(z) ? `${z.likes} likes` : 'sealed'}</span>
                      <span>{z.remixes} remixes</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {!issues.length ? (
          <p className="serif">
            No dropped issues yet.{' '}
            {mine ? <Link to="/studio">Open the studio.</Link> : null}
          </p>
        ) : null}

        {table ? (
          <section className="comments">
            <div className="issue-chip">FEST TABLE</div>
            <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
              {table.name}
            </h2>
            <p className="serif">{table.blurb}</p>
            <Link to="/fest" className="comic-btn small">
              the floor
            </Link>
          </section>
        ) : null}

        {loans.length ? (
          <section className="comments" aria-label="On loan">
            <div className="issue-chip">ON LOAN</div>
            <div className="badge-row" style={{ marginTop: 8 }}>
              {loans.map((loan) => (
                <Link key={loan.zineId} to={`/z/${loan.zineId}`} className="comic-badge">
                  {loan.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {stamps.length ? (
          <section className="comments" aria-label="Passport">
            <div className="issue-chip">PASSPORT</div>
            <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
              {stamps.length} stamp{stamps.length === 1 ? '' : 's'}
            </h2>
            <div className="badge-row">
              {stamps.map((stamp) => (
                <Link key={stamp.zineId} to={`/z/${stamp.zineId}`} className="comic-badge">
                  {stamp.title}
                </Link>
              ))}
            </div>
          </section>
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
