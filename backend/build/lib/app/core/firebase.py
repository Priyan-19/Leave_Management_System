import json
from pathlib import Path

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin import firestore as firebase_firestore
from google.cloud.firestore_v1 import Client

from app.core.config import get_settings


def _load_credentials() -> credentials.Certificate:
    settings = get_settings()

    if settings.firebase_service_account_json:
        return credentials.Certificate(json.loads(settings.firebase_service_account_json))

    if settings.firebase_service_account_path:
        service_account_path = Path(settings.firebase_service_account_path).expanduser()
        return credentials.Certificate(str(service_account_path))

    raise RuntimeError(
        "Firebase credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON."
    )


def get_firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    settings = get_settings()
    options: dict[str, str] = {}
    if settings.firebase_project_id:
        options["projectId"] = settings.firebase_project_id
    if settings.firebase_storage_bucket:
        options["storageBucket"] = settings.firebase_storage_bucket

    return firebase_admin.initialize_app(_load_credentials(), options=options)


def get_firestore_client() -> Client:
    get_firebase_app()
    return firebase_firestore.client()


def get_auth_client() -> firebase_auth:
    get_firebase_app()
    return firebase_auth
