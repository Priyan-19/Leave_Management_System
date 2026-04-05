from fastapi import APIRouter, Depends, Request

from app.core.rate_limit import limiter
from app.dependencies.auth import get_current_user
from app.schemas import UserProfile

router = APIRouter()


@router.get("/me", response_model=UserProfile)
@limiter.limit("20/minute")
def get_me(request: Request, current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    return current_user
