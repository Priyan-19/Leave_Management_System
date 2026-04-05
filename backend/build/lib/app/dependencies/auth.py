from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.firebase import get_auth_client, get_firestore_client
from app.schemas import LeaveCounters, UserProfile, UserRole, normalize_role
from app.services.users import UserService
from app.utils.dates import utcnow

bearer_scheme = HTTPBearer(auto_error=False)

MOCK_STAFF_ID = "mock_staff_1"


def _build_mock_user(uid: str, role_hint: str | None) -> UserProfile:
    now = utcnow()
    settings = get_settings()
    role = normalize_role(role_hint or UserRole.STUDENT.value)
    leave_counters = LeaveCounters(
        total_days=12 if role == UserRole.STUDENT else 0,
        approved_days=0,
        pending_days=0,
        remaining_days=12 if role == UserRole.STUDENT else 0,
    )

    payload = {
        "uid": uid,
        "email": f"{uid}@example.com",
        "full_name": f"Mock {role.value.replace('_', ' ').title()}",
        "role": role,
        "institution": settings.institution_name,
        "department": "Computer Science",
        "year": "2",
        "roll_number": "MOCK-ROLL-1" if role == UserRole.STUDENT else None,
        "phone_number": "9999999999" if role == UserRole.STUDENT else None,
        "section": "A",
        "staff_id": MOCK_STAFF_ID if role == UserRole.STUDENT else uid,
        "leave_allowance": 12 if role == UserRole.STUDENT else 0,
        "leave_counters": leave_counters,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    if role in {UserRole.STAFF, UserRole.SUPER_ADMIN}:
        payload["year"] = None
        payload["roll_number"] = None
        payload["phone_number"] = None

    return UserProfile.model_validate(payload)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserProfile:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    if credentials.credentials.startswith("mock_"):
        parts = credentials.credentials.split("_")
        role_hint = parts[1] if len(parts) > 2 else None
        user = _build_mock_user(credentials.credentials, role_hint)
    else:
        auth_client = get_auth_client()
        try:
            token = auth_client.verify_id_token(credentials.credentials)
        except Exception as exc:  # pragma: no cover
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Firebase ID token.",
            ) from exc

        user_service = UserService(get_firestore_client())
        user = user_service.get_user(token["uid"], token.get("role"))

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    return user


def require_roles(*roles: UserRole):
    def dependency(user: UserProfile = Depends(get_current_user)) -> UserProfile:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this resource.",
            )
        return user

    return dependency
