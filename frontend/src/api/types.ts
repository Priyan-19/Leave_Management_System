export type UserRole = 'admin' | 'staff' | 'student'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = 'casual' | 'medical' | 'emergency' | 'on_duty'

export interface LeaveCounters {
  total_days: number
  approved_days: number
  pending_days: number
  remaining_days: number
}

export interface UserProfile {
  uid: string
  email: string
  full_name: string
  role: UserRole
  institution?: string | null
  department?: string | null
  year?: string | null
  roll_number?: string | null
  phone_number?: string | null
  section?: string | null
  staff_id?: string | null
  leave_allowance: number
  leave_counters: LeaveCounters
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffProfile {
  uid: string
  staff_id: string
  email: string
  full_name: string
  role: Extract<UserRole, 'admin' | 'staff'>
  institution: string
  department?: string | null
  year?: string | null
  section?: string | null
  batch?: string | null
  is_active: boolean
  managed_student_count?: number | null
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  uid: string
  email: string
  full_name: string
  role: 'student'
  institution: string
  department: string
  year: string
  roll_number: string
  phone_number?: string | null
  section?: string | null
  staff_id: string
  leave_allowance: number
  leave_counters: LeaveCounters
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeaveRecord {
  id: string
  roll_number: string
  staff_id: string
  student_name: string
  student_email?: string | null
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason: string
  status: LeaveStatus
  note?: string | null
  reviewed_by_uid?: string | null
  reviewed_by_name?: string | null
  created_at: string
  updated_at: string
  decision_at?: string | null
}

export interface StudentDashboardSummary {
  total_leaves_taken: number
  remaining_balance: number
  pending_requests: number
  leave_counters: LeaveCounters
  recent_activity: LeaveRecord[]
}

export interface StatusBreakdownItem {
  label: string
  value: number
}

export interface StudentLeaveCount {
  student_name: string
  roll_number: string
  value: number
}

export interface TrendPoint {
  label: string
  value: number
}

export interface StaffDashboardSummary {
  total_students: number
  total_requests: number
  approved_count: number
  rejected_count: number
  pending_count: number
  status_breakdown: StatusBreakdownItem[]
  student_breakdown: StudentLeaveCount[]
  trend: TrendPoint[]
  recent_requests: LeaveRecord[]
}

export interface SuperAdminDashboardSummary extends StaffDashboardSummary {
  total_staff: number
}

export interface ReportSummary {
  period: string
  scope: string
  start_date: string
  end_date: string
  total_requests: number
  total_leave_days: number
  approved_count: number
  rejected_count: number
  pending_count: number
  status_breakdown: StatusBreakdownItem[]
  student_breakdown: StudentLeaveCount[]
  requests: LeaveRecord[]
}

export interface StaffCreatePayload {
  email: string
  full_name: string
  department?: string
  year?: string
  section?: string
  batch?: string
  institution?: string
}


export interface StaffCreateResponse {
  staff: StaffProfile
  temporary_password: string
  password_setup_required: boolean
}

export interface StaffUpdatePayload {
  full_name?: string
  department?: string
  year?: string
  section?: string
  batch?: string
  institution?: string
}


export interface StudentCreatePayload {
  email: string
  full_name: string
  roll_number: string
  department: string
  year: string
  phone_number?: string
  section?: string
  institution?: string
  leave_allowance?: number
}

export interface StudentCreateResponse {
  student: StudentProfile
  temporary_password: string
  password_setup_required: boolean
}

export interface StudentUpdatePayload {
  full_name?: string
  department?: string
  year?: string
  section?: string
  phone_number?: string
  leave_allowance?: number
}

export interface StudentImportRowResult {
  row_number: number
  email: string
  roll_number: string
  status: string
  message: string
  temporary_password?: string | null
  password_setup_required: boolean
}

export interface StudentImportSummary {
  processed_rows: number
  created_count: number
  failed_count: number
  results: StudentImportRowResult[]
}

export interface LeaveCreatePayload {
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
}

export interface LeaveActionPayload {
  note?: string
}
