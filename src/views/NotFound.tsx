import { Link } from 'react-router-dom'
import { Topbar } from '../components/Chrome'

export function NotFound() {
  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio">
        <div className="issue-chip">404 · WRONG DIMENSION</div>
        <h1 className="display chroma">this page tore off</h1>
        <p className="serif" style={{ maxWidth: 420, margin: '0.8rem 0 1.2rem' }}>
          No panel here. The gutter ate it. Try the cover, the studio, or the stream.
        </p>
        <div className="cta-row">
          <Link to="/" className="comic-btn pink">
            Cover
          </Link>
          <Link to="/studio" className="comic-btn">
            Studio
          </Link>
          <Link to="/explore" className="comic-btn ghost">
            Stream
          </Link>
        </div>
      </main>
    </div>
  )
}
