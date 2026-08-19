import { useLayoutEffect, useRef } from 'react'
import { looksOf, removeLook, reorderLooks } from '../lib/looks'
import type { Block, LookLayer, VibeId } from '../lib/types'

function lookKey(layer: LookLayer, index: number, looks: LookLayer[]): string {
  const n = looks.slice(0, index + 1).filter((item) => item.label === layer.label).length
  return `${layer.label}#${n}`
}

export function AppearanceStack({
  block,
  vibe,
  onChange,
}: {
  block: Block
  vibe: VibeId
  onChange: (next: Block, recordHistory?: boolean) => void
}) {
  const looks = looksOf(block)
  const nodes = useRef(new Map<string, HTMLElement>())
  const last = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, number>()
    nodes.current.forEach((el, key) => {
      const top = el.getBoundingClientRect().top
      next.set(key, top)
      const before = last.current.get(key)
      if (reduce || before === undefined) return
      const dy = before - top
      if (!dy) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 140ms var(--ease)'
          el.style.transform = ''
          const clear = () => {
            el.style.transition = ''
            el.removeEventListener('transitionend', clear)
          }
          el.addEventListener('transitionend', clear)
        })
      })
    })
    last.current = next
  }, [looks])

  if (!looks.length) return null

  return (
    <div className="look-stack" aria-label="appearance stack">
      <p className="serif look-hint">later scrap wins the overlapping cut. drag to reorder.</p>
      {looks.map((layer, i) => (
        <div
          key={lookKey(layer, i, looks)}
          ref={(el) => {
            const key = lookKey(layer, i, looks)
            if (el) nodes.current.set(key, el)
            else nodes.current.delete(key)
          }}
          className={`look-row${layer.overridden?.length ? ' over' : ''}${layer.linked ? ' linked' : ''}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-zine-look', String(i))
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-zine-look')) e.preventDefault()
          }}
          onDrop={(e) => {
            const from = Number(e.dataTransfer.getData('application/x-zine-look'))
            if (Number.isFinite(from)) onChange(reorderLooks(block, from, i, vibe), true)
          }}
        >
          <span className="look-grip" aria-hidden>
            ≡
          </span>
          <span className="look-label">{layer.label}</span>
          {layer.linked ? <span className="look-badge">linked</span> : null}
          {layer.overridden?.length ? <span className="look-badge">overridden</span> : null}
          <button
            type="button"
            className="icon-btn"
            disabled={i === 0}
            aria-label={`Move ${layer.label} earlier`}
            onClick={() => onChange(reorderLooks(block, i, i - 1, vibe), true)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={i === looks.length - 1}
            aria-label={`Move ${layer.label} later`}
            onClick={() => onChange(reorderLooks(block, i, i + 1, vibe), true)}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove ${layer.label}`}
            onClick={() => onChange(removeLook(block, i, vibe), true)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
