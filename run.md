*Last Updated: 5th April 2026*
**Project Status: ✅ Completed & Verified**

This guide ensures the **Leave Portal** is configured correctly on your local machine with separate collections for **Admins**, **Staff**, and **Students**.


---

## 🏗️ 1. Backend Setup

From the `backend` directory:

1.  **Environment Preparation**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate  # macOS/Linux
    ```

2.  **Install Dependencies**:
    ```bash
    # You MUST run this in each new virtual environment
    pip install -e .[dev]
    ```

3.  **Config**: Ensure `.env` contains your Firebase Service Account JSON path.

4.  **Start Server**:
    ```bash
    python -m uvicorn app.main:app --reload
    ```
    API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🎨 2. Frontend Setup

From the `frontend` directory:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Config**: Ensure `.env` contains your Firebase Web App configuration.

3.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    App: [http://localhost:5173/login](http://localhost:5173/login)

---

## 🛡️ 3. Security & Account Management

### A. Initial Super Admin Bootstrap (Required)
Since UI signup is restricted for security, you MUST create the initial Super Admin via the terminal:

```bash
cd backend
python scripts/bootstrap_admin.py --email admin@leaveportal.com --password Admin@123 --name "Admin User" --role super_admin
```

### B. Delete/Reset an Account
If you need to delete an account and recreate it (e.g., to move it to a different collection):

```bash
cd backend
python scripts/delete_user.py --email priyan19@gmail.com
```

---

## 📱 4. Mobile Build (Optional)

Compile the Android application:

1.  Build assets: `npm run build:mobile` (in `frontend`)
2.  Sync: `npx cap sync`
3.  Build APK:
    ```bash
    cd android
    .\gradlew.bat assembleDebug
    ```
