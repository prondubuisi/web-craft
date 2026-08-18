import { useEffect, useState } from 'react'
import { api } from './api'
import { actionError, catchBackground } from './catch'
import { appHref } from './paths'
import { copyText } from './share'
import {
  bumpPageStat,
  checkoutLocal,
  claimLocal,
  claimState,
  dumpBag,
  inBag,
  loadLoans,
  loadLocalPolls,
  loadMargins,
  loadPageStats,
  loadSeriesWatch,
  nomState,
  nominateLocal,
  sendLetter,
  stockShelf,
  toggleSeriesWatch,
  tuckBag,
  voteLocalPoll,
} from './social'
import { createBlock } from './widgets'
import type { Session } from './contract'
import type { Block, MarginNote, PageStat, PollTally, Zine } from './types'

type ArchiveState = { noms: number; archived: boolean; mine: boolean }
type RunState = { claimed: number; mine: boolean; out: boolean }

export function useIssueSocial(opts: {
  id: string | undefined
  zine: Zine | undefined
  locked: boolean
  needsPass: boolean
  mine: boolean
  online: boolean
  session: Session | null
  profileName: string
  chainInvite: string | null
}) {
  const { id, zine, locked, needsPass, mine, online, session, profileName, chainInvite } = opts
  const [polls, setPolls] = useState<Record<string, PollTally>>({})
  const [stats, setStats] = useState<PageStat[]>([])
  const [chainPrev, setChainPrev] = useState<Block[] | null>(null)
  const [chainTurn, setChainTurn] = useState<number | null>(null)
  const [chainText, setChainText] = useState('the next fold.')
  const [chainMsg, setChainMsg] = useState('')
  const [bagged, setBagged] = useState(false)
  const [margins, setMargins] = useState<MarginNote[]>([])
  const [archive, setArchive] = useState<ArchiveState>({ noms: 0, archived: false, mine: false })
  const [run, setRun] = useState<RunState>({ claimed: 0, mine: false, out: false })
  const [loaned, setLoaned] = useState(false)
  const [watchingRun, setWatchingRun] = useState(false)
  const [mailNote, setMailNote] = useState('')

  const bagOwner = session?.name ?? profileName
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

  const zineId = zine?.id
  useEffect(() => {
    if (!zineId) return
    if (online && session) {
      void api
        .bag()
        .then((res) => setBagged(res.bag.some((item) => item.zineId === zineId)))
        .catch(() => setBagged(inBag(bagOwner, zineId)))
      return
    }
    setBagged(inBag(bagOwner, zineId))
  }, [zineId, online, session, bagOwner])

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
    setWatchingRun(
      Boolean(zine?.series && loadSeriesWatch(bagOwner).includes(zine.series.trim().toLowerCase())),
    )
    if (zine?.editionSize) {
      const claim = claimState(bagOwner, id, zine.editionSize)
      setRun({
        claimed: zine.claimed ?? claim.claimed,
        mine: zine.claimedByMe ?? claim.mine,
        out: claim.out || (zine.claimed ?? 0) >= zine.editionSize,
      })
    }
  }, [
    id,
    remoteSocial,
    locked,
    needsPass,
    bagOwner,
    zine?.noms,
    zine?.archived,
    zine?.editionSize,
    zine?.claimed,
    zine?.claimedByMe,
    zine?.series,
  ])

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
      .then((res) => {
        setChainPrev(res.previous)
        setChainTurn(res.turn)
      })
      .catch(() => {
        setChainPrev(null)
        setChainTurn(null)
      })
  }, [id, chainInvite, online])

  function vote(blockId: string, option: number, optionCount: number) {
    if (!zine) return
    if (online && session) {
      void api
        .votePoll(zine.id, blockId, option)
        .then((res) => setPolls((prev) => ({ ...prev, [blockId]: res })))
        .catch(() =>
          setPolls((prev) => ({
            ...prev,
            [blockId]: voteLocalPoll(zine.id, blockId, option, optionCount),
          })),
        )
      return
    }
    setPolls((prev) => ({
      ...prev,
      [blockId]: voteLocalPoll(zine.id, blockId, option, optionCount),
    }))
  }

  function hitPage(page: number, dwell: number) {
    if (!zine) return
    setStats(bumpPageStat(zine.id, page, dwell))
    if (online) void api.pageHit(zine.id, page, dwell).catch(catchBackground)
  }

  function toggleBag() {
    if (!zine) return
    if (bagged) {
      dumpBag(bagOwner, zine.id)
      if (session && online) void api.dump(zine.id).catch(catchBackground)
      setBagged(false)
      return
    }
    tuckBag(bagOwner, {
      zineId: zine.id,
      title: zine.title,
      owner: zine.owner,
      vibe: zine.vibe,
    })
    if (session && online) void api.tuck(zine.id).catch(catchBackground)
    setBagged(true)
  }

  function stock() {
    if (!zine) return
    stockShelf(bagOwner, {
      zineId: zine.id,
      title: zine.title,
      owner: zine.owner,
      note: 'stocked from the pile',
      vibe: zine.vibe,
    })
    if (session && online) void api.stock(zine.id).catch(catchBackground)
  }

  function nominate() {
    if (!zine) return
    if (session && online) {
      void api
        .nominate(zine.id)
        .then((res) => setArchive(res))
        .catch(() => setArchive(nominateLocal(bagOwner, zine.id)))
      return
    }
    setArchive(nominateLocal(bagOwner, zine.id))
  }

  function watchRun() {
    if (!zine?.series) return
    const next = toggleSeriesWatch(bagOwner, zine.series)
    setWatchingRun(next.includes(zine.series.trim().toLowerCase()))
    if (session && online) void api.watchSeries(zine.series).catch(catchBackground)
  }

  function checkout() {
    if (!zine) return
    checkoutLocal(bagOwner, zine.id, zine.title, { owner: zine.owner, vibe: zine.vibe })
    setLoaned(true)
    setBagged(true)
    if (session && online) void api.checkout(zine.id).catch(catchBackground)
  }

  function claim() {
    if (!zine?.editionSize) return
    if (session && online) {
      void api
        .claim(zine.id)
        .then((res) => setRun(res))
        .catch(() => setRun(claimLocal(bagOwner, zine.id, zine.editionSize ?? 0)))
      return
    }
    setRun(claimLocal(bagOwner, zine.id, zine.editionSize))
  }

  function mailMaker(text: string) {
    if (!zine) return
    const dest = zine.owner.replace(/^@/, '')
    if (dest === 'you') {
      sendLetter(bagOwner, dest, text, { postcard: true, vibe: zine.vibe })
      setMailNote('postcard folded.')
      return
    }
    if (online && session) {
      void api
        .sendMail(dest, text, { postcard: true, vibe: zine.vibe })
        .then(() => setMailNote('postcard mailed.'))
        .catch(() => {
          sendLetter(bagOwner, dest, text, { postcard: true, vibe: zine.vibe })
          setMailNote('postcard folded.')
        })
      return
    }
    sendLetter(bagOwner, dest, text, { postcard: true, vibe: zine.vibe })
    setMailNote('postcard folded.')
  }

  function passCorpse() {
    if (!zine || !chainInvite) return
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
        .catch((err: unknown) => setChainMsg(actionError(err, 'could not add')))
    } else {
      setChainMsg('claim a handle to pass the corpse on the API')
    }
  }

  return {
    bagOwner,
    remoteSocial,
    polls,
    stats,
    chainPrev,
    chainTurn,
    chainText,
    setChainText,
    chainMsg,
    bagged,
    margins,
    addMargin: (note: MarginNote) => setMargins((prev) => [...prev, note]),
    archive,
    run,
    loaned,
    watchingRun,
    mailNote,
    vote,
    hitPage,
    toggleBag,
    stock,
    nominate,
    watchRun,
    checkout,
    claim,
    mailMaker,
    passCorpse,
  }
}
