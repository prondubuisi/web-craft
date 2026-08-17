import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ComicButton, SceneLinks, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { useRemoteWithFallback } from '../lib/useRemote'
import { loadSits, loadTables, toggleSit, upsertTable } from '../lib/social'
import type { FestTable } from '../lib/types'
import { isMine, profilePath } from '../lib/zine'
import { useZines } from '../store/useZines'

export function Fest() {
  const { session, online, profile, zines } = useZines()
  const [scene, setScene] = useState('')
  const [name, setName] = useState('')
  const [blurb, setBlurb] = useState('')
  const mine = zines.filter((z) => z.published && isMine(z, session?.name)).slice(0, 8)
  const [picked, setPicked] = useState<string[]>([])

  const [fest, setFest] = useRemoteWithFallback(
    () => api.fest(),
    () => {
      const local = loadTables()
      return {
        tables: local,
        sits: Object.fromEntries(local.map((table) => [table.id, loadSits(table.id)])),
      }
    },
    (data) => ({
      tables: data.tables,
      sits: Object.fromEntries(data.tables.map((table) => [table.id, table.sitters ?? []])),
    }),
    [],
  )
  const { tables, sits } = fest

  const visible = useMemo(() => {
    const q = scene.trim().toLowerCase()
    if (!q) return tables
    return tables.filter((table) => table.scene.toLowerCase().includes(q))
  }, [tables, scene])

  async function setup() {
    const table: FestTable = {
      id: session?.name ?? profile.name,
      owner: session ? `@${session.name}` : profile.name,
      name: name.trim() || 'my table',
      scene: scene.trim() || profile.scene || 'wherever',
      blurb: blurb.trim() || 'sit if you want.',
      zineIds: picked,
      createdAt: Date.now(),
    }
    if (online && session) {
      const res = await api.setTable({
        name: table.name,
        scene: table.scene,
        blurb: table.blurb,
        zineIds: picked,
      })
      setFest((prev) => ({
        ...prev,
        tables: [res.table, ...prev.tables.filter((row) => row.owner !== res.table.owner)],
      }))
    } else {
      setFest((prev) => ({ ...prev, tables: upsertTable(table) }))
    }
    setName('')
    setBlurb('')
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="studio-head">
          <div>
            <div className="issue-chip">THE FLOOR</div>
            <h1 className="display chroma">zine fest</h1>
            <p className="serif" style={{ maxWidth: 520, marginTop: 8 }}>
              Not a marketplace. Tables, scenes, and whatever you carried in your bag.
            </p>
            <SceneLinks here="/fest" />
          </div>
        </div>

        <form
          className="board-form"
          onSubmit={(e) => {
            e.preventDefault()
            void setup()
          }}
        >
          <input value={name} placeholder="table name" onChange={(e) => setName(e.target.value)} />
          <input
            value={scene}
            placeholder="scene / city (bushwick)"
            onChange={(e) => setScene(e.target.value)}
          />
          <textarea value={blurb} placeholder="what is on the table" onChange={(e) => setBlurb(e.target.value)} />
          {mine.length ? (
            <div className="vibe-picks">
              {mine.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className={`tray-item ${picked.includes(z.id) ? 'on' : ''}`}
                  onClick={() =>
                    setPicked((prev) => (prev.includes(z.id) ? prev.filter((id) => id !== z.id) : [...prev, z.id]))
                  }
                >
                  {z.title}
                </button>
              ))}
            </div>
          ) : null}
          <ComicButton className="pink">Set up a table</ComicButton>
        </form>

        <div className="board-list">
          {visible.map((table) => (
            <article key={table.id} className="board-card fest-table">
              <div className="meta-line">
                <strong className="hand">{table.name}</strong>
                <Link className="owner-link" to={profilePath(table.owner)}>
                  {table.owner}
                </Link>
                {table.scene ? <span className="issue-chip">{table.scene}</span> : null}
              </div>
              <p className="serif">{table.blurb}</p>
              {table.zineIds.length ? (
                <div className="cta-row" style={{ marginTop: 8 }}>
                  {table.zineIds.map((id) => {
                    const zine = zines.find((z) => z.id === id)
                    return (
                      <Link key={id} to={`/z/${id}`} className="comic-btn small">
                        {zine?.title ?? 'issue'}
                      </Link>
                    )
                  })}
                </div>
              ) : null}
              <div className="cta-row" style={{ marginTop: 8 }}>
                <ComicButton
                  className="small"
                  onClick={() => {
                    const who = session?.name ?? profile.name
                    if (online && session) {
                      void api
                        .sit(table.id)
                        .then((res) =>
                          setFest((prev) => ({
                            ...prev,
                            sits: { ...prev.sits, [table.id]: res.sitters },
                          })),
                        )
                        .catch(() =>
                          setFest((prev) => ({
                            ...prev,
                            sits: { ...prev.sits, [table.id]: toggleSit(table.id, who) },
                          })),
                        )
                      return
                    }
                    setFest((prev) => ({
                      ...prev,
                      sits: { ...prev.sits, [table.id]: toggleSit(table.id, who) },
                    }))
                  }}
                >
                  Sit
                </ComicButton>
                {(sits[table.id] ?? table.sitters ?? []).length ? (
                  <span className="meta-line">{(sits[table.id] ?? table.sitters ?? []).join(' · ')}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!visible.length ? <p className="serif">the floor is empty. set a table first.</p> : null}
      </main>
    </div>
  )
}
