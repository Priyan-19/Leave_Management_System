import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell'
import { LoadingScreen } from '@/components/loading-screen'
import { ProtectedRoute } from '@/components/protected-route'

const LandingPage = lazy(async () => ({
  default: (await import('@/pages/landing-page')).LandingPage,
}))
const LoginPage = lazy(async () => ({
  default: (await import('@/pages/login-page')).LoginPage,
}))
const StudentDashboardPage = lazy(async () => ({
  default: (await import('@/pages/student/student-dashboard-page')).StudentDashboardPage,
}))
const ApplyLeavePage = lazy(async () => ({
  default: (await import('@/pages/student/apply-leave-page')).ApplyLeavePage,
}))
const LeaveHistoryPage = lazy(async () => ({
  default: (await import('@/pages/student/leave-history-page')).LeaveHistoryPage,
}))
const LeaveBalancePage = lazy(async () => ({
  default: (await import('@/pages/student/leave-balance-page')).LeaveBalancePage,
}))
const StaffDashboardPage = lazy(async () => ({
  default: (await import('@/pages/admin/dashboard-page')).StaffDashboardPage,
}))
const StaffStudentsPage = lazy(async () => ({
  default: (await import('@/pages/admin/students-page')).StaffStudentsPage,
}))
const StaffLeaveRequestsPage = lazy(async () => ({
  default: (await import('@/pages/admin/leave-requests-page')).StaffLeaveRequestsPage,
}))
const ReportsPage = lazy(async () => ({
  default: (await import('@/pages/admin/reports-page')).ReportsPage,
}))
const SuperAdminDashboardPage = lazy(async () => ({
  default: (await import('@/pages/super-admin/dashboard-page')).SuperAdminDashboardPage,
}))
const StaffManagementPage = lazy(async () => ({
  default: (await import('@/pages/super-admin/staff-page')).StaffManagementPage,
}))

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading page..." />}>
      <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<LoginPage />} path="/student/login" />
        <Route element={<Navigate replace to="/student/login" />} path="/login" />
        <Route element={<LoginPage />} path="/admin/login" />
        <Route element={<LoginPage />} path="/staff/login" />
        <Route element={<Navigate replace to="/staff/login" />} path="/staff-login" />
        <Route element={<Navigate replace to="/admin/login" />} path="/admin-login" />
        <Route element={<Navigate replace to="/student/login" />} path="/student-login" />

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route element={<AppShell />}>
            <Route element={<StudentDashboardPage />} path="/student-dashboard" />
            <Route element={<ApplyLeavePage />} path="/student/apply-leave" />
            <Route element={<LeaveHistoryPage />} path="/student/history" />
            <Route element={<LeaveBalancePage />} path="/student/balance" />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
          <Route element={<AppShell />}>
            <Route element={<StaffDashboardPage />} path="/staff-dashboard" />
            <Route element={<StaffStudentsPage />} path="/staff/students" />
            <Route element={<StaffLeaveRequestsPage />} path="/staff/leave-requests" />
            <Route element={<ReportsPage />} path="/staff/reports" />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AppShell />}>
            <Route index element={<SuperAdminDashboardPage />} />
            <Route element={<StaffManagementPage />} path="staff" />
            <Route element={<ReportsPage />} path="reports" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  )
}
