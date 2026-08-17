import { useEffect, useRef, useState } from 'react'
import { BlockView } from './Blocks'
import { ComicButton } from './Chrome'
import { paginateZine } from '../lib/fold'
import type { PageStat, PollTally, Zine } from '../lib/types'

export function FlipReader({
  zine,
  polls,
  onVote,
  onPage,
  stats,
}: {
  zine: Zine
  polls?: Record<string, PollTally>
  onVote?: (blockId: string, option: number) => void
  onPage?: (page: number, dwellMs: number) => void
  stats?: PageStat[]
}) {
  const pages = paginateZine(zine).filter((page) => page.n === 1 || page.blocks.length)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(0)
  const entered = useRef(Date.now())
  const page = pages[i] ?? pages[0]
  const stat = stats?.find((row) => row.page === page?.n)

  const pageN = page?.n
  useEffect(() => {
    entered.current = Date.now()
    return () => {
      if (pageN) onPage?.(pageN, Date.now() - entered.current)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [pageN])

  function go(next: number) {
    if (next < 0 || next >= pages.length || next === i) return
    setDir(next > i ? 1 : -1)
    setI(next)
  }

  return (
    <div
      className="flip-reader"
      onTouchStart={(e) => {
        const x = e.changedTouches[0]?.clientX ?? 0
        const el = e.currentTarget
        el.dataset.x = String(x)
      }}
      onTouchEnd={(e) => {
        const start = Number(e.currentTarget.dataset.x ?? 0)
        const x = e.changedTouches[0]?.clientX ?? start
        if (x - start > 50) go(i - 1)
        if (start - x > 50) go(i + 1)
      }}
    >
      <div className="flip-meta">
        <span className="issue-chip">
          PAGE {page?.n ?? 1} / {pages[pages.length - 1]?.n ?? 1}
        </span>
        {stat ? (
          <span className="meta-line">
            {stat.views} reads · {Math.round(stat.dwellMs / 1000)}s linger
          </span>
        ) : null}
      </div>
      <div key={page?.n} className={`flip-page ${dir < 0 ? 'back' : 'fwd'}`}>
        {page?.blocks.map((block) => (
          <div key={block.id} className="block">
            <BlockView
              block={block}
              poll={polls?.[block.id]}
              onVote={
                block.type === 'poll' && onVote ? (option) => onVote(block.id, option) : undefined
              }
            />
          </div>
        ))}
      </div>
      <div className="cta-row">
        <ComicButton className="small" disabled={i === 0} onClick={() => go(i - 1)}>
          Prev
        </ComicButton>
        <ComicButton className="small" disabled={i >= pages.length - 1} onClick={() => go(i + 1)}>
          Next
        </ComicButton>
      </div>
    </div>
  )
}
