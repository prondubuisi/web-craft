import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { BottomSheet, CheckCircle, ComicButton, VibePicks } from '../components/Chrome'
import { DropModal } from '../components/DropModal'
import { EditorMeta } from '../components/EditorMeta'
import { RemixCredit } from '../components/RemixCredit'
import { Inspector, type Eyedropper, type SubSel } from '../components/Inspector'
import { Tray } from '../components/Tray'
import { actionError } from '../lib/catch'
import { cutoutImage } from '../lib/cutout'
import {
  applyLook,
  breakingLooks,
  changedKeys,
  EYEDROP_LABEL,
  SAMPLE_MIME,
  unlinkLooks,
  withOverrides,
} from '../lib/looks'
import {
  canPin,
  overlayPin,
  pinFromPointer,
  pinOrigin,
  tiltFromPointer,
  type PinLive,
} from '../lib/pin'
import { appHref } from '../lib/paths'
import { dismissPrimer, primerSeen } from '../lib/primer'
import { copyText, downloadJson, readImageAsDataUrl, tryEncodeShare } from '../lib/share'
import { markShared } from '../lib/shared'
import type { Block, BlockType, LookLayer, PreviewMode, VibeId, Zine } from '../lib/types'
import { VIBES } from '../lib/vibes'
import { useHistory } from '../lib/useHistory'
import { bagForType, linkBag, matchSample, misregisterPage, SAMPLES, typeForSample } from '../lib/samples'
import { applyBag, harvest, restylePageForVibe, type AttrBag } from '../lib/widgetLang'
import { contentsFrom, createBlock, matchWidget, widgetByType } from '../lib/widgets'
import { pushToast } from '../lib/toast'
import { editPath, isSeededDemo, isToolkitSeed, issuePath, slugify, sourceOfRemix } from '../lib/zine'
import { useZines } from '../store/useZines'

type Sheet = 'tray' | 'inspect' | 'more' | null

export function Editor() {
  const { id } = useParams()
  const { zineById } = useZines()
  const zine = id ? zineById(id) : undefined
  if (!zine) {
    return (
      <div className="studio">
        <h1 className="display">this issue wandered off</h1>
        <Link to="/studio" className="comic-btn">
          Back to studio
        </Link>
      </div>
    )
  }
  return <EditorCanvas zine={zine} />
}

