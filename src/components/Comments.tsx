import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { addLocalComment, loadLocalComments } from '../lib/social'
import type { Comment } from '../lib/types'
import { profilePath } from '../lib/zine'
import { useZines } from '../store/useZines'
import { ComicButton } from './Chrome'

export function Comments({
  zineId,
  locked,
  remote = false,
}: {
  zineId: string
  locked: boolean
  remote?: boolean
}) {
  const { session, online, profile } = useZines()
  const [items, setItems] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (remote) {
      void api
        .comments(zineId)
        .then((res) => {
          if (!cancelled) setItems(res.comments)
        })
        .catch(() => {
          if (!cancelled) setItems(loadLocalComments(zineId))
        })
    } else {
      setItems(loadLocalComments(zineId))
    }
    return () => {
      cancelled = true
    }
  }, [zineId, remote])

  async function submit() {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    setError('')
    try {
      if (remote && session) {
        const res = await api.comment(zineId, text)
        setItems((prev) => [...prev, res.comment])
      } else {
        const comment = addLocalComment(zineId, session?.name ?? profile.name, text)
        setItems((prev) => [...prev, comment])
      }
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  if (locked) return null

  return (
    <section className="comments" aria-label="Letters">
      <div className="issue-chip">LETTERS TO THE EDITOR</div>
      <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
        {items.length ? `${items.length} note${items.length === 1 ? '' : 's'}` : 'leave a note'}
      </h2>
      <div className="comment-list">
        {items.map((item) => (
          <article key={item.id} className="comment">
            <div className="meta-line">
              <Link className="owner-link" to={profilePath(item.author)}>
                {item.author.startsWith('@') || item.author === 'you' ? item.author : `@${item.author}`}
              </Link>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="serif">{item.body}</p>
          </article>
        ))}
      </div>
      <form
        className="comment-form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <textarea
          value={body}
          maxLength={280}
          placeholder={
            online && !session ? 'claim a handle in the studio to write on the wall' : 'ink a note (280)'
          }
          onChange={(e) => setBody(e.target.value)}
          disabled={Boolean(online && !session)}
        />
        {error ? <p className="hand">{error}</p> : null}
        <div className="cta-row">
          <ComicButton className="pink small" disabled={busy || !body.trim() || Boolean(online && !session)}>
            Send it
          </ComicButton>
          {!online ? <span className="meta-line">saved in this browser</span> : null}
        </div>
      </form>
    </section>
  )
}
