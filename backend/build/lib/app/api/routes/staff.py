from fastapi import APIRouter, Depends

from app.core.firebase import get_firestore_client
from app.dependencies.auth import require_roles
from app.schemas import StaffCreate, StaffCreateResponse, StaffProfile, UserProfile, UserRole
from app.services.users import UserService

router = APIRouter()


@router.get("", response_model=list[StaffProfile])
def list_staff(
    search: str | None = None,
    institution: str | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> list[StaffProfile]:
    return UserService(get_firestore_client()).list_staff(search=search, institution=institution)


@router.post("", response_model=StaffCreateResponse)
def create_staff(
    payload: StaffCreate,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> StaffCreateResponse:
    return UserService(get_firestore_client()).create_staff(payload)


@router.delete("/{staff_id}", response_model=StaffProfile)
def deactivate_staff(
    staff_id: str,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> StaffProfile:
    return UserService(get_firestore_client()).deactivate_staff(staff_id)
