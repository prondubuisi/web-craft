import { Link } from 'react-router-dom'
import type { Zine } from '../lib/types'
import { REMIX_MISSING_HOP, remixCreditPath } from '../lib/zine'

export function RemixCredit({
  source,
  handle,
  after,
}: {
  source?: Zine
  handle?: string | null
  after?: string
}) {
  if (source) {
    return (
      <>
        remix of <Link to={remixCreditPath(source, handle)}>{source.title}</Link>
        {after ?? ''}
      </>
    )
  }
  return (
    <>
      this is a remix. the original is not on this desk.{' '}
      <Link to={REMIX_MISSING_HOP.to}>{REMIX_MISSING_HOP.go}</Link>.
    </>
  )
}
