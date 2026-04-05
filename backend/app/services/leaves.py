from datetime import date

from fastapi import HTTPException, status
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.schemas import (
    LeaveActionRequest,
    LeaveCounters,
    LeaveCreate,
    LeaveRecord,
    LeaveStatus,
    StudentDashboardSummary,
    UserProfile,
    UserRole,
)
from app.services.users import UserService
from app.utils.dates import calculate_leave_days, dates_overlap, utcnow
from app.utils.search import build_search_terms, normalize_search_text


class LeaveService:
    def __init__(self, db):
        self.db = db
        self.user_service = UserService(db)

    @property
    def leaves_collection(self):
        return self.db.collection("leave_requests")

    @property
    def students_collection(self):
        return self.db.collection("students")

    def _default_counters(self, total_days: int) -> LeaveCounters:
        return LeaveCounters(
            total_days=total_days,
            approved_days=0,
            pending_days=0,
            remaining_days=total_days,
        )

    def _doc_to_leave(self, doc) -> LeaveRecord:
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")

        payload = doc.to_dict()
        return LeaveRecord.model_validate(
            {
                "id": doc.id,
                "roll_number": payload.get("rollNo") or payload.get("roll_number", ""),
                "staff_id": payload.get("staffId") or payload.get("staff_id", ""),
                "student_name": payload.get("studentName") or payload.get("student_name", ""),
                "student_email": payload.get("studentEmail") or payload.get("student_email"),
                "leave_type": payload.get("leaveType") or payload.get("leave_type"),
                "start_date": payload.get("startDate") or payload.get("start_date"),
                "end_date": payload.get("endDate") or payload.get("end_date"),
                "days": payload.get("days", 0),
                "reason": payload.get("reason", ""),
                "status": payload.get("status"),
                "note": payload.get("note"),
                "reviewed_by_uid": payload.get("reviewedByUid") or payload.get("reviewed_by_uid"),
                "reviewed_by_name": payload.get("reviewedByName") or payload.get("reviewed_by_name"),
                "created_at": payload.get("createdAt") or payload.get("created_at") or utcnow(),
                "updated_at": payload.get("updatedAt") or payload.get("updated_at") or utcnow(),
                "decision_at": payload.get("decisionAt") or payload.get("decision_at"),
            }
        )

    def _query_leave_documents(
        self,
        *,
        roll_number: str | None = None,
        staff_id: str | None = None,
        status_filter: LeaveStatus | None = None,
        search: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ):
        query = self.leaves_collection
        if roll_number:
            query = query.where(filter=FieldFilter("rollNo", "==", roll_number))
        if staff_id:
            query = query.where(filter=FieldFilter("staffId", "==", staff_id))
        if status_filter:
            query = query.where(filter=FieldFilter("status", "==", status_filter.value))

        normalized_search = normalize_search_text(search)
        if normalized_search:
            query = query.where(filter=FieldFilter("searchTerms", "array_contains", normalized_search))

        # We omit start_date and end_date inequality filters here to prevent
        # Firestore composite index requirement errors (e.g., staffId == X AND startDate >= Y).
        # We'll filter in Python instead.

        return query

    def _list_student_requests(self, roll_number: str) -> list[LeaveRecord]:
        query = self._query_leave_documents(roll_number=roll_number)
        return [self._doc_to_leave(doc) for doc in query.stream()]

    def list_student_leaves(
        self,
        current_user: UserProfile,
        status_filter: LeaveStatus | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[LeaveRecord]:
        requests = [
            leave
            for leave in self._query_leave_documents(
                roll_number=current_user.roll_number or "",
                status_filter=status_filter,
            ).stream()
        ]
        leaves = [self._doc_to_leave(doc) for doc in requests]
        
        # Apply date filters in Python
        if start_date:
            leaves = [leave for leave in leaves if leave.start_date >= start_date]
        if end_date:
            leaves = [leave for leave in leaves if leave.start_date <= end_date]
            
        leaves.sort(key=lambda x: x.created_at, reverse=True)
        return leaves

    def list_leave_requests(
        self,
        current_user: UserProfile,
        status_filter: LeaveStatus | None = None,
        search: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[LeaveRecord]:
        staff_id = current_user.staff_id if current_user.role == UserRole.STAFF else None
        requests = [
            self._doc_to_leave(doc)
            for doc in self._query_leave_documents(
                staff_id=staff_id,
                status_filter=status_filter,
                search=search,
            ).stream()
        ]
        
        # Apply date filters in Python
        if start_date:
            requests = [req for req in requests if req.start_date >= start_date]
        if end_date:
            requests = [req for req in requests if req.start_date <= end_date]
            
        requests.sort(key=lambda x: x.created_at, reverse=True)
        return requests

    def apply_leave(self, current_user: UserProfile, payload: LeaveCreate) -> LeaveRecord:
        roll_number = current_user.roll_number or ""
        existing_requests = self._list_student_requests(roll_number)
        for leave in existing_requests:
            if leave.status in {LeaveStatus.PENDING, LeaveStatus.APPROVED} and dates_overlap(
                payload.start_date, payload.end_date, leave.start_date, leave.end_date
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A leave request already exists for one or more of these dates.",
                )

        leave_days = calculate_leave_days(payload.start_date, payload.end_date)
        student_ref = self.students_collection.document(roll_number)
        leave_ref = self.leaves_collection.document()
        now = utcnow()

        @firestore.transactional
        def transaction_apply(transaction):
            student_snapshot = student_ref.get(transaction=transaction)
            if not student_snapshot.exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

            student_data = student_snapshot.to_dict()
            counters = student_data.get("leaveCounters") or {}
            approved_days = int(counters.get("approved_days", counters.get("approvedDays", 0)))
            pending_days = int(counters.get("pending_days", counters.get("pendingDays", 0)))
            total_days = int(student_data.get("leaveBalance", counters.get("total_days", counters.get("totalDays", 0))))

            if approved_days + pending_days + leave_days > total_days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This request exceeds the remaining leave allowance.",
                )

            updated_counters = {
                "total_days": total_days,
                "approved_days": approved_days,
                "pending_days": pending_days + leave_days,
                "remaining_days": max(total_days - approved_days, 0),
            }

            transaction.update(
                student_ref,
                {
                    "leaveCounters": updated_counters,
                    "updatedAt": now,
                },
            )

            transaction.set(
                leave_ref,
                {
                    "leaveId": leave_ref.id,
                    "rollNo": roll_number,
                    "staffId": current_user.staff_id,
                    "studentName": current_user.full_name,
                    "studentEmail": current_user.email,
                    "leaveType": payload.leave_type.value,
                    "startDate": payload.start_date.isoformat(),
                    "endDate": payload.end_date.isoformat(),
                    "days": leave_days,
                    "reason": payload.reason.strip(),
                    "status": LeaveStatus.PENDING.value,
                    "note": None,
                    "reviewedByUid": None,
                    "reviewedByName": None,
                    "searchTerms": build_search_terms(current_user.full_name, current_user.email, roll_number),
                    "createdAt": now,
                    "updatedAt": now,
                    "decisionAt": None,
                },
            )

        transaction_apply(self.db.transaction())
        return self._doc_to_leave(leave_ref.get())

    def get_balance(self, current_user: UserProfile) -> LeaveCounters:
        student = self.user_service.get_student_by_roll_number(current_user.roll_number or "")
        return student.leave_counters

    def get_student_dashboard(self, current_user: UserProfile) -> StudentDashboardSummary:
        student = self.user_service.get_student_by_roll_number(current_user.roll_number or "")
        all_requests = [self._doc_to_leave(doc) for doc in self._query_leave_documents(roll_number=student.roll_number).stream()]
        all_requests.sort(key=lambda x: x.created_at, reverse=True)
        recent = all_requests[:5]
        counters = student.leave_counters
        return StudentDashboardSummary(
            total_leaves_taken=counters.approved_days,
            remaining_balance=counters.remaining_days,
            pending_requests=sum(1 for leave in all_requests if leave.status == LeaveStatus.PENDING),
            leave_counters=counters,
            recent_activity=recent,
        )

    def review_leave(
        self,
        leave_id: str,
        current_user: UserProfile,
        status_update: LeaveStatus,
        payload: LeaveActionRequest,
    ) -> LeaveRecord:
        if status_update not in {LeaveStatus.APPROVED, LeaveStatus.REJECTED}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid leave action.")

        leave_ref = self.leaves_collection.document(leave_id)
        now = utcnow()

        @firestore.transactional
        def transaction_review(transaction):
            leave_snapshot = leave_ref.get(transaction=transaction)
            if not leave_snapshot.exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")

            leave_data = leave_snapshot.to_dict()
            if current_user.role == UserRole.STAFF and leave_data.get("staffId") != current_user.staff_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")

            if leave_data["status"] != LeaveStatus.PENDING.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only pending leave requests can be reviewed.",
                )

            student_ref = self.students_collection.document(leave_data["rollNo"])
            student_snapshot = student_ref.get(transaction=transaction)
            if not student_snapshot.exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

            student_data = student_snapshot.to_dict()
            counters = student_data.get("leaveCounters") or {}
            total_days = int(student_data.get("leaveBalance", counters.get("total_days", counters.get("totalDays", 0))))
            approved_days = int(counters.get("approved_days", counters.get("approvedDays", 0)))
            pending_days = max(
                int(counters.get("pending_days", counters.get("pendingDays", 0))) - int(leave_data["days"]),
                0,
            )

            updated_counters = {
                "total_days": total_days,
                "pending_days": pending_days,
            }

            if status_update == LeaveStatus.APPROVED:
                updated_approved_days = approved_days + int(leave_data["days"])
                if updated_approved_days > total_days:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Approving this request would exceed the student's leave allowance.",
                    )
                updated_counters.update(
                    {
                        "approved_days": updated_approved_days,
                        "remaining_days": max(total_days - updated_approved_days, 0),
                    }
                )
            else:
                updated_counters.update(
                    {
                        "approved_days": approved_days,
                        "remaining_days": max(total_days - approved_days, 0),
                    }
                )

            transaction.update(
                leave_ref,
                {
                    "status": status_update.value,
                    "note": payload.note,
                    "reviewedByUid": current_user.uid,
                    "reviewedByName": current_user.full_name,
                    "updatedAt": now,
                    "decisionAt": now,
                },
            )
            transaction.update(
                student_ref,
                {
                    "leaveCounters": updated_counters,
                    "updatedAt": now,
                },
            )

        transaction_review(self.db.transaction())
        return self._doc_to_leave(leave_ref.get())
