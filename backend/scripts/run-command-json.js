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
  console.log('✅ Oracle Client initialized successfully\n');
} catch (e) {
  console.error('❌ Oracle Client initialization failed:', e.message || e);
}

const dbConfig = {
  user: process.env.DB_USER || 'chummame',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

async function run() {
  const file = path.join(__dirname, '..', 'command.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const statements = Array.isArray(json.sql) ? json.sql : (json.sql ? [json.sql] : []);
  const conn = await oracledb.getConnection(dbConfig);
  console.log(`📝 Processing ${statements.length} SQL statements from command.json\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      
      try {
        await conn.execute(trimmed);
        console.log(`✅ [${i + 1}/${statements.length}] Executed: ${trimmed.substring(0, 60)}...`);
        successCount++;
      } catch (err) {
        // Handle specific Oracle errors
        if (err.errorNum === 955) {
          // Table already exists
          console.log(`⚠️  [${i + 1}/${statements.length}] Table already exists, skipping CREATE TABLE`);
          skipCount++;
        } else if (err.errorNum === 1 || err.errorNum === 2291) {
          // Unique constraint violation or integrity constraint violation (duplicate key)
          console.log(`⚠️  [${i + 1}/${statements.length}] Data already exists (duplicate), skipping: ${trimmed.substring(0, 60)}...`);
          skipCount++;
        } else if (err.errorNum === 2290) {
          // Check constraint violation
          console.log(`⚠️  [${i + 1}/${statements.length}] Constraint violation, skipping: ${trimmed.substring(0, 60)}...`);
          skipCount++;
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Error:`, err.message);
          console.error(`   SQL: ${trimmed.substring(0, 100)}...`);
          errorCount++;
          // Continue with other statements instead of failing completely
        }
      }
    }
    await conn.commit();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully executed: ${successCount}`);
    console.log(`   ⚠️  Skipped (already exists): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ command.json processing complete!\n');
  } finally {
    await conn.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });


