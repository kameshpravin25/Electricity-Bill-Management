# 🚀 How to Run the Application

## Quick Start Guide

### Method 1: Separate Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd <path-to-project-root>/backend
npm install
npm start
```
Wait for: "🚀 Backend server running on port 3000"

**Terminal 2 - Frontend:**
```bash
cd <path-to-project-root>/frontend
npm install
npm start
```
Wait for: Browser opens at http://localhost:3001

---

### Method 2: Using Package Scripts

From project root (`<path-to-project-root>`):
```bash
npm run start:backend    # Start backend only
npm run start:frontend   # Start frontend only
```

---

## What Happens When You Start

### Backend (Port 3000)
- Connects to Oracle database
- Loads electricity bill data
- Provides REST API endpoints
- Serves at: http://localhost:3000

### Frontend (Port 3001)
- Opens automatically in browser
- Shows dark mode interface
- Connects to backend API
- Serves at: http://localhost:3001

---

## How to Stop

Press `Ctrl + C` in both terminal windows

Or use:
```bash
# Find processes
netstat -ano | findstr ":3000 :3001"

# Kill by PID
taskkill /F /PID <process_id>
```

---

## URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **All Bills**: http://localhost:3000/api/bills

---

## Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill it
taskkill /F /PID <pid>
```

### Frontend Won't Start
```bash
cd D:\DBMS_project\frontend
npm install
npm start
```

### Backend Won't Start
```bash
cd D:\DBMS_project\backend
npm install
npm start
```

### Database Connection Error
- Make sure Oracle database is running
- Check credentials in `backend/server.js`

---

## Features Available

✅ View all electricity bills
✅ Add new bills
✅ Edit existing bills
✅ Delete bills
✅ View statistics (total, paid, unpaid, amount)
✅ Dark mode interface
✅ Automatic bill calculation

---

**Enjoy your Electricity Bill Management System!**


