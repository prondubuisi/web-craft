import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { catchBackground } from '../lib/catch'
import { appHref, assetUrl } from '../lib/paths'
import { imposeSheet, paginateZine } from '../lib/fold'
import { issuePath } from '../lib/zine'
import type { Block, Zine } from '../lib/types'

function Mini({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return <p className="fold-h">{block.text}</p>
    case 'sticker':
    case 'glitch':
    case 'quote':
      return <p>{block.text}</p>
    case 'sfx':
      return <p className="fold-h">{block.word}</p>
    case 'hero':
      return <img src={assetUrl(block.src)} alt="" />
    case 'poll':
      return <p>{block.question}</p>
    case 'audio':
      return <p>♪ {block.caption}</p>
    case 'grid':
      return <p>{block.panels.map((p) => p.text).join(' · ')}</p>
    case 'stack':
      return <p>{block.cards.map((c) => c.title).join(' / ')}</p>
    default:
      return null
  }
}

export function FoldSheet({ zine }: { zine: Zine }) {
  const cells = imposeSheet(paginateZine(zine))
  const [qr, setQr] = useState('')
  const foldUrl = appHref(issuePath(zine))
  useEffect(() => {
    void QRCode.toString(foldUrl, { type: 'svg', margin: 0, width: 96 })
      .then(setQr)
      .catch((err: unknown) => {
        catchBackground(err)
        setQr('')
      })
  }, [foldUrl])
  return (
    <section className="fold-sheet" aria-label="Fold-and-staple sheet">
      {cells.map((cell) => (
        <article key={cell.page.n} className={`fold-cell ${cell.flip ? 'flip' : ''}`}>
          <span className="fold-n">{cell.page.n}</span>
          {cell.page.n === 1 ? <p className="fold-h">{zine.title}</p> : null}
          {cell.page.n === 8 && qr ? (
            <div className="fold-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          ) : null}
          {cell.page.blocks.map((block) => (
            <Mini key={block.id} block={block} />
          ))}
          {!cell.page.blocks.length && cell.page.n !== 1 && cell.page.n !== 8 ? (
            <p className="fold-blank">paste here</p>
          ) : null}
        </article>
      ))}
    </section>
  )
}
