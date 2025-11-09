// Verify database tables and data
const oracledb = require('oracledb');
require('dotenv').config();

// Initialize Oracle Client
try {
  const fs = require('fs');
  const basePath = process.env.ORACLE_LIB_DIR || 'D:\application_software\instantclient-basic-windows.x64-19.28.0.0.0dbru';
  const subPath = basePath + '\\instantclient_19_28';
  let libDir = basePath;
  
  if (fs.existsSync(subPath) && fs.existsSync(subPath + '\\oci.dll')) {
    libDir = subPath;
  }
  
  oracledb.initOracleClient({ libDir });
  console.log('✅ Oracle Client initialized successfully\n');
} catch (e) {
  console.error('❌ Oracle Client initialization failed:', e.message || e);
  process.exit(1);
}

const dbConfig = {
  user: process.env.DB_USER || 'chummame',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

async function verifyDatabase() {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    console.log('🔗 Connected to database\n');

    // List all tables
    console.log('📋 Database Tables:');
    console.log('='.repeat(50));
    const tablesResult = await conn.execute(
      `SELECT table_name FROM user_tables ORDER BY table_name`
    );
    
    const tables = tablesResult.rows.map(row => row[0]);
    tables.forEach((table, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${table}`);
    });
    console.log(`\n✅ Total tables: ${tables.length}\n`);

    // Check row counts for key tables
    console.log('📊 Table Record Counts:');
    console.log('='.repeat(50));
    
    const keyTables = [
      'CUSTOMER', 'CUSTOMERAUTH', 'ADMIN', 'STAFF', 'LOGIN', 
      'ROLES', 'TARIFF', 'METER', 'BILL', 'INVOICE', 'PAYMENT', 'FEEDBACK'
    ];
    
    for (const table of keyTables) {
      try {
        const countResult = await conn.execute(`SELECT COUNT(*) FROM ${table}`);
        const count = countResult.rows[0][0];
        console.log(`${table.padEnd(20)} : ${count.toString().padStart(5)} rows`);
      } catch (err) {
        console.log(`${table.padEnd(20)} : Error - ${err.message}`);
      }
    }

    console.log('\n✅ Database verification complete!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing connection:', e.message);
      }
    }
  }
}

verifyDatabase();

