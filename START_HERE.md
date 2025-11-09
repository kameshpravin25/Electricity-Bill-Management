# 🚀 Quick Start Guide

## Step 1: Setup Database

```bash
cd backend
npm install
npm run setup-db
```

This will:
- Create the `electricity_bills` table
- Insert 10 sample bills
- Verify the setup

## Step 2: Start Backend Server

**Open a NEW terminal window:**

```bash
cd backend
npm start
```

You should see:
```
✅ Oracle Client initialized successfully
🚀 Backend server running on port 3000
📡 API endpoints available at http://localhost:3000/api
```

## Step 3: Start Frontend

**Open ANOTHER terminal window:**

```bash
cd frontend
npm install
npm start
```

The React app will open automatically at http://localhost:3001

## ✅ You're Done!

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000

### Test the Connection

Try these URLs:
- http://localhost:3000/health (Backend health check)
- http://localhost:3001 (Frontend UI)

---

## 📊 Project Architecture

```
Frontend (React) → Port 3001
    ↓ (HTTP requests)
Backend (Express) → Port 3000
    ↓ (SQL queries)
Oracle Database → Port 1521
```

---

## 🔧 Troubleshooting

### Oracle Connection Error
- Make sure Oracle database is running
- Verify `backend/.env` exists and contains correct `DB_USER`, `DB_PASSWORD`, and `DB_CONNECT_STRING` (or set these env vars in your shell)
- Ensure the Instant Client folder is available and set via `ORACLE_LIB_DIR` environment variable or added to your system PATH

### Port Already in Use
- Change PORT in `backend/server.js` or `frontend/package.json`
- Kill the process using the port

### Module Not Found
- Run `npm install` in both `backend/` and `frontend/` folders

---

## 📱 Features to Test

1. **View Statistics** - Dashboard shows total bills, paid/unpaid counts
2. **View Bills** - See all bills in a table
3. **Add Bill** - Click "Add New Bill" and fill the form
4. **Edit Bill** - Click "Edit" on any bill
5. **Delete Bill** - Click "Delete" on any bill

Enjoy your Electricity Bill Management System! ⚡

