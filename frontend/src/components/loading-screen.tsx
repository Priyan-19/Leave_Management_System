interface LoadingScreenProps {
  label?: string
}

export function LoadingScreen({ label = 'Loading your workspace' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel max-w-md px-8 py-10 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <p className="mt-5 text-base font-semibold text-slate-900">{label}</p>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;re syncing your dashboard, leave data, and access permissions.
        </p>
      </div>
    </div>
  )
}
