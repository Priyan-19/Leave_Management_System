import { ArrowRight, GraduationCap, School } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '@/contexts/auth-context'
import { getHomePath } from '@/lib/navigation'

const portalCards = [
  {
    title: 'Student Portal',
    description: 'Apply for leave, track your balance, and follow every request from submission to decision.',
    href: '/login',
    icon: GraduationCap,
    accent: 'text-brand',
    badge: 'bg-brand/10 text-brand',
    glow: 'bg-brand/5',
  },
  {
    title: 'Staff Portal',
    description: 'Manage your assigned students, review leave requests, and export scoped reports.',
    href: '/staff/login',
    icon: School,
    accent: 'text-amber-600 group-hover:text-amber-700',
    badge: 'bg-amber-500/10 text-amber-600',
    glow: 'bg-amber-500/5',
  },
]

export function LandingPage() {
  const { profile } = useAuth()

  if (profile) {
    return <Navigate replace to={getHomePath(profile.role)} />
  }

  return (
    <div className="min-h-screen px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.4em] text-slate-900">Institutional Access</p>
        <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight text-slate-900 md:text-7xl">
          Leave Portal
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-500">
          A multi-tenant leave management platform for campuses, where staff handle their assigned students and students
          track every leave request with clarity.
        </p>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 lg:grid-cols-2">
          {portalCards.map(({ title, description, href, icon: Icon, accent, badge, glow }) => (
            <Link
              key={href}
              to={href}
              className="group glass-panel relative overflow-hidden p-8 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10"
            >
              <div className={`absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full transition-transform group-hover:scale-150 ${glow}`} />

              <div className="relative">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${badge}`}>
                  <Icon size={28} />
                </div>
                <h2 className="mt-6 font-display text-2xl font-bold text-slate-900">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
                <div className={`mt-8 flex items-center gap-2 font-semibold ${accent}`}>
                  Open portal <ArrowRight className="translate-x-0 transition-transform group-hover:translate-x-1" size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-sm text-slate-400">
          Authorized personnel only. Contact your institution&apos;s IT department for access issues.
        </p>
      </div>
    </div>
  )
}
