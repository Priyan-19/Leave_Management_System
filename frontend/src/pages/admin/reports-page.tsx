import { useQuery } from '@tanstack/react-query'
import { CalendarRange, FileSpreadsheet, FileText, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { formatRange } from '@/lib/format'

const chartColors = ['var(--brand)', '#f59e0b', '#ef4444', '#0ea5e9']

export function ReportsPage() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState('weekly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)

  const isSuperAdmin = profile?.role === 'admin'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', profile?.role, period, startDate, endDate],
    queryFn: () =>
      api.getReportSummary({
        period,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  })

  async function handleDownload(format: 'excel' | 'pdf') {
    setDownloading(format)
    try {
      await api.downloadReport(format, {
        period,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      toast.success(`Report downloaded as ${format.toUpperCase()}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download report.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        action={
          <div className="flex flex-wrap gap-3">
            <button className="secondary-button gap-2" disabled={downloading !== null} onClick={() => void handleDownload('excel')} type="button">
              <FileSpreadsheet size={18} />
              {downloading === 'excel' ? 'Downloading...' : 'Download Excel'}
            </button>
            <button className="secondary-button gap-2" disabled={downloading !== null} onClick={() => void handleDownload('pdf')} type="button">
              <FileText size={18} />
              {downloading === 'pdf' ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        }
        description={
          isSuperAdmin
            ? 'Generate institution-wide reports, inspect staff-wide trends, and export shareable summaries for leadership.'
            : 'Generate weekly or monthly insights for your assigned students and export shareable reports for your department.'
        }
        title="Reports and analytics"
      />

      <article className="data-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="reportPeriod">
              Period
            </label>
            <select className="input-base" id="reportPeriod" onChange={(event) => setPeriod(event.target.value)} value={period}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="reportStartDate">
              Custom start date
            </label>
            <input className="input-base" id="reportStartDate" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </div>
          <div>
            <label className="field-label" htmlFor="reportEndDate">
              Custom end date
            </label>
            <input className="input-base" id="reportEndDate" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </div>
        </div>
      </article>

      {isLoading ? <PanelLoader label="Building the latest report..." /> : null}
      {isError ? <EmptyState description="Report data could not be loaded." title="Report unavailable" /> : null}

      {!isLoading && !isError && data ? (
        <>
          <article className="data-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Current scope</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">{data.scope}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This export respects multi-tenant access control, so staff only see their own students while super admins can review institution-wide trends.
            </p>
          </article>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard detail="Requests included in the current report range." icon={ListChecks} label="Total requests" value={data.total_requests} />
            <StatCard detail="Combined leave days represented in this report." icon={CalendarRange} label="Leave days" value={data.total_leave_days} />
            <StatCard detail="Requests approved in the selected range." icon={FileSpreadsheet} label="Approved" value={data.approved_count} />
            <StatCard detail="Requests still pending review." icon={FileText} label="Pending" value={data.pending_count} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="data-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Student-wise counts</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Leave requests by student</h2>
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Status split</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Approval mix</h2>
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
            </article>
          </section>

          <article className="data-panel">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Detailed records</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">
                {data.period} report: {data.start_date} to {data.end_date}
              </h2>
            </div>
            {data.requests.length > 0 ? (
              <div className="table-shell">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold">Dates</th>
                      <th className="px-6 py-4 font-semibold">Days</th>
                      <th className="px-6 py-4 font-semibold">Reason</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((leave) => (
                      <tr className="border-t border-slate-100" key={leave.id}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{leave.student_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{leave.roll_number}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{formatRange(leave.start_date, leave.end_date)}</td>
                        <td className="px-6 py-4 text-slate-600">{leave.days}</td>
                        <td className="max-w-xs px-6 py-4 text-slate-600">{leave.reason}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={leave.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState description="No leave requests were found in the selected report range." title="No report rows" />
              </div>
            )}
          </article>
        </>
      ) : null}
    </div>
  )
}
