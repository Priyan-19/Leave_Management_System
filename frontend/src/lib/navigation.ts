import type { UserRole } from '@/api/types'

export function getHomePath(role: UserRole) {
  if (role === 'student') {
    return '/student-dashboard'
  }

  if (role === 'staff') {
    return '/staff-dashboard'
  }

  return '/admin'
}
