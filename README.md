# ⚡ Electricity Billing System (Full Stack)

Node.js + Express + Oracle (oracledb) backend, React + Tailwind frontend, JWT auth. Existing schema tables are used: `Customer, Invoice, Payment, Feedback, Admin, Roles, Staff, Login, Tariff, Meter, Bill` plus `CustomerAuth` (for customer login).

## 🏗️ Project Structure
  - The project reads the Instant Client directory from the `ORACLE_LIB_DIR` environment variable or will try to auto-detect an `instantclient_...` folder under a parent directory. Do not hard-code a local user path in the repo. Example values:
    - Exact client folder: `C:\oracle\instantclient_19_28`
    - Parent folder: `C:\application_software\instantclient-basic-windows.x64-19.28.0.0.0dbru`
```
DBMS_project/
├── backend/                  # Backend (Express + oracledb)
│   ├── server.js             # Main server (auth + sample APIs)
│   ├── migrations/           # SQL migrations (001_create_customer_auth.sql)
│   ├── scripts/
│   │   ├── run-migrations.js # Applies SQL files
│   │   └── run-seed.js       # Minimal seed
ORACLE_LIB_DIR=C:\path\to\instantclient_19_28   # or the parent folder that contains instantclient_* directories
├── frontend/                 # Frontend (React + Tailwind)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── App.js            # Router: Home, Login, Register, Customer, Admin
│       └── index.css         # Tailwind directives
└── README.md
```

## 🚀 Tech Stack

**Backend:** Node 18+, Express 4+, oracledb, JWT, bcrypt, dotenv, CORS

**Frontend:** React, React Router, Axios, Tailwind CSS

## 📋 Prerequisites

1. **Oracle Database** running and accessible
2. **Oracle Instant Client** installed
   - Location: `D:\application_software\instantclient-basic-windows.x64-19.28.0.0.0dbru\instantclient_19_28`
3. **Node.js** (v18 or higher)
4. **npm** or **yarn**

## 🛠️ Installation & Setup

### 1) Backend env

Create `backend/.env` by copying `backend/.env.example` and filling in values. Example placeholders:

```
PORT=3000
# ORACLE_LIB_DIR: path to the instantclient folder (contains oci.dll) or its parent
ORACLE_LIB_DIR=C:\path\to\instantclient_19_28
DB_USER=<your_db_user>
DB_PASSWORD=<your_db_password>
DB_CONNECT_STRING=<host:port/servicename>  # e.g. localhost:1521/XE
JWT_SECRET=<your_jwt_secret>
```

### 2) Install

From project root:

```

### 3) Migrate + seed (creates CustomerAuth and seeds minimal data)

```bash
cd backend
npm run migrate
npm run seed
```

### 4) Start servers

```bash
# terminal 1
cd backend && npm start

# terminal 2
cd ../frontend && npm start
```

Frontend: `http://localhost:3001` (proxy to backend `http://localhost:3000`)

## 🌐 Key API Endpoints

Auth
- `POST /api/auth/register` { email, password, cust_id }
- `POST /api/auth/login` { email, password } → { token }

Data (JWT Bearer required)
- `GET /api/customers`
- `GET /api/invoices`

## 📊 Features

### Dashboard
- Real-time statistics (Total bills, Paid/Unpaid count, Outstanding amount)
- Visual stat cards with color coding

### Bill Management
- View all bills in a table
- Add new bills with automatic calculation
- Edit existing bills
- Delete bills
- Filter by status (Paid/Unpaid)

### Bill Calculation
- Automatic calculation of:
  - Units consumed (Current Reading - Previous Reading)
  - Bill amount (Units × Rate per Unit)

## 💾 Database Schema

### electricity_bills Table

| Column | Type | Description |
|--------|------|-------------|
| bill_id | NUMBER | Primary Key |
| customer_name | VARCHAR2(100) | Customer name |
| address | VARCHAR2(200) | Customer address |
| customer_id | VARCHAR2(50) | Unique customer ID |
| bill_date | DATE | Bill generation date |
| due_date | DATE | Payment due date |
| previous_reading | NUMBER(10,2) | Previous meter reading |
| current_reading | NUMBER(10,2) | Current meter reading |
| units_consumed | NUMBER(10,2) | Calculated units |
| rate_per_unit | NUMBER(10,2) | Rate per unit |
| bill_amount | NUMBER(12,2) | Total bill amount |
| status | VARCHAR2(20) | Paid/Unpaid |
| payment_date | DATE | Payment date |

## 🎨 UI Features

- Responsive design (works on mobile, tablet, desktop)
- Modern gradient background
- Smooth animations and transitions
- Modal forms for adding/editing
- Status badges with color coding
- Real-time statistics cards
- Error handling and loading states

## 🔧 Configuration

Use `backend/.env` to configure credentials and client path.

Oracle Instant Client path is read from `ORACLE_LIB_DIR`.

## 🚦 Running the Application

Access
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

## 📱 Usage
Use the navbar to navigate to Login/Register, then Customer/Admin dashboards (scaffolded).

## 🧪 Testing

Test the API endpoints using curl:

```bash
# Get all bills
curl http://localhost:3000/api/bills

# Get statistics
curl http://localhost:3000/api/bills/stats/summary

# Health check
curl http://localhost:3000/health
```

## 📝 Notes

- Make sure Oracle Database and Instant Client are properly installed
- Ensure database service is running before starting the backend
- CORS is enabled to allow frontend-backend communication
- The application uses port 3000 for backend and 3001 for frontend

## 📄 License

This project is for educational purposes as part of DBMS course.

## 👤 Author

Created for Electricity Bill Management System - DBMS Project


"# Electricity-Bill-Management" 
