import argparse
import os
import sys

# Add the backend root to the search path for out-of-module execution
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from firebase_admin import auth as firebase_auth
from app.core.firebase import get_auth_client, get_firestore_client

def parse_args():
    parser = argparse.ArgumentParser(description="Delete a user from Firebase Auth and Firestore.")
    parser.add_argument("--email", required=True, help="Email of the user to delete.")
    return parser.parse_args()

def main():
    args = parse_args()
    auth_client = get_auth_client()
    firestore_client = get_firestore_client()

    try:
        user = auth_client.get_user_by_email(args.email)
        uid = user.uid

        # 1. Delete from Firestore (check ALL collections)
        for collection in ["admins", "staff", "students"]:
            firestore_client.collection(collection).document(uid).delete()
        
        # Also check student roll number mapping if roll number is different from UID
        # (In our system, students are keyed by roll number, but staff/admins by UID)
        # We search by authUid for students
        student_docs = firestore_client.collection("students").where("authUid", "==", uid).limit(1).get()
        for doc in student_docs:
            doc.reference.delete()
        
        # 2. Delete from Firebase Auth
        auth_client.delete_user(uid)
        
        print(f"Successfully deleted user with email {args.email} (UID: {uid}) from both Auth and Firestore.")
    except firebase_auth.UserNotFoundError:
        print(f"User with email {args.email} not found in Firebase Authentication.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
