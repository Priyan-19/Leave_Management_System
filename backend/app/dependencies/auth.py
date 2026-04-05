from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.firebase import get_auth_client, get_firestore_client
from app.schemas import UserProfile, UserRole
from app.services.users import UserService

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserProfile:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required.",
        )

    auth_client = get_auth_client()
    settings = get_settings()

    if settings.environment == "development" and credentials.credentials.startswith("mock_"):
        parts = credentials.credentials.split("_", 2)

        # Fixed logic: handle mock_uid_role format correctly
        uid = parts[1] if len(parts) > 1 else credentials.credentials
        role_hint = parts[2] if len(parts) > 2 else (parts[1] if len(parts) > 1 else None)
        token = {"uid": uid, "role": role_hint}

    elif credentials.credentials.startswith("mock_"):
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mock tokens are not allowed in this environment.",
        )
    else:
        try:
            token = auth_client.verify_id_token(credentials.credentials, check_revoked=True)
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
