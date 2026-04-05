import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  detail: string
}

export function StatCard({ icon: Icon, label, value, detail }: StatCardProps) {
  return (
    <article className="glass-panel overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
          <p className="mt-4 font-display text-3xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon size={22} />
        </div>
      </div>
    </article>
  )
}
