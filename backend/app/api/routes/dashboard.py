from fastapi import APIRouter, Depends

from app.core.firebase import get_firestore_client
from app.dependencies.auth import require_roles
from app.schemas import (
    StaffDashboardSummary,
    StudentDashboardSummary,
    SuperAdminDashboardSummary,
    UserProfile,
    UserRole,
)
from app.services.leaves import LeaveService
from app.services.reports import ReportService

router = APIRouter()


@router.get("/student", response_model=StudentDashboardSummary)
def student_dashboard(
    current_user: UserProfile = Depends(require_roles(UserRole.STUDENT)),
) -> StudentDashboardSummary:
    return LeaveService(get_firestore_client()).get_student_dashboard(current_user)


@router.get("/staff", response_model=StaffDashboardSummary)
def staff_dashboard(
    current_user: UserProfile = Depends(require_roles(UserRole.STAFF)),
) -> StaffDashboardSummary:
    return ReportService(get_firestore_client()).build_staff_dashboard(current_user)


@router.get("/super-admin", response_model=SuperAdminDashboardSummary)
def super_admin_dashboard(
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN)),
) -> SuperAdminDashboardSummary:
    return ReportService(get_firestore_client()).build_super_admin_dashboard(current_user)



