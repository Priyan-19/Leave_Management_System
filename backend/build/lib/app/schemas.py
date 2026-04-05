from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    STAFF = "staff"
    STUDENT = "student"


class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class LeaveType(str, Enum):
    CASUAL = "casual"
    MEDICAL = "medical"
    EMERGENCY = "emergency"
    ON_DUTY = "on_duty"


def normalize_role(value: UserRole | str | None) -> UserRole:
    if isinstance(value, UserRole):
        return value
    if value == "admin":
        return UserRole.SUPER_ADMIN
    if value is None:
        raise ValueError("User role is required.")
    return UserRole(value)


class LeaveCounters(BaseModel):
    total_days: int = Field(ge=0)
    approved_days: int = Field(default=0, ge=0)
    pending_days: int = Field(default=0, ge=0)
    remaining_days: int = Field(ge=0)


class UserProfile(BaseModel):
    uid: str
    email: EmailStr
    full_name: str
    role: UserRole
    institution: str | None = None
    department: str | None = None
    year: str | None = None
    roll_number: str | None = None
    phone_number: str | None = None
    section: str | None = None
    staff_id: str | None = None
    leave_allowance: int = Field(default=0, ge=0)
    leave_counters: LeaveCounters
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, value: UserRole | str) -> UserRole:
        return normalize_role(value)


class StaffProfile(BaseModel):
    uid: str
    staff_id: str
    email: EmailStr
    full_name: str
    role: UserRole
    institution: str
    department: str | None = None
    year: str | None = None
    section: str | None = None
    is_active: bool = True
    managed_student_count: int | None = Field(default=None, ge=0)
    created_at: datetime
    updated_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, value: UserRole | str) -> UserRole:
        return normalize_role(value)


class StudentProfile(BaseModel):
    uid: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STUDENT
    institution: str
    department: str
    year: str
    roll_number: str
    phone_number: str | None = None
    section: str | None = None
    staff_id: str
    leave_allowance: int = Field(default=0, ge=0)
    leave_counters: LeaveCounters
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, value: UserRole | str) -> UserRole:
        return normalize_role(value)


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    department: str | None = Field(default=None, min_length=2, max_length=80)
    year: str | None = Field(default=None, min_length=1, max_length=30)
    section: str | None = Field(default=None, max_length=30)
    institution: str | None = Field(default=None, min_length=2, max_length=120)


class StaffCreateResponse(BaseModel):
    staff: StaffProfile
    temporary_password: str


class StudentCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    roll_number: str = Field(min_length=2, max_length=40)
    department: str = Field(min_length=2, max_length=80)
    year: str = Field(min_length=1, max_length=30)
    phone_number: str | None = Field(default=None, max_length=20)
    section: str | None = Field(default=None, max_length=30)
    institution: str | None = Field(default=None, min_length=2, max_length=120)
    leave_allowance: int | None = Field(default=None, ge=1, le=365)


class StudentCreateResponse(BaseModel):
    student: StudentProfile
    temporary_password: str


class StudentImportRowResult(BaseModel):
    row_number: int
    email: str
    roll_number: str
    status: str
    message: str
    temporary_password: str | None = None


class StudentImportSummary(BaseModel):
    processed_rows: int
    created_count: int
    failed_count: int
    results: list[StudentImportRowResult]


class LeaveCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=8, max_length=500)

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, value: date, info):
        start_date = info.data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("End date cannot be earlier than start date.")
        return value


class LeaveActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=300)


class LeaveRecord(BaseModel):
    id: str
    roll_number: str
    staff_id: str
    student_name: str
    student_email: str | None = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: int
    reason: str
    status: LeaveStatus
    note: str | None = None
    reviewed_by_uid: str | None = None
    reviewed_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    decision_at: datetime | None = None


class StatusBreakdownItem(BaseModel):
    label: str
    value: int


class StudentLeaveCount(BaseModel):
    student_name: str
    roll_number: str
    value: int


class TrendPoint(BaseModel):
    label: str
    value: int


class StudentDashboardSummary(BaseModel):
    total_leaves_taken: int
    remaining_balance: int
    pending_requests: int
    leave_counters: LeaveCounters
    recent_activity: list[LeaveRecord]


class StaffDashboardSummary(BaseModel):
    total_students: int
    total_requests: int
    approved_count: int
    rejected_count: int
    pending_count: int
    status_breakdown: list[StatusBreakdownItem]
    student_breakdown: list[StudentLeaveCount]
    trend: list[TrendPoint]
    recent_requests: list[LeaveRecord]


class SuperAdminDashboardSummary(StaffDashboardSummary):
    total_staff: int


class ReportSummary(BaseModel):
    period: str
    scope: str
    start_date: date
    end_date: date
    total_requests: int
    total_leave_days: int
    approved_count: int
    rejected_count: int
    pending_count: int
    status_breakdown: list[StatusBreakdownItem]
    student_breakdown: list[StudentLeaveCount]
    requests: list[LeaveRecord]
