# Leave Portal - User Guide

*Last Updated: 5th April 2026*

Welcome to the **Leave Portal**, a multi-tenant leave management platform built for educational institutions. The system now separates responsibilities clearly:

- **Super Admin** manages staff accounts and institution-wide oversight
- **Staff** manages only their own students, leave requests, and reports
- **Student** applies for leave and tracks status and balance

---

> [!IMPORTANT]
> For developers setting up the system for the first time, please see the [Manual Run Guide](../run.md).

## 1. Accessing the Portal

Open your institution's Leave Portal URL, such as `http://localhost:5173`.

You will see three sign-in options:

- **Student Login**
- **Staff Login**
- **Super Admin Login**

Use your institutional email address and password to sign in. After authentication, the system automatically redirects you to the correct workspace based on your role.

---

## 2. Student Guide

The Student Portal gives each student a personal view of leave balance, requests, and approval history.

### Student Dashboard

After login, students land on the **Dashboard**.

- **Total Leaves Taken** shows approved leave days already used
- **Remaining Balance** shows available leave days
- **Pending Requests** shows requests awaiting staff review
- **Recent Activity** lists the latest leave requests and their statuses

### Applying for Leave

To request leave:

1. Open **Apply Leave**
2. Choose **Leave Type**
3. Select **Start Date** and **End Date**
4. Enter a clear **Reason**
5. Submit the request

The system checks:

- overlapping date ranges
- leave balance limits
- valid start/end dates

### Leave History and Balance

- **Leave History** shows all requests with filters for status and date range
- **Leave Balance** shows allocation, approved days, pending days, and remaining days

---

## 3. Staff Guide

The Staff Portal is limited to the students assigned to that staff account.

### Staff Dashboard

The **Dashboard** shows only data for that staff member's students:

- total managed students
- total leave requests
- approved, rejected, and pending counts
- charts for leave distribution and student-wise activity

### Managing Students

Open **Students** to manage onboarding inside your assigned scope.

You can:

- add a student manually
- upload a CSV file
- upload an Excel (`.xlsx`) file
- search and filter only your own students

When a student is created:

- a Firebase Auth user is generated
- the student is linked automatically to your `staffId`
- a temporary password is shown

### Reviewing Leave Requests

Open **Leave Requests** to review leave requests from your students only.

You can:

- filter by status
- filter by date range
- search by student name or roll number
- approve a request
- reject a request with an optional note

### Reports

Open **Reports** to generate leave analytics for your own students.

You can:

- view weekly or monthly summaries
- set custom date ranges
- review student-wise totals
- download reports as **Excel**
- download reports as **PDF**

---

## 4. Super Admin Guide

The Super Admin Portal controls staff accounts and institution-wide visibility.

### Super Admin Dashboard

The **Dashboard** provides institution-wide summaries:

- total staff
- total students
- total leave requests
- approved, rejected, and pending counts
- charts for approval mix and student activity

### Staff Management

Open **Staff** to manage staff accounts.

You can:

- create a new staff member
- assign department, year, section, and institution
- view how many students each staff member manages
- deactivate staff access when needed

Each new staff account receives:

- Firebase Authentication credentials
- a Firestore staff profile
- a temporary password displayed in the UI

### Reports

Super Admin reports are institution-wide and can be exported as Excel or PDF.

These reports help with:

- overall leave monitoring
- department-level oversight
- administrative review

---

## 5. Access Control Rules

The system enforces strict tenant boundaries:

- **Staff** can access only students where `student.staffId` matches their account
- **Staff** can access only leave requests where `leave.staffId` matches their account
- **Student** can access only their own leave records and balance
- **Super Admin** can manage staff and view institution-wide analytics

---

## 6. Troubleshooting

- **Login fails**: confirm the account exists in Firebase Authentication and the Firestore profile is active
- **Staff cannot see students**: verify those student records were created under the correct `staffId`
- **Bulk upload fails**: confirm the file contains the required columns listed on the upload page
- **Balance looks incorrect**: review whether a request is still pending or already approved
- **Super Admin login issues**: ensure the profile exists in the `admins` collection.
- **Staff management issues**: confirm staff records exist in the `staff` collection with active status.

---

Built for modern campuses: secure, responsive, and role-aware.
