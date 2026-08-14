import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { loadReviews, upsertReview } from '../lib/social'
import type { Review } from '../lib/types'
import { profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'
import { ComicButton } from './Chrome'

export function Reviews({
  zineId,
  locked,
  remote = false,
}: {
  zineId: string
  locked: boolean
  remote?: boolean
}) {
  const { session, online, profile } = useZines()
  const [items, setItems] = useState<Review[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const me = session?.name ?? profile.name

  useEffect(() => {
    let cancelled = false
    if (remote) {
      void api
        .reviews(zineId)
        .then((res) => {
          if (!cancelled) setItems(res.reviews)
        })
        .catch(() => {
          if (!cancelled) setItems(loadReviews(zineId))
        })
    } else {
      setItems(loadReviews(zineId))
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
        const res = await api.review(zineId, text)
        setItems((prev) => [res.review, ...prev.filter((row) => row.author !== res.review.author)])
      } else {
        const review = upsertReview(zineId, me, text)
        setItems((prev) => [review, ...prev.filter((row) => row.author !== review.author)])
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
    <section className="comments" aria-label="Blurbs">
      <div className="issue-chip">BLURBS</div>
      <h2 className="display" style={{ fontSize: '2rem', marginTop: 8 }}>
        {items.length ? `${items.length} review${items.length === 1 ? '' : 's'}` : 'leave a blurb'}
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
          maxLength={240}
          placeholder={
            online && !session ? 'claim a handle in the studio to leave a blurb' : 'one line. no stars.'
          }
          onChange={(e) => setBody(e.target.value)}
          disabled={Boolean(online && !session)}
        />
        {error ? <p className="hand">{error}</p> : null}
        <div className="cta-row">
          <ComicButton className="pink small" disabled={busy || !body.trim() || Boolean(online && !session)}>
            Stamp it
          </ComicButton>
          {!online ? <span className="meta-line">saved in this browser</span> : null}
        </div>
      </form>
    </section>
  )
}
