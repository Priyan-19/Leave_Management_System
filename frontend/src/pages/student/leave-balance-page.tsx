import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Wallet } from 'lucide-react'

import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatCard } from '@/components/stat-card'

export function LeaveBalancePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: api.getBalance,
  })

  if (isLoading) {
    return <PanelLoader label="Loading leave balance..." />
  }

  if (isError || !data) {
    return (
      <EmptyState
        description="We could not load your leave balance right now. Please try again soon."
        title="Balance unavailable"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Understand how many days have been approved, how many are pending, and what remains available for future requests."
        title="Leave balance"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Your total allocated leave days." icon={Wallet} label="Allocation" value={data.total_days} />
        <StatCard detail="Days already approved by staff." icon={CalendarDays} label="Approved" value={data.approved_days} />
        <StatCard detail="Days currently tied to pending requests." icon={Clock3} label="Pending" value={data.pending_days} />
      </section>

      <article className="data-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Available now</p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-5xl font-semibold text-slate-900">{data.remaining_days}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Remaining leave days that can still be approved for the current student profile.</p>
          </div>
          <div className="rounded-[24px] border border-brand/15 bg-brand/5 px-5 py-4 text-sm leading-6 text-slate-600 md:max-w-sm">
            Remaining balance decreases only when a request is approved, while pending requests are still tracked to prevent over-booking.
          </div>
        </div>
      </article>
    </div>
  )
}
