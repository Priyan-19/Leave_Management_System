import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus2, SendHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { LeaveCreatePayload } from '@/api/types'
import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'

const leaveSchema = z
  .object({
    leave_type: z.enum(['casual', 'medical', 'emergency', 'on_duty']),
    start_date: z.string().min(1, 'Choose a start date.'),
    end_date: z.string().min(1, 'Choose an end date.'),
    reason: z.string().min(10, 'Please add a clear reason for the request.'),
  })
  .refine((values) => values.end_date >= values.start_date, {
    message: 'End date must be on or after the start date.',
    path: ['end_date'],
  })

type LeaveFormValues = z.infer<typeof leaveSchema>

export function ApplyLeavePage() {
  const queryClient = useQueryClient()
  const balanceQuery = useQuery({
    queryKey: ['leave-balance'],
    queryFn: api.getBalance,
  })

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type: 'casual',
      start_date: '',
      end_date: '',
      reason: '',
    },
  })

  const applyMutation = useMutation({
    mutationFn: (payload: LeaveCreatePayload) => api.applyLeave(payload),
    onSuccess: () => {
      toast.success('Leave applied successfully.')
      reset()
      void queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-history'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-balance'] })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to submit leave request.'
      toast.error(message)
    },
  })

  if (balanceQuery.isLoading) {
    return <PanelLoader label="Preparing your leave application workspace..." />
  }

  if (balanceQuery.isError || !balanceQuery.data) {
    return (
      <EmptyState
        description="Your leave balance could not be loaded, so we cannot safely accept a new request yet."
        title="Unable to load leave balance"
      />
    )
  }

  async function onSubmit(values: LeaveFormValues) {
    await applyMutation.mutateAsync(values)
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Submit a new leave request with date validation, reason capture, and balance awareness before it reaches staff approval."
        title="Apply for leave"
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="data-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <CalendarPlus2 size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-slate-900">Leave request form</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the dates carefully. Overlapping requests are blocked automatically.</p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="field-label" htmlFor="leave_type">
                Leave type
              </label>
              <select className="input-base" id="leave_type" {...register('leave_type')}>
                <option value="casual">Casual</option>
                <option value="medical">Medical</option>
                <option value="emergency">Emergency</option>
                <option value="on_duty">On duty</option>
              </select>
              {errors.leave_type ? <p className="mt-2 text-sm text-rose-600">{errors.leave_type.message}</p> : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="start_date">
                  Start date
                </label>
                <input className="input-base" id="start_date" type="date" {...register('start_date')} />
                {errors.start_date ? <p className="mt-2 text-sm text-rose-600">{errors.start_date.message}</p> : null}
              </div>

              <div>
                <label className="field-label" htmlFor="end_date">
                  End date
                </label>
                <input className="input-base" id="end_date" type="date" {...register('end_date')} />
                {errors.end_date ? <p className="mt-2 text-sm text-rose-600">{errors.end_date.message}</p> : null}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="reason">
                Reason
              </label>
              <textarea
                className="input-base min-h-32 resize-y"
                id="reason"
                placeholder="Describe why you need leave and add any helpful context for review."
                {...register('reason')}
              />
              {errors.reason ? <p className="mt-2 text-sm text-rose-600">{errors.reason.message}</p> : null}
            </div>

              <button
                className="primary-button w-full gap-2 sm:w-auto"
                disabled={isSubmitting || applyMutation.isPending}
                type="submit"
              >
                {isSubmitting || applyMutation.isPending ? 'Submitting...' : 'Submit leave request'}
                <SendHorizontal size={18} />
              </button>
          </form>
        </article>

        <article className="data-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Balance overview</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Before you submit</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
              <p className="text-sm text-slate-300">Remaining days</p>
              <p className="mt-2 font-display text-4xl font-semibold">{balanceQuery.data.remaining_days}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Approved days</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{balanceQuery.data.approved_days}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Pending days</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{balanceQuery.data.pending_days}</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-brand/15 bg-brand/5 px-5 py-4 text-sm leading-6 text-slate-600">
              Requests are checked against your balance and overlapping date ranges before they are saved.
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
