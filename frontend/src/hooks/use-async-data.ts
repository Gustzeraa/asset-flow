/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useState, type DependencyList, type Dispatch, type SetStateAction } from 'react'


type AsyncState<T> = {
  data: T | null
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
  setData: Dispatch<SetStateAction<T | null>>
}


export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef(loader)
  const requestIdRef = useRef(0)

  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  const execute = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setIsLoading(true)
    setError(null)

    try {
      const nextData = await loaderRef.current()

      if (requestId !== requestIdRef.current) {
        return
      }

      setData(nextData)
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setError(err instanceof Error ? err.message : 'Falha ao carregar dados.')
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void execute()
  }, [execute, ...deps])

  return {
    data,
    isLoading,
    error,
    reload: execute,
    setData,
  }
}