function EditorCanvas({ zine }: { zine: Zine }) {
  const { patchZine, setBlocks, publishZine, deleteZine, remixZine, zines, session } = useZines()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [slash, setSlash] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashPick, setSlashPick] = useState(0)
  const [mode, setMode] = useState<PreviewMode>('page')
  const [trayOpen, setTrayOpen] = useState(true)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [eyedropper, setEyedropper] = useState<Eyedropper>({ on: false, bag: null })
  const [pickupBag, setPickupBag] = useState<AttrBag | null>(null)
  const [ghostBag, setGhostBag] = useState<AttrBag | null>(null)
  const [pinLive, setPinLive] = useState<PinLive | null>(null)
  const [subSel, setSubSel] = useState<(SubSel & { blockId: string }) | null>(null)
  const textTimer = useRef<number>(0)
  const textDirty = useRef(false)
  const slashRef = useRef<HTMLInputElement>(null)
  const pageRef = useRef<HTMLElement>(null)
  const zineRef = useRef(zine)
  zineRef.current = zine
  const didDrag = useRef(false)
  const pinLiveRef = useRef<PinLive | null>(null)
  const pinRaf = useRef(0)
  const dragRef = useRef<{
    id: string
    kind: 'move' | 'rotate'
    originX: number
    originY: number
    startX: number
    startY: number
    cx: number
    cy: number
    moved: boolean
    prev: Block
    pointerId: number
    target: Element | null
  } | null>(null)
  const { remember, undo, redo } = useHistory(zine)
  const rememberRef = useRef(remember)
  rememberRef.current = remember
  const firstVisit = useRef(!primerSeen())
  const [railOpen, setRailOpen] = useState(() => firstVisit.current && zine.blocks.length === 0)

  useEffect(() => {
    if (firstVisit.current && zine.blocks.length === 0) dismissPrimer()
  }, [zine.blocks.length])

  const rawSelected = zine.blocks.find((b) => b.id === selected)
  const selectedBlock = rawSelected ? overlayPin(rawSelected, pinLive) : undefined
  const remixSource = sourceOfRemix(zines, zine)

  useEffect(() => {
    if (!subSel) return
    const block = zine.blocks.find((item) => item.id === subSel.blockId)
    if (!block) {
      setSubSel(null)
      return
    }
    const len =
      block.type === 'grid' || block.type === 'strip'
        ? block.panels.length
        : block.type === 'stack'
          ? block.cards.length
          : 0
    if (subSel.index >= len) setSubSel(null)
  }, [subSel, zine.blocks])

  const slashHits = useMemo(() => {
    const widgets = matchWidget(slash).map((w) => ({
      kind: 'widget' as const,
      key: `w-${w.type}`,
      title: `/${w.slash} — ${w.label}`,
      detail: w.attrs.join(' · '),
      type: w.type,
    }))
    const scraps = matchSample(slash).map((sample) => ({
      kind: 'sample' as const,
      key: `s-${sample.label}`,
      title: `/${sample.label}`,
      detail: sample.attrs.join(' · '),
      sample,
    }))
    return [...widgets, ...scraps]
  }, [slash])

  function rollPage() {
    if (!zine.blocks.length) return
    update(misregisterPage(zine.blocks))
  }

  function update(next: Block[], record = true) {
    if (record) remember()
    setBlocks(zine.id, next)
  }

  function pickVibe(next: VibeId) {
    if (next === zine.vibe) return
    remember()
    setBlocks(zine.id, restylePageForVibe(zine.blocks, zine.vibe, next))
    patchZine(zine.id, { vibe: next })
  }

  function closeSlash() {
    setSlashOpen(false)
    setSlash('')
    setSlashPick(0)
  }

  function openSheet(next: Sheet) {
    closeSlash()
    setSheet(next)
  }

  function insertBlock(block: Block) {
    const idx = zine.blocks.findIndex((b) => b.id === selected)
    const next =
      idx >= 0
        ? [...zine.blocks.slice(0, idx + 1), block, ...zine.blocks.slice(idx + 1)]
        : [...zine.blocks, block]
    update(next)
    setSelected(block.id)
    closeSlash()
    setSheet(null)
  }

  function insert(type: BlockType) {
    const block = type === 'contents' ? contentsFrom(zine.blocks) : createBlock(type, zine.vibe)
    insertBlock(block)
  }

  function linkSampleOnPage(bag: AttrBag, live?: LookLayer[]) {
    const next = linkBag(zine.blocks, bag, live)
    if (next.every((block, i) => block === zine.blocks[i])) {
      setSlash('')
      setSlashPick(0)
      setSlashOpen(false)
      return
    }
    update(next)
    setSlash('')
    setSlashPick(0)
    setSlashOpen(false)
  }

  function plantSample(sample: ReturnType<typeof matchSample>[number]) {
    const selectedFits =
      selectedBlock && sample.attrs.some((attr) => widgetByType(selectedBlock.type).attrs.includes(attr))
    if (selectedFits && selectedBlock) {
      const layer: LookLayer = {
        label: sample.label,
        bag: bagForType(selectedBlock.type, sample.bag),
      }
      update(zine.blocks.map((b) => (b.id === selectedBlock.id ? applyLook(b, layer) : b)))
      setSlash('')
      setSlashPick(0)
      setSlashOpen(false)
      return
    }
    const fresh = createBlock(typeForSample(sample), zine.vibe)
    insertBlock(applyLook(fresh, { label: sample.label, bag: bagForType(fresh.type, sample.bag) }))
  }

  function applySampleTo(block: Block, label: string) {
    const sample = SAMPLES.find((row) => row.label === label)
    if (!sample) return
    const layer: LookLayer = { label: sample.label, bag: bagForType(block.type, sample.bag) }
    remember()
    setBlocks(
      zine.id,
      zine.blocks.map((item) => (item.id === block.id ? applyLook(item, layer) : item)),
    )
  }

  function remove(blockId: string) {
    update(zine.blocks.filter((b) => b.id !== blockId))
    setSelected(null)
    if (subSel?.blockId === blockId) setSubSel(null)
  }

  function duplicate(blockId: string) {
    const i = zine.blocks.findIndex((b) => b.id === blockId)
    if (i < 0) return
    const copy = { ...structuredClone(zine.blocks[i]), id: crypto.randomUUID() }
    const next = [...zine.blocks.slice(0, i + 1), copy, ...zine.blocks.slice(i + 1)]
    update(next)
    setSelected(copy.id)
  }

  function move(blockId: string, dir: -1 | 1) {
    const i = zine.blocks.findIndex((b) => b.id === blockId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= zine.blocks.length) return
    const next = [...zine.blocks]
    const [item] = next.splice(i, 1)
    next.splice(j, 0, item)
    update(next)
  }

  function paintBlock(id: string, fn: (block: Block) => Block) {
    const current = zineRef.current
    setBlocks(
      current.id,
      current.blocks.map((block) => (block.id === id ? fn(block) : block)),
    )
  }

  function patchBlock(next: Block, recordHistory = false) {
    const current = zine.blocks.find((block) => block.id === next.id)
    let dest = next
    if (current) {
      const breaking = breakingLooks(current, next)
      if (breaking.length) {
        const labels = breaking.map((layer) => layer.label).join(', ')
        if (!window.confirm(`This unlinks “${labels}” from other blocks on the page.`)) return
        dest = unlinkLooks(next, breaking, changedKeys(harvest(current), harvest(next)))
      }
      dest = withOverrides(current, dest)
    }
    if (recordHistory) {
      remember()
      textDirty.current = false
    } else if (!textDirty.current) {
      remember()
      textDirty.current = true
    }
    setBlocks(
      zine.id,
      zine.blocks.map((b) => (b.id === dest.id ? dest : b)),
    )
    window.clearTimeout(textTimer.current)
    textTimer.current = window.setTimeout(() => {
      textDirty.current = false
    }, 700)
  }

  function onEyedropBlock(block: Block) {
    if (!eyedropper.on) return false
    if (!eyedropper.bag) {
      const bag = harvest(block)
      setEyedropper({ on: true, bag })
      setPickupBag(bag)
      setSelected(block.id)
      return true
    }
    const slim = bagForType(block.type, eyedropper.bag)
    if (Object.keys(slim).length) {
      const next = applyLook(block, { label: EYEDROP_LABEL, bag: slim })
      remember()
      setBlocks(
        zine.id,
        zine.blocks.map((item) => (item.id === block.id ? next : item)),
      )
    }
    setSelected(block.id)
    return true
  }

  function flushPinLive(next: PinLive) {
    pinLiveRef.current = next
    if (pinRaf.current) return
    pinRaf.current = window.requestAnimationFrame(() => {
      pinRaf.current = 0
      if (pinLiveRef.current) setPinLive(pinLiveRef.current)
    })
  }

  function clearPinLive() {
    if (pinRaf.current) {
      window.cancelAnimationFrame(pinRaf.current)
      pinRaf.current = 0
    }
    pinLiveRef.current = null
    setPinLive(null)
  }

  function startPinDrag(e: ReactPointerEvent, block: Block, index: number, kind: 'move' | 'rotate') {
    if (eyedropper.on) return
    if (!canPin(block.type) && kind === 'move') return
    if (block.type !== 'sticker' && kind === 'rotate') return
    const origin = pinOrigin(block, index, Boolean(zine.scatter))
    const box = e.currentTarget.closest('.block')?.getBoundingClientRect()
    didDrag.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture is best-effort on older webviews */
    }
    dragRef.current = {
      id: block.id,
      kind,
      originX: origin.x,
      originY: origin.y,
      startX: e.clientX,
      startY: e.clientY,
      cx: box ? box.left + box.width / 2 : e.clientX,
      cy: box ? box.top + box.height / 2 : e.clientY,
      moved: false,
      prev: block,
      pointerId: e.pointerId,
      target: e.currentTarget,
    }

    function onMove(ev: PointerEvent) {
      const drag = dragRef.current
      const page = pageRef.current
      if (!drag || !page || ev.pointerId !== drag.pointerId) return
      const rect = page.getBoundingClientRect()
      if (!drag.moved && Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) > 3) {
        drag.moved = true
        didDrag.current = true
      }
      if (!drag.moved) return
      ev.preventDefault()
      const rotation =
        drag.kind === 'rotate'
          ? tiltFromPointer(drag.cx, drag.cy, ev.clientX, ev.clientY)
          : drag.prev.type === 'sticker'
            ? drag.prev.rotation
            : 0
      const pos =
        drag.kind === 'move'
          ? pinFromPointer(
              drag.originX,
              drag.originY,
              drag.startX,
              drag.startY,
              ev.clientX,
              ev.clientY,
              rect.width,
              rect.height,
            )
          : { x: drag.originX, y: drag.originY }
      flushPinLive({ id: drag.id, x: pos.x, y: pos.y, rotation })
    }

    function onUp(ev: PointerEvent) {
      const drag = dragRef.current
      if (!drag || ev.pointerId !== drag.pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (drag.target instanceof Element && drag.target.hasPointerCapture(drag.pointerId)) {
        drag.target.releasePointerCapture(drag.pointerId)
      }
      dragRef.current = null
      const live = pinLiveRef.current
      clearPinLive()
      if (!drag.moved || !live) return
      const staged =
        drag.prev.type === 'sticker'
          ? { ...drag.prev, x: live.x, y: live.y, rotation: live.rotation }
          : drag.prev.type === 'hero'
            ? { ...drag.prev, x: live.x, y: live.y }
            : drag.prev
      const breaking = breakingLooks(drag.prev, staged)
      if (breaking.length) {
        const labels = breaking.map((layer) => layer.label).join(', ')
        if (!window.confirm(`This unlinks “${labels}” from other blocks on the page.`)) return
        rememberRef.current()
        paintBlock(drag.id, () =>
          unlinkLooks(withOverrides(drag.prev, staged), breaking, changedKeys(harvest(drag.prev), harvest(staged))),
        )
        return
      }
      rememberRef.current()
      paintBlock(drag.id, () => withOverrides(drag.prev, staged))
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function onDrop(overId: string) {
    if (!dragId || dragId === overId) return
    const from = zine.blocks.findIndex((b) => b.id === dragId)
    const to = zine.blocks.findIndex((b) => b.id === overId)
    if (from < 0 || to < 0) return
    const next = [...zine.blocks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update(next)
    setDragId(null)
  }

  async function share(kind: 'local' | 'snapshot') {
    if (kind === 'snapshot') {
      const packed = tryEncodeShare(zine)
      if (!packed.ok) {
        pushToast(packed.reason, 'error', zine.vibe)
        return
      }
      const url = `${appHref('/s')}#${packed.token}`
      const ok = await copyText(url)
      if (ok) markShared()
      pushToast(ok ? 'Snapshot link copied' : url, 'success', zine.vibe)
      return
    }
    const url = appHref(`/z/${zine.id}`)
    const ok = await copyText(url)
    if (ok) markShared()
    pushToast(ok ? 'Studio link copied' : url, 'success', zine.vibe)
  }

  async function snapSticker(file: File | undefined) {
    if (!file) return
    try {
      const raw = await readImageAsDataUrl(file)
      const src = await cutoutImage(raw).catch(() => raw)
      const block = createBlock('sticker', zine.vibe)
      if (block.type === 'sticker') {
        block.src = src
        block.text = 'cut this out'
        block.rotation = -3
      }
      const idx = zine.blocks.findIndex((b) => b.id === selected)
      const next =
        idx >= 0
          ? [...zine.blocks.slice(0, idx + 1), block, ...zine.blocks.slice(idx + 1)]
          : [...zine.blocks, block]
      update(next)
      setSelected(block.id)
      setSheet(null)
    } catch (err) {
      pushToast(actionError(err, 'Could not use that photo'), 'error', zine.vibe)
    }
  }

  function onPageDrop(e: DragEvent<HTMLElement>) {
    if (!zine.scatter || !dragId) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(2, Math.min(68, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(2, Math.min(72, ((e.clientY - rect.top) / rect.height) * 100))
    const block = zine.blocks.find((item) => item.id === dragId)
    if (block && (block.type === 'sticker' || block.type === 'hero')) {
      update(
        zine.blocks.map((item) => (item.id === dragId ? { ...item, x, y } : item)),
      )
    }
    setDragId(null)
  }

  useEffect(() => {
    if (slashOpen && slash === '') slashRef.current?.focus()
  }, [slashOpen, slash])

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const fromItems = [...(e.clipboardData?.items ?? [])]
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile()
      const fromFiles = [...(e.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      const file = fromItems ?? fromFiles
      if (!file) return
      e.preventDefault()
      void snapSticker(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (meta && e.key === 'Enter') {
        e.preventDefault()
        setDropOpen(true)
        return
      }
      if (e.key === '/' && !typing) {
        e.preventDefault()
        setSlash('')
        setSlashPick(0)
        setSlashOpen(true)
      }
      if (selected && !typing && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
        e.preventDefault()
        move(selected, e.key === 'ArrowUp' ? -1 : 1)
        return
      }
      if (
        zine.scatter &&
        selected &&
        !typing &&
        !e.altKey &&
        !meta &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        const i = zine.blocks.findIndex((b) => b.id === selected)
        const block = i >= 0 ? zine.blocks[i] : undefined
        if (block && (block.type === 'sticker' || block.type === 'hero')) {
          e.preventDefault()
          const step = e.shiftKey ? 6 : 2
          const x0 = block.x ?? (i % 3) * 28 + 6
          const y0 = block.y ?? Math.floor(i / 3) * 26 + 8
          const x = Math.max(
            2,
            Math.min(68, x0 + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0)),
          )
          const y = Math.max(
            2,
            Math.min(72, y0 + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)),
          )
          update(zine.blocks.map((item) => (item.id === selected ? { ...item, x, y } : item)))
          return
        }
      }
      if (selected && !typing && meta && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicate(selected)
        return
      }
      if (selected && !typing && (e.key === '[' || e.key === ']')) {
        const block = zine.blocks.find((b) => b.id === selected)
        if (block?.type === 'sticker') {
          e.preventDefault()
          const rotation = Math.max(-8, Math.min(8, block.rotation + (e.key === ']' ? 0.8 : -0.8)))
          update(zine.blocks.map((item) => (item.id === selected ? { ...item, rotation } : item)))
          return
        }
      }
      if (e.key === 'Escape') {
        closeSlash()
        setSheet(null)
        setDropOpen(false)
        setEyedropper({ on: false, bag: null })
        setGhostBag(null)
        setSubSel(null)
        clearPinLive()
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selected && !typing) {
        e.preventDefault()
        remove(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    function onResize() {
      if (window.innerWidth <= 859) closeSlash()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const modes = (
    <div className="mode-row">
      {(['page', 'phone', 'tablet', 'fold'] as PreviewMode[]).map((m) => (
        <button
          key={m}
          className={`icon-btn ${mode === m ? 'on' : ''}`}
          onClick={() => setMode(m)}
          style={{ width: 'auto', padding: '0 8px' }}
        >
          {m}
        </button>
      ))}
      <button
        type="button"
        className={`icon-btn ${zine.scatter ? 'on' : ''}`}
        onClick={() => patchZine(zine.id, { scatter: !zine.scatter })}
        style={{ width: 'auto', padding: '0 8px' }}
        aria-pressed={Boolean(zine.scatter)}
        aria-label="Scatter floor layout"
      >
        floor
      </button>
    </div>
  )

  return (
    <div className={`editor finish-${zine.finish ?? 'clean'}`} data-vibe={zine.vibe}>
      <header className="editor-bar">
        <Link to="/studio" className="comic-btn small ghost">
          ← studio
        </Link>
        <input
          className="title-input"
          value={zine.title}
          onChange={(e) => patchZine(zine.id, { title: e.target.value })}
          aria-label="Zine title"
        />
        <div className="editor-actions desktop-only">
          <select
            value={zine.vibe}
            onChange={(e) => pickVibe(e.target.value as VibeId)}
            aria-label="Vibe"
          >
            {VIBES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {modes}
          <ComicButton className="small" onClick={() => undo()}>
            Undo
          </ComicButton>
          <ComicButton className="small" onClick={() => redo()}>
            Redo
          </ComicButton>
          <ComicButton
            className="small"
            onClick={() => {
              setSlash('')
              setSlashPick(0)
              setSlashOpen(true)
            }}
          >
            / add
          </ComicButton>
          {zine.blocks.length > 0 ? (
            <ComicButton
              className="small"
              onClick={rollPage}
              title="Roll two or three scraps onto every block"
            >
              misregister
            </ComicButton>
          ) : null}
          <ComicButton className="small cyan" onClick={() => navigate(`/z/${zine.id}`)}>
            Preview
          </ComicButton>
          <ComicButton className="small pink" onClick={() => setDropOpen(true)}>
            {zine.published ? 'Dropped' : 'Drop issue'}
          </ComicButton>
          {!zine.published && zine.blocks.length > 0 ? (
            <span className="drop-ready hand">A heading and a picture is a page. Drop when it feels like one.</span>
          ) : null}
        </div>
        <button className="icon-btn mobile-only" onClick={() => openSheet('more')} aria-label="More">
          ☰
        </button>
      </header>
      <EditorMeta zine={zine} zines={zines} patchZine={patchZine} />
      {zine.remixedFrom ? (
        <p className="serif no-print" style={{ margin: '0.45rem 0.9rem 0' }}>
          <RemixCredit
            source={remixSource}
            handle={session?.name}
            after=". drop when it feels like a page."
          />
        </p>
      ) : isSeededDemo(zine) ? (
        <p className="serif no-print" style={{ margin: '0.45rem 0.9rem 0' }}>
          {isToolkitSeed(zine)
            ? 'this is the studio kit. remix it to keep the original, then drop your own page. '
            : 'this is a seeded page. remix it to keep the original, then drop your own page. '}
          <button
            type="button"
            className="owner-link"
            onClick={() => {
              void remixZine(zine.id, zine).then((next) => {
                if (next) navigate(editPath(next))
              })
            }}
          >
            {isToolkitSeed(zine) ? 'Remix this kit' : 'Remix this page'}
          </button>
        </p>
      ) : null}

      <div className="editor-stage">
        {trayOpen ? (
          <aside className="tray desktop-only">
            <div className="tray-head">
              <strong className="hand">widget tray</strong>
              <button className="icon-btn" onClick={() => setTrayOpen(false)} aria-label="Hide tray">
                ×
              </button>
            </div>
            <Tray
              onInsert={insert}
              onSnap={(f) => void snapSticker(f)}
              onPlantSample={plantSample}
              onLinkSample={(sample) => linkSampleOnPage(sample.bag)}
            />
          </aside>
        ) : (
          <button className="comic-btn small desktop-only" style={{ margin: 8 }} onClick={() => setTrayOpen(true)}>
            tray
          </button>
        )}

        <div
          className={`canvas-wrap${eyedropper.on ? ' eyedropper' : ''}`}
          onClick={() => {
            setSelected(null)
            closeSlash()
            setSubSel(null)
          }}
        >
          <article
            ref={pageRef}
            className={`zine-page ${mode}${zine.scatter ? ' scatter' : ''}${eyedropper.on ? ' eyedropper' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => {
              if (
                e.dataTransfer?.types.includes('Files') ||
                e.dataTransfer.types.includes(SAMPLE_MIME) ||
                zine.scatter
              ) {
                e.preventDefault()
              }
            }}
            onDrop={(e) => {
              const file = [...(e.dataTransfer?.files ?? [])].find((row) => row.type.startsWith('image/'))
              if (file) {
                e.preventDefault()
                void snapSticker(file)
                return
              }
              if (zine.scatter) onPageDrop(e)
            }}
          >
            {zine.blocks.length === 0 ? (
              <p className="empty-hint">
                type / for a sticker, or snap a photo. cork scraps paste in. A heading and a picture
                is enough — then Drop issue.
              </p>
            ) : null}
            {zine.blocks.map((block, i) => {
              const pinned = overlayPin(block, pinLive)
              const shown =
                selected === block.id && ghostBag && !pinLive
                  ? applyBag(pinned, bagForType(block.type, ghostBag))
                  : pinned
              const origin = pinOrigin(pinned, i, Boolean(zine.scatter))
              return (
              <div
                key={block.id}
                className={`block ${selected === block.id ? 'selected' : ''}${
                  zine.scatter && canPin(block.type) ? ' scatter-pin' : ''
                }${canPin(block.type) ? ' pinnable' : ''}${
                  pinLive?.id === block.id ? ' pinning' : ''
                }${eyedropper.on && eyedropper.bag ? ' eyedrop-target' : ''}`}
                style={
                  zine.scatter && canPin(block.type)
                    ? { left: `${origin.x}%`, top: `${origin.y}%` }
                    : undefined
                }
                onClick={(e) => {
                  e.stopPropagation()
                  if (didDrag.current) {
                    didDrag.current = false
                    return
                  }
                  if (onEyedropBlock(block)) return
                  setSelected(block.id)
                  closeSlash()
                  if (subSel && subSel.blockId !== block.id) setSubSel(null)
                }}
                onPointerDown={(e) => {
                  const tag = (e.target as HTMLElement).tagName
                  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
                  if ((e.target as HTMLElement).closest('.block-tools, .block-handle, .rotate-handle')) {
                    return
                  }
                  if (canPin(block.type)) startPinDrag(e, block, i, 'move')
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(SAMPLE_MIME) || !zine.scatter) e.preventDefault()
                }}
                onDrop={(e) => {
                  const label = e.dataTransfer.getData(SAMPLE_MIME)
                  if (label) {
                    e.preventDefault()
                    e.stopPropagation()
                    applySampleTo(block, label)
                    setSelected(block.id)
                    return
                  }
                  if (!zine.scatter) onDrop(block.id)
                }}
              >
                <button
                  className="block-handle"
                  draggable
                  onDragStart={() => setDragId(block.id)}
                  aria-label="Drag block"
                />
                <div className="block-tools">
                  <button className="icon-btn" onClick={() => move(block.id, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => move(block.id, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button className="icon-btn" onClick={() => duplicate(block.id)} aria-label="Duplicate">
                    +
                  </button>
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(block.id)
                      setSlash('')
                      setSlashPick(0)
                      setSlashOpen(true)
                    }}
                    aria-label="Add below"
                  >
                    /
                  </button>
                  <button
                    className="icon-btn mobile-only"
                    onClick={() => openSheet('inspect')}
                    aria-label="Inspect"
                  >
                    ✎
                  </button>
                  <button className="icon-btn" onClick={() => remove(block.id)} aria-label="Delete">
                    ×
                  </button>
                </div>
                {selected === block.id && block.type === 'sticker' ? (
                  <button
                    type="button"
                    className="rotate-handle"
                    aria-label="Rotate sticker"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      startPinDrag(e, block, i, 'rotate')
                    }}
                  />
                ) : null}
                <BlockView
                  block={shown}
                  onChange={(next) => patchBlock(next, false)}
                  flowPin={!zine.scatter}
                  subIndex={subSel?.blockId === block.id ? subSel.index : null}
                  onSubSelect={(kind, index) => {
                    setSelected(block.id)
                    setSubSel({ blockId: block.id, kind, index })
                    closeSlash()
                  }}
                />
              </div>
              )
            })}
          </article>
        </div>

        {firstVisit.current && zine.blocks.length === 0 ? (
          <TourRail open={railOpen} onToggle={() => setRailOpen((v) => !v)} />
        ) : (
        <aside className="inspector desktop-only">
          <div className="kicker">INSPECTOR</div>
          {selectedBlock ? (
            <Inspector
              block={selectedBlock}
              onChange={patchBlock}
              onCommit={remember}
              onLinkBag={linkSampleOnPage}
              pageBlocks={zine.blocks}
              vibe={zine.vibe}
              eyedropper={eyedropper}
              onEyedropper={setEyedropper}
              onPreview={setGhostBag}
              subSel={subSel?.blockId === selectedBlock.id ? subSel : null}
              pickup={pickupBag}
            />
          ) : (
            <div>
              <p className="hand">nothing selected.</p>
              {zine.blocks.length > 0 ? (
                <>
                  <ComicButton className="small" onClick={rollPage} title="Roll two or three scraps onto every block">
                    misregister the page
                  </ComicButton>
                  <p className="serif">rolls two or three scraps onto every block. undo takes it back.</p>
                </>
              ) : null}
              <label>Vibe</label>
              <VibePicks
                value={zine.vibe}
                onChange={pickVibe}
              />
              <label>File</label>
              <ComicButton
                className="small"
                onClick={() => downloadJson(`${slugify(zine.title)}.zine.json`, zine)}
              >
                Export JSON
              </ComicButton>
              <label>Danger</label>
              <ComicButton
                className="small"
                onClick={() => {
                  deleteZine(zine.id)
                  navigate('/studio')
                }}
              >
                Delete issue
              </ComicButton>
            </div>
          )}
        </aside>
        )}
      </div>

      <button className="fab mobile-only" onClick={() => openSheet('tray')} aria-label="Add widget">
        +
      </button>

      {sheet === 'tray' ? (
        <BottomSheet title="widget tray" onClose={() => setSheet(null)}>
          <Tray
            onInsert={insert}
            onSnap={(f) => void snapSticker(f)}
            onPlantSample={plantSample}
            onLinkSample={(sample) => linkSampleOnPage(sample.bag)}
            className="tray-grid sheet-grid"
          />
        </BottomSheet>
      ) : null}

      {sheet === 'inspect' && selectedBlock ? (
        <BottomSheet title="inspect" onClose={() => setSheet(null)}>
          <Inspector
            block={selectedBlock}
            onChange={patchBlock}
            onCommit={remember}
            onLinkBag={linkSampleOnPage}
            pageBlocks={zine.blocks}
            vibe={zine.vibe}
            eyedropper={eyedropper}
            onEyedropper={setEyedropper}
            onPreview={setGhostBag}
            subSel={subSel?.blockId === selectedBlock.id ? subSel : null}
            pickup={pickupBag}
          />
        </BottomSheet>
      ) : null}

      {sheet === 'more' ? (
        <BottomSheet title="issue menu" onClose={() => setSheet(null)}>
          <label>Vibe</label>
          <VibePicks
            value={zine.vibe}
            onChange={pickVibe}
          />
          <label>Preview frame</label>
          {modes}
          <div className="cta-row" style={{ marginTop: 12 }}>
            <ComicButton className="small" onClick={() => undo()}>
              Undo
            </ComicButton>
            <ComicButton className="small" onClick={() => redo()}>
              Redo
            </ComicButton>
            {zine.blocks.length > 0 ? (
              <ComicButton className="small" onClick={rollPage}>
                misregister
              </ComicButton>
            ) : null}
            <ComicButton className="small cyan" onClick={() => navigate(`/z/${zine.id}`)}>
              Preview
            </ComicButton>
            <ComicButton className="small pink" onClick={() => setDropOpen(true)}>
              {zine.published ? 'Dropped' : 'Drop'}
            </ComicButton>
            <ComicButton
              className="small ghost"
              onClick={() => {
                markShared()
                window.print()
                setSheet(null)
              }}
            >
              Print issue
            </ComicButton>
          </div>
          {!zine.published && zine.blocks.length > 0 ? (
            <p className="hand">A heading and a picture is a page. Drop when it feels like one.</p>
          ) : null}
        </BottomSheet>
      ) : null}

      {slashOpen ? (
        <div className="slash" style={{ left: 16, bottom: 96 }}>
          <input
            ref={slashRef}
            autoFocus
            value={slash}
            placeholder="/city /photo · page links the scrap"
            aria-label="Slash insert"
            onChange={(e) => {
              setSlash(e.target.value)
              setSlashPick(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSlashPick((i) => Math.min(i + 1, Math.max(0, slashHits.length - 1)))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSlashPick((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter' && slashHits[slashPick]) {
                const hit = slashHits[slashPick]
                if (hit.kind === 'widget') insert(hit.type)
                else if (e.shiftKey) linkSampleOnPage(hit.sample.bag)
                else plantSample(hit.sample)
              }
              if (e.key === 'Escape') setSlashOpen(false)
            }}
          />
          {slashHits.map((hit, i) =>
            hit.kind === 'sample' ? (
              <div key={hit.key} className={`slash-row ${i === slashPick ? 'on' : ''}`}>
                <button
                  type="button"
                  className={i === slashPick ? 'on' : ''}
                  onClick={() => plantSample(hit.sample)}
                >
                  {hit.title}
                  <span className="meta-line"> {hit.detail}</span>
                </button>
                <button
                  type="button"
                  className="slash-page"
                  aria-label={`same scrap on the page: ${hit.sample.label}`}
                  onClick={() => linkSampleOnPage(hit.sample.bag)}
                >
                  page
                </button>
              </div>
            ) : (
              <button
                key={hit.key}
                className={i === slashPick ? 'on' : ''}
                onClick={() => insert(hit.type)}
              >
                {hit.title}
                <span className="meta-line"> {hit.detail}</span>
              </button>
            ),
          )}
        </div>
      ) : null}

      {dropOpen ? (
        <DropModal
          zine={zine}
          local={!session}
          onClose={() => setDropOpen(false)}
          onDrop={(when, opts) => {
            const shareKey =
              opts.visibility === 'unlisted' || opts.chain
                ? zine.shareKey || crypto.randomUUID().replace(/-/g, '').slice(0, 16)
                : zine.shareKey
            const firstDrop = publishZine(zine.id, when, { ...opts, shareKey })
            setDropOpen(false)
            if (opts.chain && shareKey) {
              const url = `${appHref(`/z/${zine.id}?chain=${shareKey}`)}`
              void copyText(url).then((ok) => {
                if (ok) markShared()
              })
              if (!firstDrop) {
                pushToast('Corpse link copied. They only see the last page.', 'success', zine.vibe)
              }
            } else if (opts.visibility === 'unlisted' && shareKey) {
              const url = `${appHref(issuePath({ id: zine.id, shareKey, visibility: 'unlisted' }))}`
              void copyText(url).then((ok) => {
                if (ok) markShared()
              })
              if (!firstDrop) {
                pushToast('Unlisted link copied. Not on the stream.', 'success', zine.vibe)
              }
            } else {
              const packed = tryEncodeShare(zine)
              if (packed.ok) {
                const url = `${appHref('/s')}#${packed.token}`
                void copyText(url).then((ok) => {
                  if (ok) markShared()
                })
                if (!firstDrop) {
                  pushToast(
                    when > Date.now() ? 'Scheduled. Snapshot copied.' : 'Dropped. Snapshot copied.',
                    'success',
                    zine.vibe,
                  )
                }
              } else if (!firstDrop) {
                pushToast(
                  when > Date.now() ? `Scheduled. ${packed.reason}` : `Dropped. ${packed.reason}`,
                  'error',
                  zine.vibe,
                )
              }
            }
          }}
          onCopy={share}
          onExport={() => downloadJson(`${slugify(zine.title)}.zine.json`, zine)}
          onPrint={() => {
            markShared()
            window.print()
            setDropOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

const TOUR_STEPS = ['Add a block with /', 'Stack two scraps, then misregister', 'Drop your issue']

function TourRail({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const tabRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  const skipFocus = useRef(true)

  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false
      return
    }
    if (open) collapseRef.current?.focus()
    else tabRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        ref={tabRef}
        type="button"
        className="tour-rail-tab-col desktop-only"
        onClick={onToggle}
      >
        TRY THIS
      </button>
    )
  }
  return (
    <aside className="tour-rail desktop-only" aria-label="First issue">
      <div className="tray-head">
        <strong className="hand">try this</strong>
        <button
          ref={collapseRef}
          type="button"
          className="tour-rail-min"
          onClick={onToggle}
          aria-label="Collapse tour"
        >
          ›
        </button>
      </div>
      <ul className="milestone-list">
        {TOUR_STEPS.map((label) => (
          <li key={label}>
            <CheckCircle on={false} />
            {label}
          </li>
        ))}
      </ul>
      <p className="hand tour-rail-note">canvas stays fully usable — this never blocks a click.</p>
    </aside>
  )
}
