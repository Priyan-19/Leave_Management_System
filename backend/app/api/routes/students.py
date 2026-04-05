from fastapi import APIRouter, Depends, File, UploadFile

from app.core.firebase import get_firestore_client
from app.dependencies.auth import require_roles
from app.schemas import (
    StudentCreate,
    StudentCreateResponse,
    StudentImportSummary,
    StudentProfile,
    StudentUpdate,
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
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
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
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> StudentCreateResponse:
    return UserService(get_firestore_client()).create_student(payload, current_user)


@router.post("/import", response_model=StudentImportSummary)
async def import_students(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> StudentImportSummary:
    content = await file.read()
    rows = parse_student_upload(file.filename or "", content)
    return UserService(get_firestore_client()).import_students(rows, current_user)


@router.delete("/{roll_number}")
def delete_student(
    roll_number: str,
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> dict[str, str]:
    UserService(get_firestore_client()).delete_student(roll_number, current_user)
    return {"status": "ok", "message": f"Student {roll_number} deleted successfully."}


@router.put("/{roll_number}", response_model=StudentProfile)
def update_student(
    roll_number: str,
    payload: StudentUpdate,
    current_user: UserProfile = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> StudentProfile:
    return UserService(get_firestore_client()).update_student(roll_number, payload, current_user)
