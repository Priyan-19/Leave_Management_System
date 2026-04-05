import { saveAs } from 'file-saver'

import { apiClient } from '@/api/client'
import type {
  LeaveActionPayload,
  LeaveCounters,
  LeaveCreatePayload,
  LeaveRecord,
  LeaveStatus,
  ReportSummary,
  StaffCreatePayload,
  StaffCreateResponse,
  StaffDashboardSummary,
  StaffProfile,
  StaffUpdatePayload,
  StudentCreatePayload,
  StudentCreateResponse,
  StudentDashboardSummary,
  StudentImportSummary,
  StudentProfile,
  StudentUpdatePayload,
  SuperAdminDashboardSummary,
  UserProfile,
} from '@/api/types'

interface LeaveFilters {
  status_filter?: LeaveStatus
  search?: string
  start_date?: string
  end_date?: string
}

interface StudentFilters {
  search?: string
  department?: string
  year?: string
  section?: string
  staff_id?: string
}

interface StaffFilters {
  search?: string
  institution?: string
}

interface ReportFilters {
  period: string
  start_date?: string
  end_date?: string
}

function compactParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params as Record<string, string | undefined>).filter(([, value]) => value),
  )
}

export const api = {
  async getCurrentUser() {
    const { data } = await apiClient.get<UserProfile>('/auth/me')
    return data
  },
  async getStudentDashboard() {
    const { data } = await apiClient.get<StudentDashboardSummary>('/dashboard/student')
    return data
  },
  async getStaffDashboard() {
    const { data } = await apiClient.get<StaffDashboardSummary>('/dashboard/staff')
    return data
  },
  async getSuperAdminDashboard() {
    const { data } = await apiClient.get<SuperAdminDashboardSummary>('/dashboard/super-admin')
    return data
  },
  async getBalance() {
    const { data } = await apiClient.get<LeaveCounters>('/leaves/balance')
    return data
  },
  async listMyLeaves(filters: LeaveFilters = {}) {
    const { data } = await apiClient.get<LeaveRecord[]>('/leaves/mine', {
      params: compactParams(filters),
    })
    return data
  },
  async listLeaveRequests(filters: LeaveFilters = {}) {
    const { data } = await apiClient.get<LeaveRecord[]>('/leaves', {
      params: compactParams(filters),
    })
    return data
  },
  async applyLeave(payload: LeaveCreatePayload) {
    const { data } = await apiClient.post<LeaveRecord>('/leaves', payload)
    return data
  },
  async approveLeave(leaveId: string, payload: LeaveActionPayload) {
    const { data } = await apiClient.post<LeaveRecord>(`/leaves/${leaveId}/approve`, payload)
    return data
  },
  async rejectLeave(leaveId: string, payload: LeaveActionPayload) {
    const { data } = await apiClient.post<LeaveRecord>(`/leaves/${leaveId}/reject`, payload)
    return data
  },
  async listStudents(filters: StudentFilters = {}) {
    const { data } = await apiClient.get<StudentProfile[]>('/students', {
      params: compactParams(filters),
    })
    return data
  },
  async createStudent(payload: StudentCreatePayload) {
    const { data } = await apiClient.post<StudentCreateResponse>('/students', payload)
    return data
  },
  async deleteStudent(rollNumber: string) {
    const { data } = await apiClient.delete<{ status: string; message: string }>(`/students/${rollNumber}`)
    return data
  },
  async updateStudent(rollNumber: string, payload: StudentUpdatePayload) {
    const { data } = await apiClient.put<StudentProfile>(`/students/${rollNumber}`, payload)
    return data
  },
  async importStudents(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<StudentImportSummary>('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
  async listStaff(filters: StaffFilters = {}) {
    const { data } = await apiClient.get<StaffProfile[]>('/staff', {
      params: compactParams(filters),
    })
    return data
  },
  async createStaff(payload: StaffCreatePayload) {
    const { data } = await apiClient.post<StaffCreateResponse>('/staff', payload)
    return data
  },
  async updateStaff(staffId: string, payload: StaffUpdatePayload) {
    const { data } = await apiClient.put<StaffProfile>(`/staff/${staffId}`, payload)
    return data
  },
  async deactivateStaff(staffId: string) {
    const { data } = await apiClient.post<StaffProfile>(`/staff/${staffId}/deactivate`)
    return data
  },
  async deleteStaff(staffId: string) {
    const { data } = await apiClient.delete<boolean>(`/staff/${staffId}`)
    return data
  },
  async getReportSummary(filters: ReportFilters) {
    const { data } = await apiClient.get<ReportSummary>('/reports/summary', {
      params: compactParams(filters),
    })
    return data
  },
  async downloadReport(format: 'excel' | 'pdf', filters: ReportFilters) {
    const response = await apiClient.get<Blob>(`/reports/export/${format}`, {
      params: compactParams(filters),
      responseType: 'blob',
    })

    const disposition = response.headers['content-disposition']
    const filenameMatch = disposition?.match(/filename="(.+)"/)
    const defaultExtension = format === 'excel' ? 'xlsx' : 'pdf'
    const filename = filenameMatch?.[1] ?? `leave-report.${defaultExtension}`
    saveAs(response.data, filename)
  },
}
