import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { decodeShare, payloadToZine } from '../lib/share'
import { useCountdown } from '../lib/useCountdown'
import { coverSrc } from '../lib/zine'
import { useZines } from '../store/useZines'

export function Share() {
  const { hash } = useLocation()
  const payload = useMemo(() => decodeShare(hash || window.location.hash), [hash])
  const zine = useMemo(() => (payload ? payloadToZine(payload) : null), [payload])
  const drop = useCountdown(zine?.dropsAt)
  const { importZine } = useZines()
  const navigate = useNavigate()

  if (!zine) {
    return (
      <div data-vibe="miles">
        <Topbar />
        <main className="studio">
          <h1 className="display">broken snapshot</h1>
          <p className="serif">That link did not unpack into a zine.</p>
          <Link to="/explore" className="comic-btn" style={{ marginTop: 12 }}>
            Back to stream
          </Link>
        </main>
      </div>
    )
  }

  const locked = Boolean(zine.dropsAt && !drop.live)

  return (
    <div data-vibe={zine.vibe}>
      <Topbar />
      <div className="preview-page">
        <article className="zine-page">
          {zine.dropsAt ? (
            <div className="next-issue">
              <span className="kicker">SNAPSHOT DROP</span>
              <strong className="display">{drop.live ? 'OPEN' : drop.label}</strong>
            </div>
          ) : null}
          {locked ? (
            <div className="drop-lock">
              <Halftone src={coverSrc(zine)} alt="" className="hero-shot" />
              <h1 className="display chroma" style={{ marginTop: 12 }}>
                {zine.title}
              </h1>
              <p className="serif">This snapshot is still sealed.</p>
            </div>
          ) : (
            <>
              <div className="meta-line" style={{ marginBottom: '0.8rem' }}>
                <span className="issue-chip">{zine.vibe}</span>
                <span>{zine.owner}</span>
                <span>portable issue</span>
              </div>
              {zine.blocks.map((block) => (
                <div key={block.id} className="block">
                  <BlockView block={block} />
                </div>
              ))}
            </>
          )}
          <div className="cta-row" style={{ marginTop: '1.4rem' }}>
            <ComicButton
              className="pink"
              onClick={() => {
                const id = importZine(zine)
                if (id) navigate(`/edit/${id}`)
              }}
            >
              Remix into studio
            </ComicButton>
          </div>
        </article>
      </div>
    </div>
  )
}
