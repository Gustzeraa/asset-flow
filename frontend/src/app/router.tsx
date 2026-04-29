import { Center } from '@mantine/core'
import { useEffect } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'

import { useAuth } from './auth-context'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { DashboardPage } from '@/features/auth/dashboard-page'
import { LoginPage } from '@/features/auth/login-page'


function getNextPath(search: string) {
  const nextPath = new URLSearchParams(search).get('next')
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/dashboard'
  }

  return nextPath
}


function isSpaPath(pathname: string) {
  return pathname === '/dashboard' || pathname === '/login'
}


function LegacyRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <Center className="min-h-screen">
      <LoadingPanel label="Redirecionando..." />
    </Center>
  )
}


function ProtectedRoute() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingPanel label="Restaurando sessao..." />
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`
    return <Navigate replace to={`/login?next=${encodeURIComponent(nextPath)}`} />
  }

  return <DashboardPage />
}


function LoginGuard() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const nextPath = getNextPath(location.search)

  if (isLoading) {
    return (
      <Center className="min-h-screen">
        <LoadingPanel label="Preparando acesso..." />
      </Center>
    )
  }

  if (isAuthenticated) {
    if (!isSpaPath(nextPath)) {
      return <LegacyRedirect to={nextPath} />
    }

    return <Navigate replace to={nextPath} />
  }

  return <LoginPage />
}


export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route element={<LoginGuard />} path="/login" />
        <Route element={<ProtectedRoute />} path="/dashboard" />
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    </Router>
  )
}
