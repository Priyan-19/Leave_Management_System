import secrets
import string
from collections.abc import Iterable

from fastapi import HTTPException, status
from firebase_admin import auth as firebase_auth
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.config import get_settings
from app.core.firebase import get_auth_client
from app.schemas import (
    LeaveCounters,
    StaffCreate,
    StaffCreateResponse,
    StaffProfile,
    StaffUpdate,
    StudentCreate,
    StudentCreateResponse,
    StudentImportRowResult,
    StudentImportSummary,
    StudentProfile,
    StudentUpdate,
    UserProfile,
    UserRole,
    normalize_role,
)
from app.utils.dates import utcnow
from app.utils.search import build_search_terms, normalize_search_text


class UserService:
    def __init__(self, db):
        self.db = db
        self.settings = get_settings()
        self.auth_client = get_auth_client()

    @property
    def admins_collection(self):
        return self.db.collection("admins")

    @property
    def staff_collection(self):
        return self.db.collection("staff")

    @property
    def students_collection(self):
        return self.db.collection("students")

    @property
    def legacy_users_collection(self):
        return self.db.collection("users")

    def _default_counters(self, total_days: int) -> LeaveCounters:
        return LeaveCounters(
            total_days=total_days,
            approved_days=0,
            pending_days=0,
            remaining_days=total_days,
        )

    def _generate_temporary_password(self) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$"
        return "".join(secrets.choice(alphabet) for _ in range(self.settings.default_password_length))

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

    def _delete_auth_user_safely(self, uid: str | None) -> None:
        if not uid:
            return

        try:
            self.auth_client.delete_user(uid)
        except firebase_auth.UserNotFoundError:
            return

    def _staff_payload_to_profile(
        self,
        payload: dict,
        default_uid: str,
        managed_student_count: int | None = None,
    ) -> StaffProfile:
        full_name = payload.get("name") or payload.get("full_name") or payload.get("displayName") or "Staff Member"
        role_val = payload.get("role") or UserRole.STAFF.value
        now = utcnow()
        created_at = payload.get("createdAt") or payload.get("created_at") or now
        updated_at = payload.get("updatedAt") or payload.get("updated_at") or now

        return StaffProfile.model_validate(
            {
                "uid": payload.get("uid") or payload.get("staffId") or default_uid,
                "staff_id": payload.get("staffId") or payload.get("uid") or default_uid,
                "email": payload.get("email", ""),
                "full_name": full_name,
                "role": normalize_role(role_val),
                "institution": payload.get("institution") or self.settings.institution_name,
                "department": payload.get("department"),
                "year": str(payload.get("year")) if payload.get("year") is not None else None,
                "section": payload.get("section"),
                "batch": payload.get("batch"),
                "is_active": payload.get("isActive", payload.get("is_active", True)),
                "managed_student_count": managed_student_count,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )

    def _staff_doc_to_profile(self, doc, managed_student_count: int | None = None) -> StaffProfile:
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

        payload = doc.to_dict()
        return self._staff_payload_to_profile(payload, doc.id, managed_student_count=managed_student_count)

    def _student_payload_to_profile(self, payload: dict, default_roll_number: str) -> StudentProfile:
        allowance = int(payload.get("leaveBalance", payload.get("leave_allowance", 0)))
        counters = payload.get("leaveCounters") or payload.get("leave_counters") or self._default_counters(allowance).model_dump()
        full_name = payload.get("name") or payload.get("full_name") or payload.get("displayName") or "Student"
        role_val = payload.get("role") or UserRole.STUDENT.value
        now = utcnow()

        return StudentProfile.model_validate(
            {
                "uid": payload.get("authUid") or payload.get("uid", ""),
                "email": payload.get("email", ""),
                "full_name": full_name,
                "role": normalize_role(role_val),
                "institution": payload.get("institution") or self.settings.institution_name,
                "department": payload.get("department", ""),
                "year": str(payload.get("year", "")),
                "roll_number": payload.get("rollNo") or payload.get("roll_number") or default_roll_number,
                "phone_number": payload.get("phoneNumber") or payload.get("phone_number"),
                "section": payload.get("section"),
                "staff_id": payload.get("staffId") or payload.get("staff_id", ""),
                "leave_allowance": allowance,
                "leave_counters": counters,
                "is_active": payload.get("isActive", payload.get("is_active", True)),
                "created_at": payload.get("createdAt") or payload.get("created_at") or now,
                "updated_at": payload.get("updatedAt") or payload.get("updated_at") or now,
            }
        )

    def _student_doc_to_profile(self, doc) -> StudentProfile:
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        payload = doc.to_dict()
        return self._student_payload_to_profile(payload, doc.id)

    def _legacy_doc_to_user(self, doc) -> UserProfile:
        payload = doc.to_dict() | {"uid": doc.id}
        allowance = int(payload.get("leave_allowance", 0))
        payload.setdefault("institution", self.settings.institution_name)
        payload.setdefault("staff_id", payload.get("uid"))
        payload.setdefault(
            "leave_counters",
            self._default_counters(allowance).model_dump(),
        )
        payload["role"] = normalize_role(payload.get("role")).value
        return UserProfile.model_validate(payload)

    def _as_user_profile(self, profile: StaffProfile | StudentProfile) -> UserProfile:
        payload = profile.model_dump()
        if "leave_counters" not in payload:
            payload["leave_counters"] = self._default_counters(0).model_dump()
        return UserProfile.model_validate(payload)

    def _staff_scope_query(self, search: str | None = None, institution: str | None = None):
        query = self.staff_collection.where(filter=FieldFilter("role", "==", UserRole.STAFF.value))
        if institution:
            query = query.where(filter=FieldFilter("institution", "==", institution))

        normalized_search = normalize_search_text(search)
        if normalized_search:
            query = query.where(filter=FieldFilter("searchTerms", "array_contains", normalized_search))

        return query

    def _student_scope_query(
        self,
        current_user: UserProfile,
        search: str | None = None,
        department: str | None = None,
        year: str | None = None,
        section: str | None = None,
        staff_id: str | None = None,
    ):
        query = self.students_collection
        if current_user.role == UserRole.STAFF:
            query = query.where(filter=FieldFilter("staffId", "==", current_user.staff_id))
        elif staff_id:
            query = query.where(filter=FieldFilter("staffId", "==", staff_id))

        if department:
            query = query.where(filter=FieldFilter("department", "==", department))
        if year:
            query = query.where(filter=FieldFilter("year", "==", year))
        if section:
            query = query.where(filter=FieldFilter("section", "==", section))

        normalized_search = normalize_search_text(search)
        if normalized_search:
            query = query.where(filter=FieldFilter("searchTerms", "array_contains", normalized_search))

        return query

    def get_user(self, uid: str, role_hint: str | UserRole | None = None) -> UserProfile:
        normalized_role_val = normalize_role(role_hint) if role_hint else None

        if normalized_role_val == UserRole.ADMIN or normalized_role_val is None:
            admin_doc = self.admins_collection.document(uid).get()
            if admin_doc.exists:
                return self._as_user_profile(self._staff_doc_to_profile(admin_doc))


        if normalized_role_val == UserRole.STAFF or normalized_role_val is None:
            staff_doc = self.staff_collection.document(uid).get()
            if staff_doc.exists:
                return self._as_user_profile(self._staff_doc_to_profile(staff_doc))

        if normalized_role_val == UserRole.STUDENT or normalized_role_val is None:
            student_docs = list(
                self.students_collection.where(filter=FieldFilter("authUid", "==", uid)).limit(1).stream()
            )
            if student_docs:
                return self._as_user_profile(self._student_doc_to_profile(student_docs[0]))

        legacy_doc = self.legacy_users_collection.document(uid).get()
        if legacy_doc.exists:
            return self._legacy_doc_to_user(legacy_doc)

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    def get_student_by_roll_number(self, roll_number: str) -> StudentProfile:
        return self._student_doc_to_profile(self.students_collection.document(roll_number).get())

    def list_staff(self, search: str | None = None, institution: str | None = None) -> list[StaffProfile]:
        profiles: list[StaffProfile] = []
        for doc in self._staff_scope_query(search=search, institution=institution).stream():
            managed_count = self._count_documents(
                self.students_collection.where(filter=FieldFilter("staffId", "==", doc.id))
            )
            profiles.append(self._staff_doc_to_profile(doc, managed_student_count=managed_count))
        profiles.sort(key=lambda x: x.full_name)
        return profiles

    def _build_staff_payload(self, uid: str, staff: StaffCreate, role: UserRole = UserRole.STAFF) -> dict:
        now = utcnow()
        institution = staff.institution or self.settings.institution_name
        return {
            "staffId": uid,
            "name": staff.full_name,
            "email": staff.email,
            "department": staff.department,
            "year": staff.year,
            "section": staff.section,
            "batch": staff.batch,
            "institution": institution,
            "role": role.value,
            "searchTerms": build_search_terms(staff.full_name, staff.email, staff.department, institution),
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }


    def create_staff(self, staff: StaffCreate) -> StaffCreateResponse:
        # User requested default password for all staff
        temporary_password = "Staff@123"
        user_record = None

        try:
            user_record = self.auth_client.create_user(
                email=staff.email,
                password=temporary_password,
                display_name=staff.full_name,
                email_verified=False,
            )
            self.auth_client.set_custom_user_claims(user_record.uid, {"role": UserRole.STAFF.value})
            payload = self._build_staff_payload(user_record.uid, staff)
            staff_ref = self.staff_collection.document(user_record.uid)

            @firestore.transactional
            def transaction_create_staff(transaction):
                if staff_ref.get(transaction=transaction).exists:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="A staff record already exists for this account.",
                    )
                transaction.set(staff_ref, payload)

            transaction_create_staff(self.db.transaction())
            return StaffCreateResponse(
                staff=self._staff_payload_to_profile(payload, user_record.uid, managed_student_count=0),
                temporary_password=temporary_password,
                password_setup_required=True,
            )
        except firebase_auth.EmailAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{staff.email}' already exists.",
            ) from exc
        except HTTPException:
            self._delete_auth_user_safely(getattr(user_record, "uid", None))
            raise
        except Exception as exc:
            self._delete_auth_user_safely(getattr(user_record, "uid", None))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to create the staff account.",
            ) from exc

    def deactivate_staff(self, staff_id: str) -> StaffProfile:
        staff_ref = self.staff_collection.document(staff_id)
        staff_doc = staff_ref.get()
        staff_profile = self._staff_doc_to_profile(
            staff_doc,
            managed_student_count=self._count_documents(
                self.students_collection.where(filter=FieldFilter("staffId", "==", staff_id))
            ),
        )

        if staff_profile.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Super admin accounts cannot be deactivated from the staff manager.",
            )

        now = utcnow()
        try:
            self.auth_client.update_user(staff_id, disabled=True)
        except firebase_auth.UserNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth user not found.") from exc

        staff_ref.set({"isActive": False, "updatedAt": now}, merge=True)
        return self._staff_doc_to_profile(
            staff_ref.get(),
            managed_student_count=self._count_documents(
                self.students_collection.where(filter=FieldFilter("staffId", "==", staff_id))
            ),
        )

    def delete_staff(self, staff_id: str) -> bool:
        staff_ref = self.staff_collection.document(staff_id)
        staff_doc = staff_ref.get()
        if not staff_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

        # 1. Delete from Firebase Auth
        self._delete_auth_user_safely(staff_id)

        # 2. Delete from Firestore
        staff_ref.delete()

        return True

    def list_students(
        self,
        current_user: UserProfile,
        search: str | None = None,
        department: str | None = None,
        year: str | None = None,
        section: str | None = None,
        staff_id: str | None = None,
    ) -> list[StudentProfile]:
        query = self._student_scope_query(
            current_user=current_user,
            search=search,
            department=department,
            year=year,
            section=section,
            staff_id=staff_id,
        )
        students = [self._student_doc_to_profile(doc) for doc in query.stream()]
        students.sort(key=lambda x: x.full_name)
        return students

    def _build_student_payload(self, uid: str, student: StudentCreate, current_user: UserProfile) -> dict:
        allowance = student.leave_allowance or self.settings.default_student_leave_allowance
        now = utcnow()
        counters = self._default_counters(allowance)
        institution = student.institution or current_user.institution or self.settings.institution_name
        section = student.section or current_user.section

        return {
            "authUid": uid,
            "rollNo": student.roll_number,
            "name": student.full_name,
            "email": student.email,
            "department": student.department,
            "year": student.year,
            "section": section,
            "institution": institution,
            "staffId": current_user.staff_id or current_user.uid,
            "leaveBalance": allowance,
            "leaveCounters": counters.model_dump(),
            "phoneNumber": student.phone_number,
            "role": UserRole.STUDENT.value,
            "searchTerms": build_search_terms(
                student.full_name,
                student.email,
                student.roll_number,
                student.department,
                student.year,
                section,
                institution,
            ),
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

    def create_student(self, student: StudentCreate, current_user: UserProfile) -> StudentCreateResponse:
        temporary_password = "Student@123"
        user_record = None

        try:
            user_record = self.auth_client.create_user(
                email=student.email,
                password=temporary_password,
                display_name=student.full_name,
                email_verified=False,
            )
            self.auth_client.set_custom_user_claims(user_record.uid, {"role": UserRole.STUDENT.value})
            payload = self._build_student_payload(user_record.uid, student, current_user)
            student_ref = self.students_collection.document(student.roll_number)

            @firestore.transactional
            def transaction_create_student(transaction):
                if student_ref.get(transaction=transaction).exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Roll number '{student.roll_number}' already exists.",
                    )
                transaction.set(student_ref, payload)

            transaction_create_student(self.db.transaction())
            
            # Update staff managed student count
            staff_id = current_user.staff_id or current_user.uid
            staff_ref = self.staff_collection.document(staff_id)
            if staff_ref.get().exists:
                staff_ref.update({"managed_student_count": firestore.Increment(1)})
                
            return StudentCreateResponse(
                student=self._student_payload_to_profile(payload, student.roll_number),
                temporary_password=temporary_password,
                password_setup_required=True,
            )
        except firebase_auth.EmailAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{student.email}' already exists.",
            ) from exc
        except HTTPException:
            self._delete_auth_user_safely(getattr(user_record, "uid", None))
            raise
        except Exception as exc:
            self._delete_auth_user_safely(getattr(user_record, "uid", None))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to create the student account.",
            ) from exc

    def import_students(self, rows: Iterable[dict], current_user: UserProfile) -> StudentImportSummary:
        results: list[StudentImportRowResult] = []

        for row in rows:
            row_number = int(row["row_number"])
            email = row.get("email", "")
            roll_number = row.get("roll_number", "")

            try:
                student = StudentCreate(
                    email=email,
                    full_name=row.get("full_name", ""),
                    roll_number=roll_number,
                    department=row.get("department", ""),
                    year=row.get("year", ""),
                    phone_number=row.get("phone_number"),
                    section=row.get("section"),
                    institution=row.get("institution"),
                    leave_allowance=int(row["leave_allowance"]) if row.get("leave_allowance") else None,
                )
                response = self.create_student(student, current_user)
                results.append(
                    StudentImportRowResult(
                        row_number=row_number,
                        email=student.email,
                        roll_number=student.roll_number,
                        status="created",
                        message="Student account created successfully.",
                        temporary_password=response.temporary_password,
                        password_setup_required=response.password_setup_required,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                message = str(getattr(exc, "detail", str(exc)))
                results.append(
                    StudentImportRowResult(
                        row_number=row_number,
                        email=email,
                        roll_number=roll_number,
                        status="failed",
                        message=message,
                        password_setup_required=False,
                    )
                )

        created_num = sum(1 for result in results if result.status == "created")
        return StudentImportSummary(
            processed_rows=len(results),
            created_count=created_num,
            failed_count=len(results) - created_num,
            results=results,
        )

    def delete_student(self, roll_number: str, current_user: UserProfile) -> bool:
        student_ref = self.students_collection.document(roll_number)
        student_doc = student_ref.get()
        if not student_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        student_data = student_doc.to_dict()
        uid = student_data.get("authUid")
        staff_id = student_data.get("staffId")

        # BUG-002 Fix: Only owner or Super Admin can delete
        if current_user.role != UserRole.ADMIN and staff_id != (current_user.staff_id or current_user.uid):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this student.",
            )

        # 1. Delete from Firebase Auth
        self._delete_auth_user_safely(uid)

        # 2. Delete from Firestore
        student_ref.delete()

        # 3. Update staff managed student count if applicable
        if staff_id:
            staff_ref = self.staff_collection.document(staff_id)
            if staff_ref.get().exists:
                staff_ref.update({"managed_student_count": firestore.Increment(-1)})

        return True

    def update_staff(self, staff_id: str, update_data: StaffUpdate) -> StaffProfile:
        staff_ref = self.staff_collection.document(staff_id)
        staff_doc = staff_ref.get()
        if not staff_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

        payload = update_data.model_dump(exclude_unset=True)
        if not payload:
            return self._staff_doc_to_profile(staff_doc)

        now = utcnow()
        updates = {"updatedAt": now}

        if "full_name" in payload:
            updates["name"] = payload["full_name"]
            # Also update Auth UI name
            try:
                self.auth_client.update_user(staff_id, display_name=payload["full_name"])
            except firebase_auth.UserNotFoundError:
                pass

        if "department" in payload:
            updates["department"] = payload["department"]
        if "year" in payload:
            updates["year"] = payload["year"]
        if "section" in payload:
            updates["section"] = payload["section"]
        if "institution" in payload:
            updates["institution"] = payload["institution"]
        if "batch" in payload:
            updates["batch"] = payload["batch"]

        # Recalculate search terms if name or institution changed
        current_data = staff_doc.to_dict()
        name = payload.get("full_name", current_data.get("name", ""))
        email = current_data.get("email", "")
        department = payload.get("department", current_data.get("department", ""))
        batch = payload.get("batch", current_data.get("batch", ""))
        institution = payload.get("institution", current_data.get("institution", ""))
        
        updates["searchTerms"] = build_search_terms(name, email, department, institution)

        staff_ref.update(updates)
        return self._staff_doc_to_profile(staff_ref.get())

    def update_student(self, roll_number: str, update_data: StudentUpdate, current_user: UserProfile) -> StudentProfile:
        student_ref = self.students_collection.document(roll_number)
        student_doc = student_ref.get()
        if not student_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        current_data = student_doc.to_dict()
        staff_id = current_data.get("staffId")

        # Ownership check
        if current_user.role != UserRole.ADMIN and staff_id != (current_user.staff_id or current_user.uid):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this student.",
            )

        payload = update_data.model_dump(exclude_unset=True)
        if not payload:
            return self._student_doc_to_profile(student_doc)
        now = utcnow()
        updates = {"updatedAt": now}

        if "full_name" in payload:
            updates["name"] = payload["full_name"]
            # Also update Auth UI name
            uid = current_data.get("authUid")
            if uid:
                try:
                    self.auth_client.update_user(uid, display_name=payload["full_name"])
                except firebase_auth.UserNotFoundError:
                    pass

        if "department" in payload:
            updates["department"] = payload["department"]
        if "year" in payload:
            updates["year"] = payload["year"]
        if "section" in payload:
            updates["section"] = payload["section"]
        if "phone_number" in payload:
            updates["phoneNumber"] = payload["phone_number"]
            
        if "leave_allowance" in payload:
            updates["leaveBalance"] = payload["leave_allowance"]
            # Also update the counters to reflect the new basis
            # We must be careful not to override existing days used
            # Just calculating the remaining_days based on pending + approved
            counters = current_data.get("leaveCounters", {})
            approved = counters.get("approved_days", 0)
            pending = counters.get("pending_days", 0)
            remaining = max(0, payload["leave_allowance"] - approved - pending)
            
            updates["leaveCounters"] = {
                "total_days": payload["leave_allowance"],
                "approved_days": approved,
                "pending_days": pending,
                "remaining_days": remaining
            }

        # Recalculate search terms
        name = payload.get("full_name", current_data.get("name", ""))
        email = current_data.get("email", "")
        department = payload.get("department", current_data.get("department", ""))
        year = payload.get("year", current_data.get("year", ""))
        section = payload.get("section", current_data.get("section", ""))
        institution = current_data.get("institution", "")
        
        updates["searchTerms"] = build_search_terms(name, email, roll_number, department, year, section, institution)

        student_ref.update(updates)
        return self._student_doc_to_profile(student_ref.get())
