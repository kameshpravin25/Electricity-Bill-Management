// Test database connection
const oracledb = require('oracledb');
require('dotenv').config();

// Initialize Oracle Client
try {
  const fs = require('fs');
  const defaultParent = 'D:\\application_software\\instantclient-basic-windows.x64-19.28.0.0.0dbru';
  const basePath = process.env.ORACLE_LIB_DIR || defaultParent;
  const preferredSubdirs = ['instantclient_21_19', 'instantclient_19_28', 'instantclient'];
  let libDir = basePath;

  // If basePath itself contains oci.dll, use it. Otherwise look for common subfolders
  try {
    if (fs.existsSync(libDir + '\\oci.dll')) {
      console.log('📁 Using Oracle Client directory:', libDir);
    } else {
      let found = false;
      for (const sub of preferredSubdirs) {
        const candidate = basePath + '\\' + sub;
        if (fs.existsSync(candidate) && fs.existsSync(candidate + '\\oci.dll')) {
          libDir = candidate;
          found = true;
          break;
        }
      }

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

      if (found) console.log('📁 Using Oracle Client subdirectory:', libDir);
      else console.log('📁 Using Oracle Client base directory (no oci.dll found yet):', libDir);
    }
  } catch (err) {
    console.error('Error while detecting Oracle Instant Client folder:', err && err.message ? err.message : err);
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

console.log('\n📋 Database Configuration:');
console.log('  User:', dbConfig.user);
console.log('  Connect String:', dbConfig.connectString);
console.log('  Oracle Client Path:', process.env.ORACLE_LIB_DIR || 'D:\application_software\instantclient-basic-windows.x64-19.28.0.0.0dbru\instantclient_19_28');

async function testConnection() {
  let conn;
  try {
    console.log('\n🔗 Attempting to connect to Oracle database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Database connection successful!\n');

    // Test query
    console.log('📊 Testing database query...');
    const result = await conn.execute('SELECT sysdate, user FROM dual');
    console.log('✅ Query executed successfully');
    console.log('  Current Database Time:', result.rows[0][0]);
    console.log('  Connected User:', result.rows[0][1]);

    // Get Oracle version
    const versionResult = await conn.execute('SELECT * FROM v$version');
    console.log('\n📦 Oracle Database Version:');
    versionResult.rows.forEach(row => {
      console.log('  ', row[0]);
    });

    // Test a simple table query (try to get table count)
    try {
      const tableCount = await conn.execute(
        `SELECT COUNT(*) FROM user_tables`
      );
      console.log('\n📋 User Tables Count:', tableCount.rows[0][0]);
    } catch (e) {
      console.log('\n⚠️  Could not query user tables:', e.message);
    }

    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (err) {
    console.error('\n❌ Database connection failed!');
    console.error('Error Code:', err.errorNum || err.code);
    console.error('Error Message:', err.message);
    
    if (err.errorNum === 12505) {
      console.error('\n💡 Tip: The TNS connect string might be incorrect.');
    } else if (err.errorNum === 1017) {
      console.error('\n💡 Tip: Invalid username or password.');
    } else if (err.errorNum === 12154) {
      console.error('\n💡 Tip: TNS could not resolve the connect identifier.');
    } else if (err.message && err.message.includes('DPI-1047')) {
      console.error('\n💡 Tip: Oracle Client library not found. Check ORACLE_LIB_DIR path.');
    }
    
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('\n🔒 Connection closed');
      } catch (e) {
        console.error('Error closing connection:', e.message);
      }
    }
  }
}

testConnection();

