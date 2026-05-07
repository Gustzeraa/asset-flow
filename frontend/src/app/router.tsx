import { Center } from '@mantine/core'
import { useEffect } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'

import { useAuth } from './auth-context'
import { AppShellLayout } from '@/components/layout/app-shell-layout'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { LoginPage } from '@/features/auth/login-page'
import { CategoriesPage } from '@/features/categories/categories-page'
import { CollaboratorsPage } from '@/features/collaborators/collaborators-page'
import { ConsumablesPage } from '@/features/consumables/consumables-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { EquipmentsPage } from '@/features/equipments/equipments-page'
import { MovementsPage } from '@/features/movements/movements-page'
import { TrashPage } from '@/features/trash/trash-page'


function getNextPath(search: string) {
  const nextPath = new URLSearchParams(search).get('next')
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/dashboard'
  }

  return nextPath
}


function isSpaPath(pathname: string) {
  return ['/', '/dashboard', '/equipamentos', '/categorias', '/colaboradores', '/consumiveis', '/historico', '/lixeira', '/login'].includes(pathname)
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

  return <AppShellLayout />
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
        <Route element={<ProtectedRoute />}>
          <Route element={<Navigate replace to="/dashboard" />} path="/" />
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<EquipmentsPage />} path="/equipamentos" />
          <Route element={<CategoriesPage />} path="/categorias" />
          <Route element={<CollaboratorsPage />} path="/colaboradores" />
          <Route element={<ConsumablesPage />} path="/consumiveis" />
          <Route element={<MovementsPage />} path="/historico" />
          <Route element={<TrashPage />} path="/lixeira" />
        </Route>
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Routes>
    </Router>
  )
}
