# Leave Portal - Frontend

> [!NOTE]
> For a full system setup and running instructions, see the [Manual Run Guide](../run.md) in the project root.
**Project Status: ✅ Frontend Fully Implemented**

React + TypeScript + Vite frontend application for handling multi-tenant Leave Management. Contains tailored views for Students, Staff, and Super Admins.

## Features

- **React 19 & Vite**: Ultra-fast hot module replacement and build tooling.
- **Tailwind CSS & Shadcn UI**: Clean, responsive, and accessible user interfaces.
- **Role-Based Routing**: Dynamic navigation links, protected routes checking Firebase Auth custom roles.
- **Data Fetching**: Extensively uses TanStack React Query for caching, mutations, and pagination.
- **Forms**: React Hook Form coupled with Zod for robust client-side validation.
- **Mobile First**: Ready to be compiled into an Android App via Capacitor.

## Prerequisites

- Node.js 18+ (or 20 LTS recommended)
- Firebase Project Configuration Values (API Key, Auth Domain, Project ID, etc.)

## Installation & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` (or create one) and insert your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY="..."
   VITE_FIREBASE_AUTH_DOMAIN="..."
   VITE_FIREBASE_PROJECT_ID="..."
   VITE_FIREBASE_STORAGE_BUCKET="..."
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="..."
   VITE_API_BASE_URL="http://localhost:8000/api/v1"
   ```

3. **Start Development Server**:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

## Mobile Build (Capacitor)

The mobile wrapper lies within `android/`. When you wish to sync your latest React UI into the Capacitor wrapper:
```bash
npm run build:mobile
```
Then, using Android Studio or Gradle locally:
```bash
cd android
.\gradlew.bat assembleDebug
```
