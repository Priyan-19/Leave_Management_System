import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Edit2, Search, Trash2, UploadCloud, UserPlus } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { StudentCreatePayload, StudentCreateResponse, StudentImportSummary, StudentProfile, StudentUpdatePayload } from '@/api/types'
import { api } from '@/api/sdk'
import { EmptyState } from '@/components/empty-state'
import { PanelLoader } from '@/components/panel-loader'
import { SectionHeading } from '@/components/section-heading'
import { useAuth } from '@/contexts/auth-context'
import { sendPasswordSetupEmail, sendPasswordSetupEmails } from '@/lib/firebase'

const studentSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  full_name: z.string().min(2, 'Student name is required.'),
  roll_number: z.string().min(2, 'Roll number is required.'),
  department: z.string().min(2, 'Department is required.'),
  year: z.string().min(1, 'Year is required.'),
  phone_number: z.string().optional(),
  section: z.string().optional(),
  leave_allowance: z.string().optional(),
})

type StudentFormValues = z.infer<typeof studentSchema>
type CreatedStudentState = StudentCreateResponse & {
  setupEmailStatus: 'sent' | 'failed'
}
type ImportSummaryState = StudentImportSummary & {
  setupEmailStatuses: Record<string, 'sent' | 'failed'>
}

export function StaffStudentsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState(profile?.department ?? '')
  const [year, setYear] = useState(profile?.year ?? '')
  const [section, setSection] = useState(profile?.section ?? '')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [createdStudent, setCreatedStudent] = useState<CreatedStudentState | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummaryState | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null)

  const deferredSearch = useDeferredValue(search)
  const deferredDepartment = useDeferredValue(department)
  const deferredYear = useDeferredValue(year)
  const deferredSection = useDeferredValue(section)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', deferredSearch, deferredDepartment, deferredYear, deferredSection],
    queryFn: () =>
      api.listStudents({
        search: deferredSearch || undefined,
        department: deferredDepartment || undefined,
        year: deferredYear || undefined,
        section: deferredSection || undefined,
      }),
  })

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      email: '',
      full_name: '',
      roll_number: '',
      department: profile?.department ?? '',
      year: profile?.year ?? '',
      phone_number: '',
      section: profile?.section ?? '',
      leave_allowance: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: StudentCreatePayload) => {
      const response = await api.createStudent(payload)
      try {
        await sendPasswordSetupEmail(response.student.email)
        return { ...response, setupEmailStatus: 'sent' as const }
      } catch {
        return { ...response, setupEmailStatus: 'failed' as const }
      }
    },
    onSuccess: (response) => {
      toast.success(
        'Student account created successfully. Please provide the temporary password shown below to the student.',
      )
      setCreatedStudent(response)
      reset({
        email: '',
        full_name: '',
        roll_number: '',
        department: profile?.department ?? '',
        year: profile?.year ?? '',
        phone_number: '',
        section: profile?.section ?? '',
        leave_allowance: '',
      })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create student account.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { rollNumber: string; data: StudentUpdatePayload }) => {
      return api.updateStudent(payload.rollNumber, payload.data)
    },
    onSuccess: () => {
      toast.success('Student account updated.')
      setEditingStudent(null)
      reset({
        email: '',
        full_name: '',
        roll_number: '',
        department: profile?.department ?? '',
        year: profile?.year ?? '',
        phone_number: '',
        section: profile?.section ?? '',
        leave_allowance: '',
      })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update student account.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (rollNumber: string) => api.deleteStudent(rollNumber),
    onSuccess: (_, rollNumber) => {
      toast.success(`Student ${rollNumber} deleted successfully.`)
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete student.')
    },
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const summary = await api.importStudents(file)
      const setupEmailStatuses = await sendPasswordSetupEmails(
        summary.results
          .filter((result) => result.status === 'created' && result.password_setup_required)
          .map((result) => result.email),
      )

      return { ...summary, setupEmailStatuses }
    },
    onSuccess: (summary) => {
      toast.success(
        `Import finished with ${summary.created_count} student(s) created. Provide the temporary passwords in the table below to the students.`,
      )
      setImportSummary(summary)
      setBulkFile(null)
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to import students.')
    },
  })

  const studentCountLabel = useMemo(() => `${data?.length ?? 0} matching student(s)`, [data])

  async function onCreateStudent(values: StudentFormValues) {
    if (editingStudent) {
      await updateMutation.mutateAsync({
        rollNumber: editingStudent.roll_number,
        data: {
          full_name: values.full_name,
          department: values.department,
          year: values.year,
          phone_number: values.phone_number || undefined,
          section: values.section || undefined,
          leave_allowance: values.leave_allowance ? Number(values.leave_allowance) : undefined,
        },
      })
      return
    }

    await createMutation.mutateAsync({
      email: values.email,
      full_name: values.full_name,
      roll_number: values.roll_number,
      department: values.department,
      year: values.year,
      phone_number: values.phone_number || undefined,
      section: values.section || undefined,
      leave_allowance: values.leave_allowance ? Number(values.leave_allowance) : undefined,
      institution: profile?.institution ?? undefined,
    })
  }

  async function onImportStudents() {
    if (!bulkFile) {
      toast.error('Choose a CSV or XLSX file to import.')
      return
    }

    await importMutation.mutateAsync(bulkFile)
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        action={
          <div className="flex flex-wrap gap-3">
            <a className="secondary-button gap-2" href="/templates/students_template.csv">
              <Download size={18} />
              CSV template
            </a>
            <a className="secondary-button gap-2" href="/templates/students_template.xlsx">
              <Download size={18} />
              Excel template
            </a>
          </div>
        }
        description="Create student accounts one by one or in bulk. Every record is automatically linked to your staff account for strict tenant isolation."
        title="Student onboarding"
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="data-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-slate-900">
                {editingStudent ? 'Edit student details' : 'Add a student manually'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingStudent
                  ? 'Update the student profile values below.'
                  : 'This creates both the Firestore profile and Firebase Authentication account inside your assigned tenant scope.'}
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onCreateStudent)}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input className="input-base" id="email" type="email" disabled={!!editingStudent} {...register('email')} />
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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="roll_number">
                  Roll number
                </label>
                <input className="input-base" id="roll_number" disabled={!!editingStudent} {...register('roll_number')} />
                {errors.roll_number ? <p className="mt-2 text-sm text-rose-600">{errors.roll_number.message}</p> : null}
              </div>
              <div>
                <label className="field-label" htmlFor="department">
                  Department
                </label>
                <input className="input-base" id="department" {...register('department')} />
                {errors.department ? <p className="mt-2 text-sm text-rose-600">{errors.department.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
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
              </div>
              <div>
                <label className="field-label" htmlFor="leave_allowance">
                  Leave allowance
                </label>
                <input className="input-base" id="leave_allowance" min="1" type="number" {...register('leave_allowance')} />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="phone_number">
                Phone number
              </label>
              <input className="input-base" id="phone_number" {...register('phone_number')} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="primary-button w-full gap-2 sm:w-auto" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} type="submit">
                {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingStudent ? 'Save changes' : 'Create student')}
                <UserPlus size={18} />
              </button>
              {editingStudent && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingStudent(null)
                    reset({
                      email: '',
                      full_name: '',
                      roll_number: '',
                      department: profile?.department ?? '',
                      year: profile?.year ?? '',
                      phone_number: '',
                      section: profile?.section ?? '',
                      leave_allowance: '',
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
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <UploadCloud size={22} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-900">Bulk import</h2>
                <p className="mt-1 text-sm text-slate-500">Upload CSV or Excel files to onboard entire classes into your scope quickly.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <input
                accept=".csv,.xlsx"
                className="input-base"
                onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <button className="primary-button w-full gap-2 sm:w-auto" disabled={importMutation.isPending} onClick={onImportStudents} type="button">
                {importMutation.isPending ? 'Importing...' : 'Upload file'}
                <UploadCloud size={18} />
              </button>
              {bulkFile ? <p className="text-sm text-slate-500">Selected file: {bulkFile.name}</p> : null}
            </div>
          </article>

          {createdStudent ? (
            <article className="data-panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Latest account created</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">{createdStudent.student.full_name}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Roll number</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{createdStudent.student.roll_number}</p>
                </div>
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Temporary password</p>
                  <p className="mt-2 text-lg font-mono font-bold text-amber-900 select-all">
                    {createdStudent.temporary_password}
                  </p>
                  <p className="mt-1 text-xs text-amber-600">Give this to the student for their first login.</p>
                </div>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <article className="data-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="field-label" htmlFor="studentSearch">
              Search students
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-base pl-11"
                id="studentSearch"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or roll number"
                value={search}
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="yearFilter">
              Year filter
            </label>
            <input className="input-base" id="yearFilter" onChange={(event) => setYear(event.target.value)} value={year} />
          </div>
          <div>
            <label className="field-label" htmlFor="sectionFilter">
              Section filter
            </label>
            <input className="input-base" id="sectionFilter" onChange={(event) => setSection(event.target.value)} value={section} />
          </div>
        </div>

        <div className="mt-4">
          <label className="field-label" htmlFor="departmentFilter">
            Department filter
          </label>
          <input
            className="input-base"
            id="departmentFilter"
            onChange={(event) => setDepartment(event.target.value)}
            value={department}
          />
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-500">{studentCountLabel}</p>
      </article>

      {isLoading ? <PanelLoader label="Loading student directory..." /> : null}
      {isError ? <EmptyState description="Student records could not be loaded." title="Directory unavailable" /> : null}

      {!isLoading && !isError ? (
        <article className="data-panel">
          {data && data.length > 0 ? (
            <div className="table-shell">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Roll no</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Year</th>
                    <th className="px-6 py-4 font-semibold">Section</th>
                    <th className="px-6 py-4 font-semibold">Allowance</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((student) => (
                    <tr className="border-t border-slate-100" key={student.roll_number}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{student.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{student.roll_number}</td>
                      <td className="px-6 py-4 text-slate-600">{student.department}</td>
                      <td className="px-6 py-4 text-slate-600">{student.year}</td>
                      <td className="px-6 py-4 text-slate-600">{student.section ?? '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{student.leave_allowance}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-slate-400 hover:text-brand transition-colors"
                          onClick={() => {
                            setEditingStudent(student)
                            reset({
                              email: student.email,
                              full_name: student.full_name,
                              roll_number: student.roll_number,
                              department: student.department,
                              year: student.year,
                              phone_number: student.phone_number ?? '',
                              section: student.section ?? '',
                              leave_allowance: String(student.leave_allowance),
                            })
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          title="Edit student"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete student ${student.roll_number}?`)) {
                              deleteMutation.mutate(student.roll_number)
                            }
                          }}
                          title="Delete student"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                description="No students match the current filters. Try clearing search or import a new class."
                title="No students found"
              />
            </div>
          )}
        </article>
      ) : null}

      {importSummary ? (
        <article className="data-panel">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Bulk upload results</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">
              {importSummary.created_count} created, {importSummary.failed_count} failed
            </h2>
          </div>
          <div className="table-shell">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Row</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Roll no</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-amber-600">Temporary Password</th>
                  <th className="px-6 py-4 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {importSummary.results.map((result) => (
                  <tr className="border-t border-slate-100" key={`${result.row_number}-${result.email}`}>
                    <td className="px-6 py-4 text-slate-600">{result.row_number}</td>
                    <td className="px-6 py-4 text-slate-600">{result.email}</td>
                    <td className="px-6 py-4 text-slate-600">{result.roll_number}</td>
                    <td className="px-6 py-4">
                      <span className={result.status === 'created' ? 'text-emerald-700' : 'text-rose-700'}>{result.status}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-700 select-all">
                      {result.temporary_password || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{result.message}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </div>
  )
}
