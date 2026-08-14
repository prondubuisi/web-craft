import { useEffect, useState } from 'react'
import { formatCountdown } from './zine'

export function useCountdown(target: number | null | undefined): {
  live: boolean
  label: string
  remaining: number
} {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target || target <= Date.now()) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [target])
  const remaining = target ? target - now : 0
  const live = !target || remaining <= 0
  return {
    live,
    remaining,
    label: live ? 'NOW' : formatCountdown(remaining),
  }
}
