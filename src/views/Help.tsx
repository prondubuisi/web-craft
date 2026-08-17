import { Link } from 'react-router-dom'
import { Topbar } from '../components/Chrome'

const ENTRIES = [
  {
    term: 'issue',
    body: 'A zine. Pages of blocks you drop, print, or pass as a snapshot.',
  },
  {
    term: 'vibe',
    body: 'A palette, not a template. Miles, Gwen, Peni, Ham, Noir. Temperature, not layout.',
  },
  {
    term: 'drop',
    body: 'Publish. Now, in a minute, or as a time capsule years out. A sealed drop stays folded until the clock hits.',
  },
  {
    term: 'snapshot',
    body: 'The issue packed into a link. Opens without the original studio. Photos are compressed first. If they still will not fit, the copy fails out loud — export JSON instead of losing the pictures.',
  },
  {
    term: 'snap',
    body: 'Camera or upload → cutout → a tilted sticker. Lives in the widget tray. No new widget type, just a photo that behaves like collage.',
  },
  {
    term: 'scatter',
    body: 'An optional page layout. Stickers and heroes sit free on the spread instead of in a stack. Drag the handle to pin them. Linear blocks stay the default.',
  },
  {
    term: 'remix',
    body: 'Fork someone else’s issue and make it yours. Credit stays on the original.',
  },
  {
    term: 'bag',
    body: 'Your private reading pile. Stuff an issue in, or check one out of the Archive — that copy lands here too. Not the public distro shelf.',
  },
  {
    term: 'distro shelf',
    body: 'Issues you stock on your profile for other people to find. A table, not a store, and not your bag.',
  },
  {
    term: 'archive',
    body: 'Community nomination, not a popularity list. Enough votes and the issue gets a permanent home. Check out a filed issue and it also goes in your bag for a week.',
  },
  {
    term: 'board',
    body: 'Trade, collab, and feedback pins. Mail-swap culture, not a marketplace. Mark a swap done when it is done.',
  },
  {
    term: 'fest',
    body: 'Tables on a floor, filtered by scene. Sit if you want. Still not a marketplace.',
  },
  {
    term: 'desk',
    body: 'The corkboard. Scatter pins before they become a page. Paste a pin into a draft when you are ready.',
  },
  {
    term: 'jam',
    body: 'A time-boxed prompt. Public drops that fit the format land in the pile automatically.',
  },
  {
    term: 'letters',
    body: 'Private pen-pal threads. A postcard is the tiny version. MAIL in the topbar is the wire — notices, not the inbox.',
  },
  {
    term: 'b-side',
    body: 'A hidden fold on the reader. Unfold it if the maker left one.',
  },
  {
    term: 'corpse',
    body: 'Exquisite corpse. A chain invite shows only the last page. Add yours and pass the next link.',
  },
  {
    term: 'handle',
    body: 'Who you are on the API. Claim one to sync drafts and join the scene. Without it, this browser is the studio.',
  },
]

export function Help() {
  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio help-page">
        <div className="issue-chip">GLOSSARY</div>
        <h1 className="display chroma">what the words mean</h1>
        <p className="serif help-lede">
          Zineverse talks like a photocopier, not a settings menu. Flip these if a sticker does not
          explain itself. Nothing here is for sale.
        </p>
        <dl className="help-list">
          {ENTRIES.map((entry) => (
            <div key={entry.term} className="help-entry comic-cell">
              <dt className="hand">{entry.term}</dt>
              <dd className="serif">{entry.body}</dd>
            </div>
          ))}
        </dl>
        <div className="cta-row" style={{ marginTop: '1.4rem' }}>
          <Link to="/studio" className="comic-btn pink">
            Open the studio
          </Link>
          <Link to="/explore" className="comic-btn ghost">
            The stream
          </Link>
        </div>
      </main>
    </div>
  )
}
