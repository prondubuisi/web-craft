import { useEffect, useRef, useState } from 'react'
import { useZines } from '../store/useZines'

export type RemoteState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export type UseRemoteOptions = {
  enabled?: boolean
  delay?: number
}

/** Shared online-only fetch. Does not run when the API is down or `enabled` is false. */
export function useRemote<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
  opts?: UseRemoteOptions,
): RemoteState<T> {
  const { online } = useZines()
  const enabled = opts?.enabled ?? true
  const delay = opts?.delay ?? 0
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const depKey = JSON.stringify(deps)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!online || !enabled) {
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const run = () => {
      void fetcherRef
        .current()
        .then((value) => {
          if (!cancelled) {
            setData(value)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'request failed')
            setLoading(false)
          }
        })
    }
    const timer = delay > 0 ? window.setTimeout(run, delay) : (run(), 0)
    return () => {
      cancelled = true
      if (delay > 0) window.clearTimeout(timer)
    }
  }, [online, enabled, delay, depKey])

  return { data, loading, error }
}
