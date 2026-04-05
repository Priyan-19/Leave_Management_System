# Leave Portal

*Last Updated: 5th April 2026*
**Project Status: ✅ Completed & Verified**

Leave Portal is a full-stack leave management SaaS for schools and colleges, built with FastAPI, React, Firebase, and Capacitor. It provides distinct workspaces for Super-Admins, Staff, and Students.

> [!IMPORTANT]
> For a clean setup experience, please refer to the [Manual Run Guide](./run.md).

## What is included

- **FastAPI Backend**: Robust API with Firebase Admin SDK, rate limiting, and structured logging.
- **React Frontend**: Modern, professional UI with Tailwind CSS and TanStack Query.
- **Firebase Auth & Firestore**: Secure multi-tenant database model with role-based routing.
- **Staff Management Dashboard**: Comprehensive tools for Super-Admins to create, view, deactivate, and delete staff accounts.
- **Secure Access Control**: Admin login option removed from the standard login page to prevent unauthorized access.
- **Staff-Scoped Student Onboarding**: Supports manual forms and Excel/CSV bulk uploads.
- **Leave Workflows**: Balance validation, overlap checks, approval workflows, and status tracking.
- **Reporting**: Exportable weekly and monthly reports in Excel and PDF formats.
- **Mobile Built-in**: Integrated Capacitor Android project in `frontend/android`.

## Project Structure

- `backend/`: FastAPI API, Firebase services, tests, and super-admin bootstrap scripts.
- `frontend/`: React application, Tailwind styling, Capacitor wrapper, and static templates.
- `docs/`: Extra implementation notes and user guides.
- `run.md`: Detailed manual setup and execution guide.

## Role Model

- **Super Admin**: Manages staff accounts globally, views institution analytics, and oversees the system.
- **Staff**: Manages assigned students within their specific scope (department, year, batch, section).
- **Student**: Applies for leaves, checks balance, and monitors approval status.

## Firestore Collections

1.  **`admins`**: Stores Super-Admin profile data (UID, email, name).
2.  **`staff`**: Stores basic info, department, year, section, batch, and institution metadata.
3.  **`students`**: Stores complete student profiles, roll numbers, assigned `staffId`, and leave counters.
4.  **`leave_requests`**: Tracks all leave submissions including dates, reasons, and approval status.

## Getting Started

### 1. Configuration
- Copy `.env.example` to `.env` in both `frontend` and `backend`.
- Fill in your Firebase configuration and point to your Service Account JSON in the backend `.env`.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -e .[dev]
python -m uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Bootstrap Super Admin
Admin accounts must be created through the CLI for security:
```bash
python backend/scripts/bootstrap_admin.py --email admin@campus.edu --password ChangeMe123! --name "Admin" --role super_admin
```

## Import Templates
The app supports bulk student upload using templates found in:
- `frontend/public/templates/students_template.csv`
- `frontend/public/templates/students_template.xlsx`

Required columns: `full_name`, `email`, `roll_number`, `department`, `year`.

## Mobile Build
Building the debug APK requires the Android SDK.
```bash
cd frontend
npm run build:mobile
cd android
.\gradlew.bat assembleDebug
```

---
*Built with React, FastAPI, and Firebase.*
