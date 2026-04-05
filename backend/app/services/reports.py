from collections import Counter
from datetime import date, timedelta
from io import BytesIO

import pandas as pd
from google.cloud.firestore_v1.base_query import FieldFilter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas import (
    LeaveRecord,
    LeaveStatus,
    ReportSummary,
    StaffDashboardSummary,
    StatusBreakdownItem,
    StudentLeaveCount,
    SuperAdminDashboardSummary,
    TrendPoint,
    UserProfile,
    UserRole,
)
from app.services.leaves import LeaveService


class ReportService:
    def __init__(self, db):
        self.db = db
        self.leave_service = LeaveService(db)

    @property
    def admins_collection(self):
        return self.db.collection("admins")

    @property
    def staff_collection(self):
        return self.db.collection("staff")

    @property
    def students_collection(self):
        return self.db.collection("students")

    def _count_documents(self, query) -> int:
        try:
            counts = query.count(alias="count").get()
            if not counts:
                return 0
            # Some versions return a list of lists, others a list of AggregationResults
            res = counts[0]
            if isinstance(res, list):
                res = res[0]
            
            # Access by attribute 'value' or by subscripting with alias
            if hasattr(res, "value"):
                return int(res.value)
            return int(res["count"])
        except Exception:
            return 0

    def _student_count(self, current_user: UserProfile) -> int:
        query = self.students_collection
        if current_user.role == UserRole.STAFF:
            query = query.where(filter=FieldFilter("staffId", "==", current_user.staff_id))
        return self._count_documents(query)

    def _staff_count(self) -> int:
        query = self.staff_collection.where(filter=FieldFilter("isActive", "==", True))
        return self._count_documents(query)

    def _scoped_leaves(
        self,
        current_user: UserProfile,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[LeaveRecord]:
        return self.leave_service.list_leave_requests(
            current_user=current_user,
            start_date=start_date,
            end_date=end_date,
        )

    def _build_trend(self, leaves: list[LeaveRecord]) -> list[TrendPoint]:
        trend_buckets: list[TrendPoint] = []
        today = date.today()
        for offset in range(5, -1, -1):
            bucket_start = today - timedelta(days=offset * 7)
            bucket_end = bucket_start + timedelta(days=6)
            value = sum(1 for leave in leaves if bucket_start <= leave.start_date <= bucket_end)
            trend_buckets.append(
                TrendPoint(label=f"{bucket_start.strftime('%d %b')} - {bucket_end.strftime('%d %b')}", value=value)
            )
        return trend_buckets

    def _build_dashboard_payload(self, current_user: UserProfile) -> dict:
        leaves = self._scoped_leaves(current_user)
        status_counts = Counter(leave.status for leave in leaves)
        per_student = Counter((leave.student_name, leave.roll_number) for leave in leaves)

        recent_requests = sorted(leaves, key=lambda leave: leave.created_at, reverse=True)[:8]

        return {
            "total_students": self._student_count(current_user),
            "total_requests": len(leaves),
            "approved_count": status_counts.get(LeaveStatus.APPROVED, 0),
            "rejected_count": status_counts.get(LeaveStatus.REJECTED, 0),
            "pending_count": status_counts.get(LeaveStatus.PENDING, 0),
            "status_breakdown": [
                StatusBreakdownItem(label="Approved", value=status_counts.get(LeaveStatus.APPROVED, 0)),
                StatusBreakdownItem(label="Pending", value=status_counts.get(LeaveStatus.PENDING, 0)),
                StatusBreakdownItem(label="Rejected", value=status_counts.get(LeaveStatus.REJECTED, 0)),
            ],
            "student_breakdown": [
                StudentLeaveCount(student_name=name, roll_number=roll, value=count)
                for (name, roll), count in per_student.most_common(8)
            ],
            "trend": self._build_trend(leaves),
            "recent_requests": recent_requests,
        }

    def build_staff_dashboard(self, current_user: UserProfile) -> StaffDashboardSummary:
        return StaffDashboardSummary.model_validate(self._build_dashboard_payload(current_user))

    def build_super_admin_dashboard(self, current_user: UserProfile) -> SuperAdminDashboardSummary:
        return SuperAdminDashboardSummary.model_validate(
            self._build_dashboard_payload(current_user) | {"total_staff": self._staff_count()}
        )

    def build_report(
        self,
        current_user: UserProfile,
        period: str = "weekly",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ReportSummary:
        if start_date is None or end_date is None:
            from app.utils.dates import default_period_range

            start_date, end_date = default_period_range(period)

        scope = "Global institution report" if current_user.role == UserRole.ADMIN else "Staff-scoped report"
        leaves = self._scoped_leaves(current_user, start_date=start_date, end_date=end_date)
        status_counts = Counter(leave.status for leave in leaves)
        student_counts = Counter((leave.student_name, leave.roll_number) for leave in leaves)

        return ReportSummary(
            period=period,
            scope=scope,
            start_date=start_date,
            end_date=end_date,
            total_requests=len(leaves),
            total_leave_days=sum(leave.days for leave in leaves),
            approved_count=status_counts.get(LeaveStatus.APPROVED, 0),
            rejected_count=status_counts.get(LeaveStatus.REJECTED, 0),
            pending_count=status_counts.get(LeaveStatus.PENDING, 0),
            status_breakdown=[
                StatusBreakdownItem(label="Approved", value=status_counts.get(LeaveStatus.APPROVED, 0)),
                StatusBreakdownItem(label="Pending", value=status_counts.get(LeaveStatus.PENDING, 0)),
                StatusBreakdownItem(label="Rejected", value=status_counts.get(LeaveStatus.REJECTED, 0)),
            ],
            student_breakdown=[
                StudentLeaveCount(student_name=name, roll_number=roll, value=count)
                for (name, roll), count in student_counts.most_common()
            ],
            requests=sorted(leaves, key=lambda leave: leave.created_at, reverse=True),
        )

    def export_excel(self, summary: ReportSummary) -> bytes:
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            pd.DataFrame(
                [
                    {"metric": "Scope", "value": summary.scope},
                    {"metric": "Period", "value": summary.period},
                    {"metric": "Start Date", "value": summary.start_date.isoformat()},
                    {"metric": "End Date", "value": summary.end_date.isoformat()},
                    {"metric": "Total Requests", "value": summary.total_requests},
                    {"metric": "Total Leave Days", "value": summary.total_leave_days},
                    {"metric": "Approved", "value": summary.approved_count},
                    {"metric": "Pending", "value": summary.pending_count},
                    {"metric": "Rejected", "value": summary.rejected_count},
                ]
            ).to_excel(writer, sheet_name="Summary", index=False)

            pd.DataFrame([item.model_dump() for item in summary.student_breakdown]).to_excel(
                writer, sheet_name="Students", index=False
            )

            pd.DataFrame(
                [
                    {
                        "student_name": request.student_name,
                        "student_email": request.student_email,
                        "roll_number": request.roll_number,
                        "staff_id": request.staff_id,
                        "leave_type": request.leave_type,
                        "start_date": request.start_date.isoformat(),
                        "end_date": request.end_date.isoformat(),
                        "days": request.days,
                        "status": request.status,
                        "reason": request.reason,
                    }
                    for request in summary.requests
                ]
            ).to_excel(writer, sheet_name="Requests", index=False)

        return buffer.getvalue()

    def export_pdf(self, summary: ReportSummary) -> bytes:
        buffer = BytesIO()
        styles = getSampleStyleSheet()
        document = SimpleDocTemplate(buffer, pagesize=A4)
        story = [
            Paragraph("Leave Report", styles["Title"]),
            Spacer(1, 12),
            Paragraph(summary.scope, styles["BodyText"]),
            Spacer(1, 6),
            Paragraph(
                f"Period: {summary.period.title()} ({summary.start_date.isoformat()} to {summary.end_date.isoformat()})",
                styles["BodyText"],
            ),
            Spacer(1, 12),
        ]

        summary_table = Table(
            [
                ["Metric", "Value"],
                ["Total Requests", summary.total_requests],
                ["Total Leave Days", summary.total_leave_days],
                ["Approved", summary.approved_count],
                ["Pending", summary.pending_count],
                ["Rejected", summary.rejected_count],
            ]
        )
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.extend([summary_table, Spacer(1, 18)])

        request_rows = [["Student", "Roll No", "Type", "Dates", "Status"]]
        request_rows.extend(
            [
                [
                    request.student_name,
                    request.roll_number,
                    request.leave_type.value.replace("_", " ").title(),
                    f"{request.start_date.isoformat()} to {request.end_date.isoformat()}",
                    request.status.value.title(),
                ]
                for request in summary.requests
            ]
        )
        requests_table = Table(request_rows, colWidths=[110, 60, 70, 140, 70])
        requests_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("PADDING", (0, 0), (-1, -1), 6),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(requests_table)
        document.build(story)
        return buffer.getvalue()
