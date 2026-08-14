import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ComicButton, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { uid } from '../lib/id'
import { loadCork, saveCork } from '../lib/social'
import type { CorkPin } from '../lib/types'
import { useZines } from '../store/ZineContext'

export function Cork() {
  const { session, online, profile } = useZines()
  const me = session?.name ?? profile.name
  const [pins, setPins] = useState<CorkPin[]>(() => loadCork(me))
  const [draft, setDraft] = useState('')
  const board = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => {
    if (online && session) {
      void api
        .cork()
        .then((res) => setPins(res.pins))
        .catch(() => setPins(loadCork(me)))
      return
    }
    setPins(loadCork(me))
  }, [online, session, me])

  function persist(next: CorkPin[]) {
    setPins(next)
    saveCork(me, next)
    if (online && session) void api.saveCork(next).catch(() => undefined)
  }

  function add() {
    const text = draft.trim()
    if (!text) return
    persist([
      ...pins,
      {
        id: uid(),
        text,
        x: 12 + Math.random() * 60,
        y: 12 + Math.random() * 50,
        rotation: -8 + Math.random() * 16,
      },
    ])
    setDraft('')
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">CUTTING TABLE</div>
            <h1 className="display chroma">corkboard</h1>
            <p className="serif" style={{ maxWidth: 480, marginTop: 8 }}>
              Scatter clippings before they become a page. This is not an issue yet.
            </p>
          </div>
        </div>
        <form
          className="board-form"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input value={draft} placeholder="a scrap, a line, a dare" onChange={(e) => setDraft(e.target.value)} />
          <ComicButton className="pink">Pin it</ComicButton>
        </form>
        <div
          ref={board}
          className="cork-board"
          onPointerMove={(e) => {
            if (!drag.current || !board.current) return
            const box = board.current.getBoundingClientRect()
            const x = ((e.clientX - box.left - drag.current.dx) / box.width) * 100
            const y = ((e.clientY - box.top - drag.current.dy) / box.height) * 100
            const id = drag.current.id
            setPins((prev) =>
              prev.map((pin) =>
                pin.id === id
                  ? { ...pin, x: Math.max(0, Math.min(88, x)), y: Math.max(0, Math.min(88, y)) }
                  : pin,
              ),
            )
          }}
          onPointerUp={() => {
            if (drag.current) persist(pins)
            drag.current = null
          }}
        >
          {pins.map((pin) => (
            <article
              key={pin.id}
              className="cork-pin"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: `rotate(${pin.rotation}deg)` }}
              onPointerDown={(e) => {
                const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
                drag.current = { id: pin.id, dx: e.clientX - box.left, dy: e.clientY - box.top }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
            >
              <p className="hand">{pin.text}</p>
              <button
                type="button"
                className="icon-btn"
                aria-label="Unpin"
                onClick={() => persist(pins.filter((row) => row.id !== pin.id))}
              >
                ×
              </button>
            </article>
          ))}
          {!pins.length ? <p className="hand cork-empty">the board is blank. pin something ugly.</p> : null}
        </div>
        <Link to="/studio" className="comic-btn ghost" style={{ marginTop: 12 }}>
          Back to studio
        </Link>
      </main>
    </div>
  )
}
