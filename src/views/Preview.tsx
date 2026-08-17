import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { FoldSheet } from '../components/FoldSheet'
import { FlipReader } from '../components/FlipReader'
import { Comments } from '../components/Comments'
import { Margins } from '../components/Margins'
import { Reviews } from '../components/Reviews'
import { api } from '../lib/api'
import { appHref } from '../lib/paths'
import { copyText, tryEncodeShare } from '../lib/share'
import { stampIssue } from '../lib/social'
import { useCountdown } from '../lib/useCountdown'
import { useIssueSocial } from '../lib/useIssueSocial'
import {
  byline,
  canOpenSecret,
  coverSrc,
  fingerprint,
  isCapsule,
  isMine,
  issuePath,
  profilePath,
  runLabel,
  seriesLabel,
  wearLevel,
} from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function Preview() {
  const { id } = useParams()
  const search = new URLSearchParams(useLocation().search)
  const key = search.get('k')
  const chainInvite = search.get('chain')
  const { zineById, likeZine, remixZine, recordView, profile, session, online } = useZines()
  const found = id ? zineById(id) : undefined
  const [remote, setRemote] = useState<typeof found>()
  const [unlocked, setUnlocked] = useState(false)
  const [pass, setPass] = useState('')
  const [passError, setPassError] = useState('')
  const zine = found ?? remote
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [fold, setFold] = useState(false)
  const [flip, setFlip] = useState(false)
  const [bOpen, setBOpen] = useState(false)
  const [more, setMore] = useState(false)
  const drop = useCountdown(zine?.dropsAt)
  const mine = Boolean(zine && isMine(zine, session?.name))
  const secretOk = Boolean(zine && canOpenSecret(zine, key))
  const hiddenUnlisted = Boolean(zine && zine.visibility === 'unlisted' && !mine && !secretOk)
  const needsPass = Boolean(zine && zine.hasPass && !mine && !unlocked)
  const locked = Boolean(zine && zine.published && !drop.live && !mine)
  const social = useIssueSocial({
    id,
    zine,
    locked,
    needsPass,
    mine,
    online,
    session,
    profileName: profile.name,
    chainInvite,
  })

  useEffect(() => {
    if (!id || found || !online) return
    void api
      .get(id, key)
      .then((res) => {
        setRemote(res.zine)
        if (res.locked) setUnlocked(false)
      })
      .catch(() => undefined)
  }, [id, found, online, key])

  useEffect(() => {
    if (id && zine && !locked) recordView(id)
    if (id && zine && !locked && !needsPass && !mine) {
      stampIssue(session?.name ?? profile.name, {
        zineId: zine.id,
        title: zine.title,
        owner: zine.owner,
        vibe: zine.vibe,
        createdAt: Date.now(),
      })
      if (online && session) void api.stamp(zine.id).catch(() => undefined)
    }
  }, [id])

  if (!zine || hiddenUnlisted) {
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
    const target = zine as NonNullable<typeof zine>
    if (target.visibility === 'unlisted') {
      const ok = await copyText(appHref(issuePath(target)))
      setCopied(ok)
      window.setTimeout(() => setCopied(false), 2000)
      return
    }
    const packed = tryEncodeShare(target)
    if (!packed.ok) {
      window.alert(packed.reason)
      return
    }
    const ok = await copyText(`${appHref('/s')}#${packed.token}`)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function unlock() {
    setPassError('')
    if (online && !found) {
      try {
        const res = await api.unlock(zine!.id, pass, key)
        setRemote(res.zine)
        setUnlocked(true)
      } catch (err) {
        setPassError(err instanceof Error ? err.message : 'Wrong passphrase')
      }
      return
    }
    if (zine?.passHash) {
      const next = await fingerprint(pass)
      if (next !== zine.passHash) {
        setPassError('Wrong passphrase')
        return
      }
    }
    setUnlocked(true)
  }

  return (
    <div className={`finish-${zine.finish ?? 'clean'} wear-${wearLevel(zine)}`} data-vibe={zine.vibe}>
      <Topbar />
      <div className="preview-page">
        <article className={`zine-page${zine.scatter ? ' scatter' : ''}`}>
          {!drop.live && zine.published ? (
            <div className="next-issue">
              <span className="kicker">{isCapsule(zine) ? 'TIME CAPSULE' : 'NEXT ISSUE'}</span>
              <strong className="display">{drop.label}</strong>
              {isMine(zine, session?.name) ? (
                <p className="hand">you can still read your own drop.</p>
              ) : (
                <p className="hand">
                  {isCapsule(zine) ? 'sealed for a future reader. do not open early.' : 'come back when the clock hits.'}
                </p>
              )}
            </div>
          ) : null}

          {needsPass ? (
            <div className="drop-lock">
              <h1 className="display chroma">{zine.title}</h1>
              <p className="serif">This issue is folded behind a passphrase.</p>
              {!online ? (
                <p className="hand">theater until the API is up — the pages still live in this browser.</p>
              ) : null}
              <form
                className="board-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void unlock()
                }}
              >
                <input
                  type="password"
                  value={pass}
                  placeholder="passphrase"
                  onChange={(e) => setPass(e.target.value)}
                />
                {passError ? <p className="hand">{passError}</p> : null}
                <ComicButton className="pink">Unlock</ComicButton>
              </form>
            </div>
          ) : locked ? (
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
              {zine.dedication ? (
                <p className="dedication serif">for {zine.dedication}</p>
              ) : null}
              {zine.errata ? (
                <aside className="errata-slip">
                  <div className="issue-chip">ERRATA</div>
                  <p className="serif">{zine.errata}</p>
                </aside>
              ) : null}
              {(zine.includes ?? []).length ? (
                <aside className="comp-list">
                  <div className="issue-chip">THIS COMP STOCKS</div>
                  <div className="cta-row" style={{ marginTop: 8 }}>
                    {zine.includes!.map((item) => (
                      <Link key={item.zineId} to={`/z/${item.zineId}`} className="comic-btn small">
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </aside>
              ) : null}
              <div className="meta-line" style={{ marginBottom: '0.8rem' }}>
                <span className="issue-chip">{zine.vibe}</span>
                {seriesLabel(zine) ? <span className="issue-chip">{seriesLabel(zine)}</span> : null}
                {zine.jamId ? <span className="issue-chip">JAM</span> : null}
                {social.archive.archived ? <span className="issue-chip">ARCHIVE</span> : null}
                {runLabel(zine) ? <span className="issue-chip">{runLabel(zine)}</span> : null}
                {(zine.includes ?? []).length ? <span className="issue-chip">COMP</span> : null}
                <Link className="owner-link" to={profilePath(zine.owner)}>
                  {byline(zine)}
                </Link>
                <span>{zine.views} views</span>
              </div>
              {chainInvite && social.chainPrev ? (
                <div className="chain-peek">
                  <div className="issue-chip">EXQUISITE CORPSE · last page only</div>
                  {social.chainPrev.map((block) => (
                    <div key={block.id} className="block">
                      <BlockView block={block} />
                    </div>
                  ))}
                  <form
                    className="board-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      social.passCorpse()
                    }}
                  >
                    <textarea
                      value={social.chainText}
                      onChange={(e) => social.setChainText(e.target.value)}
                      placeholder="add the next page"
                    />
                    <ComicButton className="pink">Pass it on</ComicButton>
                    {social.chainMsg ? <p className="hand">{social.chainMsg}</p> : null}
                  </form>
                </div>
              ) : flip ? (
                <FlipReader
                  zine={zine}
                  polls={social.polls}
                  stats={mine ? social.stats : undefined}
                  onVote={(blockId, option) => {
                    const block = zine.blocks.find((b) => b.id === blockId)
                    if (!block || block.type !== 'poll') return
                    social.vote(blockId, option, block.options.length)
                  }}
                  onPage={social.hitPage}
                />
              ) : (
                zine.blocks.map((block, i) => (
                  <div
                    key={block.id}
                    className={`block${
                      zine.scatter && (block.type === 'sticker' || block.type === 'hero')
                        ? ' scatter-pin'
                        : ''
                    }`}
                    style={
                      zine.scatter && (block.type === 'sticker' || block.type === 'hero')
                        ? {
                            left: `${block.x ?? (i % 3) * 28 + 6}%`,
                            top: `${block.y ?? Math.floor(i / 3) * 26 + 8}%`,
                          }
                        : undefined
                    }
                  >
                    <BlockView
                      block={block}
                      poll={social.polls[block.id]}
                      onMail={block.type === 'reply' && !mine ? social.mailMaker : undefined}
                      onVote={
                        block.type === 'poll'
                          ? (option) => social.vote(block.id, option, block.options.length)
                          : undefined
                      }
                    />
                    <Margins
                      zineId={zine.id}
                      blockId={block.id}
                      notes={social.margins}
                      remote={social.remoteSocial}
                      onAdd={social.addMargin}
                    />
                  </div>
                ))
              )}
            </>
          )}

          <div className="cta-row issue-actions" style={{ marginTop: '1.4rem' }}>
            {!locked ? (
              <ComicButton className={liked ? 'pink' : ''} onClick={() => likeZine(zine.id)}>
                {liked ? 'Liked' : 'Like'} · {zine.likes}
              </ComicButton>
            ) : null}
            <ComicButton
              className="cyan"
              onClick={() => {
                void remixZine(zine.id, zine).then((next) => {
                  if (next) navigate(`/edit/${next}`)
                })
              }}
            >
              Remix · {zine.remixes}
            </ComicButton>
            {!locked ? (
              <ComicButton className="small ghost no-print" onClick={() => window.print()}>
                Print issue
              </ComicButton>
            ) : null}
            {!locked && !needsPass ? (
              <ComicButton className="small no-print" onClick={() => setFlip((v) => !v)}>
                {flip ? 'Scroll' : 'Flip pages'}
              </ComicButton>
            ) : null}
            {!locked && !needsPass ? (
              <ComicButton
                className={`small no-print ${social.bagged ? 'pink' : 'ghost'}`}
                onClick={social.toggleBag}
              >
                {social.bagged ? 'In the bag' : 'Stuff in bag'}
              </ComicButton>
            ) : null}
            {isMine(zine, session?.name) ? (
              <Link to={`/edit/${zine.id}`} className="comic-btn ghost">
                Edit
              </Link>
            ) : null}
            {!locked ? (
              <ComicButton className="small ghost no-print" onClick={() => setMore((v) => !v)}>
                {more ? 'Less' : 'More on this issue'}
              </ComicButton>
            ) : null}
          </div>
          {more && !locked ? (
            <div className="cta-row issue-more" style={{ marginTop: '0.7rem' }}>
              <ComicButton className="small" onClick={() => void share()}>
                {copied ? 'Copied' : 'Copy snapshot'}
              </ComicButton>
              <ComicButton
                className="small no-print"
                onClick={() => {
                  setFold(true)
                  document.body.classList.add('fold-print')
                  window.setTimeout(() => {
                    window.print()
                    document.body.classList.remove('fold-print')
                  }, 50)
                }}
              >
                Print fold sheet
              </ComicButton>
              <ComicButton className="small ghost no-print" onClick={() => setFold((v) => !v)}>
                {fold ? 'Hide fold' : 'Preview fold'}
              </ComicButton>
              {!needsPass && !mine ? (
                <ComicButton
                  className="small cyan no-print"
                  onClick={() => {
                    social.stock()
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1600)
                  }}
                >
                  Stock in distro
                </ComicButton>
              ) : null}
              {!needsPass && !mine ? (
                <ComicButton
                  className={`small no-print ${social.archive.mine ? 'pink' : 'ghost'}`}
                  onClick={social.nominate}
                >
                  {social.archive.mine ? 'Nominated' : 'Nominate'} · {social.archive.noms}
                </ComicButton>
              ) : null}
              {!needsPass && zine.series ? (
                <ComicButton
                  className={`small no-print ${social.watchingRun ? 'pink' : 'ghost'}`}
                  onClick={social.watchRun}
                >
                  {social.watchingRun ? 'Watching run' : 'Watch this run'}
                </ComicButton>
              ) : null}
              {!needsPass && social.archive.archived && !mine ? (
                <ComicButton
                  className={`small no-print ${social.loaned ? 'pink' : 'ghost'}`}
                  onClick={social.checkout}
                >
                  {social.loaned ? 'On loan' : 'Check out'}
                </ComicButton>
              ) : null}
              {!needsPass && zine.editionSize && !mine ? (
                <ComicButton
                  className={`small no-print ${social.run.mine ? 'pink' : ''}`}
                  disabled={social.run.out && !social.run.mine}
                  onClick={social.claim}
                >
                  {social.run.out && !social.run.mine
                    ? 'Out of print'
                    : social.run.mine
                      ? `Copy ${social.run.claimed}/${zine.editionSize}`
                      : `Claim ${social.run.claimed + 1}/${zine.editionSize}`}
                </ComicButton>
              ) : null}
              {!needsPass && zine.bSide ? (
                <ComicButton className="small no-print" onClick={() => setBOpen((v) => !v)}>
                  {bOpen ? 'Fold the b-side' : 'Unfold the b-side'}
                </ComicButton>
              ) : null}
              {mine && zine.chainOpen && zine.chainKey ? (
                <ComicButton
                  className="small no-print"
                  onClick={() => {
                    void copyText(appHref(`/z/${zine.id}?chain=${zine.chainKey}`))
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  Copy corpse link
                </ComicButton>
              ) : null}
            </div>
          ) : null}
          {social.mailNote ? <p className="hand">{social.mailNote}</p> : null}
          {bOpen && zine.bSide ? (
            <aside className="bside-reveal">
              <div className="issue-chip">B-SIDE</div>
              <p className="serif">{zine.bSide}</p>
            </aside>
          ) : null}
          {!locked && !needsPass ? (
            <section className="issue-ink" aria-label="Ink">
              <div className="issue-chip">INK</div>
              <p className="serif ink-lede">
                A blurb is one line. A letter stays. ¶ on a panel is a margin note. Dedication and
                tear-out live with the maker.
              </p>
              <Reviews zineId={zine.id} locked={false} remote={social.remoteSocial} />
              <Comments zineId={zine.id} locked={false} remote={social.remoteSocial} />
            </section>
          ) : null}
        </article>
        {!locked ? (
          <div className={`fold-wrap ${fold ? 'on' : ''}`}>
            <p className="serif no-print fold-help">
              One landscape sheet. Top row prints upside-down. Fold in half, then quarters, slit the
              middle, and staple the spine. Page 1 is the cover.
            </p>
            <FoldSheet zine={zine} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
