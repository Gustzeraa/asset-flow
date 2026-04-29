import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { apiFetch } from '@/lib/api'
import type { Lookups } from '@/types/domain'
import { useAuth } from './auth-context'


type LookupsContextValue = {
  lookups: Lookups | null
  isLoading: boolean
  refreshLookups: () => Promise<void>
}

const LookupsContext = createContext<LookupsContextValue | null>(null)


export function LookupsProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth()
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshLookups = useCallback(async () => {
    if (!isAuthenticated) {
      setLookups(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiFetch<Lookups>('/api/lookups/')
      setLookups(response)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refreshLookups()
  }, [refreshLookups])

  const value = useMemo(
    () => ({
      lookups,
      isLoading,
      refreshLookups,
    }),
    [isLoading, lookups, refreshLookups],
  )

  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>
}


export function useLookups() {
  const context = useContext(LookupsContext)

  if (!context) {
    throw new Error('useLookups deve ser usado dentro de LookupsProvider.')
  }

  return context
}
