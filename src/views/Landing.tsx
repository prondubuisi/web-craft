import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { ComicButton, Halftone, LocalNote, SceneLinks, Topbar } from '../components/Chrome'
import { assetUrl } from '../lib/paths'
import { dismissPrimer, primerSeen } from '../lib/primer'
import { VIBES } from '../lib/vibes'
import { rememberVibe, studioPath } from '../lib/zine'
import { useZines } from '../store/useZines'
import type { VibeId } from '../lib/types'

export function Landing() {
  const [vibe, setVibe] = useState<VibeId>('miles')
  const [primer, setPrimer] = useState(() => !primerSeen())
  const { zines } = useZines()
  const navigate = useNavigate()
  const current = VIBES.find((v) => v.id === vibe)!
  const sample = zines.find((z) => z.published && z.title.toLowerCase().includes('after hours')) ?? zines.find((z) => z.published)

  function start(withVibe: VibeId) {
    rememberVibe(withVibe)
    navigate(studioPath({ new: true, vibe: withVibe }))
  }

  return (
    <div data-vibe={vibe}>
      <Topbar />
      <LocalNote />
      {primer ? (
        <aside className="primer" aria-label="First visit">
          <div className="primer-grid">
            <article className="comic-cell" style={{ transform: 'rotate(-1deg)' }}>
              <div className="kicker">1</div>
              <h3>Make an issue</h3>
              <p>Pages are collage. Pick a vibe and drop blocks. It lives in this browser until you claim a handle.</p>
            </article>
            <article className="comic-cell" style={{ transform: 'rotate(0.8deg)', background: 'var(--accent-3)' }}>
              <div className="kicker">2</div>
              <h3>Print it. Pass it.</h3>
              <p>Print the issue or a fold sheet. Copy a snapshot link to open it somewhere else.</p>
            </article>
            <article className="comic-cell" style={{ transform: 'rotate(-0.4deg)' }}>
              <div className="kicker">3</div>
              <h3>Remix the pile</h3>
              <p>
                The stream is other people&apos;s issues. Fork anything. Trades, letters, and a fest floor wait
                behind a handle.
              </p>
            </article>
          </div>
          <div className="cta-row" style={{ marginTop: '0.9rem' }}>
            <ComicButton
              className="small"
              onClick={() => {
                dismissPrimer()
                setPrimer(false)
              }}
            >
              Got it
            </ComicButton>
            <Link to="/help" className="comic-btn small ghost">
              Glossary
            </Link>
          </div>
        </aside>
      ) : null}

      <section className="hero-spread">
        <div className="bg halftone-media">
          <img src={assetUrl('/art/collage-hero.jpg')} alt="" />
        </div>
        <div className="hero-copy">
          <span className="issue-chip">MAKE · PRINT · PASS · REMIX</span>
          <h1 className="display chroma">ZINEVERSE</h1>
          <p className="lede serif">
            A zine studio, not a website builder. Cut a page like collage — imperfect, personal, and
            printed slightly wrong on purpose.
          </p>
          <div className="cta-row">
            <ComicButton className="pink" onClick={() => start(vibe)}>
              Make an issue
            </ComicButton>
            <ComicButton
              className="ghost"
              onClick={() => {
                rememberVibe(vibe)
                navigate(studioPath({ vibe }))
              }}
            >
              Enter the studio
            </ComicButton>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="display chroma">Vibes, not templates</h2>
        <p className="serif" style={{ marginBottom: '1.2rem', maxWidth: 640 }}>
          Templates decide your layout. Vibes decide your temperature. Remix Miles, Gwen, Peni, Ham,
          or Noir — then break them.
        </p>
        <div className="vibe-rail">
          {VIBES.map((v) => (
            <button
              key={v.id}
              className={`vibe-card ${vibe === v.id ? 'on' : ''}`}
              onClick={() => {
                setVibe(v.id)
                rememberVibe(v.id)
              }}
              type="button"
            >
              <Halftone src={v.art} alt="" className="thumb" />
              <div className="meta">
                <h3>{v.name}</h3>
                <p>{v.alias}</p>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <ComicButton onClick={() => start(vibe)}>
            Build with {current.name}
          </ComicButton>
        </div>
      </section>

      {sample ? (
        <section className="section">
          <h2 className="display">One finished issue</h2>
          <p className="serif" style={{ marginBottom: '1rem', maxWidth: 560 }}>
            {sample.title} — already in your studio. Read it, remix it, or start a blank page.
          </p>
          <article className="landing-sample">
            {sample.blocks.slice(0, 4).map((block) => (
              <div key={block.id} className="block">
                <BlockView block={block} />
              </div>
            ))}
          </article>
          <div className="cta-row" style={{ marginTop: '1rem' }}>
            <Link to={`/z/${sample.id}`} className="comic-btn cyan">
              Read {sample.title}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="display chroma">The scene is optional</h2>
        <p className="serif" style={{ maxWidth: 560 }}>
          Trades, letters, and a fest floor when you claim a handle. Until then this browser is the
          whole studio.{' '}
          <Link to="/help">A glossary lives at /help.</Link>
        </p>
        <SceneLinks />
      </section>

      <footer className="footer-issue">
        <div className="kicker">NEXT ISSUE</div>
        <h2 className="display chroma">THE WEB IS A ZINE</h2>
        <p className="serif" style={{ margin: '0.6rem auto 1rem', maxWidth: 420 }}>
          Reclaim the handmade internet. Imperfect on purpose.
        </p>
        <ComicButton className="pink" onClick={() => start(vibe)}>
          Start issue one
        </ComicButton>
        <p className="meta-line" style={{ justifyContent: 'center', marginTop: 14 }}>
          <a href="https://github.com/prondubuisi/web-craft" target="_blank" rel="noreferrer">
            source
          </a>
          <Link to="/help">help</Link>
          <span>print any issue from the reader</span>
        </p>
      </footer>
    </div>
  )
}
