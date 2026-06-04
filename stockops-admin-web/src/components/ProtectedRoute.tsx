/**
 * Protected route wrapper component.
 * Redirects unauthenticated users to login page.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

function isAdminRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'SYSTEM_ADMIN'
}

/**
 * Props for ProtectedRoute component.
 */
interface ProtectedRouteProps {
  /** Child components to render if authenticated */
  children: React.ReactNode
}

/**
 * Protected route wrapper that checks authentication status.
 * Redirects to /login if user is not authenticated.
 * Waits for Zustand persist to rehydrate before checking.
 *
 * @param props - Component props containing children
 * @returns Children if authenticated, otherwise redirects to login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isRestoring = useAuthStore((state) => state.isRestoring)
  const hasTriedRestore = useAuthStore((state) => state.hasTriedRestore)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const location = useLocation()

  useEffect(() => {
    if (!token && !hasTriedRestore && !isRestoring) {
      void restoreSession()
    }
  }, [hasTriedRestore, isRestoring, restoreSession, token])

  if (!token && (isRestoring || !hasTriedRestore)) {
    return null
  }

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    )
  }

  const adminPaths = ['/admin', '/admin/notices', '/admin/audit-logs', '/admin/ai-suggestions']
  if (adminPaths.some((path) => location.pathname === path) && !isAdminRole(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
