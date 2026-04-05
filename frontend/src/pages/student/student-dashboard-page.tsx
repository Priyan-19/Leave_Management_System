import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Wallet } from 'lucide-react'

import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime, formatRange, toLabelCase } from '@/lib/format'

export function StudentDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: api.getStudentDashboard,
  })

  if (isLoading) {
    return <PanelLoader label="Loading your dashboard summary..." />
  }

  if (isError || !data) {
    return (
      <EmptyState
        description="We could not load your dashboard right now. Please refresh or try again shortly."
        title="Dashboard unavailable"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Stay on top of approved days, pending requests, and the latest activity across your leave timeline."
        title="Student dashboard"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          detail="Approved leave days used so far."
          icon={CalendarDays}
          label="Total leaves taken"
          value={data.total_leaves_taken}
        />
        <StatCard
          detail="Available days left for upcoming plans."
          icon={Wallet}
          label="Remaining balance"
          value={data.remaining_balance}
        />
        <StatCard
          detail="Requests still waiting for tutor action."
          icon={Clock3}
          label="Pending requests"
          value={data.pending_requests}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="data-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Balance snapshot</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Your leave wallet</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
              <p className="text-sm text-slate-300">Total allocation</p>
              <p className="mt-2 font-display text-4xl font-semibold">{data.leave_counters.total_days}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Approved days</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{data.leave_counters.approved_days}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Pending days</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{data.leave_counters.pending_days}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="data-panel">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Recent activity</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Latest leave requests</h2>
          </div>
          {data.recent_activity.length === 0 ? (
            <div className="p-6">
              <EmptyState
                description="You haven't submitted any leave requests yet. Head to Apply Leave when you need time away."
                title="No recent leave activity"
              />
            </div>
          ) : (
            <div className="table-shell">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Dates</th>
                    <th className="px-6 py-4 font-semibold">Requested</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_activity.map((leave) => (
                    <tr className="border-t border-slate-100" key={leave.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{toLabelCase(leave.leave_type)}</p>
                        <p className="mt-1 text-xs text-slate-500">{leave.days} day(s)</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatRange(leave.start_date, leave.end_date)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(leave.created_at)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
