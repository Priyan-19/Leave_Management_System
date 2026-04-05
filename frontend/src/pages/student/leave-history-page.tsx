import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api } from '@/api/sdk'
import type { LeaveStatus } from '@/api/types'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime, formatRange, toLabelCase } from '@/lib/format'

export function LeaveHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave-history', statusFilter, startDate, endDate],
    queryFn: () =>
      api.listMyLeaves({
        status_filter: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Review every leave submission with filterable status and date ranges so you always know where each request stands."
        title="Leave history"
      />

      <article className="data-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="statusFilter">
              Status
            </label>
            <select
              className="input-base"
              id="statusFilter"
              onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | '')}
              value={statusFilter}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="startDateFilter">
              From date
            </label>
            <input
              className="input-base"
              id="startDateFilter"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="endDateFilter">
              To date
            </label>
            <input
              className="input-base"
              id="endDateFilter"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </div>
        </div>
      </article>

      {isLoading ? <PanelLoader label="Loading your leave history..." /> : null}
      {isError ? (
        <EmptyState
          description="Leave history could not be loaded right now. Please try again in a moment."
          title="History unavailable"
        />
      ) : null}

      {!isLoading && !isError ? (
        <article className="data-panel">
          {data && data.length > 0 ? (
            <div className="table-shell">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Leave</th>
                    <th className="px-6 py-4 font-semibold">Dates</th>
                    <th className="px-6 py-4 font-semibold">Reason</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((leave) => (
                    <tr className="border-t border-slate-100" key={leave.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{toLabelCase(leave.leave_type)}</p>
                        <p className="mt-1 text-xs text-slate-500">{leave.days} day(s)</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatRange(leave.start_date, leave.end_date)}</td>
                      <td className="max-w-xs px-6 py-4 text-slate-600">{leave.reason}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(leave.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                description="No leave requests match the current filters. Try widening the date range or clearing the status filter."
                title="No matching requests"
              />
            </div>
          )}
        </article>
      ) : null}
    </div>
  )
}
