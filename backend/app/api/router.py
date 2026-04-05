from fastapi import APIRouter

from app.api.routes import auth, dashboard, leaves, reports, staff, students

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(leaves.router, prefix="/leaves", tags=["leaves"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
