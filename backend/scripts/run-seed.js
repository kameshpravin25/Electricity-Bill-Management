const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
require('dotenv').config();
const bcrypt = require('bcryptjs');

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
}

const dbConfig = {
  user: process.env.DB_USER || 'chummame',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

function splitStatements(sql) {
  // naive split on ; end of line
  return sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function run() {
  const dir = path.join(__dirname, '..', 'seeds');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const conn = await oracledb.getConnection(dbConfig);
  try {
    for (const f of files) {
      const full = path.join(dir, f);
      console.log('Seeding', f);
      const raw = fs.readFileSync(full, 'utf8');
      const statements = splitStatements(raw);
      for (const stmt of statements) {
        await conn.execute(stmt);
      }
    }
    // Post-process: hash CustomerAuth passwords if inserted as plain text
    const ca = await conn.execute("SELECT Auth_ID, Username, PasswordHash FROM CustomerAuth");
    for (const row of ca.rows) {
      const [authId, username, current] = row;
      if (typeof current === 'string' && !current.startsWith('$2a$') && !current.startsWith('$2b$')) {
        const hash = await bcrypt.hash(current, 10);
        await conn.execute('UPDATE CustomerAuth SET PasswordHash = :h WHERE Auth_ID = :id', [hash, authId]);
      }
    }
    await conn.commit();
    console.log('Seed complete');
  } finally {
    await conn.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });


