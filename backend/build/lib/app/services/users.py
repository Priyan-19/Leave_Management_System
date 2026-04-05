import secrets
import string
from collections import Counter
from collections.abc import Iterable

from fastapi import HTTPException, status
from firebase_admin import auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.config import get_settings
from app.core.firebase import get_auth_client
from app.schemas import (
    LeaveCounters,
    StaffCreate,
    StaffCreateResponse,
    StaffProfile,
    StudentCreate,
    StudentCreateResponse,
    StudentImportRowResult,
    StudentImportSummary,
    StudentProfile,
    UserProfile,
    UserRole,
    normalize_role,
)
from app.utils.dates import utcnow


class UserService:
    def __init__(self, db):
        self.db = db
        self.settings = get_settings()
        self.auth_client = get_auth_client()

    @property
    def staff_collection(self):
        return self.db.collection("staff")

    @property
    def admins_collection(self):
        return self.db.collection("admins")

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

    def _staff_doc_to_profile(self, doc, managed_student_count: int | None = None) -> StaffProfile:
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

        payload = doc.to_dict()
        return StaffProfile.model_validate(
            {
                "uid": payload.get("staffId", doc.id),
                "staff_id": payload.get("staffId", doc.id),
                "email": payload["email"],
                "full_name": payload.get("name") or payload.get("full_name", ""),
                "role": payload.get("role", UserRole.STAFF.value),
                "institution": payload.get("institution") or self.settings.institution_name,
                "department": payload.get("department"),
                "year": str(payload.get("year")) if payload.get("year") is not None else None,
                "section": payload.get("section"),
                "is_active": payload.get("isActive", True),
                "managed_student_count": managed_student_count,
                "created_at": payload.get("createdAt") or utcnow(),
                "updated_at": payload.get("updatedAt") or utcnow(),
            }
        )

    def _student_doc_to_profile(self, doc) -> StudentProfile:
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        payload = doc.to_dict()
        allowance = int(payload.get("leaveBalance", 0))
        counters = payload.get("leaveCounters") or self._default_counters(allowance).model_dump()
        return StudentProfile.model_validate(
            {
                "uid": payload.get("authUid", ""),
                "email": payload["email"],
                "full_name": payload.get("name") or payload.get("full_name", ""),
                "role": payload.get("role", UserRole.STUDENT.value),
                "institution": payload.get("institution") or self.settings.institution_name,
                "department": payload.get("department", ""),
                "year": str(payload.get("year", "")),
                "roll_number": payload.get("rollNo") or doc.id,
                "phone_number": payload.get("phoneNumber"),
                "section": payload.get("section"),
                "staff_id": payload.get("staffId", ""),
                "leave_allowance": allowance,
                "leave_counters": counters,
                "is_active": payload.get("isActive", True),
                "created_at": payload.get("createdAt") or utcnow(),
                "updated_at": payload.get("updatedAt") or utcnow(),
            }
        )

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

    def get_user(self, uid: str, role_hint: str | UserRole | None = None) -> UserProfile:
        normalized_role = normalize_role(role_hint) if role_hint else None

        if normalized_role == UserRole.SUPER_ADMIN or normalized_role is None:
            admin_doc = self.admins_collection.document(uid).get()
            if admin_doc.exists:
                return self._as_user_profile(self._staff_doc_to_profile(admin_doc))

        if normalized_role == UserRole.STAFF or normalized_role is None:
            staff_doc = self.staff_collection.document(uid).get()
            if staff_doc.exists:
                return self._as_user_profile(self._staff_doc_to_profile(staff_doc))

        if normalized_role == UserRole.STUDENT or normalized_role is None:
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
        staff_profiles = []
        for doc in self.staff_collection.stream():
            payload = doc.to_dict()
            managed_count = payload.get("managed_student_count", 0)
            profile = self._staff_doc_to_profile(doc, managed_student_count=managed_count)
            if profile.role != UserRole.STAFF:
                continue
            staff_profiles.append(profile)

        if isinstance(search, str):
            needle = search.lower().strip()
            staff_profiles = [
                profile
                for profile in staff_profiles
                if needle in profile.full_name.lower() or needle in profile.email.lower()
            ]
        if institution:
            staff_profiles = [profile for profile in staff_profiles if profile.institution == institution]

        return sorted(staff_profiles, key=lambda profile: profile.full_name.lower())

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
            "institution": institution,
            "role": role.value,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

    def create_staff(self, staff: StaffCreate) -> StaffCreateResponse:
        temporary_password = "staff@123"

        try:
            user_record = self.auth_client.create_user(
                email=staff.email,
                password=temporary_password,
                display_name=staff.full_name,
                email_verified=False,
            )
            self.auth_client.set_custom_user_claims(user_record.uid, {"role": UserRole.STAFF.value})
            payload = self._build_staff_payload(user_record.uid, staff)
            self.staff_collection.document(user_record.uid).set(payload)
            return StaffCreateResponse(
                staff=self._staff_doc_to_profile(self.staff_collection.document(user_record.uid).get()),
                temporary_password=temporary_password,
            )
        except firebase_auth.EmailAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{staff.email}' already exists.",
            ) from exc
        except Exception as exc:
            if "user_record" in locals():
                self.auth_client.delete_user(user_record.uid)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to create the staff account.",
            ) from exc

    def deactivate_staff(self, staff_id: str) -> StaffProfile:
        staff_ref = self.staff_collection.document(staff_id)
        staff_doc = staff_ref.get()
        staff_profile = self._staff_doc_to_profile(staff_doc)

        if staff_profile.role == UserRole.SUPER_ADMIN:
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
        return self._staff_doc_to_profile(staff_ref.get())

    def list_students(
        self,
        current_user: UserProfile,
        search: str | None = None,
        department: str | None = None,
        year: str | None = None,
        section: str | None = None,
        staff_id: str | None = None,
    ) -> list[StudentProfile]:
        query = self.students_collection
        if current_user.role == UserRole.STAFF:
            query = query.where(filter=FieldFilter("staffId", "==", current_user.staff_id))
        elif staff_id:
            query = query.where(filter=FieldFilter("staffId", "==", staff_id))

        students = [self._student_doc_to_profile(doc) for doc in query.stream()]

        if search:
            needle = search.lower().strip()
            students = [
                student
                for student in students
                if needle in student.full_name.lower()
                or needle in student.email.lower()
                or needle in student.roll_number.lower()
            ]
        if department:
            students = [student for student in students if student.department == department]
        if year:
            students = [student for student in students if student.year == year]
        if section:
            students = [student for student in students if student.section == section]

        return sorted(students, key=lambda student: student.full_name.lower())

    def _ensure_roll_number_unique(self, roll_number: str) -> None:
        if self.students_collection.document(roll_number).get().exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roll number '{roll_number}' already exists.",
            )

    def _build_student_payload(self, uid: str, student: StudentCreate, current_user: UserProfile) -> dict:
        allowance = student.leave_allowance or self.settings.default_student_leave_allowance
        now = utcnow()
        counters = self._default_counters(allowance)

        return {
            "authUid": uid,
            "rollNo": student.roll_number,
            "name": student.full_name,
            "email": student.email,
            "department": student.department,
            "year": student.year,
            "section": student.section or current_user.section,
            "institution": student.institution or current_user.institution or self.settings.institution_name,
            "staffId": current_user.staff_id or current_user.uid,
            "leaveBalance": allowance,
            "leaveCounters": counters.model_dump(),
            "phoneNumber": student.phone_number,
            "role": UserRole.STUDENT.value,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

    def create_student(self, student: StudentCreate, current_user: UserProfile) -> StudentCreateResponse:
        self._ensure_roll_number_unique(student.roll_number)
        temporary_password = self._generate_temporary_password()

        try:
            from google.cloud import firestore
            user_record = self.auth_client.create_user(
                email=student.email,
                password=temporary_password,
                display_name=student.full_name,
                email_verified=False,
            )
            self.auth_client.set_custom_user_claims(user_record.uid, {"role": UserRole.STUDENT.value})
            payload = self._build_student_payload(user_record.uid, student, current_user)
            self.students_collection.document(student.roll_number).set(payload)

            staff_id = payload.get("staffId")
            if staff_id:
                self.staff_collection.document(staff_id).set(
                    {"managed_student_count": firestore.Increment(1)}, merge=True
                )

            return StudentCreateResponse(
                student=self._student_doc_to_profile(self.students_collection.document(student.roll_number).get()),
                temporary_password=temporary_password,
            )
        except firebase_auth.EmailAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{student.email}' already exists.",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            if "user_record" in locals():
                self.auth_client.delete_user(user_record.uid)
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
                    )
                )

        created_num = sum(1 for r in results if r.status == "created")
        return StudentImportSummary(
            processed_rows=len(results),
            created_count=created_num,
            failed_count=len(results) - created_num,
            results=results,
        )
