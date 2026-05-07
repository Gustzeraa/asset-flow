import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { apiFetch, ensureCsrfCookie, getApiErrorMessage } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import type { User } from '@/types/domain'


type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)


export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await ensureCsrfCookie()
      const response = await apiFetch<{ authenticated: boolean; user: User | null }>('/api/auth/me/')
      startTransition(() => {
        setUser(response.authenticated ? response.user : null)
      })
    } catch {
      startTransition(() => {
        setUser(null)
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    await ensureCsrfCookie()
    const response = await apiFetch<{ detail: string; user: User }>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    startTransition(() => {
      setUser(response.user)
    })
    appFeedback.success({
      title: 'Sessao iniciada',
      message: response.detail,
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ detail: string }>('/api/auth/logout/', {
        method: 'POST',
      })
      appFeedback.info({
        title: 'Sessao encerrada',
        message: 'O acesso foi encerrado com segurança.',
      })
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao encerrar sessao',
        message: getApiErrorMessage(error),
      })
    } finally {
      startTransition(() => {
        setUser(null)
      })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refresh,
    }),
    [isLoading, login, logout, refresh, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
