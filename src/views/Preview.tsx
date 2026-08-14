import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { Comments } from '../components/Comments'
import { appHref } from '../lib/paths'
import { copyText, encodeShare } from '../lib/share'
import { loadLocalPolls, voteLocalPoll } from '../lib/social'
import { useCountdown } from '../lib/useCountdown'
import { api } from '../lib/api'
import type { PollTally } from '../lib/types'
import { coverSrc, isMine, profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function Preview() {
  const { id } = useParams()
  const { zineById, likeZine, remixZine, recordView, profile, session, online } = useZines()
  const local = id ? zineById(id) : undefined
  const [remote, setRemote] = useState<typeof local>()
  const zine = local ?? remote
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [polls, setPolls] = useState<Record<string, PollTally>>({})
  const drop = useCountdown(zine?.dropsAt)
  const locked = Boolean(zine && zine.published && !drop.live && !isMine(zine, session?.name))

  useEffect(() => {
    if (!id || local || !online) return
    void api
      .get(id)
      .then((res) => setRemote(res.zine))
      .catch(() => undefined)
  }, [id, local, online])

  useEffect(() => {
    if (id && zine && !locked) recordView(id)
  }, [id])

  const remoteSocial = Boolean(online && zine?.published && zine.owner !== 'you')

  useEffect(() => {
    if (!id || locked) return
    if (remoteSocial) {
      void api
        .polls(id)
        .then((res) => setPolls(res.polls))
        .catch(() => setPolls(loadLocalPolls(id)))
    } else {
      setPolls(id ? loadLocalPolls(id) : {})
    }
  }, [id, remoteSocial, locked])

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
    const url = `${appHref('/s')}#${encodeShare(zine as NonNullable<typeof zine>)}`
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
              {isMine(zine, session?.name) ? (
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
                <Link className="owner-link" to={profilePath(zine.owner)}>
                  {zine.owner}
                </Link>
                <span>{zine.views} views</span>
              </div>
              {zine.blocks.map((block) => (
                <div key={block.id} className="block">
                  <BlockView
                    block={block}
                    poll={polls[block.id]}
                    onVote={
                      block.type === 'poll'
                        ? (option) => {
                            if (online && session) {
                              void api
                                .votePoll(zine.id, block.id, option)
                                .then((res) => setPolls((prev) => ({ ...prev, [block.id]: res })))
                                .catch(() => undefined)
                              return
                            }
                            setPolls((prev) => ({
                              ...prev,
                              [block.id]: voteLocalPoll(zine.id, block.id, option, block.options.length),
                            }))
                          }
                        : undefined
                    }
                  />
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
                void remixZine(zine.id).then((next) => {
                  if (next) navigate(`/edit/${next}`)
                })
              }}
            >
              Remix · {zine.remixes}
            </ComicButton>
            <ComicButton className="small" onClick={() => void share()}>
              {copied ? 'Copied' : 'Copy snapshot'}
            </ComicButton>
            {!locked ? (
              <ComicButton className="small ghost no-print" onClick={() => window.print()}>
                Print issue
              </ComicButton>
            ) : null}
            {isMine(zine, session?.name) ? (
              <Link to={`/edit/${zine.id}`} className="comic-btn ghost">
                Edit
              </Link>
            ) : null}
          </div>
          <Comments zineId={zine.id} locked={locked} remote={remoteSocial} />
        </article>
      </div>
    </div>
  )
}
