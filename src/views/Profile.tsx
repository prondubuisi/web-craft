import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, ComicButton, Halftone, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { BADGE_META, computeBadges } from '../lib/seed'
import type { BadgeId, Zine } from '../lib/types'
import { coverSrc, isDropLive, ownerHandle } from '../lib/zine'
import { useZines } from '../store/ZineContext'

const ALL_BADGES = Object.keys(BADGE_META) as BadgeId[]

export function Profile() {
  const { handle = '' } = useParams()
  const name = decodeURIComponent(handle).replace(/^@/, '').toLowerCase()
  const { zines, session, online, profile } = useZines()
  const mine = session?.name.toLowerCase() === name || (!session && name === 'you')
  const [bio, setBio] = useState('')
  const [remote, setRemote] = useState<{
    name: string
    bio: string
    remixPoints: number
    createdAt: number
    zines: Zine[]
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
        }
      })
      .catch(() => {
        if (!cancelled) setRemote(null)
      })
    return () => {
      cancelled = true
    }
  }, [name, online])

  const localIssues = zines.filter((z) => z.published && ownerHandle(z.owner).toLowerCase() === name)
  const issues = remote?.zines ?? localIssues
  const remixPoints = remote?.remixPoints ?? (mine ? profile.remixPoints : 0)
  const badges = computeBadges(remote?.zines ?? zines, remixPoints, name === 'you' ? null : name)
  const display = name === 'you' ? 'you' : `@${name}`

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
            </div>
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
      </main>
    </div>
  )
}
