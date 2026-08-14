import { Link, useNavigate } from 'react-router-dom'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { useCountdown } from '../lib/useCountdown'
import { coverSrc, isDropLive } from '../lib/zine'
import { useZines } from '../store/ZineContext'
import type { Zine } from '../lib/types'

export function Explore() {
  const { zines, remixZine } = useZines()
  const published = zines.filter((z) => z.published)
  const navigate = useNavigate()

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">ONE-CLICK REMIX</div>
            <h1 className="display chroma">the stream</h1>
            <p className="serif" style={{ maxWidth: 520, marginTop: 8 }}>
              A website is a gathering place, not a billboard. Fork anything you like.
            </p>
          </div>
        </div>
        <div className="zine-wall">
          {published.map((z) => (
            <ExploreCard
              key={z.id}
              zine={z}
              onRemix={() => {
                const id = remixZine(z.id)
                if (id) navigate(`/edit/${id}`)
              }}
            />
          ))}
        </div>
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
          <span>{zine.owner}</span>
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
