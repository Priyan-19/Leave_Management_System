import type { LeaveStatus } from '@/api/types'
import { cn } from '@/lib/cn'

interface StatusBadgeProps {
  status: LeaveStatus
}

const statusStyles: Record<LeaveStatus, string> = {
  approved: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  rejected: 'bg-rose-100 text-rose-700 ring-rose-200',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1', statusStyles[status])}>
      {status}
    </span>
  )
}
