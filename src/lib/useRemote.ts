import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { actionError } from './catch'
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
            setError(actionError(err, 'request failed'))
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

/**
 * Online fetch that overlays a local value. While the request is in flight the
 * last value stays (initialized from `fallback`). Offline, disabled, or error
 * re-runs `fallback`. `setValue` is for in-view mutations on top of that merge.
 */
export function useRemoteWithFallback<T, V>(
  fetcher: () => Promise<T>,
  fallback: () => V,
  select: (data: T) => V,
  deps: readonly unknown[],
  opts?: UseRemoteOptions,
): [V, Dispatch<SetStateAction<V>>] {
  const { online } = useZines()
  const enabled = opts?.enabled ?? true
  const remote = useRemote(fetcher, deps, opts)
  const fallbackRef = useRef(fallback)
  fallbackRef.current = fallback
  const selectRef = useRef(select)
  selectRef.current = select
  const [value, setValue] = useState(fallback)
  const depKey = JSON.stringify(deps)

  useEffect(() => {
    if (!online || !enabled || remote.error) {
      setValue(fallbackRef.current())
      return
    }
    if (remote.data != null) setValue(selectRef.current(remote.data))
  }, [online, enabled, remote.data, remote.error, depKey])

  return [value, setValue]
}
