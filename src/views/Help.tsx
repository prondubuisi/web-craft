import { Link } from 'react-router-dom'
import { SceneLinks, Topbar } from '../components/Chrome'

const ENTRIES: { term: string; body: string; to?: string; go?: string }[] = [
  {
    term: 'issue',
    body: 'A zine. Pages of blocks you drop, print, or pass as a snapshot.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'vibe',
    body: 'A palette, not a template. Miles, Gwen, Peni, Ham, Noir. Temperature, not layout.',
    to: '/',
    go: 'Pick a vibe',
  },
  {
    term: 'drop',
    body: 'Publish. Now, in a minute, or as a time capsule years out. A sealed drop stays folded until the clock hits.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'snapshot',
    body: 'The issue packed into a link. Opens without the original studio. Photos are compressed first. If they still will not fit, the copy fails out loud — export JSON instead of losing the pictures.',
  },
  {
    term: 'snap',
    body: 'Camera or upload → cutout → a tilted sticker. Lives in the widget tray. No new widget type, just a photo that behaves like collage.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'type',
    body: 'What a block is. Change it in the inspector. Shared cuts carry over — heading ink becomes quote ink, a sticker photo becomes a hero photo.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'cut',
    body: 'The parts a widget is made of: ink, photo, tape, cut, pin, set, cite, holes. Slash /photo or the tray cut row finds every recipe that uses that part. Not a vibe and not a new widget.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'sample',
    body: 'A scrap of ink, photo, set, or another cut. Pick more than one in the inspector — they combine. City ink plus a miles photo makes a sticker.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'scatter',
    body: 'An optional page layout. Stickers and heroes sit free on the spread instead of in a stack. Drag the handle to pin them. Linear blocks stay the default.',
    to: '/studio',
    go: 'Open the studio',
  },
  {
    term: 'remix',
    body: 'Fork someone else’s issue and make it yours. Credit stays on the original.',
    to: '/explore',
    go: 'The stream',
  },
  {
    term: 'bag',
    body: 'Your private reading pile. Stuff an issue in, or check one out of the Archive — that copy lands here too. Not the public distro shelf.',
    to: '/studio',
    go: 'Your bag lives in studio',
  },
  {
    term: 'distro shelf',
    body: 'Issues you stock on your profile for other people to find. A table, not a store, and not your bag.',
    to: '/explore',
    go: 'The stream',
  },
  {
    term: 'archive',
    body: 'Community nomination, not a popularity list. Enough votes and the issue gets a permanent home. Check out a filed issue and it also goes in your bag for a week.',
    to: '/explore',
    go: 'The stream',
  },
  {
    term: 'board',
    body: 'Trade, collab, and feedback pins. Mail-swap culture, not a marketplace. Mark a swap done when it is done.',
    to: '/board',
    go: 'Open the board',
  },
  {
    term: 'fest',
    body: 'Tables on a floor, filtered by scene. Sit if you want. Still not a marketplace.',
    to: '/fest',
    go: 'Open the fest',
  },
  {
    term: 'desk',
    body: 'The corkboard. Scatter pins before they become a page. Paste a pin into a draft when you are ready.',
    to: '/cork',
    go: 'Open the desk',
  },
  {
    term: 'jam',
    body: 'A time-boxed prompt. Public drops that fit the format land in the pile automatically.',
    to: '/explore',
    go: 'The stream',
  },
  {
    term: 'letters',
    body: 'Private pen-pal threads. A postcard is the tiny version. MAIL in the topbar is the wire — notices, not the inbox. On an issue, a letter under INK stays on that page.',
    to: '/mail',
    go: 'Open letters',
  },
  {
    term: 'blurb',
    body: 'One line on the issue, no stars. Under INK with letters. Not a letter and not a margin note.',
  },
  {
    term: 'margin',
    body: 'A scribble on one panel (¶). Lives on that block, not the whole issue.',
  },
  {
    term: 'dedication',
    body: 'The maker writes “for …” before the drop. Not a reader response. It prints with the issue.',
  },
  {
    term: 'tear-out',
    body: 'A reply block on the page. Tear it off and it mails a postcard. The block is the form; the postcard is mail.',
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
    to: '/studio',
    go: 'Claim in the studio',
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
              <dd className="serif">
                {entry.body}
                {entry.to ? (
                  <>
                    {' '}
                    <Link to={entry.to}>{entry.go}</Link>
                  </>
                ) : null}
              </dd>
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
        <SceneLinks />
      </main>
    </div>
  )
}
