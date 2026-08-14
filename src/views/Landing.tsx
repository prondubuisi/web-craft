import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar, ComicButton, Halftone } from '../components/Chrome'
import { assetUrl } from '../lib/paths'
import { BlockView } from '../components/Blocks'
import { VIBES } from '../lib/vibes'
import { WIDGETS, createBlock } from '../lib/widgets'
import { useZines } from '../store/ZineContext'
import type { VibeId } from '../lib/types'

const SAMPLE = {
  sticker: createBlock('sticker', 'miles'),
  sfx: createBlock('sfx', 'miles'),
  glitch: createBlock('glitch', 'miles'),
  stack: createBlock('stack', 'miles'),
}

export function Landing() {
  const [vibe, setVibe] = useState<VibeId>('miles')
  const { createZine } = useZines()
  const navigate = useNavigate()
  const current = VIBES.find((v) => v.id === vibe)!

  function start(withVibe: VibeId, title = 'untitled issue') {
    const id = createZine(title, withVibe)
    navigate(`/edit/${id}`)
  }

  return (
    <div data-vibe={vibe}>
      <Topbar />
      <section className="hero-spread">
        <div className="bg halftone-media">
          <img src={assetUrl('/art/collage-hero.jpg')} alt="" />
        </div>
        <div className="hero-copy">
          <span className="issue-chip">NEW CATEGORY · EXPRESSIVE BUILDER</span>
          <h1 className="display chroma">ZINEVERSE</h1>
          <p className="lede serif">
            Don&apos;t build a website. Craft a world. A drag-and-drop zine builder that treats
            pages like collage — imperfect, personal, and printed slightly wrong on purpose.
          </p>
          <div className="cta-row">
            <ComicButton className="pink" onClick={() => start(vibe, `${current.name.toLowerCase()} draft`)}>
              Drop a zine
            </ComicButton>
            <ComicButton className="ghost" onClick={() => navigate('/studio')}>
              Enter the studio
            </ComicButton>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="display chroma">Vibes, not templates</h2>
        <p className="serif" style={{ marginBottom: '1.2rem', maxWidth: 640 }}>
          Templates decide your layout. Vibes decide your temperature. Remix Miles, Gwen, Peni,
          Ham, or Noir — then break them.
        </p>
        <div className="vibe-rail">
          {VIBES.map((v) => (
            <button
              key={v.id}
              className={`vibe-card ${vibe === v.id ? 'on' : ''}`}
              onClick={() => setVibe(v.id)}
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
          <ComicButton onClick={() => start(vibe, `${current.name.toLowerCase()} issue`)}>
            Build with {current.name}
          </ComicButton>
        </div>
      </section>

      <section className="section">
        <h2 className="display">How it feels</h2>
        <div className="how-grid">
          <article className="comic-cell" style={{ transform: 'rotate(-1deg)' }}>
            <div className="kicker">JAPAN</div>
            <h3>Polite speed</h3>
            <p>Halftones are CSS dots. Chromatic split is a shadow. Nothing waits on a shader.</p>
          </article>
          <article className="comic-cell" style={{ transform: 'rotate(1.2deg)', background: 'var(--accent-3)' }}>
            <div className="kicker">KOREA</div>
            <h3>Dopamine first</h3>
            <p>Joy is a feature. If a control doesn&apos;t make you grin, it doesn&apos;t ship.</p>
          </article>
          <article className="comic-cell" style={{ transform: 'rotate(-0.4deg)' }}>
            <div className="kicker">LATAM + NORDIC</div>
            <h3>Loud, then lean</h3>
            <p>Color is conversation. Every widget still has to earn its bytes.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <h2 className="display chroma">Widget zoo</h2>
        <div className="widget-zoo">
          <div className="comic-cell">
            <div className="kicker">/sfx</div>
            <BlockView block={SAMPLE.sfx} />
          </div>
          <div className="comic-cell">
            <div className="kicker">/sticker</div>
            <BlockView block={SAMPLE.sticker} />
          </div>
          <div className="comic-cell">
            <div className="kicker">/glitch</div>
            <BlockView block={SAMPLE.glitch} />
          </div>
          <div className="comic-cell">
            <div className="kicker">/stack</div>
            <BlockView block={SAMPLE.stack} />
          </div>
        </div>
        <p className="hand" style={{ marginTop: '1rem' }}>
          Slash any of {WIDGETS.map((w) => `/${w.slash}`).join('  ')} in the editor.
        </p>
      </section>

      <section className="section">
        <h2 className="display">Not another builder</h2>
        <div className="compete">
          {[
            ['Squarespace', 'Beautiful cages', 'Remixable vibes, no cages'],
            ['Wix', 'Freeform, generic', 'Freeform with a visual language'],
            ['Webflow', 'Power, steep', 'Zero learning curve — play'],
            ['Framer', 'Designer-only', 'Anyone can make a world'],
            ['Notion', 'Blocks, bland', 'Blocks with a pulse'],
          ].map(([name, weak, us]) => (
            <div className="compare-row" key={name}>
              <strong>{name}</strong>
              <span>{weak}</span>
              <span className="hand">vs</span>
              <span>{us}</span>
            </div>
          ))}
        </div>
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
          <span>print any issue from the reader</span>
        </p>
      </footer>
    </div>
  )
}
