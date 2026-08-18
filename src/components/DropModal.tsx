import { useState } from 'react'
import { demoJams, formatHint, jamForPublish, liveJam } from '../lib/jam'
import type { Visibility, Zine } from '../lib/types'
import { ComicButton, Modal } from './Chrome'

export function DropModal({
  zine,
  local,
  onClose,
  onDrop,
  onCopy,
  onExport,
  onPrint,
}: {
  zine: Zine
  local?: boolean
  onClose: () => void
  onDrop: (when: number, opts: { visibility: Visibility; password?: string; chain?: boolean }) => void
  onCopy: (kind: 'local' | 'snapshot') => void
  onExport: () => void
  onPrint: () => void
}) {
  const [visibility, setVisibility] = useState<Visibility>(zine.visibility ?? 'public')
  const [password, setPassword] = useState('')
  const [chain, setChain] = useState(Boolean(zine.chainOpen))
  const jam = liveJam(demoJams())
  const inJam = jam && jamForPublish({ blocks: zine.blocks, visibility }, demoJams())
  const options = [
    { label: 'Drop now', at: Date.now() },
    { label: 'In a minute', at: Date.now() + 60_000 },
    { label: 'In an hour', at: Date.now() + 3600_000 },
    { label: 'Tomorrow', at: Date.now() + 86400_000 },
    { label: 'In a year', at: Date.now() + 365 * 86400_000 },
    { label: 'In a decade', at: Date.now() + 3650 * 86400_000 },
  ]
  return (
    <Modal title="drop this issue" onClose={onClose}>
      <p className="serif">
        A heading and a picture is enough. A public drop hits the stream. An unlisted drop is a
        secret link. A year or a decade is a time capsule — write to someone who is not here yet.
      </p>
      {local ? (
        <p className="hand" style={{ margin: '0.6rem 0 0' }}>
          This drop lives in this browser until you claim a handle. Snapshot or print is the pass.
        </p>
      ) : null}
      <div className="vibe-picks" style={{ marginTop: 12 }}>
        <button
          className={`tray-item ${visibility === 'public' ? 'on' : ''}`}
          onClick={() => setVisibility('public')}
        >
          public
        </button>
        <button
          className={`tray-item ${visibility === 'unlisted' ? 'on' : ''}`}
          onClick={() => setVisibility('unlisted')}
        >
          unlisted
        </button>
        <button className={`tray-item ${chain ? 'on' : ''}`} onClick={() => setChain((v) => !v)}>
          exquisite corpse
        </button>
      </div>
      {jam ? (
        <p className="hand" style={{ margin: '0.7rem 0 0' }}>
          {inJam
            ? `enters ${jam.title} · ${formatHint(jam.format)}`
            : `${jam.title} is live — ${formatHint(jam.format)}. trim the issue to enter.`}
        </p>
      ) : null}
      <input
        type="password"
        value={password}
        placeholder="optional passphrase (4+)"
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <div className="vibe-picks" style={{ marginTop: 12 }}>
        {options.map((opt) => (
          <button
            key={opt.label}
            className="tray-item"
            onClick={() =>
              onDrop(opt.at, {
                visibility: chain ? 'unlisted' : visibility,
                password: password.length >= 4 ? password : undefined,
                chain,
              })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      {zine.published ? (
        <p className="hand" style={{ margin: '0.8rem 0 0' }}>
          {zine.visibility === 'unlisted' ? 'already unlisted.' : 'already on the stream.'} Copy the
          snapshot or print the page. Fold sheet lives on Preview.
        </p>
      ) : (
        <p className="hand" style={{ margin: '0.8rem 0 0' }}>
          Print the page here. Fold sheet lives on Preview.
        </p>
      )}
      <div className="cta-row" style={{ marginTop: 12 }}>
        <ComicButton className="small cyan" onClick={() => onCopy('snapshot')}>
          Copy snapshot link
        </ComicButton>
        <ComicButton className="small ghost" onClick={onPrint}>
          Print issue
        </ComicButton>
        <ComicButton className="small ghost" onClick={() => onCopy('local')}>
          Copy studio link
        </ComicButton>
        <ComicButton className="small ghost" onClick={onExport}>
          Export JSON
        </ComicButton>
      </div>
    </Modal>
  )
}
