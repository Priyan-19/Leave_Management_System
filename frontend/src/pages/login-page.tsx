import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, GraduationCap, School, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/contexts/auth-context'
import { firebaseConfigError, firebaseConfigReady } from '@/lib/firebase'
import { getHomePath } from '@/lib/navigation'
import { cn } from '@/lib/cn'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must contain at least 6 characters.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getRolePresentation(role: string | null) {
  if (role === 'student') {
    return {
      title: 'Student Login',
      icon: GraduationCap,
      badge: 'bg-brand/10 text-brand',
      button: '',
      bar: 'bg-brand',
    }
  }

  if (role === 'admin') {
    return {
      title: 'Admin Login',
      icon: ShieldCheck,
      badge: 'bg-sky-500/10 text-sky-700',
      button: 'bg-sky-700 hover:bg-sky-800 shadow-sky-500/20',
      bar: 'bg-sky-700',
    }
  }

  return {
    title: 'Staff Login',
    icon: School,
    badge: 'bg-amber-500/10 text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
    bar: 'bg-amber-600',
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  let role: string = 'student'
  if (location.pathname.includes('staff')) {
    role = 'staff'
  } else if (location.pathname.includes('admin')) {
    role = 'admin'
  }
  const { profile, signIn, loading, error } = useAuth()
  
  const rolePresentation = getRolePresentation(role)
  const Icon = rolePresentation.icon

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (profile) {
    return <Navigate replace to={getHomePath(profile.role)} />
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      const nextProfile = await signIn(values.email, values.password, role)
      const fromState = location.state as { from?: string } | null
      navigate(fromState?.from ?? getHomePath(nextProfile.role), { replace: true })
    } catch {
      // Error is caught and surfaced in Context
    }
  }

  return (
    <div className={cn("flex min-h-screen items-center justify-center px-4 py-8 md:px-6", `theme-${role}`)}>
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-brand"
        >
          <ArrowLeft size={16} />
          Back to portal selection
        </Link>

        <section className="glass-panel overflow-hidden p-8 sm:p-10">
          <div className={`absolute inset-x-0 top-0 h-1.5 ${rolePresentation.bar}`} />

          <div className="flex flex-col items-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${rolePresentation.badge}`}>
              <Icon size={32} />
            </div>

            <h2 className="mt-6 text-center font-display text-3xl font-bold tracking-tight text-slate-900">
              {rolePresentation.title}
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">
              Enter your institutional credentials below.
            </p>
          </div>

          {!firebaseConfigReady && firebaseConfigError ? (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              {firebaseConfigError}
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="mt-10 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="field-label" htmlFor="email">
                Email address
              </label>
              <input
                className="input-base"
                id="email"
                type="email"
                {...register('email')}
              />
              {errors.email ? <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p> : null}
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                className="input-base"
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password ? <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p> : null}
            </div>

            <button
              className={`primary-button mt-2 w-full gap-2 ${rolePresentation.button}`}
              disabled={!firebaseConfigReady || isSubmitting || loading}
              type="submit"
            >
              {isSubmitting || loading ? 'Verifying...' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-10 border-t border-slate-100 pt-8 text-center">
            <p className="text-xs text-slate-400">
              Security Notice: This session is monitored. Unauthorized access is prohibited by institutional policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
