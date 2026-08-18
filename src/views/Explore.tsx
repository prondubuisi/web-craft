import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ComicButton, Halftone, LocalNote, SceneLinks, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { useRemoteWithFallback } from '../lib/useRemote'
import { useCountdown } from '../lib/useCountdown'
import { demoJams, formatHint, liveJam } from '../lib/jam'
import type { StreamSort, VibeId, Zine } from '../lib/types'
import { VIBES } from '../lib/vibes'
import { byline, coverSrc, filterStream, isDropLive, profilePath, seriesLabel, studioPath } from '../lib/zine'
import { useZines } from '../store/useZines'

export function Explore() {
  const { zines, remixZine, online, profile, session } = useZines()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [vibe, setVibe] = useState<VibeId | 'all'>('all')
  const [sort, setSort] = useState<StreamSort>('new')
  const [lane, setLane] = useState<'all' | 'following' | 'jam' | 'archive'>('all')
  const [tag, setTag] = useState('')
  const [jam] = useRemoteWithFallback(
    () => api.jams(),
    () => liveJam(demoJams()) ?? null,
    (data) => data.live,
    [],
  )
  const [remote] = useRemoteWithFallback(
    () =>
      api.stream({
        q,
        vibe: vibe === 'all' ? undefined : vibe,
        sort,
        following: lane === 'following',
        tag: tag || undefined,
        jam: lane === 'jam',
        archive: lane === 'archive',
      }),
    () => null,
    (data) => data.zines,
    [q, vibe, sort, lane, session, tag],
    { enabled: online && !(lane === 'following' && !session), delay: 180 },
  )

  const published = useMemo(() => {
    const opts = {
      q,
      vibe,
      sort,
      tag: tag || undefined,
      following: lane === 'following' ? profile.following : null,
      jamId: lane === 'jam' ? jam?.id : undefined,
      archived: lane === 'archive',
    }
    const fromRemote = filterStream(remote ?? zines, opts)
    if (fromRemote.length || !remote) return fromRemote
    return filterStream(zines, opts)
  }, [remote, zines, q, vibe, sort, lane, profile.following, tag, jam?.id])
  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const z of remote ?? zines) for (const t of z.tags ?? []) set.add(t)
    return [...set].slice(0, 12)
  }, [remote, zines])

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <LocalNote />
        <div className="studio-head">
          <div>
            <div className="issue-chip">ONE-CLICK REMIX</div>
            <h1 className="display chroma">the stream</h1>
            <p className="serif" style={{ maxWidth: 520, marginTop: 8 }}>
              A website is a gathering place, not a billboard. Fork anything you like.
            </p>
            <SceneLinks here="/explore" />
            {jam ? (
              <p className="serif" style={{ maxWidth: 520, marginTop: 8 }}>
                <Link to={`/jam/${jam.id}`}>
                  <strong className="hand">{jam.title}</strong>
                </Link>{' '}
                is live — {jam.prompt} <span className="meta-line">{formatHint(jam.format)}</span>
              </p>
            ) : null}
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
        <div className="filter-bar stream-filters">
          <input
            type="search"
            value={q}
            placeholder="search titles, handles, vibes"
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search the stream"
          />
          <div className="filter-cluster" role="group" aria-label="lane">
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
            <button
              className={`tray-item ${lane === 'jam' ? 'on' : ''}`}
              onClick={() => setLane('jam')}
            >
              jam
            </button>
            <button
              className={`tray-item ${lane === 'archive' ? 'on' : ''}`}
              onClick={() => setLane('archive')}
            >
              archive
            </button>
          </div>
          <div className="filter-cluster" role="group" aria-label="vibe">
            {VIBES.map((v) => (
              <button
                key={v.id}
                className={`tray-item ${vibe === v.id ? 'on' : ''}`}
                onClick={() => setVibe(v.id)}
                style={{
                  outline: vibe === v.id ? '3px solid var(--ink)' : undefined,
                  background: vibe === v.id ? v.palette[2] : '#fff',
                }}
              >
                <span className="glyph" style={{ color: v.palette[0] }}>
                  ●
                </span>
                {v.name}
              </button>
            ))}
          </div>
          <div className="filter-cluster" role="group" aria-label="sort">
            {(['new', 'likes', 'remixes'] as const).map((key) => (
              <button
                key={key}
                className={`tray-item ${sort === key ? 'on' : ''}`}
                onClick={() => setSort(key)}
              >
                {key}
              </button>
            ))}
          </div>
          {tags.length ? (
            <div className="filter-cluster" role="group" aria-label="tags">
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
          ) : null}
        </div>
        <div className="zine-wall">
          {published.map((z) => (
            <ExploreCard
              key={z.id}
              zine={z}
              onRemix={() => {
                void remixZine(z.id, z).then((id) => {
                  if (id) navigate(`/edit/${id}`)
                })
              }}
            />
          ))}
        </div>
        {!published.length ? (
          <p className="serif">
            {lane === 'following' && !session ? (
              <>
                Watching is a signed-in pile. <Link to="/studio">Claim studio</Link> or stay in{' '}
                <button type="button" className="owner-link" onClick={() => setLane('all')}>
                  the whole stream
                </button>
                .
              </>
            ) : lane === 'following' ? (
              <>
                Nobody you watch dropped yet. Find a maker on{' '}
                <button type="button" className="owner-link" onClick={() => setLane('all')}>
                  the stream
                </button>
                , sit at the <Link to="/fest">fest</Link>, or pin a <Link to="/board">collab</Link>.
              </>
            ) : lane === 'archive' ? (
              <>
                The archive is still empty. Open a live issue, then Nominate from More.{' '}
                <button type="button" className="owner-link" onClick={() => setLane('all')}>
                  Back to the pile
                </button>
                .
              </>
            ) : lane === 'jam' ? (
              <>
                Nothing in this jam yet.{' '}
                {jam ? (
                  <Link to={`/jam/${jam.id}`}>{jam.title}</Link>
                ) : (
                  <Link to={studioPath({ new: true })}>Make a one-pager</Link>
                )}
                {' · '}
                <Link to="/cork">steal a scrap from the desk</Link>.
              </>
            ) : (
              <>
                Nothing in this lane yet. Try another vibe.{' '}
                <button
                  type="button"
                  className="owner-link"
                  onClick={() => {
                    setQ('')
                    setTag('')
                    setVibe('all')
                    setLane('all')
                  }}
                >
                  Clear the filters
                </button>{' '}
                or pull from the pile.
              </>
            )}
          </p>
        ) : null}
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
            {byline(zine)}
          </Link>
          {zine.jamId ? <span>jam</span> : null}
          {zine.archived ? <span>archive</span> : null}
          {seriesLabel(zine) ? <span>{seriesLabel(zine)}</span> : null}
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
