import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { BottomSheet, ComicButton, Modal, VibePicks } from '../components/Chrome'
import { Inspector } from '../components/Inspector'
import { appHref } from '../lib/paths'
import { copyText, downloadJson, encodeShare } from '../lib/share'
import type { Block, BlockType, PreviewMode, VibeId, Zine } from '../lib/types'
import { WIDGETS, createBlock } from '../lib/widgets'
import { slugify } from '../lib/zine'
import { useZines } from '../store/ZineContext'

type Snap = { title: string; vibe: VibeId; blocks: Block[] }
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
  const { patchZine, setBlocks, publishZine, deleteZine } = useZines()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [slash, setSlash] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [mode, setMode] = useState<PreviewMode>('page')
  const [trayOpen, setTrayOpen] = useState(true)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const past = useRef<Snap[]>([])
  const future = useRef<Snap[]>([])
  const textTimer = useRef<number>(0)
  const textDirty = useRef(false)

  const selectedBlock = zine.blocks.find((b) => b.id === selected)

  const slashHits = useMemo(() => {
    const q = slash.replace(/^\//, '').toLowerCase()
    return WIDGETS.filter(
      (w) => w.slash.includes(q) || w.label.toLowerCase().includes(q) || w.type.includes(q),
    )
  }, [slash])

  function snapshot(): Snap {
    return {
      title: zine.title,
      vibe: zine.vibe,
      blocks: structuredClone(zine.blocks),
    }
  }

  function remember() {
    past.current.push(snapshot())
    if (past.current.length > 60) past.current.shift()
    future.current = []
  }

  function applySnap(snap: Snap) {
    patchZine(zine.id, { title: snap.title, vibe: snap.vibe })
    setBlocks(zine.id, snap.blocks)
  }

  function undo() {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(snapshot())
    applySnap(prev)
  }

  function redo() {
    const next = future.current.pop()
    if (!next) return
    past.current.push(snapshot())
    applySnap(next)
  }

  function update(next: Block[], record = true) {
    if (record) remember()
    setBlocks(zine.id, next)
  }

  function insert(type: BlockType) {
    const block = createBlock(type, zine.vibe)
    const idx = zine.blocks.findIndex((b) => b.id === selected)
    const next =
      idx >= 0
        ? [...zine.blocks.slice(0, idx + 1), block, ...zine.blocks.slice(idx + 1)]
        : [...zine.blocks, block]
    update(next)
    setSelected(block.id)
    setSlashOpen(false)
    setSheet(null)
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
    const url =
      kind === 'local' ? appHref(`/z/${zine.id}`) : `${appHref('/s')}#${encodeShare(zine)}`
    const ok = await copyText(url)
    setCopied(ok ? (kind === 'local' ? 'Studio link copied' : 'Snapshot link copied') : url)
    window.setTimeout(() => setCopied(null), 2400)
  }

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
        setSlashOpen(true)
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
    <div className="editor" data-vibe={zine.vibe}>
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
          <ComicButton className="small" onClick={() => setSlashOpen(true)}>
            / add
          </ComicButton>
          <ComicButton className="small cyan" onClick={() => navigate(`/z/${zine.id}`)}>
            Preview
          </ComicButton>
          <ComicButton className="small pink" onClick={() => setDropOpen(true)}>
            {zine.published ? 'Dropped' : 'Drop issue'}
          </ComicButton>
        </div>
        <button className="icon-btn mobile-only" onClick={() => setSheet('more')} aria-label="More">
          ☰
        </button>
      </header>

      <div className="editor-stage">
        {trayOpen ? (
          <aside className="tray desktop-only">
            <div className="tray-head">
              <strong className="hand">widget tray</strong>
              <button className="icon-btn" onClick={() => setTrayOpen(false)} aria-label="Hide tray">
                ×
              </button>
            </div>
            <div className="tray-grid">
              {WIDGETS.map((w) => (
                <button key={w.type} className="tray-item" onClick={() => insert(w.type)}>
                  <span className="glyph">{w.glyph}</span>
                  /{w.slash}
                </button>
              ))}
            </div>
          </aside>
        ) : (
          <button className="comic-btn small desktop-only" style={{ margin: 8 }} onClick={() => setTrayOpen(true)}>
            tray
          </button>
        )}

        <div className="canvas-wrap" onClick={() => setSelected(null)}>
          <article className={`zine-page ${mode}`} onClick={(e) => e.stopPropagation()}>
            {zine.blocks.length === 0 ? (
              <p className="empty-hint">type / to drop a sticker. this page is yours.</p>
            ) : null}
            {zine.blocks.map((block) => (
              <div
                key={block.id}
                className={`block ${selected === block.id ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(block.id)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(block.id)}
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
            <Inspector block={selectedBlock} onChange={patchBlock} onCommit={remember} />
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
          <div className="tray-grid sheet-grid">
            {WIDGETS.map((w) => (
              <button key={w.type} className="tray-item" onClick={() => insert(w.type)}>
                <span className="glyph">{w.glyph}</span>
                /{w.slash}
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}

      {sheet === 'inspect' && selectedBlock ? (
        <BottomSheet title="inspect" onClose={() => setSheet(null)}>
          <Inspector block={selectedBlock} onChange={patchBlock} onCommit={remember} />
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
            <ComicButton className="small cyan" onClick={() => navigate(`/z/${zine.id}`)}>
              Preview
            </ComicButton>
            <ComicButton className="small pink" onClick={() => setDropOpen(true)}>
              Drop
            </ComicButton>
          </div>
        </BottomSheet>
      ) : null}

      {slashOpen ? (
        <div className="slash" style={{ left: 16, bottom: 96 }}>
          <input
            autoFocus
            value={slash}
            placeholder="/sticker /halftone /panel"
            onChange={(e) => setSlash(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && slashHits[0]) insert(slashHits[0].type)
              if (e.key === 'Escape') setSlashOpen(false)
            }}
          />
          {slashHits.map((w, i) => (
            <button key={w.type} className={i === 0 ? 'on' : ''} onClick={() => insert(w.type)}>
              /{w.slash} — {w.label}
            </button>
          ))}
        </div>
      ) : null}

      {dropOpen ? (
        <DropModal
          zine={zine}
          onClose={() => setDropOpen(false)}
          onDrop={(when) => {
            publishZine(zine.id, when)
            setDropOpen(false)
            setCopied(when > Date.now() ? 'Scheduled. NEXT ISSUE is live on the stream.' : 'Issue dropped.')
            window.setTimeout(() => setCopied(null), 2600)
          }}
          onCopy={share}
          onExport={() => downloadJson(`${slugify(zine.title)}.zine.json`, zine)}
        />
      ) : null}

      {copied ? <div className="drop-toast">{copied}</div> : null}
    </div>
  )
}

function DropModal({
  zine,
  onClose,
  onDrop,
  onCopy,
  onExport,
}: {
  zine: Zine
  onClose: () => void
  onDrop: (when: number) => void
  onCopy: (kind: 'local' | 'snapshot') => void
  onExport: () => void
}) {
  const options = [
    { label: 'Drop now', at: Date.now() },
    { label: 'In a minute', at: Date.now() + 60_000 },
    { label: 'In an hour', at: Date.now() + 3600_000 },
    { label: 'Tomorrow', at: Date.now() + 86400_000 },
  ]
  return (
    <Modal title="drop this issue" onClose={onClose}>
      <p className="serif">
        A drop is a publish. Schedule one and the stream shows a comic <em>NEXT ISSUE</em> banner
        until the clock hits.
      </p>
      <div className="vibe-picks" style={{ marginTop: 12 }}>
        {options.map((opt) => (
          <button key={opt.label} className="tray-item" onClick={() => onDrop(opt.at)}>
            {opt.label}
          </button>
        ))}
      </div>
      {zine.published ? (
        <p className="hand" style={{ margin: '0.8rem 0' }}>
          already on the stream.
        </p>
      ) : null}
      <div className="cta-row" style={{ marginTop: 12 }}>
        <ComicButton className="small" onClick={() => onCopy('local')}>
          Copy studio link
        </ComicButton>
        <ComicButton className="small cyan" onClick={() => onCopy('snapshot')}>
          Copy snapshot link
        </ComicButton>
        <ComicButton className="small ghost" onClick={onExport}>
          Export JSON
        </ComicButton>
      </div>
    </Modal>
  )
}
