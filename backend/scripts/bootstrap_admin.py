import argparse
import os
import sys

# Add the backend root to the search path for out-of-module execution
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from firebase_admin import auth as firebase_auth

from app.core.config import get_settings
from app.core.firebase import get_auth_client, get_firestore_client
from app.schemas import UserRole, normalize_role
from app.utils.dates import utcnow
from app.utils.search import build_search_terms


def parse_args():
    parser = argparse.ArgumentParser(
        description="Create or update a super admin or staff user in Firebase Auth and Firestore."
    )
    parser.add_argument("--email", required=True, help="Login email for the account.")
    parser.add_argument("--password", required=True, help="Initial password for the account.")
    parser.add_argument("--name", required=True, help="Display name for the account.")
    parser.add_argument(
        "--role",
        choices=[UserRole.ADMIN.value, UserRole.STAFF.value, "admin"],
        default=UserRole.ADMIN.value,
        help="Role to assign to the user. Legacy 'admin' is mapped to 'admin'.",
    )
    parser.add_argument("--department", default=None, help="Department assigned to the user.")
    parser.add_argument("--year", default=None, help="Academic year assigned to the user.")
    parser.add_argument("--section", default=None, help="Section assigned to the user.")
    parser.add_argument("--institution", default=None, help="Institution name for the account.")
    return parser.parse_args()


def main():
    args = parse_args()
    settings = get_settings()
    role = normalize_role(args.role)
    auth_client = get_auth_client()
    firestore_client = get_firestore_client()
    now = utcnow()

    try:
        user = auth_client.get_user_by_email(args.email)
        user = auth_client.update_user(user.uid, password=args.password, display_name=args.name, disabled=False)
        print(f"Updated existing auth user: {user.uid}")
    except firebase_auth.UserNotFoundError:
        user = auth_client.create_user(email=args.email, password=args.password, display_name=args.name, email_verified=True)
        print(f"Created new auth user: {user.uid}")

    auth_client.set_custom_user_claims(user.uid, {"role": role.value})

    # Route to correct collection based on role
    collection_name = "admins" if role == UserRole.ADMIN else "staff"
    other_collection = "staff" if role == UserRole.ADMIN else "admins"
    
    # Clean up other collection if user is being moved
    firestore_client.collection(other_collection).document(user.uid).delete()
    
    user_ref = firestore_client.collection(collection_name).document(user.uid)
    existing = user_ref.get()
    created_at = existing.to_dict().get("createdAt", now) if existing.exists else now

    payload = {
        "staffId": user.uid,
        "name": args.name,
        "email": args.email,
        "department": args.department,
        "year": args.year,
        "section": args.section,
        "institution": args.institution or settings.institution_name,
        "role": role.value,
        "searchTerms": build_search_terms(
            args.name, args.email, args.department, args.institution or settings.institution_name
        ),
        "isActive": True,
        "createdAt": created_at,
        "updatedAt": now,
    }
    user_ref.set(payload, merge=True)

    print(f"Provisioned {role.value} user in Firestore and Firebase Auth: {args.email}")


if __name__ == "__main__":
    main()
