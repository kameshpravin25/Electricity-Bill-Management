// Script to add Commercial tariff to database
const oracledb = require('oracledb');
require('dotenv').config();

// Initialize Oracle Client
try {
  const fs = require('fs');
  const basePath = process.env.ORACLE_LIB_DIR || 'C:\\Users\\jaiak\\Downloads\\instantclient-basic-windows.x64-21.19.0.0.0dbru';
  const subPath = basePath + '\\instantclient_21_19';
  let libDir = basePath;
  
  if (fs.existsSync(subPath) && fs.existsSync(subPath + '\\oci.dll')) {
    libDir = subPath;
  }
  
  oracledb.initOracleClient({ libDir });
  console.log('✅ Oracle Client initialized successfully');
} catch (e) {
  console.error('❌ Oracle Client initialization failed:', e.message || e);
  process.exit(1);
}

const dbConfig = {
  user: process.env.DB_USER || 'chummame',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

async function addCommercialTariff() {
  let conn;
  try {
    console.log('🔗 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if commercial tariff already exists
    const check = await conn.execute(
      "SELECT COUNT(*) FROM Tariff WHERE Description = 'Commercial'"
    );
    
    if (check.rows[0][0] > 0) {
      console.log('⚠️  Commercial tariff already exists');
      return;
    }

    // Get next Tariff_ID
    const nextIdRes = await conn.execute('SELECT NVL(MAX(Tariff_ID),0)+1 FROM Tariff');
    const nextId = nextIdRes.rows[0][0];

    // Insert Commercial tariff
    await conn.execute(
      `INSERT INTO Tariff (Tariff_ID, Description, Rate_Per_Unit, Effective_From, Effective_To) 
       VALUES (:tariffId, 'Commercial', 10, SYSDATE, TO_DATE('2026-12-31','YYYY-MM-DD'))`,
      [nextId]
    );

    await conn.commit();
    console.log(`✅ Commercial tariff added successfully with ID: ${nextId}`);
    console.log('   Description: Commercial');
    console.log('   Rate Per Unit: ₹10');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (conn) {
      try {
        await conn.rollback();
      } catch (e) {}
    }
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {}
    }
  }
}

addCommercialTariff();

