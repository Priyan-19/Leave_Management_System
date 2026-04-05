import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'

import { api } from '@/api/sdk'
import type { LeaveStatus } from '@/api/types'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { StatusBadge } from '@/components/status-badge'
import { formatRange, toLabelCase } from '@/lib/format'

export function StaffLeaveRequestsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const deferredSearch = useDeferredValue(search)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave-requests', deferredSearch, statusFilter, startDate, endDate],
    queryFn: () =>
      api.listLeaveRequests({
        search: deferredSearch || undefined,
        status_filter: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  })

  const approveMutation = useMutation({
    mutationFn: (leaveId: string) => api.approveLeave(leaveId, { note: 'Approved by staff.' }),
    onSuccess: () => {
      toast.success('Leave request approved.')
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to approve request.')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ leaveId, note }: { leaveId: string; note?: string }) => api.rejectLeave(leaveId, { note }),
    onSuccess: () => {
      toast.success('Leave request rejected.')
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to reject request.')
    },
  })

  async function handleReject(leaveId: string) {
    const note = window.prompt('Optional rejection note:', 'Please contact staff for more details.') ?? undefined
    await rejectMutation.mutateAsync({ leaveId, note })
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Review requests from students assigned to you, filter by status or date, and record approval decisions without leaving the queue."
        title="Leave requests"
      />

      <article className="data-panel p-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.75fr_0.75fr]">
          <div>
            <label className="field-label" htmlFor="leaveSearch">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-base pl-11"
                id="leaveSearch"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or roll number"
                value={search}
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="leaveStatusFilter">
              Status
            </label>
            <select
              className="input-base"
              id="leaveStatusFilter"
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
            <input className="input-base" id="startDateFilter" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </div>
          <div>
            <label className="field-label" htmlFor="endDateFilter">
              To date
            </label>
            <input className="input-base" id="endDateFilter" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </div>
        </div>
      </article>

      {isLoading ? <PanelLoader label="Loading leave request queue..." /> : null}
      {isError ? <EmptyState description="Leave requests could not be loaded at the moment." title="Queue unavailable" /> : null}

      {!isLoading && !isError ? (
        <article className="data-panel">
          {data && data.length > 0 ? (
            <div className="table-shell">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Leave</th>
                    <th className="px-6 py-4 font-semibold">Dates</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((leave) => (
                    <tr className="border-t border-slate-100" key={leave.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{leave.student_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{leave.roll_number}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{toLabelCase(leave.leave_type)}</p>
                        <p className="mt-1 text-xs text-slate-500">{leave.reason}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatRange(leave.start_date, leave.end_date)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-6 py-4">
                        {leave.status === 'pending' ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="primary-button px-4 py-2 text-xs"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(leave.id)}
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="secondary-button px-4 py-2 text-xs"
                              disabled={rejectMutation.isPending}
                              onClick={() => void handleReject(leave.id)}
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Decision recorded</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                description="No leave requests match the current filters. Try clearing the status or date range."
                title="No matching requests"
              />
            </div>
          )}
        </article>
      ) : null}
    </div>
  )
}
