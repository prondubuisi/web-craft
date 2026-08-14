import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, Topbar } from '../components/Chrome'
import { FoldSheet } from '../components/FoldSheet'
import { FlipReader } from '../components/FlipReader'
import { Comments } from '../components/Comments'
import { Margins } from '../components/Margins'
import { Reviews } from '../components/Reviews'
import { appHref } from '../lib/paths'
import { copyText, encodeShare } from '../lib/share'
import {
  bumpPageStat,
  checkoutLocal,
  claimLocal,
  claimState,
  dumpBag,
  loadLoans,
  inBag,
  loadLocalPolls,
  loadMargins,
  loadPageStats,
  nomState,
  nominateLocal,
  stampIssue,
  stockShelf,
  tuckBag,
  voteLocalPoll,
} from '../lib/social'
import { createBlock } from '../lib/widgets'
import { useCountdown } from '../lib/useCountdown'
import { api } from '../lib/api'
import type { Block, MarginNote, PageStat, PollTally } from '../lib/types'
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
  const [polls, setPolls] = useState<Record<string, PollTally>>({})
  const [flip, setFlip] = useState(false)
  const [stats, setStats] = useState<PageStat[]>([])
  const [chainPrev, setChainPrev] = useState<Block[] | null>(null)
  const [chainText, setChainText] = useState('the next fold.')
  const [chainMsg, setChainMsg] = useState('')
  const [bagged, setBagged] = useState(false)
  const [margins, setMargins] = useState<MarginNote[]>([])
  const [archive, setArchive] = useState({ noms: 0, archived: false, mine: false })
  const [bOpen, setBOpen] = useState(false)
  const [run, setRun] = useState({ claimed: 0, mine: false, out: false })
  const [loaned, setLoaned] = useState(false)
  const drop = useCountdown(zine?.dropsAt)
  const mine = Boolean(zine && isMine(zine, session?.name))
  const secretOk = Boolean(zine && canOpenSecret(zine, key))
  const hiddenUnlisted = Boolean(zine && zine.visibility === 'unlisted' && !mine && !secretOk)
  const needsPass = Boolean(zine && zine.hasPass && !mine && !unlocked)
  const locked = Boolean(zine && zine.published && !drop.live && !mine)

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

  const bagOwner = session?.name ?? profile.name

  useEffect(() => {
    if (!zine) return
    if (online && session) {
      void api
        .bag()
        .then((res) => setBagged(res.bag.some((item) => item.zineId === zine.id)))
        .catch(() => setBagged(inBag(bagOwner, zine.id)))
      return
    }
    setBagged(inBag(bagOwner, zine.id))
  }, [zine?.id, online, session, bagOwner])

  useEffect(() => {
    if (!id || locked || needsPass) return
    if (remoteSocial) {
      void api
        .margins(id)
        .then((res) => setMargins(res.notes))
        .catch(() => setMargins(loadMargins(id)))
    } else {
      setMargins(loadMargins(id))
    }
    const local = nomState(bagOwner, id)
    setArchive({
      noms: zine?.noms ?? local.noms,
      archived: zine?.archived ?? local.archived,
      mine: local.mine,
    })
    setLoaned(loadLoans(bagOwner).some((row) => row.zineId === id))
    if (zine?.editionSize) {
      const claim = claimState(bagOwner, id, zine.editionSize)
      setRun({
        claimed: zine.claimed ?? claim.claimed,
        mine: zine.claimedByMe ?? claim.mine,
        out: claim.out || (zine.claimed ?? 0) >= zine.editionSize,
      })
    }
  }, [id, remoteSocial, locked, needsPass, bagOwner, zine?.noms, zine?.archived, zine?.editionSize, zine?.claimed, zine?.claimedByMe])

  useEffect(() => {
    if (!id || locked || needsPass) return
    if (online && mine) {
      void api.pageStats(id).then((res) => setStats(res.pages)).catch(() => setStats(loadPageStats(id)))
    } else if (id) {
      setStats(loadPageStats(id))
    }
  }, [id, online, mine, locked, needsPass])

  useEffect(() => {
    if (!id || !chainInvite || !online) return
    void api
      .chainPeek(id, chainInvite)
      .then((res) => setChainPrev(res.previous))
      .catch(() => setChainPrev(null))
  }, [id, chainInvite, online])

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
    const url =
      target.visibility === 'unlisted'
        ? appHref(issuePath(target))
        : `${appHref('/s')}#${encodeShare(target)}`
    const ok = await copyText(url)
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
        <article className="zine-page">
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
                {archive.archived ? <span className="issue-chip">ARCHIVE</span> : null}
                {runLabel(zine) ? <span className="issue-chip">{runLabel(zine)}</span> : null}
                {(zine.includes ?? []).length ? <span className="issue-chip">COMP</span> : null}
                <Link className="owner-link" to={profilePath(zine.owner)}>
                  {byline(zine)}
                </Link>
                <span>{zine.views} views</span>
              </div>
              {chainInvite && chainPrev ? (
                <div className="chain-peek">
                  <div className="issue-chip">EXQUISITE CORPSE · last page only</div>
                  {chainPrev.map((block) => (
                    <div key={block.id} className="block">
                      <BlockView block={block} />
                    </div>
                  ))}
                  <form
                    className="board-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const next = [createBlock('sticker', zine.vibe)]
                      if (next[0] && next[0].type === 'sticker') next[0].text = chainText
                      if (online) {
                        void api
                          .chainAdd(zine.id, chainInvite, next)
                          .then((res) => {
                            const url = appHref(`/z/${zine.id}?chain=${res.invite}`)
                            void copyText(url)
                            setChainMsg('page added. next invite copied.')
                          })
                          .catch((err: unknown) =>
                            setChainMsg(err instanceof Error ? err.message : 'could not add'),
                          )
                      } else {
                        setChainMsg('claim a handle to pass the corpse on the API')
                      }
                    }}
                  >
                    <textarea
                      value={chainText}
                      onChange={(e) => setChainText(e.target.value)}
                      placeholder="add the next page"
                    />
                    <ComicButton className="pink">Pass it on</ComicButton>
                    {chainMsg ? <p className="hand">{chainMsg}</p> : null}
                  </form>
                </div>
              ) : flip ? (
                <FlipReader
                  zine={zine}
                  polls={polls}
                  stats={mine ? stats : undefined}
                  onVote={(blockId, option) => {
                    const block = zine.blocks.find((b) => b.id === blockId)
                    if (!block || block.type !== 'poll') return
                    if (online && session) {
                      void api
                        .votePoll(zine.id, blockId, option)
                        .then((res) => setPolls((prev) => ({ ...prev, [blockId]: res })))
                      return
                    }
                    setPolls((prev) => ({
                      ...prev,
                      [blockId]: voteLocalPoll(zine.id, blockId, option, block.options.length),
                    }))
                  }}
                  onPage={(page, dwell) => {
                    setStats(bumpPageStat(zine.id, page, dwell))
                    if (online) void api.pageHit(zine.id, page, dwell).catch(() => undefined)
                  }}
                />
              ) : (
                zine.blocks.map((block) => (
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
                    <Margins
                      zineId={zine.id}
                      blockId={block.id}
                      notes={margins}
                      remote={remoteSocial}
                      onAdd={(note) => setMargins((prev) => [...prev, note])}
                    />
                  </div>
                ))
              )}
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
            {!locked ? (
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
            ) : null}
            {!locked ? (
              <ComicButton className="small ghost no-print" onClick={() => setFold((v) => !v)}>
                {fold ? 'Hide fold' : 'Preview fold'}
              </ComicButton>
            ) : null}
            {!locked && !needsPass ? (
              <ComicButton className="small no-print" onClick={() => setFlip((v) => !v)}>
                {flip ? 'Scroll' : 'Flip pages'}
              </ComicButton>
            ) : null}
            {!locked && !needsPass && !mine ? (
              <ComicButton
                className="small cyan no-print"
                onClick={() => {
                  const owner = session?.name ?? profile.name
                  stockShelf(owner, {
                    zineId: zine.id,
                    title: zine.title,
                    owner: zine.owner,
                    note: 'stocked from the pile',
                    vibe: zine.vibe,
                  })
                  if (session && online) void api.stock(zine.id).catch(() => undefined)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1600)
                }}
              >
                Stock in distro
              </ComicButton>
            ) : null}
            {!locked && !needsPass ? (
              <ComicButton
                className={`small no-print ${bagged ? 'pink' : 'ghost'}`}
                onClick={() => {
                  if (bagged) {
                    dumpBag(bagOwner, zine.id)
                    if (session && online) void api.dump(zine.id).catch(() => undefined)
                    setBagged(false)
                    return
                  }
                  tuckBag(bagOwner, {
                    zineId: zine.id,
                    title: zine.title,
                    owner: zine.owner,
                    vibe: zine.vibe,
                  })
                  if (session && online) void api.tuck(zine.id).catch(() => undefined)
                  setBagged(true)
                }}
              >
                {bagged ? 'In the bag' : 'Stuff in bag'}
              </ComicButton>
            ) : null}
            {!locked && !needsPass && !mine ? (
              <ComicButton
                className={`small no-print ${archive.mine ? 'pink' : 'ghost'}`}
                onClick={() => {
                  if (session && online) {
                    void api
                      .nominate(zine.id)
                      .then((res) => setArchive(res))
                      .catch(() => setArchive(nominateLocal(bagOwner, zine.id)))
                    return
                  }
                  setArchive(nominateLocal(bagOwner, zine.id))
                }}
              >
                {archive.mine ? 'Nominated' : 'Nominate'} · {archive.noms}
              </ComicButton>
            ) : null}
            {!locked && !needsPass && archive.archived && !mine ? (
              <ComicButton
                className={`small no-print ${loaned ? 'pink' : 'ghost'}`}
                onClick={() => {
                  checkoutLocal(bagOwner, zine.id, zine.title)
                  setLoaned(true)
                  if (session && online) void api.checkout(zine.id).catch(() => undefined)
                }}
              >
                {loaned ? 'On loan' : 'Check out'}
              </ComicButton>
            ) : null}
            {!locked && !needsPass && zine.editionSize && !mine ? (
              <ComicButton
                className={`small no-print ${run.mine ? 'pink' : ''}`}
                disabled={run.out && !run.mine}
                onClick={() => {
                  if (session && online) {
                    void api
                      .claim(zine.id)
                      .then((res) => setRun(res))
                      .catch(() => setRun(claimLocal(bagOwner, zine.id, zine.editionSize ?? 0)))
                    return
                  }
                  setRun(claimLocal(bagOwner, zine.id, zine.editionSize ?? 0))
                }}
              >
                {run.out && !run.mine
                  ? 'Out of print'
                  : run.mine
                    ? `Copy ${run.claimed}/${zine.editionSize}`
                    : `Claim ${run.claimed + 1}/${zine.editionSize}`}
              </ComicButton>
            ) : null}
            {!locked && !needsPass && zine.bSide ? (
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
            {isMine(zine, session?.name) ? (
              <Link to={`/edit/${zine.id}`} className="comic-btn ghost">
                Edit
              </Link>
            ) : null}
          </div>
          {bOpen && zine.bSide ? (
            <aside className="bside-reveal">
              <div className="issue-chip">B-SIDE</div>
              <p className="serif">{zine.bSide}</p>
            </aside>
          ) : null}
          <Reviews zineId={zine.id} locked={locked || needsPass} remote={remoteSocial} />
          <Comments zineId={zine.id} locked={locked || needsPass} remote={remoteSocial} />
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
