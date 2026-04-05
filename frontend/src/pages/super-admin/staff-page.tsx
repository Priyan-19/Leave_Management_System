import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Search, ShieldCheck, UserPlus, UserX } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { StaffCreatePayload, StaffCreateResponse, StaffProfile, StaffUpdatePayload } from '@/api/types'
import { api } from '@/api/sdk'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { useAuth } from '@/contexts/auth-context'

const staffSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  full_name: z.string().min(2, 'Staff name is required.'),
  department: z.string().min(1, 'Department is required.'),
  year: z.string().min(1, 'Year is required.'),
  section: z.string().min(1, 'Section is required.'),
  batch: z.string().min(1, 'Batch is required.'),
  institution: z.string().min(1, 'Institution is required.'),
})

type StaffFormValues = z.infer<typeof staffSchema>
type LatestStaffState = StaffCreateResponse

export function StaffManagementPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [latestStaff, setLatestStaff] = useState<LatestStaffState | null>(null)
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null)
  const deferredSearch = useDeferredValue(search)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff', deferredSearch],
    queryFn: () =>
      api.listStaff({
        search: deferredSearch || undefined,
      }),
  })

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: '',
      full_name: '',
      department: '',
      year: '',
      section: '',
      batch: '',
      institution: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: StaffCreatePayload) => {
      const response = await api.createStaff(payload)
      return response
    },
    onSuccess: (response) => {
      toast.success(
        'Staff account created successfully. Please provide the temporary password shown below to the staff member.',
      )
      setLatestStaff(response)
      reset({
        email: '',
        full_name: '',
        department: '',
        year: '',
        section: '',
        batch: '',
        institution: '',
      })

      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create staff account.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { staffId: string; data: StaffUpdatePayload }) => {
      return api.updateStaff(payload.staffId, payload.data)
    },
    onSuccess: () => {
      toast.success('Staff account updated.')
      setEditingStaff(null)
      reset({
        email: '',
        full_name: '',
        department: '',
        year: '',
        section: '',
        batch: '',
        institution: '',
      })

      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update staff account.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (staff_id: string) => api.deleteStaff(staff_id),
    onSuccess: () => {
      toast.success('Staff account permanently deleted.')
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete staff account.')
    },
  })

  const staffCountLabel = useMemo(() => `${data?.length ?? 0} staff member(s) in view`, [data])

  async function onSubmit(values: StaffFormValues) {
    if (editingStaff) {
      await updateMutation.mutateAsync({
        staffId: editingStaff.staff_id,
        data: {
          full_name: values.full_name,
          department: values.department || undefined,
          year: values.year || undefined,
          section: values.section || undefined,
          batch: values.batch || undefined,
          institution: values.institution || profile?.institution || undefined,
        },
      })
      return
    }

    await createMutation.mutateAsync({
      email: values.email,
      full_name: values.full_name,
      department: values.department || undefined,
      year: values.year || undefined,
      section: values.section || undefined,
      batch: values.batch || undefined,
      institution: values.institution || profile?.institution || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Provision staff accounts, assign academic scope, and deactivate access when responsibilities change."
        title="Staff management"
        action={
          <button
            onClick={() => {
              setEditingStaff(null)
              reset({
                email: '',
                full_name: '',
                department: '',
                year: '',
                section: '',
                batch: '',
                institution: '',
              })
              const element = document.getElementById('staff-form')
              element?.scrollIntoView({ behavior: 'smooth' })
              document.getElementById('email')?.focus()
            }}
            className="primary-button gap-2"
          >
            <UserPlus size={18} />
            New Staff
          </button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article id="staff-form" className="data-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-slate-900">
                {editingStaff ? 'Edit staff details' : 'Create a staff account'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingStaff
                  ? 'Update the staff scope and details below.'
                  : 'New staff receive Firebase credentials plus Firestore scope metadata for department, year, section, and institution.'}
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input className="input-base" id="email" type="email" disabled={!!editingStaff} {...register('email')} />
                {errors.email ? <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p> : null}
              </div>
              <div>
                <label className="field-label" htmlFor="full_name">
                  Full name
                </label>
                <input className="input-base" id="full_name" {...register('full_name')} />
                {errors.full_name ? <p className="mt-2 text-sm text-rose-600">{errors.full_name.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="department">
                  Department
                </label>
                <input className="input-base" id="department" {...register('department')} />
                {errors.department ? <p className="mt-2 text-sm text-rose-600">{errors.department.message}</p> : null}
              </div>
              <div>
                <label className="field-label" htmlFor="year">
                  Year
                </label>
                <input className="input-base" id="year" {...register('year')} />
                {errors.year ? <p className="mt-2 text-sm text-rose-600">{errors.year.message}</p> : null}
              </div>
              <div>
                <label className="field-label" htmlFor="section">
                  Section
                </label>
                <input className="input-base" id="section" {...register('section')} />
                {errors.section ? <p className="mt-2 text-sm text-rose-600">{errors.section.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="batch">
                  Batch
                </label>
                <input className="input-base" id="batch" {...register('batch')} />
                {errors.batch ? <p className="mt-2 text-sm text-rose-600">{errors.batch.message}</p> : null}
              </div>
              <div>
                <label className="field-label" htmlFor="institution">
                  Institution
                </label>
                <input className="input-base" id="institution" {...register('institution')} />
                {errors.institution ? <p className="mt-2 text-sm text-rose-600">{errors.institution.message}</p> : null}
              </div>
            </div>


            <div className="flex flex-wrap items-center gap-3">
              <button className="primary-button w-full gap-2 sm:w-auto" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} type="submit">
                {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingStaff ? 'Save changes' : 'Create staff')}
                <ShieldCheck size={18} />
              </button>
              {editingStaff && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingStaff(null)
                    reset({
                      email: '',
                      full_name: '',
                      department: '',
                      year: '',
                      section: '',
                      batch: '',
                      institution: '',
                    })
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </article>

        <div className="space-y-6">
          <article className="data-panel p-6">
            <label className="field-label" htmlFor="staffSearch">
              Search staff
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-base pl-11"
                id="staffSearch"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                value={search}
              />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">{staffCountLabel}</p>
          </article>

          {latestStaff ? (
            <article className="data-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Latest staff created</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">{latestStaff.staff.full_name}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Assigned scope</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {latestStaff.staff.department ?? 'Institution-wide'} / {latestStaff.staff.year ?? 'Any year'} / {latestStaff.staff.section ?? 'Any section'} / {latestStaff.staff.batch ?? 'Any batch'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Default Password</p>
                  <p className="mt-2 text-lg font-mono font-bold text-emerald-900 select-all">
                    Staff@123
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">The staff member can use this for their first login.</p>
                </div>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      {isLoading ? <PanelLoader label="Loading staff directory..." /> : null}
      {isError ? <EmptyState description="Staff records could not be loaded." title="Directory unavailable" /> : null}

      {!isLoading && !isError ? (
        <article className="data-panel">
          {data && data.length > 0 ? (
            <div className="table-shell">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Staff</th>
                    <th className="px-6 py-4 font-semibold">Scope</th>
                    <th className="px-6 py-4 font-semibold">Students</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((staff) => (
                    <tr className="border-t border-slate-100" key={staff.staff_id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{staff.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{staff.email}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {staff.department ?? 'Institution-wide'} / {staff.year ?? 'Any year'} / {staff.section ?? 'Any section'} / {staff.batch ?? 'Any batch'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{staff.managed_student_count ?? 0}</td>
                      <td className="px-6 py-4">
                        <span className={staff.is_active ? 'text-emerald-700' : 'text-rose-700'}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button
                          className="p-2 text-slate-400 hover:text-brand transition-colors"
                          onClick={() => {
                            setEditingStaff(staff)
                            reset({
                              email: staff.email,
                              full_name: staff.full_name,
                              department: staff.department ?? '',
                              year: staff.year ?? '',
                              section: staff.section ?? '',
                              batch: staff.batch ?? '',
                              institution: staff.institution ?? '',
                            })

                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          title="Edit staff"
                        >
                          <Edit2 size={18} />
                        </button>
                        <ConfirmationDialog
                          trigger={
                            <button
                              className="secondary-button px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-100"
                              disabled={deleteMutation.isPending}
                              type="button"
                            >
                              <UserX size={16} />
                              Delete
                            </button>
                          }
                          title="Delete Staff Account?"
                          description={`Are you sure you want to permanently delete ${staff.full_name}'s account? This action cannot be undone and will remove all their data from the system.`}
                          confirmLabel="Delete permanently"
                          onConfirm={() => deleteMutation.mutate(staff.staff_id)}
                          variant="danger"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                description="No staff accounts match the current search. Create the first staff member to get this tenant structure started."
                title="No staff found"
              />
            </div>
          )}
        </article>
      ) : null}
    </div>
  )
}
