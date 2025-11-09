// backend/server.js
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize Oracle Client
try {
  const fs = require('fs');
    const defaultParent = 'Oracle_instand_client_path';
    const basePath = process.env.ORACLE_LIB_DIR || defaultParent;
    const preferredSubdirs = ['instantclient_21_19', 'instantclient_19_28', 'instantclient'];
    let libDir = basePath;

    // If basePath itself contains oci.dll, use it. Otherwise look for common subfolders
    try {
      if (fs.existsSync(libDir + '\\oci.dll')) {
        // good
      } else {
        // try preferred subdirs first
        let found = false;
        for (const sub of preferredSubdirs) {
          const candidate = basePath + '\\' + sub;
          if (fs.existsSync(candidate) && fs.existsSync(candidate + '\\oci.dll')) {
            libDir = candidate;
            found = true;
            break;
          }
        }

        // if not found, scan for any instantclient* folder inside basePath
        if (!found && fs.existsSync(basePath)) {
          const entries = fs.readdirSync(basePath, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && /^instantclient/i.test(e.name)) {
              const candidate = basePath + '\\' + e.name;
              if (fs.existsSync(candidate + '\\oci.dll')) {
                libDir = candidate;
                found = true;
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error while detecting Oracle Instant Client folder:', e && e.message ? e.message : e);
    }

    oracledb.initOracleClient({ libDir });
  console.log('✅ Oracle Client initialized successfully');
} catch (e) {
  console.error('❌ Oracle Client initialization failed:', e.message || e);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER || 'your_db_username',
  password: process.env.DB_PASSWORD || 'your_password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Helper function to get database connection
async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

// ==================== AUTH & MIDDLEWARE ====================
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function roleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

// Admin login (Login table)
app.post('/api/auth/admin/login', async (req, res) => {
  let conn; try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success:false, error:'username and password required' });
    conn = await getConnection();
    const r = await conn.execute('SELECT Login_ID, Password, Staff_ID, Username FROM Login WHERE Username = :u', [username]);
    if (r.rows.length === 0) return res.status(401).json({ success:false, error:'Invalid credentials' });
    const [loginId, stored, staffId, uname] = r.rows[0];
    // Admin seed might be plain text; accept either bcrypt or plain match
    let ok = false;
    if (typeof stored === 'string' && (stored.startsWith('$2a$') || stored.startsWith('$2b$'))) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = stored === password;
    }
    if (!ok) return res.status(401).json({ success:false, error:'Invalid credentials' });
    const token = jwt.sign({ sub: String(staffId), role: 'admin', username: uname }, JWT_SECRET, { expiresIn: '8h' });
    // Optionally include basic admin details
    res.json({ success:true, token, role: 'admin', user: { userId: staffId, username: uname } });
  } catch (err) { console.error(err); res.status(500).json({ success:false, error: err.message }); }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// Customer login (CustomerAuth)
app.post('/api/auth/customer/login', async (req, res) => {
  let conn; try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success:false, error:'username and password required' });
    conn = await getConnection();
    const r = await conn.execute('SELECT Cust_ID, PasswordHash, Username FROM CustomerAuth WHERE Username = :u', [username]);
    if (r.rows.length === 0) return res.status(401).json({ success:false, error:'Invalid credentials' });
    const [custId, hash, uname] = r.rows[0];
    let ok = false;
    if (typeof hash === 'string' && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
      ok = await bcrypt.compare(password, hash);
    } else {
      ok = hash === password; // fallback if seed inserted plain text; seed runner will hash afterwards
    }
    if (!ok) return res.status(401).json({ success:false, error:'Invalid credentials' });
    const token = jwt.sign({ sub: String(custId), role: 'customer', username: uname }, JWT_SECRET, { expiresIn: '8h' });
    // Return basic customer details
    const cust = await conn.execute('SELECT Cust_ID, FirstName, LastName, Email, ContactNo, Address FROM Customer WHERE Cust_ID = :id', [custId]);
    res.json({ success:true, token, role: 'customer', customer: cust.rows && cust.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ success:false, error: err.message }); }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/customers', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    // First get all customers
    const customersResult = await conn.execute('SELECT Cust_ID, FirstName, LastName, Email, ContactNo, Address FROM Customer ORDER BY Cust_ID');
    const customers = customersResult.rows;
    
    // For each customer, get latest bill, invoice, and payment info
    const enrichedData = await Promise.all(customers.map(async (cust) => {
      const custId = cust[0];
      const result = [...cust]; // Start with base customer data
      
      // Get latest bill
      try {
        const latestBill = await conn.execute(
          `SELECT Bill_ID, Status, Due_Date FROM Bill WHERE Account_ID = :id ORDER BY Bill_ID DESC`,
          [custId],
          { maxRows: 1 }
        );
        if (latestBill.rows && latestBill.rows.length > 0) {
          result.push(latestBill.rows[0][0]); // Bill_ID
          result.push(latestBill.rows[0][1]); // Bill_Status
          result.push(latestBill.rows[0][2]); // Due_Date
        } else {
          result.push(null, null, null);
        }
      } catch (e) {
        result.push(null, null, null);
      }
      
      // Get latest invoice (skip Invoice_ID, frontend expects Status and Grand_Total at indices 9 and 10)
      try {
        const latestInvoice = await conn.execute(
          `SELECT Status, Grand_Total FROM Invoice WHERE Cust_ID = :id ORDER BY Invoice_ID DESC`,
          [custId],
          { maxRows: 1 }
        );
        if (latestInvoice.rows && latestInvoice.rows.length > 0) {
          result.push(latestInvoice.rows[0][0]); // Invoice_Status at index 9
          result.push(latestInvoice.rows[0][1]); // Grand_Total at index 10
        } else {
          result.push(null, null);
        }
      } catch (e) {
        result.push(null, null);
      }
      
      // Get latest payment (frontend expects Payment_Mode at index 12, Payment_Date at index 13, Units_Consumed at index 12 for display)
      try {
        const latestPayment = await conn.execute(
          `SELECT p.Payment_Mode, p.Payment_Date, p.Units_Consumed
           FROM Payment p 
           JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID 
           WHERE i.Cust_ID = :id 
           ORDER BY p.Payment_Date DESC, p.Payment_ID DESC`,
          [custId],
          { maxRows: 1 }
        );
        if (latestPayment.rows && latestPayment.rows.length > 0) {
          result.push(latestPayment.rows[0][2] || null); // Units_Consumed at index 11 (for display)
          result.push(latestPayment.rows[0][0] || null); // Payment_Mode at index 12
          result.push(latestPayment.rows[0][1] || null); // Payment_Date at index 13
        } else {
          result.push(null, null, null);
        }
      } catch (e) {
        result.push(null, null, null);
      }
      
      return result;
    }));
    
    res.json({ success:true, data: enrichedData });
  } catch (err) { 
    console.error('Customers endpoint error:', err);
    res.status(500).json({ success:false, error: err.message }); 
  }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

app.get('/api/admin/customer/:custId', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    conn = await getConnection();
    const cust = await conn.execute('SELECT * FROM Customer WHERE Cust_ID = :id', [custId]);
    const inv = await conn.execute('SELECT * FROM Invoice WHERE Cust_ID = :id', [custId]);
    const pay = await conn.execute('SELECT * FROM Payment WHERE Invoice_ID IN (SELECT Invoice_ID FROM Invoice WHERE Cust_ID = :id)', [custId]);
    const meters = await conn.execute('SELECT * FROM Meter WHERE Account_ID = :id', [custId]);
    res.json({ success:true, customer: cust.rows, invoices: inv.rows, payments: pay.rows, meters: meters.rows });
  } catch (err) { res.status(500).json({ success:false, error: err.message }); }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

app.post('/api/admin/customer', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const { 
      Cust_ID, FirstName, MiddleName, LastName, Adhaar, Email, ContactNo, Address, 
      Username, Password,
      // Meter fields
      createMeter, MeterType, InstallationDate, City, Pincode, Street, HouseNo, State, Tariff_ID
    } = req.body;
    conn = await getConnection();
    const nextIdRes = Cust_ID ? { rows: [[Cust_ID]] } : await conn.execute('SELECT NVL(MAX(Cust_ID),0)+1 FROM Customer');
    const nextId = nextIdRes.rows[0][0];
    await conn.execute('INSERT INTO Customer (Cust_ID, FirstName, MiddleName, LastName, Adhaar, Email, ContactNo, Address) VALUES (:a,:b,:c,:d,:e,:f,:g,:h)',
      [nextId, FirstName || null, MiddleName || null, LastName || null, Adhaar || null, Email || null, ContactNo || null, Address || null]);
    
    // Generate default username and password if not provided
    let finalUsername = Username;
    let finalPassword = Password;
    
    if (!finalUsername && FirstName && LastName) {
      const firstNameLower = FirstName.toLowerCase().replace(/\s+/g, '');
      const lastNameLower = LastName.toLowerCase().replace(/\s+/g, '');
      finalUsername = `${firstNameLower}${lastNameLower.charAt(0)}`;
    }
    
    if (!finalPassword && FirstName) {
      const firstNameCapitalized = FirstName.charAt(0).toUpperCase() + FirstName.slice(1).toLowerCase();
      finalPassword = `${firstNameCapitalized}@123`;
    }
    
    // Always create CustomerAuth entry with generated or provided credentials
    if (finalUsername && finalPassword) {
      const hash = await bcrypt.hash(finalPassword, 10);
      const authIdRes = await conn.execute('SELECT NVL(MAX(Auth_ID),0)+1 FROM CustomerAuth');
      const authId = authIdRes.rows[0][0];
      await conn.execute('INSERT INTO CustomerAuth (Auth_ID, Cust_ID, Username, PasswordHash) VALUES (:i,:j,:k,:l)', 
        [authId, nextId, finalUsername, hash]);
    }
    
    // Create meter if requested
    let meterId = null;
    if (createMeter && Tariff_ID) {
      // Validate required meter fields
      if (!MeterType || !InstallationDate || !City || !Pincode || !Street || !HouseNo || !State) {
        await conn.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'All meter fields are required when creating a meter' 
        });
      }
      
      // Get next meter ID
      const meterIdRes = await conn.execute('SELECT NVL(MAX(Meter_ID),0)+1 FROM Meter');
      meterId = meterIdRes.rows[0][0];
      
      // Insert meter
      await conn.execute(
        `INSERT INTO Meter (Meter_ID, InstallationDate, MeterType, City, Pincode, Street, HouseNo, State, Account_ID, Tariff_ID) 
         VALUES (:meterId, TO_DATE(:instDate, 'YYYY-MM-DD'), :meterType, :city, :pincode, :street, :houseNo, :state, :accountId, :tariffId)`,
        [
          meterId,
          InstallationDate,
          MeterType,
          City,
          parseInt(Pincode),
          Street,
          HouseNo,
          State,
          nextId,
          parseInt(Tariff_ID)
        ]
      );
    }
    
    await conn.commit();
    res.json({ 
      success: true, 
      custId: nextId,
      username: finalUsername,
      password: finalPassword,
      meterId: meterId
    });
  } catch (err) { 
    if (conn) { try { await conn.rollback(); } catch(e){} } 
    console.error('Create customer error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// Update customer
app.put('/api/admin/customer/:custId', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    const { FirstName, MiddleName, LastName, Adhaar, Email, ContactNo, Address } = req.body;
    conn = await getConnection();
    
    await conn.execute(
      'UPDATE Customer SET FirstName = :fn, MiddleName = :mn, LastName = :ln, Adhaar = :adh, Email = :em, ContactNo = :cn, Address = :addr WHERE Cust_ID = :id',
      [FirstName || null, MiddleName || null, LastName || null, Adhaar || null, Email || null, ContactNo || null, Address || null, custId]
    );
    
    await conn.commit();
    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Add meter to existing customer
app.post('/api/admin/customer/:custId/meter', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    const { MeterType, InstallationDate, City, Pincode, Street, HouseNo, State, Tariff_ID } = req.body;
    
    // Validate required fields
    if (!MeterType || !InstallationDate || !City || !Pincode || !Street || !HouseNo || !State || !Tariff_ID) {
      return res.status(400).json({ 
        success: false, 
        error: 'All meter fields are required' 
      });
    }
    
    conn = await getConnection();
    
    // Verify customer exists
    const custCheck = await conn.execute('SELECT Cust_ID FROM Customer WHERE Cust_ID = :id', [custId]);
    if (custCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Get next meter ID
    const meterIdRes = await conn.execute('SELECT NVL(MAX(Meter_ID),0)+1 FROM Meter');
    const meterId = meterIdRes.rows[0][0];
    
    // Insert meter
    await conn.execute(
      `INSERT INTO Meter (Meter_ID, InstallationDate, MeterType, City, Pincode, Street, HouseNo, State, Account_ID, Tariff_ID) 
       VALUES (:meterId, TO_DATE(:instDate, 'YYYY-MM-DD'), :meterType, :city, :pincode, :street, :houseNo, :state, :accountId, :tariffId)`,
      [
        meterId,
        InstallationDate,
        MeterType,
        City,
        parseInt(Pincode),
        Street,
        HouseNo,
        State,
        custId,
        parseInt(Tariff_ID)
      ]
    );
    
    await conn.commit();
    res.json({ 
      success: true, 
      meterId: meterId,
      message: 'Meter added successfully' 
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Add meter error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Get customer meters with tariff info
app.get('/api/admin/customer/:custId/meters', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    conn = await getConnection();
    
    const metersRes = await conn.execute(`
      SELECT 
        m.Meter_ID,
        m.InstallationDate,
        m.MeterType,
        m.City,
        m.Pincode,
        m.Street,
        m.HouseNo,
        m.State,
        m.Tariff_ID,
        t.Description AS Tariff_Description,
        t.Rate_Per_Unit
      FROM Meter m
      LEFT JOIN Tariff t ON t.Tariff_ID = m.Tariff_ID
      WHERE m.Account_ID = :custId
      ORDER BY m.InstallationDate DESC
    `, [custId]);
    
    const meters = metersRes.rows.map(row => ({
      meterId: row[0],
      installationDate: row[1],
      meterType: row[2],
      city: row[3],
      pincode: row[4],
      street: row[5],
      houseNo: row[6],
      state: row[7],
      tariffId: row[8],
      tariffDescription: row[9],
      ratePerUnit: row[10]
    }));
    
    res.json({ success: true, meters });
  } catch (err) {
    console.error('Get customer meters error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Delete customer
app.delete('/api/admin/customer/:custId', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    conn = await getConnection();
    
    // Check if customer has invoices/payments - if yes, prevent deletion or cascade
    const invoiceCheck = await conn.execute('SELECT COUNT(*) FROM Invoice WHERE Cust_ID = :id', [custId]);
    const hasInvoices = invoiceCheck.rows[0][0] > 0;
    
    if (hasInvoices) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete customer with existing invoices. Please handle invoices first.' 
      });
    }
    
    // Delete CustomerAuth entries first (foreign key constraint)
    await conn.execute('DELETE FROM CustomerAuth WHERE Cust_ID = :id', [custId]);
    
    // Delete customer
    await conn.execute('DELETE FROM Customer WHERE Cust_ID = :id', [custId]);
    
    await conn.commit();
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

app.get('/api/admin/payments', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    // Get both Payment records AND pending invoices (bills created but not yet paid)
    // Use UNION to combine completed payments and pending invoices
    const sql = `
      SELECT 
        p.Payment_ID,
        c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
        i.Invoice_ID,
        p.Amount_Paid,
        p.Payment_Date,
        p.Payment_Mode,
        p.Transaction_Ref,
        p.Units_Consumed,
        i.Status AS Invoice_Status,
        i.Grand_Total AS Invoice_Total,
        (SELECT NVL(SUM(p2.Amount_Paid), 0) FROM Payment p2 WHERE p2.Invoice_ID = i.Invoice_ID) AS Total_Paid,
        c.Cust_ID,
        c.Email AS Customer_Email,
        c.ContactNo AS Customer_Contact,
        'payment' AS Record_Type
      FROM Payment p
      JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
      JOIN Customer c ON c.Cust_ID = i.Cust_ID
      
      UNION ALL
      
      SELECT 
        NULL AS Payment_ID,
        c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
        i.Invoice_ID,
        NULL AS Amount_Paid,
        i.Invoice_Date AS Payment_Date,
        NULL AS Payment_Mode,
        NULL AS Transaction_Ref,
        NULL AS Units_Consumed,
        i.Status AS Invoice_Status,
        i.Grand_Total AS Invoice_Total,
        0 AS Total_Paid,
        c.Cust_ID,
        c.Email AS Customer_Email,
        c.ContactNo AS Customer_Contact,
        'invoice' AS Record_Type
      FROM Invoice i
      JOIN Customer c ON c.Cust_ID = i.Cust_ID
      WHERE i.Status IN ('Pending', 'Partially Paid')
        AND NOT EXISTS (
          SELECT 1 FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID
        )
      
      ORDER BY Payment_Date DESC, Invoice_ID DESC
    `;
    const r = await conn.execute(sql);
    res.json({ success:true, data: r.rows });
  } catch (err) { 
    console.error('Payments endpoint error:', err);
    res.status(500).json({ success:false, error: err.message }); 
  }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// Payment summary stats
app.get('/api/admin/payments/stats', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    
    // Total payments count
    const totalCountRes = await conn.execute('SELECT COUNT(*) FROM Payment');
    const totalPayments = totalCountRes.rows[0][0];
    
    // Total amount collected
    const totalAmountRes = await conn.execute('SELECT NVL(SUM(Amount_Paid), 0) FROM Payment');
    const totalAmountCollected = totalAmountRes.rows[0][0] || 0;
    
    // Pending payments: Count invoices that are either:
    // 1. Status 'Pending' with NO payment records, OR
    // 2. Status 'Pending' or 'Partially Paid' with payments but amount paid < grand total
    const pendingRes = await conn.execute(`
      SELECT COUNT(DISTINCT i.Invoice_ID)
      FROM Invoice i
      WHERE i.Status IN ('Pending', 'Partially Paid')
        AND (
          NOT EXISTS (SELECT 1 FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID)
          OR (SELECT NVL(SUM(Amount_Paid), 0) FROM Payment WHERE Invoice_ID = i.Invoice_ID) < i.Grand_Total
        )
    `);
    const pendingPayments = pendingRes.rows[0][0] || 0;
    
    res.json({ 
      success: true, 
      stats: {
        totalPayments,
        totalAmountCollected,
        pendingPayments
      }
    });
  } catch (err) {
    console.error('Payment stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Get customer invoices for dropdown
app.get('/api/admin/customer/:custId/invoices', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.params.custId);
    conn = await getConnection();
    const invoices = await conn.execute(
      'SELECT Invoice_ID, Invoice_Date, Grand_Total, Status FROM Invoice WHERE Cust_ID = :id ORDER BY Invoice_ID DESC',
      [custId]
    );
    res.json({ success: true, invoices: invoices.rows });
  } catch (err) {
    console.error('Get customer invoices error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Get all tariffs
app.get('/api/tariffs', requireAuth, async (req, res) => {
  let conn; 
  try { 
    conn = await getConnection(); 
    const r = await conn.execute(
      'SELECT Tariff_ID, Description, Rate_Per_Unit, Effective_From, Effective_To FROM Tariff ORDER BY Tariff_ID'
    ); 
    res.json({ success: true, data: r.rows }); 
  } catch (err) { 
    console.error('Tariffs endpoint error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  } finally { 
    if (conn) { try { await conn.close(); } catch(e){} } 
  }
});

// Admin create payment endpoint - MUST be before the :paymentId route
app.post('/api/admin/payment', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const { customerId, invoiceId, unitsConsumed, paymentMode, transactionRef, createNewInvoice, tariffId, dueDate } = req.body;
    
    console.log('Create payment request:', { customerId, invoiceId, unitsConsumed, paymentMode, transactionRef, createNewInvoice, tariffId, dueDate });
    
    if (!customerId || !unitsConsumed || !tariffId) {
      return res.status(400).json({ success: false, error: 'customerId, unitsConsumed, and tariffId are required' });
    }
    
    // Parse and validate inputs
    const custId = parseInt(customerId);
    const units = parseFloat(unitsConsumed);
    const tariff = parseInt(tariffId);
    
    if (isNaN(custId)) {
      return res.status(400).json({ success: false, error: 'Invalid customerId' });
    }
    if (isNaN(units) || units <= 0) {
      return res.status(400).json({ success: false, error: 'Units consumed must be a positive number' });
    }
    if (isNaN(tariff)) {
      return res.status(400).json({ success: false, error: 'Invalid tariffId' });
    }
    
    conn = await getConnection();
    
    // Get tariff rate from database
    const tariffRes = await conn.execute(
      'SELECT Rate_Per_Unit, Description FROM Tariff WHERE Tariff_ID = :tariffId',
      [tariff]
    );
    
    if (tariffRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tariff not found' });
    }
    
    const [ratePerUnit, tariffDescription] = tariffRes.rows[0];
    const UNIT_RATE = parseFloat(ratePerUnit);
    
    // Calculate amount using tariff rate
    const baseAmount = units * UNIT_RATE;
    const tax = baseAmount * 0.05; // 5% tax
    const grandTotal = baseAmount + tax;
    const amountPaid = grandTotal; // Full payment
    
    let finalInvoiceId = invoiceId ? parseInt(invoiceId) : null;
    
    // If creating new invoice or no invoice provided
    if (createNewInvoice || !invoiceId) {
      // Check if customer exists
      const custCheck = await conn.execute('SELECT Cust_ID FROM Customer WHERE Cust_ID = :customerId', [custId]);
      if (custCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      
      // Create new invoice
      const invIdRes = await conn.execute('SELECT NVL(MAX(Invoice_ID),0)+1 FROM Invoice');
      const newInvoiceId = invIdRes.rows[0][0];
      
      // Parse due date if provided, otherwise use default (SYSDATE + 20 days)
      let invoiceDueDate = null;
      if (dueDate) {
        try {
          const parsedDate = new Date(dueDate);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            invoiceDueDate = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.warn(`Error parsing due date for invoice: ${dueDate}, using default`);
        }
      }
      
      // Insert invoice with or without due date
      if (invoiceDueDate) {
      await conn.execute(
          `INSERT INTO Invoice (Invoice_ID, Invoice_Date, Base_Amount, Tax, Grand_Total, Cust_ID, Status, Due_Date) 
           VALUES (:invoiceId, SYSDATE, :baseAmount, :taxAmount, :grandTotal, :customerId, 'Pending', TO_DATE(:dueDate, 'YYYY-MM-DD'))`,
          [newInvoiceId, baseAmount, tax, grandTotal, custId, invoiceDueDate]
        );
      } else {
        await conn.execute(
          `INSERT INTO Invoice (Invoice_ID, Invoice_Date, Base_Amount, Tax, Grand_Total, Cust_ID, Status, Due_Date) 
           VALUES (:invoiceId, SYSDATE, :baseAmount, :taxAmount, :grandTotal, :customerId, 'Pending', SYSDATE + 20)`,
        [newInvoiceId, baseAmount, tax, grandTotal, custId]
      );
      }
      
      finalInvoiceId = newInvoiceId;
    } else {
      const invId = parseInt(invoiceId);
      // Verify invoice exists and belongs to customer
      const invCheck = await conn.execute(
        'SELECT Grand_Total, Cust_ID, Status FROM Invoice WHERE Invoice_ID = :invoiceId',
        [invId]
      );
      if (invCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      const [invGrandTotal, invCustId, invStatus] = invCheck.rows[0];
      
      if (String(invCustId) !== String(custId)) {
        return res.status(400).json({ success: false, error: 'Invoice does not belong to the selected customer' });
      }
      
      // When updating existing invoice, we don't validate payment amount
      // because admin is just updating the invoice (bill), not creating a payment
      // The actual payment will be made by customer via customer portal
      
      // Update Invoice Due_Date if provided
      if (dueDate) {
        try {
          const parsedDate = new Date(dueDate);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const invoiceDueDate = `${year}-${month}-${day}`;
            await conn.execute(
              'UPDATE Invoice SET Due_Date = TO_DATE(:dueDate, \'YYYY-MM-DD\') WHERE Invoice_ID = :invoiceId',
              [invoiceDueDate, invId]
            );
            console.log(`✅ Invoice ${invId} due date updated to ${invoiceDueDate}`);
          }
        } catch (e) {
          console.warn(`Error parsing due date for existing invoice: ${dueDate}`);
        }
      }
      
      finalInvoiceId = invId;
    }
    
    // REFERENTIAL INTEGRITY VERIFICATION:
    // Payment → Invoice → Customer chain must be valid
    
    // Step 1: Verify Customer exists
    const customerVerify = await conn.execute(
      'SELECT Cust_ID FROM Customer WHERE Cust_ID = :customerId',
      [custId]
    );
    
    if (customerVerify.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Referential integrity violation: Customer ${custId} does not exist in Customer table.` 
      });
    }
    
    // Step 2: Verify Invoice exists and belongs to Customer
    const invoiceVerify = await conn.execute(
      'SELECT Invoice_ID, Cust_ID, Status FROM Invoice WHERE Invoice_ID = :invoiceId',
      [finalInvoiceId]
    );
    
    if (invoiceVerify.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Referential integrity violation: Invoice ${finalInvoiceId} does not exist in Invoice table. Cannot create payment.` 
      });
    }
    
    const [verifyInvId, verifyCustId, verifyInvStatus] = invoiceVerify.rows[0];
    
    if (String(verifyCustId) !== String(custId)) {
      return res.status(400).json({ 
        success: false, 
        error: `Referential integrity violation: Invoice ${verifyInvId} belongs to Customer ${verifyCustId}, but payment is being created for Customer ${custId}.` 
      });
    }
    
    // IMPORTANT: Admin endpoint should NOT create Payment records
    // Payment records should only be created when customers actually pay via /api/customer/pay
    // Admin endpoint only creates/updates Invoices (bills) for customers to pay later
    
    // Update Invoice Due_Date if provided (for both new and existing invoices)
    if (dueDate && finalInvoiceId) {
      try {
        const parsedDate = new Date(dueDate);
        if (!isNaN(parsedDate.getTime())) {
          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');
          const invoiceDueDate = `${year}-${month}-${day}`;
      await conn.execute(
            'UPDATE Invoice SET Due_Date = TO_DATE(:dueDate, \'YYYY-MM-DD\') WHERE Invoice_ID = :invoiceId',
            [invoiceDueDate, finalInvoiceId]
          );
          console.log(`✅ Invoice ${finalInvoiceId} due date set to ${invoiceDueDate}`);
        }
      } catch (e) {
        console.warn(`Error setting due date for invoice ${finalInvoiceId}:`, e.message);
      }
    }
    
    // Keep invoice status as 'Pending' - customer will complete payment in customer portal
    // Invoice status remains 'Pending' until customer pays via /api/customer/pay
    console.log(`✅ Invoice ${finalInvoiceId} created/updated for Customer ${custId} (Status: Pending - awaiting customer payment)`);
    
    // Check if Bill exists for this customer, create/update as needed (but keep status as unpaid)
    try {
      const billCheck = await conn.execute(
        'SELECT Bill_ID, Status, Due_Date FROM Bill WHERE Account_ID = :accountId ORDER BY Bill_ID DESC',
        [custId],
        { maxRows: 1 }
      );
      
      // Parse due date if provided, otherwise use default (SYSDATE + 20 days)
      let finalDueDate;
      if (dueDate) {
        try {
          // Validate date format and convert to Oracle DATE
          const parsedDate = new Date(dueDate);
          if (isNaN(parsedDate.getTime())) {
            console.warn(`Invalid due date format: ${dueDate}, using default`);
            finalDueDate = null; // Will use default
          } else {
            // Format as YYYY-MM-DD for Oracle
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            finalDueDate = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.warn(`Error parsing due date: ${dueDate}, using default`);
          finalDueDate = null;
        }
      }
      
      if (billCheck.rows && billCheck.rows.length > 0) {
        // Bill exists, update due date if provided
        const existingBillId = billCheck.rows[0][0];
        if (finalDueDate) {
          await conn.execute(
            'UPDATE Bill SET Due_Date = TO_DATE(:dueDate, \'YYYY-MM-DD\') WHERE Bill_ID = :billId',
            [finalDueDate, existingBillId]
          );
          console.log(`✅ Bill ${existingBillId} due date updated to ${finalDueDate}`);
      } else {
          console.log(`✅ Bill ${existingBillId} exists, status remains unpaid until customer payment`);
        }
      } else {
        // No Bill exists, create a new one for this payment (with unpaid status)
        const meterCheck = await conn.execute(
          'SELECT Meter_ID FROM Meter WHERE Account_ID = :accountId',
          [custId],
          { maxRows: 1 }
        );
        
        if (meterCheck.rows && meterCheck.rows.length > 0) {
          const meterId = meterCheck.rows[0][0];
          const billIdRes = await conn.execute('SELECT NVL(MAX(Bill_ID),0)+1 FROM Bill');
          const newBillId = billIdRes.rows[0][0];
          
          if (finalDueDate) {
          await conn.execute(
            `INSERT INTO Bill (Bill_ID, Issue_Date, Due_Date, Account_ID, Meter_ID, Rate_Per_Unit, Status) 
               VALUES (:billId, SYSDATE, TO_DATE(:dueDate, 'YYYY-MM-DD'), :accountId, :meterId, :ratePerUnit, 0)`,
              [newBillId, finalDueDate, custId, meterId, UNIT_RATE]
            );
            console.log(`✅ New Bill ${newBillId} created with due date ${finalDueDate} (unpaid status)`);
          } else {
            await conn.execute(
              `INSERT INTO Bill (Bill_ID, Issue_Date, Due_Date, Account_ID, Meter_ID, Rate_Per_Unit, Status) 
               VALUES (:billId, SYSDATE, SYSDATE + 20, :accountId, :meterId, :ratePerUnit, 0)`,
            [newBillId, custId, meterId, UNIT_RATE]
          );
            console.log(`✅ New Bill ${newBillId} created with unpaid status (customer will complete payment)`);
          }
        } else {
          console.log(`⚠️  No Meter found for Customer ${custId}, skipping Bill creation`);
        }
      }
    } catch (billErr) {
      console.error('Bill operation error:', billErr);
      // Don't fail payment if Bill operation fails, just log it
    }
    
    await conn.commit();
    
    // Get created invoice with customer name
    const createdInvoice = await conn.execute(
      `SELECT i.*, c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name
       FROM Invoice i
       JOIN Customer c ON c.Cust_ID = i.Cust_ID
       WHERE i.Invoice_ID = :invoiceId`,
      [finalInvoiceId]
    );
    
    res.json({ 
      success: true, 
      invoice: createdInvoice.rows[0],
      message: 'Invoice created successfully. Customer can now pay via customer portal.',
      calculated: {
        unitsConsumed: units,
        tariffId: tariff,
        tariffDescription: tariffDescription || 'Unknown',
        unitRate: UNIT_RATE,
        baseAmount,
        tax,
        grandTotal,
        amountPaid
      }
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Create payment error:', err);
    console.error('Error details:', err.message, err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to create payment',
      details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Get single payment details for modal - MUST be after the POST route
app.get('/api/admin/payment/:paymentId', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    const paymentId = parseInt(req.params.paymentId);
    conn = await getConnection();
    
    const paymentSql = `
      SELECT 
        p.Payment_ID,
        p.Invoice_ID,
        p.Amount_Paid,
        p.Payment_Date,
        p.Payment_Mode,
        p.Transaction_Ref,
        p.Units_Consumed,
        i.Invoice_ID,
        i.Invoice_Date,
        i.Base_Amount,
        i.Tax,
        i.Grand_Total,
        i.Status AS Invoice_Status,
        c.Cust_ID,
        c.FirstName,
        c.MiddleName,
        c.LastName,
        c.Email,
        c.ContactNo,
        c.Address,
        c.Adhaar
      FROM Payment p
      JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
      JOIN Customer c ON c.Cust_ID = i.Cust_ID
      WHERE p.Payment_ID = :id
    `;
    const paymentResult = await conn.execute(paymentSql, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, payment: paymentResult.rows[0] });
  } catch (err) {
    console.error('Payment details error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Admin Dashboard Statistics
app.get('/api/admin/dashboard/stats', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    
    // Total Customers
    const custCount = await conn.execute('SELECT COUNT(*) FROM Customer');
    const totalCustomers = custCount.rows[0][0];
    
    // Total Invoices
    const invCount = await conn.execute('SELECT COUNT(*) FROM Invoice');
    const totalInvoices = invCount.rows[0][0];
    
    // Paid Invoices
    const paidCount = await conn.execute("SELECT COUNT(*) FROM Invoice WHERE Status = 'Paid'");
    const paidInvoices = paidCount.rows[0][0];
    
    // Pending Invoices
    const pendingCount = await conn.execute("SELECT COUNT(*) FROM Invoice WHERE Status = 'Pending'");
    const pendingInvoices = pendingCount.rows[0][0];
    
    // Total Payments Received (SUM)
    const totalPayRes = await conn.execute('SELECT NVL(SUM(Amount_Paid), 0) FROM Payment');
    const totalPayments = totalPayRes.rows[0][0] || 0;
    
    // Recent Payments (5 latest) with Customer info
    const recentPaymentsQuery = `
      SELECT 
        c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
        p.Invoice_ID,
        p.Amount_Paid,
        p.Payment_Date,
        p.Payment_Mode,
        p.Transaction_Ref
      FROM Payment p
      JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
      JOIN Customer c ON c.Cust_ID = i.Cust_ID
      ORDER BY p.Payment_Date DESC
    `;
    const recentPaymentsResult = await conn.execute(recentPaymentsQuery, [], { maxRows: 5 });
    const recentPayments = recentPaymentsResult.rows || [];
    
    // Payments by Month (for chart)
    const paymentsByMonth = await conn.execute(`
      SELECT 
        TO_CHAR(Payment_Date, 'YYYY-MM') AS Month,
        SUM(Amount_Paid) AS Total
      FROM Payment
      WHERE Payment_Date >= ADD_MONTHS(SYSDATE, -6)
      GROUP BY TO_CHAR(Payment_Date, 'YYYY-MM')
      ORDER BY Month
    `);
    
    res.json({
      success: true,
      stats: {
        totalCustomers,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        totalPaymentsReceived: totalPayments
      },
      recentPayments: recentPayments,
      paymentsByMonth: paymentsByMonth.rows || []
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: err.message, details: err.toString() });
  } finally {
    if (conn) {
      try { await conn.close(); } catch(e) {}
    }
  }
});

// ==================== CUSTOMER ROUTES ====================
// Customer Dashboard - Comprehensive data endpoint
app.get('/api/customer/dashboard', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const custId = parseInt(req.user.sub);
    if (!custId || isNaN(custId)) {
      return res.status(400).json({ success: false, error: 'Invalid customer ID' });
    }
    conn = await getConnection();
    
    // Get Customer Information
    const customerRes = await conn.execute(`
      SELECT 
        Cust_ID,
        FirstName,
        MiddleName,
        LastName,
        Email,
        ContactNo,
        Address,
        Adhaar
      FROM Customer
      WHERE Cust_ID = :custId
    `, [custId], { maxRows: 1 });
    
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    const customerInfo = {
      customerId: customerRes.rows[0][0] || null,
      firstName: customerRes.rows[0][1] || null,
      middleName: customerRes.rows[0][2] || null,
      lastName: customerRes.rows[0][3] || null,
      email: customerRes.rows[0][4] || null,
      contactNo: customerRes.rows[0][5] || null,
      address: customerRes.rows[0][6] || null,
      adhaar: customerRes.rows[0][7] || null
    };
    
    // Summary Cards Data
    // 1. Current Outstanding Amount: sum of Invoice.Grand_Total where Status IN ('Pending','Partially Paid') minus sum of payments
    // Calculate outstanding for each invoice individually to ensure accuracy
    let outstanding = 0;
    try {
      const outstandingRes = await conn.execute(`
        SELECT 
          i.Invoice_ID,
          i.Grand_Total,
          NVL((SELECT SUM(p.Amount_Paid) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID), 0) AS total_paid
        FROM Invoice i
        WHERE i.Cust_ID = :custId AND i.Status IN ('Pending', 'Partially Paid')
      `, [custId]);
      
      // Calculate outstanding amount for each invoice
      if (outstandingRes.rows && outstandingRes.rows.length > 0) {
        outstandingRes.rows.forEach(row => {
          const grandTotal = parseFloat(row[1]) || 0;
          const totalPaid = parseFloat(row[2]) || 0;
          const invoiceOutstanding = grandTotal - totalPaid;
          if (invoiceOutstanding > 0) {
            outstanding += invoiceOutstanding;
          }
        });
      }
    } catch (outstandingErr) {
      console.error('Error calculating outstanding amount:', outstandingErr.message);
      outstanding = 0;
    }
    
    // 2. Current Month Consumption (units): 
    // Get units from:
    // - Payments made this month (if Units_Consumed is stored in payment)
    // - Invoices created this month (derive units from Base_Amount / Rate_Per_Unit from customer's tariff)
    let currentMonthConsumption = 0;
    try {
      const currentMonthConsumptionRes = await conn.execute(`
        SELECT NVL(SUM(units), 0) FROM (
          -- Units from payments made this month
          SELECT p.Units_Consumed AS units
          FROM Payment p
          JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
          WHERE i.Cust_ID = :custId
            AND EXTRACT(YEAR FROM p.Payment_Date) = EXTRACT(YEAR FROM SYSDATE)
            AND EXTRACT(MONTH FROM p.Payment_Date) = EXTRACT(MONTH FROM SYSDATE)
            AND p.Units_Consumed IS NOT NULL
          
          UNION ALL
          
          -- Units from invoices created this month (derive from base amount / rate)
          SELECT CASE 
            WHEN NVL((SELECT t.Rate_Per_Unit FROM Meter m JOIN Tariff t ON t.Tariff_ID = m.Tariff_ID WHERE m.Account_ID = i.Cust_ID AND ROWNUM = 1), 0) > 0
            THEN ROUND(i.Base_Amount / (SELECT t.Rate_Per_Unit FROM Meter m JOIN Tariff t ON t.Tariff_ID = m.Tariff_ID WHERE m.Account_ID = i.Cust_ID AND ROWNUM = 1), 2)
            ELSE 0
          END AS units
          FROM Invoice i
          WHERE i.Cust_ID = :custId
            AND EXTRACT(YEAR FROM i.Invoice_Date) = EXTRACT(YEAR FROM SYSDATE)
            AND EXTRACT(MONTH FROM i.Invoice_Date) = EXTRACT(MONTH FROM SYSDATE)
            AND NOT EXISTS (
              -- Only count invoices that don't have payments yet (or payments don't have units)
              SELECT 1 FROM Payment p 
              WHERE p.Invoice_ID = i.Invoice_ID 
                AND p.Units_Consumed IS NOT NULL
                AND EXTRACT(YEAR FROM p.Payment_Date) = EXTRACT(YEAR FROM SYSDATE)
                AND EXTRACT(MONTH FROM p.Payment_Date) = EXTRACT(MONTH FROM SYSDATE)
            )
            AND i.Base_Amount > 0
        )
      `, [custId]);
      currentMonthConsumption = currentMonthConsumptionRes.rows[0] && currentMonthConsumptionRes.rows[0][0] ? (currentMonthConsumptionRes.rows[0][0] || 0) : 0;
    } catch (consumptionErr) {
      console.error('Error fetching current month consumption (non-critical):', consumptionErr.message);
      // Continue with 0 consumption
    }
    
    // 3. Next Due Date: nearest Invoice.Due_Date, Bill.Due_Date, or Invoice_Date + 20 days for unpaid invoices
    let nextDueDate = null;
    try {
      const nextDueDateRes = await conn.execute(`
        SELECT TO_CHAR(MIN(next_due), 'YYYY-MM-DD') AS next_due FROM (
          SELECT NVL(i.Due_Date, i.Invoice_Date + 20) AS next_due
          FROM Invoice i
          WHERE i.Cust_ID = :custId AND i.Status IN ('Pending', 'Partially Paid')
          UNION
          SELECT b.Due_Date AS next_due
          FROM Bill b
          WHERE b.Account_ID = :custId AND b.Status = 0
        )
      `, [custId]);
      nextDueDate = nextDueDateRes.rows[0] && nextDueDateRes.rows[0][0] ? nextDueDateRes.rows[0][0] : null;
    } catch (dueDateErr) {
      console.error('Error fetching next due date (non-critical):', dueDateErr.message);
      // Continue without due date
    }
    
    // 4. Last Payment: latest Payment_Date and amount
    let lastPayment = null;
    try {
      const lastPaymentRes = await conn.execute(`
        SELECT p.Payment_Date, p.Amount_Paid
        FROM Payment p
        JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
        WHERE i.Cust_ID = :custId
        ORDER BY p.Payment_Date DESC
      `, [custId], { maxRows: 1 });
      const lastPaymentRaw = lastPaymentRes.rows.length > 0 ? {
        date: lastPaymentRes.rows[0][0],
        amount: lastPaymentRes.rows[0][1]
      } : null;
      lastPayment = lastPaymentRaw ? {
        date: lastPaymentRaw.date ? (lastPaymentRaw.date instanceof Date ? lastPaymentRaw.date.toISOString().split('T')[0] : String(lastPaymentRaw.date).split('T')[0]) : null,
        amount: lastPaymentRaw.amount
      } : null;
    } catch (lastPaymentErr) {
      console.error('Error fetching last payment (non-critical):', lastPaymentErr.message);
      // Continue without last payment
    }
    
    // 5. Total Paid (YTD): SUM of Payment.Amount_Paid for current year
    let totalPaidYTD = 0;
    try {
      const totalPaidYTDRes = await conn.execute(`
        SELECT NVL(SUM(p.Amount_Paid), 0)
        FROM Payment p
        JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
        WHERE i.Cust_ID = :custId
          AND EXTRACT(YEAR FROM p.Payment_Date) = EXTRACT(YEAR FROM SYSDATE)
      `, [custId]);
      totalPaidYTD = totalPaidYTDRes.rows[0] && totalPaidYTDRes.rows[0][0] ? (totalPaidYTDRes.rows[0][0] || 0) : 0;
    } catch (totalPaidErr) {
      console.error('Error fetching total paid YTD (non-critical):', totalPaidErr.message);
      totalPaidYTD = 0;
    }
    
    // Active / Current Bill Card - First unpaid invoice
    let activeBill = null;
    try {
      const activeBillRes = await conn.execute(`
        SELECT 
          i.Invoice_ID,
          i.Invoice_Date,
          i.Base_Amount,
          i.Tax,
          i.Grand_Total,
          i.Status,
          TO_CHAR(NVL(i.Due_Date, NVL((SELECT MIN(b.Due_Date) FROM Bill b WHERE b.Account_ID = i.Cust_ID AND b.Status = 0), i.Invoice_Date + 20)), 'YYYY-MM-DD') AS due_date,
          (SELECT NVL(SUM(p.Amount_Paid), 0) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS amount_paid,
          (SELECT MAX(p.Units_Consumed) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS units_consumed
        FROM Invoice i
        WHERE i.Cust_ID = :custId 
          AND i.Status IN ('Pending', 'Partially Paid')
        ORDER BY i.Invoice_Date DESC
      `, [custId], { maxRows: 1 });
      activeBill = activeBillRes.rows.length > 0 ? {
        invoiceId: activeBillRes.rows[0][0],
        invoiceDate: activeBillRes.rows[0][1],
        baseAmount: activeBillRes.rows[0][2] || 0,
        tax: activeBillRes.rows[0][3] || 0,
        grandTotal: activeBillRes.rows[0][4] || 0,
        status: activeBillRes.rows[0][5] || 'Pending',
        dueDate: activeBillRes.rows[0][6] || null,
        amountPaid: activeBillRes.rows[0][7] || 0,
        unitsConsumed: activeBillRes.rows[0][8] || null
      } : null;
    } catch (activeBillErr) {
      console.error('Error fetching active bill (non-critical):', activeBillErr.message);
      // Continue without active bill
    }
    
    // Billing Timeline / Recent Bills - Last 6 invoices
    let recentBills = [];
    try {
      const recentBillsRes = await conn.execute(`
        SELECT 
          i.Invoice_ID,
          i.Invoice_Date,
          TO_CHAR(NVL(i.Due_Date, NVL((SELECT MIN(b.Due_Date) FROM Bill b WHERE b.Account_ID = i.Cust_ID), i.Invoice_Date + 20)), 'YYYY-MM-DD') AS due_date,
          (SELECT MAX(p.Units_Consumed) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS units,
          i.Grand_Total,
          i.Status
        FROM Invoice i
        WHERE i.Cust_ID = :custId
        ORDER BY i.Invoice_Date DESC
      `, [custId], { maxRows: 6 });
      recentBills = recentBillsRes.rows.map(row => ({
        invoiceId: row[0] || null,
        invoiceDate: row[1] || null,
        dueDate: row[2] || null,
        units: row[3] || null,
        grandTotal: row[4] || 0,
        status: row[5] || 'Pending'
      }));
    } catch (recentBillsErr) {
      console.error('Error fetching recent bills (non-critical):', recentBillsErr.message);
      recentBills = [];
    }
    
    // Recent Payments - Last 5 payments
    let recentPayments = [];
    try {
      const recentPaymentsRes = await conn.execute(`
        SELECT 
          p.Payment_ID,
          p.Amount_Paid,
          p.Payment_Date,
          p.Payment_Mode,
          p.Transaction_Ref
        FROM Payment p
        JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
        WHERE i.Cust_ID = :custId
        ORDER BY p.Payment_Date DESC, p.Payment_ID DESC
      `, [custId], { maxRows: 5 });
      recentPayments = recentPaymentsRes.rows.map(row => ({
        paymentId: row[0] || null,
        amountPaid: row[1] || 0,
        paymentDate: row[2] || null,
        paymentMode: row[3] || null,
        transactionRef: row[4] || null
      }));
    } catch (recentPaymentsErr) {
      console.error('Error fetching recent payments (non-critical):', recentPaymentsErr.message);
      recentPayments = [];
    }
    
    // Meter & Tariff Info - Get all meters for the customer
    let meters = [];
    try {
      const meterRes = await conn.execute(`
        SELECT 
          m.Meter_ID,
          m.MeterType,
          m.InstallationDate,
          NVL(m.City, '') || ', ' || NVL(m.Street, '') || ', ' || NVL(m.HouseNo, '') || ', ' || NVL(m.State, '') || ' - ' || NVL(TO_CHAR(m.Pincode), '') AS address,
          t.Description AS tariff_description,
          t.Rate_Per_Unit,
          t.Effective_From,
          t.Effective_To,
          m.City,
          m.Street,
          m.HouseNo,
          m.State,
          m.Pincode
        FROM Meter m
        LEFT JOIN Tariff t ON t.Tariff_ID = m.Tariff_ID
        WHERE m.Account_ID = :custId
        ORDER BY m.InstallationDate DESC
      `, [custId]);
      
      if (meterRes.rows && meterRes.rows.length > 0) {
        meters = meterRes.rows.map(row => ({
          meterId: row[0] || null,
          meterType: row[1] || null,
          installationDate: row[2] || null,
          address: row[3] || null,
          tariffDescription: row[4] || null,
          ratePerUnit: row[5] || null,
          effectiveFrom: row[6] || null,
          effectiveTo: row[7] || null,
          city: row[8] || null,
          street: row[9] || null,
          houseNo: row[10] || null,
          state: row[11] || null,
          pincode: row[12] || null
        }));
      }
    } catch (meterErr) {
      console.error('Error fetching meters (non-critical):', meterErr.message);
      // Meters are optional, continue without them
    }
    
    res.json({
      success: true,
      customer: customerInfo,
      summary: {
        currentOutstandingAmount: outstanding || 0,
        currentMonthConsumption: currentMonthConsumption || 0,
        nextDueDate: nextDueDate || null,
        lastPayment: lastPayment || null,
        totalPaidYTD: totalPaidYTD || 0
      },
      activeBill: activeBill || null,
      recentBills: recentBills || [],
      recentPayments: recentPayments || [],
      meters: meters || [],
      meterInfo: meters.length > 0 ? meters[0] : null // Keep meterInfo for backward compatibility (first meter)
    });
  } catch (err) {
    console.error('Customer dashboard error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to load dashboard data',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Customer invoices list with full details
app.get('/api/customer/invoices', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const custId = parseInt(req.user.sub);
    conn = await getConnection();
    
    const sql = `
      SELECT 
        i.Invoice_ID,
        (SELECT MIN(b.Bill_ID) FROM Bill b WHERE b.Account_ID = i.Cust_ID) AS Bill_ID,
        i.Invoice_Date AS Issue_Date,
        TO_CHAR(NVL(i.Due_Date, NVL((SELECT MIN(b.Due_Date) FROM Bill b WHERE b.Account_ID = i.Cust_ID AND b.Status = 0), i.Invoice_Date + 20)), 'YYYY-MM-DD') AS Due_Date,
        (SELECT MAX(p.Units_Consumed) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS Units_Consumed,
        i.Base_Amount,
        i.Tax,
        i.Grand_Total,
        (SELECT NVL(SUM(p.Amount_Paid), 0) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS Amount_Paid,
        (i.Grand_Total - (SELECT NVL(SUM(p.Amount_Paid), 0) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID)) AS Outstanding,
        i.Status
      FROM Invoice i
      WHERE i.Cust_ID = :custId
      ORDER BY i.Invoice_Date DESC
    `;
    const r = await conn.execute(sql, [custId]);
    
    const invoices = r.rows.map(row => {
      const grandTotal = parseFloat(row[7]) || 0;
      const amountPaid = parseFloat(row[8]) || 0;
      const outstanding = Math.max(0, grandTotal - amountPaid); // Ensure non-negative
      
      return {
        invoiceId: row[0],
        billId: row[1],
        issueDate: row[2],
        dueDate: row[3],
        unitsConsumed: row[4],
        baseAmount: row[5],
        tax: row[6],
        grandTotal: grandTotal,
        amountPaid: amountPaid,
        outstanding: outstanding,
        status: row[10]
      };
    });
    
    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('Customer invoices error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/customer/bills', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn; try {
    const custId = parseInt(req.user.sub);
    conn = await getConnection();
    const sql = `SELECT b.Bill_ID, b.Issue_Date, b.Due_Date, b.Status,
                        i.Invoice_ID, i.Grand_Total, i.Status AS Invoice_Status
                 FROM Bill b
                 LEFT JOIN Invoice i ON (i.Cust_ID = :c)
                 WHERE b.Account_ID = :c`;
    const r = await conn.execute(sql, [custId]);
    res.json({ success:true, data: r.rows });
  } catch (err) { res.status(500).json({ success:false, error: err.message }); }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// Invoice detail by invoiceId
app.get('/api/customer/invoice/:invoiceId', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    const custId = parseInt(req.user.sub);
    conn = await getConnection();
    
    // Get invoice details
    const invoiceRes = await conn.execute(`
      SELECT 
        i.Invoice_ID,
        i.Invoice_Date,
        i.Base_Amount,
        i.Tax,
        i.Grand_Total,
        i.Status,
        (SELECT MAX(p.Units_Consumed) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS Units_Consumed,
        (SELECT NVL(SUM(p.Amount_Paid), 0) FROM Payment p WHERE p.Invoice_ID = i.Invoice_ID) AS Amount_Paid,
        (SELECT MIN(b.Bill_ID) FROM Bill b WHERE b.Account_ID = i.Cust_ID) AS Bill_ID,
        (SELECT MIN(b.Issue_Date) FROM Bill b WHERE b.Account_ID = i.Cust_ID) AS Bill_Issue_Date,
        TO_CHAR(NVL(i.Due_Date, NVL((SELECT MIN(b.Due_Date) FROM Bill b WHERE b.Account_ID = i.Cust_ID), i.Invoice_Date + 20)), 'YYYY-MM-DD') AS Bill_Due_Date
      FROM Invoice i
      WHERE i.Invoice_ID = :invoiceId AND i.Cust_ID = :custId
    `, [invoiceId, custId]);
    
    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    const invRow = invoiceRes.rows[0];
    const invoice = {
      invoiceId: invRow[0],
      invoiceDate: invRow[1],
      baseAmount: invRow[2],
      tax: invRow[3],
      grandTotal: invRow[4],
      status: invRow[5],
      unitsConsumed: invRow[6],
      amountPaid: invRow[7] || 0,
      outstanding: invRow[4] - (invRow[7] || 0),
      billId: invRow[8],
      billIssueDate: invRow[9],
      billDueDate: invRow[10]
    };
    
    // Get payment history
    const paymentsRes = await conn.execute(`
      SELECT 
        p.Payment_ID,
        p.Amount_Paid,
        p.Payment_Date,
        p.Payment_Mode,
        p.Transaction_Ref
      FROM Payment p
      WHERE p.Invoice_ID = :invoiceId
      ORDER BY p.Payment_Date DESC, p.Payment_ID DESC
    `, [invoiceId]);
    
    const payments = paymentsRes.rows.map(row => ({
      paymentId: row[0],
      amountPaid: row[1],
      paymentDate: row[2],
      paymentMode: row[3],
      transactionRef: row[4]
    }));
    
    // Get meter info
    const meterRes = await conn.execute(`
      SELECT 
        m.Meter_ID,
        m.MeterType,
        m.InstallationDate,
        m.City || ', ' || m.Street || ', ' || m.HouseNo || ', ' || m.State || ' - ' || m.Pincode AS address,
        t.Description AS tariff_description,
        t.Rate_Per_Unit
      FROM Meter m
      LEFT JOIN Tariff t ON t.Tariff_ID = m.Tariff_ID
      WHERE m.Account_ID = :custId
    `, [custId], { maxRows: 1 });
    
    const meterInfo = meterRes.rows.length > 0 ? {
      meterId: meterRes.rows[0][0],
      meterType: meterRes.rows[0][1],
      installationDate: meterRes.rows[0][2],
      address: meterRes.rows[0][3],
      tariffDescription: meterRes.rows[0][4],
      ratePerUnit: meterRes.rows[0][5]
    } : null;
    
    res.json({
      success: true,
      invoice,
      payments,
      meterInfo
    });
  } catch (err) {
    console.error('Invoice detail error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Legacy endpoint
app.get('/api/customer/bill/:billId', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn; try {
    const billId = parseInt(req.params.billId);
    const custId = parseInt(req.user.sub);
    conn = await getConnection();
    const bill = await conn.execute('SELECT * FROM Bill WHERE Bill_ID = :b AND Account_ID = :c', [billId, custId]);
    const inv = await conn.execute('SELECT * FROM Invoice WHERE Cust_ID = :c ORDER BY Invoice_Date DESC', [custId]);
    res.json({ success:true, bill: bill.rows, invoices: inv.rows });
  } catch (err) { res.status(500).json({ success:false, error: err.message }); }
  finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

app.post('/api/customer/pay', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const { invoiceId, paymentMode, transactionRef, amount, notes } = req.body;
    
    if (!invoiceId || !amount) {
      return res.status(400).json({ success: false, error: 'invoiceId and amount required' });
    }
    
    if (!transactionRef || transactionRef.trim() === '') {
      return res.status(400).json({ success: false, error: 'Transaction reference is required' });
    }
    
    conn = await getConnection();
    
    // Get invoice details
    const invRes = await conn.execute(
      'SELECT Grand_Total, Cust_ID, Status FROM Invoice WHERE Invoice_ID = :1',
      [invoiceId]
    );
    
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    const [grandTotal, custId, currentStatus] = invRes.rows[0];
    
    if (String(custId) !== String(req.user.sub)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    // Get total amount already paid
    const paidRes = await conn.execute(
      'SELECT NVL(SUM(Amount_Paid), 0) FROM Payment WHERE Invoice_ID = :1',
      [invoiceId]
    );
    const totalPaid = paidRes.rows[0][0] || 0;
    const outstanding = grandTotal - totalPaid;
    
    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }
    
    // Round to 2 decimal places to avoid floating-point precision issues
    const roundedAmount = Math.round(paymentAmount * 100) / 100;
    const roundedOutstanding = Math.round(outstanding * 100) / 100;
    
    if (roundedAmount > roundedOutstanding) {
      return res.status(400).json({ 
        success: false, 
        error: `Amount exceeds outstanding amount of ${outstanding.toFixed(2)}` 
      });
    }
    
    // Check for duplicate transaction reference
    const duplicateCheck = await conn.execute(
      'SELECT COUNT(*) FROM Payment WHERE Transaction_Ref = :1 AND Transaction_Ref IS NOT NULL',
      [transactionRef.trim()]
    );
    
    if (duplicateCheck.rows[0][0] > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction reference already exists. Please use a unique transaction reference.' 
      });
    }
    
    // Create payment record
    const payIdRes = await conn.execute('SELECT NVL(MAX(Payment_ID),0)+1 FROM Payment');
    const payId = payIdRes.rows[0][0];
    
    await conn.execute(
      'INSERT INTO Payment(Payment_ID, Invoice_ID, Amount_Paid, Payment_Date, Payment_Mode, Transaction_Ref, Units_Consumed) VALUES (:1, :2, :3, SYSDATE, :4, :5, NULL)',
      [payId, invoiceId, paymentAmount, paymentMode || 'Other', transactionRef.trim()]
    );
    
    // Calculate new total paid
    const newTotalPaid = totalPaid + paymentAmount;
    
    // Update invoice status based on payment
    if (newTotalPaid >= grandTotal) {
      await conn.execute("UPDATE Invoice SET Status = 'Paid' WHERE Invoice_ID = :1", [invoiceId]);
      // Update bill status if invoice is fully paid
      await conn.execute('UPDATE Bill SET Status = 1 WHERE Account_ID = :1', [custId]);
    } else if (newTotalPaid > 0 && newTotalPaid < grandTotal) {
      await conn.execute("UPDATE Invoice SET Status = 'Partially Paid' WHERE Invoice_ID = :1", [invoiceId]);
    }
    
    await conn.commit();
    
    // Get created payment with customer details for receipt
    const receiptRes = await conn.execute(`
      SELECT 
        p.Payment_ID,
        p.Invoice_ID,
        p.Amount_Paid,
        TO_CHAR(p.Payment_Date, 'YYYY-MM-DD') AS Payment_Date,
        p.Payment_Mode,
        p.Transaction_Ref,
        TO_CHAR(i.Invoice_Date, 'YYYY-MM-DD') AS Invoice_Date,
        i.Grand_Total,
        i.Status AS Invoice_Status,
        c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
        c.Email AS Customer_Email,
        c.ContactNo AS Customer_Phone,
        c.Address AS Customer_Address
      FROM Payment p
      JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
      JOIN Customer c ON c.Cust_ID = i.Cust_ID
      WHERE p.Payment_ID = :1
    `, [payId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    // Get updated invoice
    const updatedInvoiceRes = await conn.execute(
      'SELECT Invoice_ID, Invoice_Date, Base_Amount, Tax, Grand_Total, Status FROM Invoice WHERE Invoice_ID = :1',
      [invoiceId]
    );
    
    const receiptData = receiptRes.rows[0];
    const receipt = {
      paymentId: receiptData.PAYMENT_ID,
      invoiceId: receiptData.INVOICE_ID,
      amountPaid: receiptData.AMOUNT_PAID,
      paymentDate: receiptData.PAYMENT_DATE,
      paymentMode: receiptData.PAYMENT_MODE,
      transactionRef: receiptData.TRANSACTION_REF,
      invoiceDate: receiptData.INVOICE_DATE,
      invoiceTotal: receiptData.GRAND_TOTAL,
      invoiceStatus: receiptData.INVOICE_STATUS,
      customerName: receiptData.CUSTOMER_NAME,
      customerEmail: receiptData.CUSTOMER_EMAIL,
      customerPhone: receiptData.CUSTOMER_PHONE,
      customerAddress: receiptData.CUSTOMER_ADDRESS
    };
    
    // Get payment array for backward compatibility
    const createdPaymentRes = await conn.execute('SELECT * FROM Payment WHERE Payment_ID = :1', [payId]);
    
    res.json({
      success: true,
      payment: createdPaymentRes.rows[0],
      invoice: updatedInvoiceRes.rows[0],
      receipt: receipt,
      message: 'Payment processed successfully'
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Customer payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Customer submit feedback
app.post('/api/customer/feedback', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const { invoiceId, text, rating } = req.body;
    const custId = parseInt(req.user.sub);
    
    // Validate feedback text (required, max 500 chars)
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'Feedback text is required' });
    }
    if (text.length > 500) {
      return res.status(400).json({ success: false, error: 'Feedback text cannot exceed 500 characters' });
    }
    
    // Validate rating (1-5)
    const ratingNum = rating ? parseInt(rating) : null;
    if (ratingNum && (ratingNum < 1 || ratingNum > 5)) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }
    
    // Validate invoice ID if provided
    if (invoiceId) {
      const invId = parseInt(invoiceId);
    conn = await getConnection();
      const invCheck = await conn.execute(
        'SELECT Cust_ID FROM Invoice WHERE Invoice_ID = :invoiceId',
        [invId]
      );
      if (invCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      if (String(invCheck.rows[0][0]) !== String(custId)) {
        return res.status(403).json({ success: false, error: 'Invoice does not belong to you' });
      }
    } else {
      conn = await getConnection();
    }
    
    // Create feedback
    const idRes = await conn.execute('SELECT NVL(MAX(Feedback_ID),0)+1 FROM Feedback');
    const fid = idRes.rows[0][0];
    
    // Query ALL columns in the Feedback table to find the date column
    let dateColumnName = null;
    try {
      const colCheck = await conn.execute(`
        SELECT column_name 
        FROM user_tab_columns 
        WHERE table_name = 'FEEDBACK'
        ORDER BY column_id
      `);
      console.log('All Feedback table columns:', colCheck.rows.map(r => r[0]));
      
      // Look for any column that might be a date column
      const dateCols = colCheck.rows.filter(row => {
        const colName = row[0].toUpperCase();
        return colName.includes('DATE') || colName === 'DATE';
      });
      
      if (dateCols.length > 0) {
        dateColumnName = dateCols[0][0];
        console.log('Found date column:', dateColumnName);
      }
    } catch (colQueryErr) {
      console.error('Error querying column names:', colQueryErr.message);
    }
    
    // If we found a column, use it with proper quoting; otherwise try common variations
    let insertSuccess = false;
    let variations;
    if (dateColumnName) {
      // If column name is uppercase (Oracle default), we may need quotes
      // If it has mixed case, we definitely need quotes
      const upperName = dateColumnName.toUpperCase();
      if (upperName === dateColumnName) {
        // It's uppercase, try both with and without quotes
        variations = [`"${dateColumnName}"`, dateColumnName];
      } else {
        // Mixed case, must use quotes
        variations = [`"${dateColumnName}"`];
      }
    } else {
      variations = ['"DATE"', '"Date"', 'Feedback_Date', 'Submission_Date', 'CREATED_DATE', 'CREATED_AT'];
    }
    
    for (const dateCol of variations) {
      try {
        const sql = `INSERT INTO Feedback(Feedback_ID, Cust_ID, Invoice_ID, Feedback_Text, ${dateCol}, Rating) VALUES (:1, :2, :3, :4, SYSDATE, :5)`;
        await conn.execute(sql, [fid, custId, invoiceId ? parseInt(invoiceId) : null, text.trim(), ratingNum]);
        insertSuccess = true;
        console.log(`Successfully inserted feedback using column: ${dateCol}`);
        break;
      } catch (colErr) {
        console.log(`Failed with column ${dateCol}:`, colErr.message);
        // Continue to next variation
        if (dateCol === variations[variations.length - 1]) {
          // Last variation failed, throw the error
          throw new Error(`Could not insert feedback. Tried columns: ${variations.join(', ')}. Last error: ${colErr.message}`);
        }
      }
    }
    
    if (!insertSuccess) {
      throw new Error('Could not insert feedback - column name issue');
    }
    await conn.commit();
    res.json({ success: true, feedbackId: fid, message: 'Feedback submitted successfully' });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(e){} }
    console.error('Feedback submission error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Customer get their feedbacks
app.get('/api/customer/feedback', requireAuth, roleMiddleware('customer'), async (req, res) => {
  let conn;
  try {
    const custId = parseInt(req.user.sub);
    conn = await getConnection();
    // Try different column name variations for Date
    let feedbackRes;
    try {
      feedbackRes = await conn.execute(`
        SELECT 
          f.Feedback_ID,
          f.Invoice_ID,
          f.Feedback_Text,
          f.Rating,
          TO_CHAR(f."DATE", 'YYYY-MM-DD') AS Feedback_Date,
          i.Invoice_Date,
          i.Grand_Total
        FROM Feedback f
        LEFT JOIN Invoice i ON i.Invoice_ID = f.Invoice_ID
        WHERE f.Cust_ID = :custId
        ORDER BY f."DATE" DESC
      `, [custId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (e) {
      // Try with "Date" (mixed case)
      feedbackRes = await conn.execute(`
        SELECT 
          f.Feedback_ID,
          f.Invoice_ID,
          f.Feedback_Text,
          f.Rating,
          TO_CHAR(f."Date", 'YYYY-MM-DD') AS Feedback_Date,
          i.Invoice_Date,
          i.Grand_Total
        FROM Feedback f
        LEFT JOIN Invoice i ON i.Invoice_ID = f.Invoice_ID
        WHERE f.Cust_ID = :custId
        ORDER BY f."Date" DESC
      `, [custId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    }
    
    const feedbacks = feedbackRes.rows.map(row => ({
      feedbackId: row.FEEDBACK_ID,
      invoiceId: row.INVOICE_ID,
      invoiceDate: row.INVOICE_DATE,
      invoiceTotal: row.GRAND_TOTAL,
      text: row.FEEDBACK_TEXT,
      rating: row.RATING,
      date: row.FEEDBACK_DATE
    }));
    
    res.json({ success: true, data: feedbacks });
  } catch (err) {
    console.error('Get customer feedbacks error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// Admin get all feedbacks
app.get('/api/admin/feedback', requireAuth, roleMiddleware('admin'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    
    // Query the actual column name from the database (same as INSERT)
    let dateColumnName = null;
    try {
      const colCheck = await conn.execute(`
        SELECT column_name 
        FROM user_tab_columns 
        WHERE table_name = 'FEEDBACK'
        ORDER BY column_id
      `);
      const dateCols = colCheck.rows.filter(row => {
        const colName = row[0].toUpperCase();
        return colName.includes('DATE') || colName === 'DATE';
      });
      if (dateCols.length > 0) {
        dateColumnName = dateCols[0][0];
      }
    } catch (colQueryErr) {
      console.error('Error querying column names:', colQueryErr.message);
    }
    
    // Build column reference based on detected name
    let dateColRef;
    if (dateColumnName) {
      const upperName = dateColumnName.toUpperCase();
      if (upperName === dateColumnName) {
        // Uppercase, try with quotes first
        dateColRef = `"${dateColumnName}"`;
      } else {
        // Mixed case, must use quotes
        dateColRef = `"${dateColumnName}"`;
      }
    } else {
      dateColRef = '"DATE"'; // Default fallback
    }
    
    // Try different column name variations for Date
    let feedbackRes;
    try {
      feedbackRes = await conn.execute(`
        SELECT 
          f.Feedback_ID,
          f.Cust_ID,
          c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
          c.Email AS Customer_Email,
          f.Invoice_ID,
          f.Feedback_Text,
          f.Rating,
          TO_CHAR(f.${dateColRef}, 'YYYY-MM-DD HH24:MI:SS') AS Feedback_Date,
          i.Invoice_Date,
          i.Grand_Total,
          i.Status AS Invoice_Status
        FROM Feedback f
        JOIN Customer c ON c.Cust_ID = f.Cust_ID
        LEFT JOIN Invoice i ON i.Invoice_ID = f.Invoice_ID
        ORDER BY f.${dateColRef} DESC
      `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (e) {
      // Try with "Date" (mixed case) as fallback
      try {
        feedbackRes = await conn.execute(`
          SELECT 
            f.Feedback_ID,
            f.Cust_ID,
            c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
            c.Email AS Customer_Email,
            f.Invoice_ID,
            f.Feedback_Text,
            f.Rating,
            TO_CHAR(f."Date", 'YYYY-MM-DD HH24:MI:SS') AS Feedback_Date,
            i.Invoice_Date,
            i.Grand_Total,
            i.Status AS Invoice_Status
          FROM Feedback f
          JOIN Customer c ON c.Cust_ID = f.Cust_ID
          LEFT JOIN Invoice i ON i.Invoice_ID = f.Invoice_ID
          ORDER BY f."Date" DESC
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      } catch (e2) {
        // Last fallback - try "DATE" with quotes
        feedbackRes = await conn.execute(`
          SELECT 
            f.Feedback_ID,
            f.Cust_ID,
            c.FirstName || ' ' || NVL(c.MiddleName || ' ', '') || c.LastName AS Customer_Name,
            c.Email AS Customer_Email,
            f.Invoice_ID,
            f.Feedback_Text,
            f.Rating,
            TO_CHAR(f."DATE", 'YYYY-MM-DD HH24:MI:SS') AS Feedback_Date,
            i.Invoice_Date,
            i.Grand_Total,
            i.Status AS Invoice_Status
          FROM Feedback f
          JOIN Customer c ON c.Cust_ID = f.Cust_ID
          LEFT JOIN Invoice i ON i.Invoice_ID = f.Invoice_ID
          ORDER BY f."DATE" DESC
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      }
    }
    
    const feedbacks = feedbackRes.rows.map(row => ({
      feedbackId: row.FEEDBACK_ID,
      customerId: row.CUST_ID,
      customerName: row.CUSTOMER_NAME,
      customerEmail: row.CUSTOMER_EMAIL,
      invoiceId: row.INVOICE_ID,
      invoiceDate: row.INVOICE_DATE,
      invoiceTotal: row.GRAND_TOTAL,
      invoiceStatus: row.INVOICE_STATUS,
      text: row.FEEDBACK_TEXT,
      rating: row.RATING,
      date: row.FEEDBACK_DATE
    }));
    
    res.json({ success: true, data: feedbacks });
  } catch (err) {
    console.error('Get admin feedbacks error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) { try { await conn.close(); } catch(e){} }
  }
});

// ==================== SHARED ROUTES ====================
// Tariffs endpoint is defined earlier with admin routes

app.get('/api/meters/:meterId', requireAuth, async (req, res) => {
  let conn; try { const id = parseInt(req.params.meterId); conn = await getConnection(); const r = await conn.execute('SELECT * FROM Meter WHERE Meter_ID = :id', [id]); if (r.rows.length===0) return res.status(404).json({ success:false, error:'Not found' }); res.json({ success:true, data:r.rows[0] }); } catch (err) { res.status(500).json({ success:false, error: err.message }); } finally { if (conn) { try { await conn.close(); } catch(e){} } }
});

// Health check
app.get('/health', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute('SELECT sysdate FROM dual');
    res.json({
      success: true,
      message: 'Database connection healthy',
      timestamp: result.rows[0][0]
    });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) { console.error(e); }
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`\n✅ Registered admin payment routes:`);
  console.log(`   POST   /api/admin/payment - Create payment`);
  console.log(`   GET    /api/admin/payment/:paymentId - Get payment details`);
  console.log(`   GET    /api/admin/payments - List all payments`);
  console.log(`   GET    /api/admin/payments/stats - Payment statistics\n`);
});

