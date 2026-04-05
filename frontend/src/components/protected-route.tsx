import { Navigate, Outlet, useLocation } from 'react-router-dom'

import type { UserRole } from '@/api/types'
import { LoadingScreen } from '@/components/loading-screen'
import { useAuth } from '@/contexts/auth-context'
import { getHomePath } from '@/lib/navigation'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { loading, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!profile) {
    let redirectPath = '/student-login'
    if (location.pathname.startsWith('/staff')) {
      redirectPath = '/staff-login'
    } else if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin')) {
      redirectPath = '/admin/login'
    }
    
    return <Navigate to={redirectPath} replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getHomePath(profile.role)} replace />
  }

  return <Outlet />
}
