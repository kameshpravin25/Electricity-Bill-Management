const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
require('dotenv').config();

try {
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
}

const dbConfig = {
  user: process.env.DB_USER || 'chummame',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

async function run() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const conn = await oracledb.getConnection(dbConfig);
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      console.log('Running', f);
      try {
        await conn.execute(sql);
        console.log(`✅ ${f} executed successfully`);
      } catch (err) {
        // ORA-01430: column already exists - safe to ignore
        if (err.errorNum === 1430 || err.message?.includes('ORA-01430')) {
          console.log(`⚠️  ${f} - Column already exists, skipping`);
        } else {
          console.error(`❌ Error in ${f}:`, err.message);
          throw err;
        }
      }
    }
    await conn.commit();
    console.log('✅ All migrations complete');
  } finally {
    await conn.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });


