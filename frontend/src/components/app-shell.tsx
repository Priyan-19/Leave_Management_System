import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { UserRole } from '@/api/types'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/cn'

interface NavigationItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', href: '/student-dashboard', icon: LayoutDashboard, roles: ['student'] },
  { label: 'Apply Leave', href: '/student/apply-leave', icon: Send, roles: ['student'] },
  { label: 'Leave History', href: '/student/history', icon: History, roles: ['student'] },
  { label: 'Leave Balance', href: '/student/balance', icon: Wallet, roles: ['student'] },
  { label: 'Dashboard', href: '/staff-dashboard', icon: LayoutDashboard, roles: ['staff'] },
  { label: 'Students', href: '/staff/students', icon: Users, roles: ['staff'] },
  { label: 'Leave Requests', href: '/staff/leave-requests', icon: ClipboardList, roles: ['staff'] },
  { label: 'Reports', href: '/staff/reports', icon: BarChart3, roles: ['staff'] },
  { label: 'Dashboard', href: '/admin', icon: ShieldCheck, roles: ['admin'] },
  { label: 'Staff', href: '/admin/staff', icon: BriefcaseBusiness, roles: ['admin'] },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin'] },
]

function getRoleHeadline(role: UserRole) {
  if (role === 'student') {
    return 'Student Workspace'
  }

  if (role === 'staff') {
    return 'Staff Operations Hub'
  }

  return 'Admin Console'
}

function getRoleSubline(role: UserRole) {
  if (role === 'student') {
    return 'Track your balance, apply for leave, and stay ahead of approvals.'
  }

  if (role === 'staff') {
    return 'Manage your assigned students, approvals, and scoped reports in one place.'
  }

  return 'Create staff accounts, oversee institution-wide activity, and keep tenant boundaries healthy.'
}

function getHeaderTitle(role: UserRole) {
  if (role === 'student') {
    return 'Your leave journey at a glance'
  }

  if (role === 'staff') {
    return 'Everything your assigned students need from one desk'
  }

  return 'Institution-wide control without losing staff-level ownership'
}

function getRoleMeta(role: UserRole, department?: string | null, year?: string | null, institution?: string | null) {
  if (role === 'student') {
    return `${department ?? 'Student'} | ${year ?? 'Current year'}`
  }

  if (role === 'staff') {
    return `${department ?? 'Academic staff'} | ${institution ?? 'Institution scope'}`
  }

  return institution ?? 'Global institution access'
}

export function AppShell() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = useMemo(
    () => navigationItems.filter((item) => (profile ? item.roles.includes(profile.role) : false)),
    [profile],
  )

  if (!profile) {
    return null
  }

  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('')

  async function handleLogout() {
    if (!profile) return
    const currentRole = profile.role

    setProfileOpen(false)
    await signOut()
    toast.success('You have been signed out.')
    navigate(`/${currentRole}/login`)
  }

  return (
    <div className={cn("min-h-screen px-4 py-4 md:px-6 md:py-6", `theme-${profile.role}`)}>
      {mobileOpen || profileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/5"
          onClick={() => {
            setMobileOpen(false)
            setProfileOpen(false)
          }}
        />
      ) : null}

      <div className="mx-auto flex max-w-7xl gap-6">
        <aside
          className={cn(
            'glass-panel fixed inset-y-4 left-4 z-40 flex w-72 flex-col gap-6 px-5 py-6 transition duration-200 md:static md:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-[120%]',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Leave Portal</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">{getRoleHeadline(profile.role)}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{getRoleSubline(profile.role)}</p>
            </div>
            <button
              className="secondary-button px-3 py-3 md:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white shadow-lg shadow-slate-950/15">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in as</p>
            <p className="mt-3 text-lg font-semibold">{profile.full_name}</p>
            <p className="mt-1 text-sm text-slate-300">{profile.email}</p>
            <p className="mt-3 text-sm text-slate-400">
              {getRoleMeta(profile.role, profile.department, profile.year, profile.institution)}
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ href, icon: Icon, label }) => (
              <NavLink
                key={href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    isActive ? 'bg-brand text-brand-foreground shadow-lg shadow-brand/20' : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )
                }
                onClick={() => setMobileOpen(false)}
                to={href}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <button className="secondary-button mt-auto w-full gap-2" onClick={handleLogout} type="button">
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6 pb-24 md:pb-0">
          <header className="glass-panel relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                className="secondary-button px-3 py-3 md:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Institution console</p>
                <h1 className="mt-2 font-display text-2xl font-semibold text-slate-900">{getHeaderTitle(profile.role)}</h1>
              </div>
            </div>

            <div className="relative">
              <button
                className={cn(
                  'flex items-center gap-3 rounded-[24px] px-4 py-3 text-left shadow-sm transition',
                  profileOpen ? 'bg-white ring-2 ring-brand/10' : 'bg-white/85 hover:bg-white',
                )}
                onClick={() => setProfileOpen(!profileOpen)}
                type="button"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-brand-foreground shadow-lg shadow-brand/20">
                  {initials}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold text-slate-900">{profile.full_name}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{profile.role.replace('_', ' ')}</p>
                </div>
              </button>

              {profileOpen ? (
                <div className="glass-panel absolute right-0 top-full z-50 mt-3 w-64 p-3 shadow-xl">
                  <div className="mb-3 rounded-2xl bg-slate-950 p-4 text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Account</p>
                    <p className="mt-2 truncate text-sm font-semibold">{profile.full_name}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{profile.email}</p>
                  </div>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        className="glass-panel fixed inset-x-4 bottom-4 z-20 grid gap-2 px-3 py-3 md:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.min(navItems.length, 4)}, minmax(0, 1fr))` }}
      >
        {navItems.slice(0, 4).map(({ href, icon: Icon, label }) => (
          <NavLink
            key={href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
                isActive ? 'bg-brand text-brand-foreground shadow-lg shadow-brand/20' : 'text-slate-500 hover:text-slate-900',
              )
            }
            to={href}
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
