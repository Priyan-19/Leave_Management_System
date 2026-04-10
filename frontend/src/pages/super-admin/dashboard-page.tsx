import { useQuery } from '@tanstack/react-query'
import { BarChart3, BriefcaseBusiness, CheckCircle2, ClipboardList, Clock3, Users } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { formatRange } from '@/lib/format'

const chartColors = ['var(--brand)', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#22c55e']

export function SuperAdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: api.getSuperAdminDashboard,
  })

  if (isLoading) {
    return <PanelLoader label="Loading admin analytics..." />
  }

  if (isError || !data) {
    return (
      <EmptyState
        description="The admin dashboard could not be loaded right now. Please try again shortly."
        title="Dashboard unavailable"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="See institution-wide leave traffic, staff coverage, approval distribution, and the students driving the most requests across all tenants."
        title="Admin dashboard"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard detail="Active staff accounts currently provisioned." icon={BriefcaseBusiness} label="Total staff" value={data.total_staff} />
        <StatCard detail="Student accounts across the institution." icon={Users} label="Total students" value={data.total_students} />
        <StatCard detail="Leave requests logged across all staff scopes." icon={ClipboardList} label="Total leaves" value={data.total_requests} />
        <StatCard detail="Requests approved across the institution." icon={CheckCircle2} label="Approved" value={data.approved_count} />
        <StatCard detail="Requests still waiting for review." icon={Clock3} label="Pending" value={data.pending_count} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="data-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Per-student trends</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Leaves per student</h2>
            </div>
            <BarChart3 className="text-brand" size={22} />
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data.student_breakdown}>
                <XAxis axisLine={false} dataKey="roll_number" tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--brand)', fillOpacity: 0.06 }} />
                <Bar dataKey="value" fill="var(--brand)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="data-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Status mix</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Approval distribution</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={data.status_breakdown} dataKey="value" innerRadius={70} outerRadius={108} paddingAngle={4}>
                  {data.status_breakdown.map((entry, index) => (
                    <Cell fill={chartColors[index % chartColors.length]} key={entry.label} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {data.status_breakdown.map((item, index) => (
              <div className="rounded-[22px] border border-slate-100 bg-white/80 px-4 py-3" key={item.label}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="data-panel">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Recent queue</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Latest leave requests</h2>
        </div>
        {data.recent_requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              description="Once staff-managed students start applying for leave, the most recent requests will show up here."
              title="No leave requests yet"
            />
          </div>
        ) : (
          <div className="table-shell">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Dates</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_requests.map((leave) => (
                  <tr className="border-t border-slate-100" key={leave.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{leave.student_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{leave.roll_number}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatRange(leave.start_date, leave.end_date)}</td>
                    <td className="max-w-xs px-6 py-4 text-slate-600">{leave.reason}</td>
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
    </div>
  )
}
