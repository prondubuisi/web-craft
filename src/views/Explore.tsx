import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { useCountdown } from '../lib/useCountdown'
import type { StreamSort, VibeId, Zine } from '../lib/types'
import { VIBES } from '../lib/vibes'
import { coverSrc, filterStream, isDropLive, profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function Explore() {
  const { zines, remixZine, online, profile, session } = useZines()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [vibe, setVibe] = useState<VibeId | 'all'>('all')
  const [sort, setSort] = useState<StreamSort>('new')
  const [lane, setLane] = useState<'all' | 'following'>('all')
  const [tag, setTag] = useState('')
  const [remote, setRemote] = useState<Zine[] | null>(null)

  useEffect(() => {
    if (!online || (lane === 'following' && !session)) {
      setRemote(null)
      return
    }
    const handle = window.setTimeout(() => {
      void api
        .stream({
          q,
          vibe: vibe === 'all' ? undefined : vibe,
          sort,
          following: lane === 'following',
          tag: tag || undefined,
        })
        .then((res) => setRemote(res.zines))
        .catch(() => setRemote(null))
    }, 180)
    return () => window.clearTimeout(handle)
  }, [online, q, vibe, sort, lane, session, tag])

  const published = useMemo(
    () =>
      filterStream(remote ?? zines, {
        q,
        vibe,
        sort,
        tag: tag || undefined,
        following: lane === 'following' ? profile.following : null,
      }),
    [remote, zines, q, vibe, sort, lane, profile.following, tag],
  )
  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const z of remote ?? zines) for (const t of z.tags ?? []) set.add(t)
    return [...set].slice(0, 12)
  }, [remote, zines])

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">ONE-CLICK REMIX</div>
            <h1 className="display chroma">the stream</h1>
            <p className="serif" style={{ maxWidth: 520, marginTop: 8 }}>
              A website is a gathering place, not a billboard. Fork anything you like.{' '}
              <Link to="/board">Need a trade or a second pair of eyes? The board is up.</Link>
            </p>
            <div className="cta-row" style={{ marginTop: 12 }}>
              <ComicButton
                className="cyan"
                onClick={() => {
                  if (online) {
                    void api
                      .pile()
                      .then((res) => navigate(`/z/${res.zine.id}`))
                      .catch(() => {
                        const pile = published.filter((z) => isDropLive(z))
                        const hit = pile[Math.floor(Math.random() * pile.length)]
                        if (hit) navigate(`/z/${hit.id}`)
                      })
                    return
                  }
                  const pile = published.filter((z) => isDropLive(z))
                  const hit = pile[Math.floor(Math.random() * pile.length)]
                  if (hit) navigate(`/z/${hit.id}`)
                }}
              >
                Pull from the pile
              </ComicButton>
            </div>
          </div>
        </div>
        <div className="filter-bar">
          <input
            type="search"
            value={q}
            placeholder="search titles, handles, vibes"
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search the stream"
          />
          <button
            className={`tray-item ${lane === 'all' && vibe === 'all' ? 'on' : ''}`}
            onClick={() => {
              setLane('all')
              setVibe('all')
            }}
          >
            all
          </button>
          <button
            className={`tray-item ${lane === 'following' ? 'on' : ''}`}
            onClick={() => setLane('following')}
          >
            watching
          </button>
          {VIBES.map((v) => (
            <button
              key={v.id}
              className={`tray-item ${vibe === v.id ? 'on' : ''}`}
              onClick={() => setVibe(v.id)}
            >
              {v.name}
            </button>
          ))}
          {(['new', 'likes', 'remixes'] as const).map((key) => (
            <button
              key={key}
              className={`tray-item ${sort === key ? 'on' : ''}`}
              onClick={() => setSort(key)}
            >
              {key}
            </button>
          ))}
          {tags.map((name) => (
            <button
              key={name}
              className={`tray-item ${tag === name ? 'on' : ''}`}
              onClick={() => setTag(tag === name ? '' : name)}
            >
              #{name}
            </button>
          ))}
        </div>
        <div className="zine-wall">
          {published.map((z) => (
            <ExploreCard
              key={z.id}
              zine={z}
              onRemix={() => {
                void remixZine(z.id).then((id) => {
                  if (id) navigate(`/edit/${id}`)
                })
              }}
            />
          ))}
        </div>
        {!published.length ? <p className="serif">Nothing in this lane yet. Try another vibe.</p> : null}
      </main>
    </div>
  )
}

function ExploreCard({ zine, onRemix }: { zine: Zine; onRemix: () => void }) {
  const drop = useCountdown(zine.dropsAt)
  const live = isDropLive(zine) && drop.live
  return (
    <article className="zine-card">
      <Link to={`/z/${zine.id}`}>
        <Halftone src={coverSrc(zine)} alt="" className="cover" />
      </Link>
      <div className="body">
        <h3>{zine.title}</h3>
        <div className="meta-line">
          <Link className="owner-link" to={profilePath(zine.owner)}>
            {zine.owner}
          </Link>
          <span>{zine.vibe}</span>
          {live ? (
            <>
              <span>{zine.likes} likes</span>
              <span>{zine.remixes} remixes</span>
            </>
          ) : (
            <span className="issue-chip">NEXT ISSUE · {drop.label}</span>
          )}
        </div>
        <div className="cta-row" style={{ marginTop: 10 }}>
          <Link to={`/z/${zine.id}`} className="comic-btn small">
            {live ? 'Read' : 'Peek'}
          </Link>
          <ComicButton className="small pink" onClick={onRemix}>
            Remix
          </ComicButton>
        </div>
      </div>
    </article>
  )
}
