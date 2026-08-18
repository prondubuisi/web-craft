import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { BottomSheet, ComicButton, VibePicks } from '../components/Chrome'
import { DropModal } from '../components/DropModal'
import { EditorMeta } from '../components/EditorMeta'
import { Inspector } from '../components/Inspector'
import { Tray } from '../components/Tray'
import { actionError } from '../lib/catch'
import { cutoutImage } from '../lib/cutout'
import { appHref } from '../lib/paths'
import { copyText, downloadJson, readImageAsDataUrl, tryEncodeShare } from '../lib/share'
import type { Block, BlockType, PreviewMode, VibeId, Zine } from '../lib/types'
import { useHistory } from '../lib/useHistory'
import { linkBag, matchSample, typeForSample } from '../lib/samples'
import { applyBag, type AttrBag } from '../lib/widgetLang'
import { contentsFrom, createBlock, matchWidget, widgetByType } from '../lib/widgets'
import { editPath, isSeededDemo, isToolkitSeed, issuePath, remixCreditPath, slugify, sourceOfRemix } from '../lib/zine'
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
  const [copied, setCopied] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const textTimer = useRef<number>(0)
  const textDirty = useRef(false)
  const slashRef = useRef<HTMLInputElement>(null)
  const { remember, undo, redo } = useHistory(zine)

  const selectedBlock = zine.blocks.find((b) => b.id === selected)
  const remixSource = sourceOfRemix(zines, zine)

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

  function update(next: Block[], record = true) {
    if (record) remember()
    setBlocks(zine.id, next)
  }

  function insertBlock(block: Block) {
    const idx = zine.blocks.findIndex((b) => b.id === selected)
    const next =
      idx >= 0
        ? [...zine.blocks.slice(0, idx + 1), block, ...zine.blocks.slice(idx + 1)]
        : [...zine.blocks, block]
    update(next)
    setSelected(block.id)
    setSlash('')
    setSlashPick(0)
    setSheet(null)
  }

  function insert(type: BlockType) {
    const block = type === 'contents' ? contentsFrom(zine.blocks) : createBlock(type, zine.vibe)
    insertBlock(block)
  }

  function linkSampleOnPage(bag: AttrBag) {
    update(linkBag(zine.blocks, bag))
    setSlash('')
    setSlashPick(0)
    setSlashOpen(false)
  }

  function plantSample(sample: ReturnType<typeof matchSample>[number]) {
    const selectedFits =
      selectedBlock && sample.attrs.some((attr) => widgetByType(selectedBlock.type).attrs.includes(attr))
    if (selectedFits && selectedBlock) {
      update(zine.blocks.map((b) => (b.id === selectedBlock.id ? applyBag(b, sample.bag) : b)))
      setSlash('')
      setSlashPick(0)
      setSlashOpen(false)
      return
    }
    insertBlock(applyBag(createBlock(typeForSample(sample), zine.vibe), sample.bag))
  }

  function remove(blockId: string) {
    update(zine.blocks.filter((b) => b.id !== blockId))
    setSelected(null)
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

  function patchBlock(next: Block, recordHistory = false) {
    if (recordHistory) {
      remember()
      textDirty.current = false
    } else if (!textDirty.current) {
      remember()
      textDirty.current = true
    }
    setBlocks(
      zine.id,
      zine.blocks.map((b) => (b.id === next.id ? next : b)),
    )
    window.clearTimeout(textTimer.current)
    textTimer.current = window.setTimeout(() => {
      textDirty.current = false
    }, 700)
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
        setCopied(packed.reason)
        window.setTimeout(() => setCopied(null), 3600)
        return
      }
      const url = `${appHref('/s')}#${packed.token}`
      const ok = await copyText(url)
      setCopied(ok ? 'Snapshot link copied' : url)
      window.setTimeout(() => setCopied(null), 2400)
      return
    }
    const url = appHref(`/z/${zine.id}`)
    const ok = await copyText(url)
    setCopied(ok ? 'Studio link copied' : url)
    window.setTimeout(() => setCopied(null), 2400)
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
      window.alert(actionError(err, 'Could not use that photo'))
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
        setSlashOpen(false)
        setSheet(null)
        setDropOpen(false)
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selected && !typing) {
        e.preventDefault()
        remove(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
            onChange={(e) => {
              remember()
              patchZine(zine.id, { vibe: e.target.value as VibeId })
            }}
            aria-label="Vibe"
          >
            {(['miles', 'gwen', 'peni', 'ham', 'noir'] as VibeId[]).map((v) => (
              <option key={v} value={v}>
                {v}
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
        <button className="icon-btn mobile-only" onClick={() => setSheet('more')} aria-label="More">
          ☰
        </button>
      </header>
      <EditorMeta zine={zine} zines={zines} patchZine={patchZine} />
      {zine.remixedFrom ? (
        <p className="serif no-print" style={{ margin: '0.45rem 0.9rem 0' }}>
          {remixSource ? (
            <>
              remix of <Link to={remixCreditPath(remixSource, session?.name)}>{remixSource.title}</Link>
              . drop when it feels like a page.
            </>
          ) : (
            <>this is a remix. the original is not on this desk.</>
          )}
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
          className="canvas-wrap"
          onClick={() => {
            setSelected(null)
            setSlashOpen(false)
          }}
        >
          <article
            className={`zine-page ${mode}${zine.scatter ? ' scatter' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => {
              if (e.dataTransfer?.types.includes('Files') || zine.scatter) e.preventDefault()
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
            {zine.blocks.map((block, i) => (
              <div
                key={block.id}
                className={`block ${selected === block.id ? 'selected' : ''}${
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
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(block.id)
                  setSlashOpen(false)
                }}
                onDragOver={(e) => {
                  if (!zine.scatter) e.preventDefault()
                }}
                onDrop={() => {
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
                    onClick={() => setSheet('inspect')}
                    aria-label="Inspect"
                  >
                    ✎
                  </button>
                  <button className="icon-btn" onClick={() => remove(block.id)} aria-label="Delete">
                    ×
                  </button>
                </div>
                <BlockView block={block} onChange={(next) => patchBlock(next, false)} />
              </div>
            ))}
          </article>
        </div>

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
            />
          ) : (
            <div>
              <p className="hand">nothing selected.</p>
              <label>Vibe</label>
              <VibePicks
                value={zine.vibe}
                onChange={(vibe) => {
                  remember()
                  patchZine(zine.id, { vibe })
                }}
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
      </div>

      <button className="fab mobile-only" onClick={() => setSheet('tray')} aria-label="Add widget">
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
          />
        </BottomSheet>
      ) : null}

      {sheet === 'more' ? (
        <BottomSheet title="issue menu" onClose={() => setSheet(null)}>
          <label>Vibe</label>
          <VibePicks
            value={zine.vibe}
            onChange={(vibe) => {
              remember()
              patchZine(zine.id, { vibe })
            }}
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
            <ComicButton className="small cyan" onClick={() => navigate(`/z/${zine.id}`)}>
              Preview
            </ComicButton>
            <ComicButton className="small pink" onClick={() => setDropOpen(true)}>
              {zine.published ? 'Dropped' : 'Drop'}
            </ComicButton>
            <ComicButton
              className="small ghost"
              onClick={() => {
                setSheet(null)
                window.setTimeout(() => window.print(), 50)
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
            publishZine(zine.id, when, { ...opts, shareKey })
            setDropOpen(false)
            if (opts.chain && shareKey) {
              const url = `${appHref(`/z/${zine.id}?chain=${shareKey}`)}`
              void copyText(url)
              setCopied('Corpse link copied. They only see the last page.')
            } else if (opts.visibility === 'unlisted' && shareKey) {
              const url = `${appHref(issuePath({ id: zine.id, shareKey, visibility: 'unlisted' }))}`
              void copyText(url)
              setCopied('Unlisted link copied. Not on the stream.')
            } else {
              const packed = tryEncodeShare(zine)
              if (packed.ok) {
                const url = `${appHref('/s')}#${packed.token}`
                void copyText(url)
                setCopied(
                  when > Date.now()
                    ? 'Scheduled. Snapshot copied.'
                    : 'Dropped. Snapshot copied.',
                )
              } else {
                setCopied(
                  when > Date.now()
                    ? `Scheduled. ${packed.reason}`
                    : `Dropped. ${packed.reason}`,
                )
              }
            }
            window.setTimeout(() => setCopied(null), 3200)
          }}
          onCopy={share}
          onExport={() => downloadJson(`${slugify(zine.title)}.zine.json`, zine)}
          onPrint={() => {
            setDropOpen(false)
            window.setTimeout(() => window.print(), 50)
          }}
        />
      ) : null}

      {copied ? <div className="drop-toast">{copied}</div> : null}
    </div>
  )
}
