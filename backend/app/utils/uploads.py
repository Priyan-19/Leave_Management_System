import re
from io import BytesIO
from pathlib import Path

import pandas as pd
from fastapi import HTTPException, status

FIELD_ALIASES = {
    "full_name": {"full_name", "name", "student_name", "student"},
    "email": {"email", "email_address", "mail"},
    "roll_number": {"roll_number", "roll_no", "roll", "rollnum"},
    "department": {"department", "dept", "programme", "program"},
    "year": {"year", "class", "semester", "academic_year"},
    "phone_number": {"phone", "phone_number", "mobile", "mobile_number"},
    "section": {"section", "group"},
    "institution": {"institution", "college", "school", "campus"},
    "leave_allowance": {"leave_allowance", "leave_balance", "balance", "allowance"},
}


def _normalize_column_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def parse_student_upload(filename: str, content: bytes) -> list[dict]:
    extension = Path(filename).suffix.lower()
    stream = BytesIO(content)

    if extension == ".csv":
        frame = pd.read_csv(stream, dtype=str)
    elif extension == ".xlsx":
        frame = pd.read_excel(stream, dtype=str)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a CSV or XLSX file.",
        )

    if frame.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    frame = frame.fillna("")
    normalized_columns = {_normalize_column_name(str(column)): column for column in frame.columns}

    missing_fields = []
    resolved_columns: dict[str, str] = {}
    for field in ["full_name", "email", "roll_number", "department", "year"]:
        for alias in FIELD_ALIASES[field]:
            if alias in normalized_columns:
                resolved_columns[field] = normalized_columns[alias]
                break
        if field not in resolved_columns:
            missing_fields.append(field)

    for field in ["phone_number", "section", "institution", "leave_allowance"]:
        for alias in FIELD_ALIASES[field]:
            if alias in normalized_columns:
                resolved_columns[field] = normalized_columns[alias]
                break

    if missing_fields:
        missing = ", ".join(missing_fields)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {missing}.",
        )

    rows: list[dict] = []
    for index, row in frame.iterrows():
        rows.append(
            {
                "row_number": index + 2,
                "full_name": str(row[resolved_columns["full_name"]]).strip(),
                "email": str(row[resolved_columns["email"]]).strip(),
                "roll_number": str(row[resolved_columns["roll_number"]]).strip(),
                "department": str(row[resolved_columns["department"]]).strip(),
                "year": str(row[resolved_columns["year"]]).strip(),
                "phone_number": str(row[resolved_columns["phone_number"]]).strip()
                if "phone_number" in resolved_columns
                else None,
                "section": str(row[resolved_columns["section"]]).strip() if "section" in resolved_columns else None,
                "institution": str(row[resolved_columns["institution"]]).strip()
                if "institution" in resolved_columns
                else None,
                "leave_allowance": str(row[resolved_columns["leave_allowance"]]).strip()
                if "leave_allowance" in resolved_columns
                else None,
            }
        )

    return rows
