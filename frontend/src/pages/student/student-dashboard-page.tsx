import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Wallet } from 'lucide-react'

import { api } from '@/api/sdk'
import { DataTable } from '@/components/data-table'
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
            <DataTable
              data={data.recent_activity}
              columns={[
                {
                  header: 'Type',
                  cell: (leave) => (
                    <div>
                      <p className="font-semibold text-slate-900">{toLabelCase(leave.leave_type)}</p>
                      <p className="mt-1 text-xs text-slate-500">{leave.days} day(s)</p>
                    </div>
                  ),
                },
                {
                  header: 'Dates',
                  cell: (leave) => (
                    <span className="text-slate-600">{formatRange(leave.start_date, leave.end_date)}</span>
                  ),
                },
                {
                  header: 'Requested',
                  cell: (leave) => (
                    <span className="text-slate-600">{formatDateTime(leave.created_at)}</span>
                  ),
                },
                {
                  header: 'Status',
                  cell: (leave) => <StatusBadge status={leave.status} />,
                },
              ]}
              mobileCard={(leave) => (
                <div className="space-y-4 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-brand">
                        {toLabelCase(leave.leave_type)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{leave.days} Day(s)</p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dates</p>
                      <p className="mt-1 text-xs text-slate-700">{formatRange(leave.start_date, leave.end_date)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Requested</p>
                      <p className="mt-1 text-xs text-slate-700">{formatDateTime(leave.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </article>
      </section>
    </div>
  )
}
