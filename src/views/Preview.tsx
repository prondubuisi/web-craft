import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { copyText, encodeShare } from '../lib/share'
import { useCountdown } from '../lib/useCountdown'
import { coverSrc } from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function Preview() {
  const { id } = useParams()
  const { zineById, likeZine, remixZine, recordView, profile } = useZines()
  const zine = id ? zineById(id) : undefined
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const drop = useCountdown(zine?.dropsAt)
  const locked = Boolean(zine && zine.published && !drop.live && zine.owner !== 'you')

  useEffect(() => {
    if (id && zine && !locked) recordView(id)
  }, [id])

  if (!zine) {
    return (
      <div data-vibe="miles">
        <Topbar />
        <main className="studio">
          <h1 className="display">missing issue</h1>
          <Link to="/explore" className="comic-btn">
            Back to stream
          </Link>
        </main>
      </div>
    )
  }

  const liked = profile.likedIds.includes(zine.id)

  async function share() {
    const url = `${window.location.origin}/s#${encodeShare(zine as NonNullable<typeof zine>)}`
    const ok = await copyText(url)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div data-vibe={zine.vibe}>
      <Topbar />
      <div className="preview-page">
        <article className="zine-page">
          {!drop.live && zine.published ? (
            <div className="next-issue">
              <span className="kicker">NEXT ISSUE</span>
              <strong className="display">{drop.label}</strong>
              {zine.owner === 'you' ? (
                <p className="hand">you can still read your own drop.</p>
              ) : (
                <p className="hand">come back when the clock hits.</p>
              )}
            </div>
          ) : null}

          {locked ? (
            <div className="drop-lock">
              <Halftone src={coverSrc(zine)} alt="" className="hero-shot" />
              <h1 className="display chroma" style={{ marginTop: 12 }}>
                {zine.title}
              </h1>
              <p className="serif">
                {zine.owner} sealed this issue. The pages stay folded until the drop.
              </p>
            </div>
          ) : (
            <>
              <div className="meta-line" style={{ marginBottom: '0.8rem' }}>
                <span className="issue-chip">{zine.vibe}</span>
                <span>{zine.owner}</span>
                <span>{zine.views} views</span>
              </div>
              {zine.blocks.map((block) => (
                <div key={block.id} className="block">
                  <BlockView block={block} />
                </div>
              ))}
            </>
          )}

          <div className="cta-row" style={{ marginTop: '1.4rem' }}>
            {!locked ? (
              <ComicButton className={liked ? 'pink' : ''} onClick={() => likeZine(zine.id)}>
                {liked ? 'Liked' : 'Like'} · {zine.likes}
              </ComicButton>
            ) : null}
            <ComicButton
              className="cyan"
              onClick={() => {
                const next = remixZine(zine.id)
                if (next) navigate(`/edit/${next}`)
              }}
            >
              Remix · {zine.remixes}
            </ComicButton>
            <ComicButton className="small" onClick={() => void share()}>
              {copied ? 'Copied' : 'Copy snapshot'}
            </ComicButton>
            {zine.owner === 'you' ? (
              <Link to={`/edit/${zine.id}`} className="comic-btn ghost">
                Edit
              </Link>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}
