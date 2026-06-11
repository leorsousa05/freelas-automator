import { useState, useEffect, useCallback, useRef } from 'react'

export function useFetch<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const result = await fetcher(controller.signal)
      if (!controller.signal.aborted) {
        setData(result)
      }
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setError(e.message)
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [fetcher])

  useEffect(() => {
    refetch()
    return () => {
      abortRef.current?.abort()
    }
  }, [refetch])

  return { data, loading, error, refetch }
}
