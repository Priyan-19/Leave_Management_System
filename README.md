<div align="center">

# 🌿 Leave Management System (LMS)
### Enterprise-Grade Leave & Workflow Management Platform 🚀


[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**LMS** is a high-performance, full-stack leave management platform engineered for educational institutions and enterprise environments. It delivers streamlined workflows, real-time processing, and role-based control within a modern, responsive interface.

</div>

---

## 📖 Project Overview

The **Leave Management System (LMS)** simplifies and automates the entire leave lifecycle—from application to approval and reporting.

### Core Value Proposition
- **🔐 Role-Based Control**: Tailored experiences for Students, Staff, and Admins
- **⚡ Real-Time Processing**: Instant updates using modern async architecture
- **📊 Insightful Dashboards**: Visual analytics for decision-making
- **📄 Enterprise Reporting**: Export-ready PDF and Excel reports
- **📱 Cross-Platform Ready**: Web + Android via Capacitor

---

## 🎨 Design Philosophy

- **Modern Aesthetics**: Built with Tailwind CSS 4 and Glassmorphism
- **Dynamic Theming**:
  - Admin → Sky Blue
  - Staff → Amber
  - Students → Lemon Yellow
- **Responsive Layouts**: Optimized for desktop and mobile
- **Micro-Animations**: Smooth transitions powered by modern CSS and React Query

---

## 🏗️ System Architecture

LMS follows a scalable **decoupled full-stack architecture**:

### ⚛️ Frontend: React 19 + Vite
- Component-driven UI architecture
- TanStack Query for server-state management
- React Router 7 for navigation
- TailwindCSS design system
- Recharts for analytics dashboards

### 🐍 Backend: FastAPI Engine
- High-performance async API layer
- Modular service-based architecture
- Firebase Admin SDK for authentication
- Rate limiting with SlowAPI

### 🔥 Data Layer: Firestore
- NoSQL cloud database
- Real-time updates
- Secure role-based access rules

---

## 🚀 Key Features

### 🔐 Authentication & Access
- Secure login system with role-based routing
- Restricted signup with admin-controlled onboarding

### 📝 Leave Lifecycle Management
- Apply, edit, withdraw leave requests
- Approve or reject with real-time updates
- Status tracking across all roles

### 📊 Analytics & Dashboards
- Visual summaries of:
  - Leave balances
  - Pending approvals
  - Usage trends
- Interactive charts powered by Recharts

### 📂 User Management
- Dedicated modules for:
  - Students
  - Staff
  - Super Admin controls

### 📄 Reporting Engine
- Export reports as:
  - **PDF (ReportLab)**
  - **Excel (Pandas + Openpyxl)**

### 🛡️ Security Layer
- API rate limiting
- Firebase Admin authentication
- Granular Firestore rules

### 📱 Mobile Support
- Android build via Capacitor
- Responsive UI across devices

---

## 📂 Project Structure

```text
├── .github/
│   └── workflows/
│       └── ci.yml
├── .vscode/
│   └── settings.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── core/
│   │   ├── dependencies/
│   │   ├── services/
│   │   └── utils/
│   ├── scripts/
│   ├── requirements.txt
│   ├── Procfile
│   └── firestore.indexes.json
├── docs/
│   └── User_Guide.md
├── frontend/
│   ├── public/
│   │   └── templates/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── ci-validate.ps1
├── README.md
└── run.md
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Firebase Project (Admin SDK + Web Config)

---

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure .env with Firebase credentials
python -m uvicorn app.main:app --reload
```

---

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure .env with Firebase Web Config
npm run dev
```

---

### 4. System Initialization

Create the first Super Admin:

```bash
cd backend
python scripts/bootstrap_admin.py \
  --email admin@example.com \
  --password YourSecurePassword \
  --name "Super Admin" \
  --role super_admin
```

---

## 📱 Mobile Build

```bash
cd frontend
npm run build
npx cap sync
```

Then:
- Open `/android` in Android Studio  
- OR run:
```bash
./gradlew assembleDebug
```

---

## 🔒 Security & Reliability

- Role-based access enforcement
- Firebase Admin authentication
- Rate-limited APIs
- Secure Firestore rules
- Controlled onboarding (no public signup)

---

## 📦 Tech Stack Summary

### Frontend
- React 19
- Vite 8
- TailwindCSS 4
- TanStack Query v5
- React Router 7
- Recharts
- React Hook Form + Zod
- Capacitor

### Backend
- FastAPI
- Firebase Admin SDK
- Firestore
- Pandas + Openpyxl
- ReportLab
- SlowAPI

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <p>Built with 🌿 for Smart Workflow Management</p>
  <p>Developed by <strong>Priyan-19</strong></p>
  <p>© 2026 Leave Management System. All Rights Reserved.</p>
</div>
