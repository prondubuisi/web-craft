import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Halftone, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { demoJams, formatHint, isJamLive } from '../lib/jam'
import type { Jam, Zine } from '../lib/types'
import { byline, coverSrc, filterStream, profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function JamPage() {
  const { id = '' } = useParams()
  const { zines, online } = useZines()
  const local = demoJams().find((item) => item.id === id) ?? demoJams()[0] ?? null
  const [jam, setJam] = useState<Jam | null>(local)
  const [issues, setIssues] = useState<Zine[]>(() => filterStream(zines, { jamId: id }))

  useEffect(() => {
    const offline = demoJams().find((item) => item.id === id) ?? demoJams()[0] ?? null
    if (!online) {
      setJam(offline)
      setIssues(filterStream(zines, { jamId: id }))
      return
    }
    void api
      .jam(id)
      .then((res) => {
        setJam(res.jam)
        setIssues(res.zines)
      })
      .catch(() => {
        setJam(offline)
        setIssues(filterStream(zines, { jamId: id }))
      })
  }, [id, online, zines])

  if (!jam) {
    return (
      <div data-vibe="miles">
        <Topbar />
        <main className="studio">
          <h1 className="display">that jam folded</h1>
          <Link to="/explore" className="comic-btn">
            Back to stream
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="issue-chip">{isJamLive(jam) ? 'LIVE JAM' : 'CLOSED JAM'}</div>
        <h1 className="display chroma">{jam.title}</h1>
        <p className="serif" style={{ maxWidth: 520, margin: '0.6rem 0 1rem' }}>
          {jam.prompt}
        </p>
        <div className="meta-line">
          <span>{formatHint(jam.format)}</span>
          <Link to="/explore">stream</Link>
        </div>
        <div className="zine-wall" style={{ marginTop: 16 }}>
          {issues.map((z) => (
            <article key={z.id} className="zine-card">
              <Link to={`/z/${z.id}`}>
                <Halftone src={coverSrc(z)} alt="" className="cover" />
              </Link>
              <div className="body">
                <h3>{z.title}</h3>
                <div className="meta-line">
                  <Link className="owner-link" to={profilePath(z.owner)}>
                    {byline(z)}
                  </Link>
                  <span>{z.vibe}</span>
                </div>
                <Link to={`/z/${z.id}`} className="comic-btn small">
                  Read
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!issues.length ? <p className="serif">Nobody printed into this jam yet.</p> : null}
        <div className="cta-row" style={{ marginTop: 16 }}>
          <Link to="/studio" className="comic-btn pink">
            Enter the jam
          </Link>
        </div>
      </main>
    </div>
  )
}
