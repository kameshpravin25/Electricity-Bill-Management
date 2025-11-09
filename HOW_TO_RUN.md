# 🚀 How to Run the Application

## Quick Start (Two Methods)

### Method 1: Using PowerShell Windows (Recommended)

**Step 1: Start Backend**
```powershell
cd backend
npm install
npm start
```
✅ Wait for: "🚀 Backend server running on port 3000"

**Step 2: Open NEW PowerShell Window - Start Frontend**
```powershell
cd frontend
npm install
$env:PORT=3001
npm start
```
✅ Wait for: Browser opens automatically at http://localhost:3001

---

### Method 2: Using Root Package Scripts

**Terminal 1 - Backend:**
```powershell
cd <path-to-project-root>
npm run start:backend
```

**Terminal 2 - Frontend:**
```powershell
cd <path-to-project-root>
npm run start:frontend
```

---

## 📍 Access URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## 🔑 Login Credentials

The project may include seeded demo accounts. If you ran the seed scripts these example credentials might apply; otherwise check `backend/seeds` or the `CustomerAuth` table for seeded values.

Example (may vary):
- Admin: `admin` / `Admin@123`
- Customers: `raju` / `Cust1@123`, `suma` / `Cust2@123`

---

## ⚠️ Important Notes

1. **Backend must start FIRST** - Wait until you see "Backend server running on port 3000"
2. **Frontend needs separate terminal** - Don't close the backend terminal
3. **Ports**:
   - Backend: Always port 3000
   - Frontend: Port 3001 (set with `$env:PORT=3001`)

---

## 🛑 To Stop Servers

Press `Ctrl + C` in each terminal window, OR:

```powershell
# Stop all Node processes
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force
```

---

## 🔧 Troubleshooting

### Backend won't start?
- Check Oracle database is running
- Verify `.env` file exists in `backend/` folder
- Check Oracle Client path is correct

### Frontend won't start?
- Make sure backend is already running
- Check if ports 3000/3001 are available
- Try: `netstat -ano | findstr ":3000 :3001"`

### Login fails?
- Verify backend is running: http://localhost:3000/health
- Check browser console (F12) for errors
- Verify credentials match exactly (case-sensitive)

---

## 📝 Quick Reference Commands

```powershell
# Navigate to project
cd C:\Users\jaiak\Music\dbms_osama\DBMS_project

# Backend
cd backend
npm start

# Frontend (in new terminal)
cd frontend
$env:PORT=3001
npm start
```



