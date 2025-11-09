// backend/drop-demo-tables.js
const oracledb = require('oracledb');

// Initialize Oracle Client (match server.js)
try {
  oracledb.initOracleClient({
    libDir: 'D:\\application_software\\instantclient-basic-windows.x64-19.28.0.0.0dbru\\instantclient_19_28'
  });
  console.log('✅ Oracle Client initialized successfully');
} catch (e) {
  console.error('❌ Oracle Client initialization failed:', e.message || e);
  process.exit(1);
}

const dbConfig = {
  user: 'chummame',
  password: 'password',
  connectString: 'localhost:1521/XE'
};

// Tables to drop (uppercase to match Oracle data dictionary)
const tablesToDrop = [
  'DEMO_CUSTOMERS',
  'DEMO_ORDERS',
  'DEMO_ORDER_ITEMS',
  'DEMO_PRODUCT_INFO',
  'DEMO_STATES',
  'DEMO_USERS',
  'DEPT',
  'ELECTRICITY_BILLS',
  'EMP',
  'EMPLOYEES'
];

async function dropTableIfExists(connection, tableName) {
  // Check existence in user's schema
  const existsResult = await connection.execute(
    `SELECT COUNT(*) FROM user_tables WHERE table_name = :tableName`,
    [tableName]
  );
  const exists = existsResult.rows[0][0] > 0;

  if (!exists) {
    console.log(`ℹ️  Table ${tableName} does not exist (skipped)`);
    return;
  }

  try {
    await connection.execute(`DROP TABLE ${tableName} CASCADE CONSTRAINTS PURGE`);
    console.log(`🗑️  Dropped table ${tableName}`);
  } catch (err) {
    console.error(`❌ Failed to drop ${tableName}:`, err.message || err);
    throw err;
  }
}

async function main() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    for (const tableName of tablesToDrop) {
      await dropTableIfExists(connection, tableName);
    }
    await connection.commit();
    console.log('✅ Done. Requested tables dropped (where present).');
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
}

main();


