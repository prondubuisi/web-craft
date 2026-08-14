import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ComicButton, Topbar } from '../components/Chrome'
import { api } from '../lib/api'
import { listThreads, markThreadRead, sendLetter, threadWith } from '../lib/social'
import type { Letter, MailThread, VibeId } from '../lib/types'
import { profilePath } from '../lib/zine'
import { useZines } from '../store/ZineContext'

export function Mail() {
  const { handle = '' } = useParams()
  const other = decodeURIComponent(handle).replace(/^@/, '').toLowerCase()
  const { session, online, profile } = useZines()
  const me = session?.name ?? profile.name
  const navigate = useNavigate()
  const [threads, setThreads] = useState<MailThread[]>(() => listThreads(me))
  const [letters, setLetters] = useState<Letter[]>(() => (other ? threadWith(me, other) : []))
  const [body, setBody] = useState('')
  const [to, setTo] = useState(other)
  const [error, setError] = useState('')
  const [card, setCard] = useState(false)
  const [vibe, setVibe] = useState<VibeId>('miles')

  useEffect(() => {
    setTo(other)
    if (online && session) {
      void api
        .mail()
        .then((res) => setThreads(res.threads))
        .catch(() => setThreads(listThreads(me)))
      if (other) {
        void api
          .thread(other)
          .then((res) => setLetters(res.letters))
          .catch(() => setLetters(threadWith(me, other)))
      } else {
        setLetters([])
      }
      return
    }
    setThreads(listThreads(me))
    if (other) {
      markThreadRead(me, other)
      setLetters(threadWith(me, other))
    } else {
      setLetters([])
    }
  }, [other, online, session, me])

  async function send() {
    const text = body.trim()
    const dest = (to || other).trim().replace(/^@/, '')
    if (!text || !dest) return
    setError('')
    try {
      if (online && session) {
        const res = await api.sendMail(dest, text, card ? { postcard: true, vibe } : undefined)
        setLetters((prev) => [...prev, res.letter])
        const next = await api.mail()
        setThreads(next.threads)
      } else {
        const letter = sendLetter(me, dest, text, card ? { postcard: true, vibe } : undefined)
        setLetters((prev) => [...prev, letter])
        setThreads(listThreads(me))
      }
      setBody('')
      if (!other) navigate(`/mail/${encodeURIComponent(dest)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    }
  }

  return (
    <div data-vibe="miles">
      <Topbar />
      <main className="studio mail-page">
        <div className="studio-head">
          <div>
            <div className="issue-chip">PEN PAL</div>
            <h1 className="display chroma">{other ? `@${other}` : 'letters'}</h1>
            <p className="serif" style={{ maxWidth: 480, marginTop: 8 }}>
              Private mail. Not a letter to the editor — just two handles and a folded note.
            </p>
          </div>
        </div>

        <div className="mail-layout">
          <aside className="mail-threads">
            {threads.length ? (
              threads.map((thread) => (
                <Link
                  key={thread.handle}
                  to={`/mail/${encodeURIComponent(thread.handle)}`}
                  className={`board-card ${other === thread.handle.toLowerCase() ? 'on' : ''}`}
                >
                  <div className="meta-line">
                    <strong className="hand">@{thread.handle}</strong>
                    {thread.unread ? <span className="issue-chip">{thread.unread} new</span> : null}
                  </div>
                  <p className="serif">{thread.last.body}</p>
                </Link>
              ))
            ) : (
              <p className="serif">no envelopes yet. write first.</p>
            )}
          </aside>

          <section>
            <form
              className="board-form"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              {!other ? (
                <input
                  value={to}
                  placeholder="handle"
                  onChange={(e) => setTo(e.target.value)}
                  aria-label="Send to handle"
                />
              ) : (
                <div className="meta-line">
                  <Link className="owner-link" to={profilePath(other)}>
                    @{other}
                  </Link>
                  <Link to="/mail">all letters</Link>
                </div>
              )}
              <div className="mail-thread">
                {letters.map((letter) => (
                  <article
                    key={letter.id}
                    className={`comment ${letter.from.replace(/^@/, '') === me.replace(/^@/, '') ? 'mine' : ''} ${letter.postcard ? 'postcard' : ''}`}
                    data-vibe={letter.postcard ? letter.vibe ?? 'miles' : undefined}
                  >
                    <div className="meta-line">
                      <span>{letter.from}</span>
                      {letter.postcard ? <span className="issue-chip">POSTCARD</span> : null}
                      <span>{new Date(letter.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="serif">{letter.body}</p>
                  </article>
                ))}
                {other && !letters.length ? <p className="hand">blank page. start it.</p> : null}
              </div>
              <button
                type="button"
                className={`tray-item ${card ? 'on' : ''}`}
                onClick={() => setCard((v) => !v)}
              >
                postcard
              </button>
              {card ? (
                <div className="vibe-picks">
                  {(['miles', 'gwen', 'peni', 'ham', 'noir'] as VibeId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`tray-item ${vibe === id ? 'on' : ''}`}
                      onClick={() => setVibe(id)}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              ) : null}
              <textarea
                value={body}
                maxLength={card ? 140 : 400}
                placeholder={card ? 'one side. no stamp required.' : 'fold it twice. mail it once.'}
                onChange={(e) => setBody(e.target.value)}
              />
              {error ? <p className="hand">{error}</p> : null}
              <ComicButton className="pink" disabled={!body.trim() || !(to || other).trim()}>
                {card ? 'Mail postcard' : 'Send letter'}
              </ComicButton>
              {!online ? <span className="meta-line">saved in this browser</span> : null}
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
