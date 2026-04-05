from datetime import date

from fastapi import APIRouter, Depends, Request

from app.core.firebase import get_firestore_client
from app.core.rate_limit import limiter
from app.dependencies.auth import require_roles
from app.schemas import (
    LeaveActionRequest,
    LeaveCounters,
    LeaveCreate,
    LeaveRecord,
    LeaveStatus,
    UserProfile,
    UserRole,
)
from app.services.leaves import LeaveService

router = APIRouter()


@router.get("/mine", response_model=list[LeaveRecord])
def list_my_leaves(
    status_filter: LeaveStatus | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.STUDENT)),
) -> list[LeaveRecord]:
    return LeaveService(get_firestore_client()).list_student_leaves(
        current_user,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("", response_model=LeaveRecord)
@limiter.limit("10/minute")
def apply_leave(
    request: Request,
    payload: LeaveCreate,
    current_user: UserProfile = Depends(require_roles(UserRole.STUDENT)),
) -> LeaveRecord:
    return LeaveService(get_firestore_client()).apply_leave(current_user, payload)


@router.get("/balance", response_model=LeaveCounters)
def get_balance(
    current_user: UserProfile = Depends(require_roles(UserRole.STUDENT)),
) -> LeaveCounters:
    return LeaveService(get_firestore_client()).get_balance(current_user)


@router.get("", response_model=list[LeaveRecord])
def list_leave_requests(
    status_filter: LeaveStatus | None = None,
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> list[LeaveRecord]:
    return LeaveService(get_firestore_client()).list_leave_requests(
        current_user=current_user,
        status_filter=status_filter,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("/{leave_id}/approve", response_model=LeaveRecord)
def approve_leave(
    leave_id: str,
    payload: LeaveActionRequest,
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> LeaveRecord:
    return LeaveService(get_firestore_client()).review_leave(leave_id, current_user, LeaveStatus.APPROVED, payload)


@router.post("/{leave_id}/reject", response_model=LeaveRecord)
def reject_leave(
    leave_id: str,
    payload: LeaveActionRequest,
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> LeaveRecord:
    return LeaveService(get_firestore_client()).review_leave(leave_id, current_user, LeaveStatus.REJECTED, payload)
