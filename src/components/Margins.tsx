import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { addMargin } from '../lib/social'
import type { MarginNote } from '../lib/types'
import { profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'
import { ComicButton } from './Chrome'

export function Margins({
  zineId,
  blockId,
  notes,
  remote,
  onAdd,
}: {
  zineId: string
  blockId: string
  notes: MarginNote[]
  remote: boolean
  onAdd: (note: MarginNote) => void
}) {
  const { session, online, profile } = useZines()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const mine = notes.filter((note) => note.blockId === blockId)

  async function submit() {
    const text = body.trim()
    if (!text) return
    if (remote && session) {
      const res = await api.margin(zineId, blockId, text)
      onAdd(res.note)
    } else {
      onAdd(addMargin(zineId, blockId, session?.name ?? profile.name, text))
    }
    setBody('')
  }

  return (
    <div className="margin-wrap">
      <button
        type="button"
        className={`margin-toggle ${mine.length ? 'hot' : ''}`}
        aria-label="Marginalia"
        onClick={() => setOpen((v) => !v)}
      >
        ¶{mine.length ? ` ${mine.length}` : ''}
      </button>
      {open ? (
        <div className="margin-panel">
          {mine.map((note) => (
            <p key={note.id} className="serif">
              <Link className="owner-link" to={profilePath(note.author)}>
                {note.author}
              </Link>{' '}
              {note.body}
            </p>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <input
              value={body}
              maxLength={160}
              placeholder={online && !session ? 'claim a handle to ink the margin' : 'scribble in the gutter'}
              disabled={Boolean(online && !session)}
              onChange={(e) => setBody(e.target.value)}
            />
            <ComicButton className="small" disabled={!body.trim() || Boolean(online && !session)}>
              Pin
            </ComicButton>
          </form>
        </div>
      ) : null}
    </div>
  )
}
