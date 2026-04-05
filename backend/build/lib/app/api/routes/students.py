from fastapi import APIRouter, Depends, File, UploadFile

from app.core.firebase import get_firestore_client
from app.dependencies.auth import require_roles
from app.schemas import (
    StudentCreate,
    StudentCreateResponse,
    StudentImportSummary,
    StudentProfile,
    UserProfile,
    UserRole,
)
from app.services.users import UserService
from app.utils.uploads import parse_student_upload

router = APIRouter()


@router.get("", response_model=list[StudentProfile])
def list_students(
    search: str | None = None,
    department: str | None = None,
    year: str | None = None,
    section: str | None = None,
    staff_id: str | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.STAFF)),
) -> list[StudentProfile]:
    return UserService(get_firestore_client()).list_students(
        current_user=current_user,
        search=search,
        department=department,
        year=year,
        section=section,
        staff_id=staff_id,
    )


@router.post("", response_model=StudentCreateResponse)
def create_student(
    payload: StudentCreate,
    current_user: UserProfile = Depends(require_roles(UserRole.STAFF)),
) -> StudentCreateResponse:
    return UserService(get_firestore_client()).create_student(payload, current_user)


@router.post("/import", response_model=StudentImportSummary)
async def import_students(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(require_roles(UserRole.STAFF)),
) -> StudentImportSummary:
    content = await file.read()
    rows = parse_student_upload(file.filename or "", content)
    return UserService(get_firestore_client()).import_students(rows, current_user)
