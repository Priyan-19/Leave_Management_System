from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.firebase import get_firestore_client
from app.dependencies.auth import require_roles
from app.schemas import ReportSummary, UserProfile, UserRole
from app.services.reports import ReportService

router = APIRouter()


@router.get("/summary", response_model=ReportSummary)
def get_report_summary(
    period: str = "weekly",
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.STAFF)),
) -> ReportSummary:
    return ReportService(get_firestore_client()).build_report(
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/export/excel")
def download_report_excel(
    period: str = "weekly",
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.STAFF)),
) -> StreamingResponse:
    service = ReportService(get_firestore_client())
    summary = service.build_report(current_user=current_user, period=period, start_date=start_date, end_date=end_date)
    content = service.export_excel(summary)
    filename = f"leave-report-{summary.start_date.isoformat()}-{summary.end_date.isoformat()}.xlsx"
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf")
def download_report_pdf(
    period: str = "weekly",
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.STAFF)),
) -> StreamingResponse:
    service = ReportService(get_firestore_client())
    summary = service.build_report(current_user=current_user, period=period, start_date=start_date, end_date=end_date)
    content = service.export_pdf(summary)
    filename = f"leave-report-{summary.start_date.isoformat()}-{summary.end_date.isoformat()}.pdf"
    return StreamingResponse(
        iter([content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
