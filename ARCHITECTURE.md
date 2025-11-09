# 🏗️ System Architecture

## 📊 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRICITY BILL MANAGEMENT               │
│                         SYSTEM ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FRONTEND LAYER (React.js)                                  │
│  URL: http://localhost:3001                                 │
│  Port: 3001                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Statistics    │  │    BillList     │  │   BillForm   │ │
│  │   Component     │  │   Component     │  │   Component  │ │
│  │                 │  │                 │  │              │ │
│  │  • Total Bills  │  │  • Display all  │  │  • Add Bill   │ │
│  │  • Paid Count   │  │    bills        │  │  • Edit Bill  │ │
│  │  • Unpaid Count │  │  • Edit action  │  │  • Delete     │ │
│  │  • Total Amount │  │  • Delete action│  │  • Validations│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Service (api.js)                      │ │
│  │  • axios HTTP client                                   │ │
│  │  • billService methods                                 │ │
│  │  • Error handling                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                               ↕                              │
└─────────────────────────────────────────────────────────────┘
                               ↕
                        HTTP/REST API
                               ↕
┌─────────────────────────────────────────────────────────────┐
│  BACKEND LAYER (Express.js)                                 │
│  URL: http://localhost:3000                                 │
│  Port: 3000                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Express Server                            │ │
│  │  • CORS enabled                                        │ │
│  │  • JSON parsing                                        │ │
│  │  • Error handling                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Routes                                │ │
│  │                                                          │ │
│  │  GET    /api/bills              → GetAllBills           │ │
│  │  GET    /api/bills/:id          → GetBillById          │ │
│  │  POST   /api/bills              → CreateBill           │ │
│  │  PUT    /api/bills/:id          → UpdateBill           │ │
│  │  DELETE /api/bills/:id          → DeleteBill           │ │
│  │  GET    /api/bills/stats/summary → GetStatistics      │ │
│  │  GET    /health                  → HealthCheck          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Oracle Database Driver                    │ │
│  │  • oracledb library                                    │ │
│  │  • Connection pooling                                 │ │
│  │  • SQL query execution                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                               ↕                              │
└─────────────────────────────────────────────────────────────┘
                               ↕
                        SQL Queries
                               ↕
┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER (Oracle Database)                           │
│  Port: 1521                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           electricity_bills TABLE                      │ │
│  │                                                          │ │
│  │  Columns:                                              │ │
│  │  • bill_id (PK)                                        │ │
│  │  • customer_name                                       │ │
│  │  • address                                             │ │
│  │  • customer_id                                         │ │
│  │  • bill_date                                           │ │
│  │  • due_date                                            │ │
│  │  • previous_reading                                    │ │
│  │  • current_reading                                     │ │
│  │  • units_consumed (calculated)                          │ │
│  │  • rate_per_unit                                       │ │
│  │  • bill_amount (calculated)                            │ │
│  │  • status (Paid/Unpaid)                                │ │
│  │  • payment_date                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Oracle Instant Client                      │ │
│  │  Path: D:\application_software\instantclient...        │ │
│  │  • ODBC connections                                  │ │
│  │  • Network protocol                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

```

## 🔄 Data Flow

### 1. **View Bills Flow**

```
User → React Frontend → API Service → Express Backend
    → Oracle Database → Execute SQL → Return Results
    → Backend → Frontend → Display in Table
```

### 2. **Add Bill Flow**

```
User fills form → Click Submit → API Service → POST /api/bills
    → Backend validates → Calculate units & amount
    → Insert into database → Return success
    → Frontend refreshes list → Show new bill
```

### 3. **Statistics Flow**

```
Page loads → Fetch stats → API Service → GET /api/stats/summary
    → Backend runs SQL aggregations → Count, Sum operations
    → Return statistics → Display in cards
```

## 📦 Technology Stack

### Frontend
- **React 18.2** - UI framework
- **Axios** - HTTP client
- **Modern CSS** - Styling and animations
- **Port 3001** - Development server

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Oracle DB Driver** - Database connectivity
- **CORS** - Cross-origin requests
- **Port 3000** - API server

### Database
- **Oracle 21c XE** - Database management system
- **SQL** - Query language
- **Port 1521** - Database listener

## 🗂️ File Structure

```
DBMS_project/
│
├── backend/                    # Backend Server
│   ├── server.js              # Express server & routes
│   ├── create-bill-tables.js  # Database setup
│   └── package.json           # Dependencies
│
├── frontend/                   # Frontend React App
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── BillList.js
│   │   │   ├── BillForm.js
│   │   │   └── Statistics.js
│   │   ├── services/
│   │   │   │   └── api.js   # API service
│   │   ├── App.js            # Main app
│   │   └── App.css           # Styles
│   └── package.json           # Dependencies
│
├── README.md                   # Full documentation
├── START_HERE.md              # Quick start
├── PROJECT_SUMMARY.md         # Project summary
└── ARCHITECTURE.md            # This file
```

## 🔌 Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend | 3000 | http://localhost:3000 |
| Database | 1521 | localhost:1521/XE |

## 💾 Database Schema

### electricity_bills Table

```sql
CREATE TABLE electricity_bills (
    bill_id NUMBER PRIMARY KEY,
    customer_name VARCHAR2(100) NOT NULL,
    address VARCHAR2(200) NOT NULL,
    customer_id VARCHAR2(50) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    previous_reading NUMBER(10,2) NOT NULL,
    current_reading NUMBER(10,2) NOT NULL,
    units_consumed NUMBER(10,2) NOT NULL,
    rate_per_unit NUMBER(10,2) NOT NULL,
    bill_amount NUMBER(12,2) NOT NULL,
    status VARCHAR2(20) DEFAULT 'Unpaid',
    payment_date DATE
);
```

## 🎯 Key Features

### 1. **Separation of Concerns**
- Frontend handles UI/UX
- Backend handles business logic
- Database handles data persistence

### 2. **RESTful API**
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON data format
- Status codes for responses

### 3. **Real-time Updates**
- Statistics update on data changes
- Bill list refreshes automatically
- No page reload needed

### 4. **Error Handling**
- Frontend error messages
- Backend validation
- Database error catching
- User-friendly feedback

## 🚀 Deployment Flow

1. **Development**: Both services running locally
2. **Testing**: API endpoints tested via curl/Postman
3. **Integration**: Frontend connects to backend
4. **Production**: Deploy to servers (optional)

---

**Perfect for DBMS Course Project! 📊**

Shows complete understanding of:
- Database design
- API development
- Frontend integration
- Full-stack architecture

