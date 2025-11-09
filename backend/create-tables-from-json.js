// backend/create-tables-from-json.js
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');

// Initialize Oracle Client (match server.js)
require('dotenv').config();

try {
  const basePath = process.env.ORACLE_LIB_DIR || 'C:\\Users\\jaiak\\Downloads\\instantclient-basic-windows.x64-21.19.0.0.0dbru';
  const subPath = basePath + '\\instantclient_21_19';
  let libDir = basePath;
  
  // Check if subdirectory exists and has oci.dll
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

const RESERVED = new Set(['DATE']);
function toOracleIdent(name) {
  // Use unquoted identifiers to default to uppercase in Oracle
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_');
  const upper = cleaned.toUpperCase();
  if (RESERVED.has(upper)) {
    return `${upper}_COL`;
  }
  return cleaned;
}

function buildCreateTableSQL(tableSpec) {
  const tableName = toOracleIdent(tableSpec.name);
  const columnDefs = tableSpec.columns.map(col => {
    const [colName, colType] = Object.entries(col)[0];
    return `${toOracleIdent(colName)} ${colType}`;
  });
  return `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n)`;
}

function buildForeignKeyStatements(tableSpec) {
  if (!tableSpec.foreign_keys || tableSpec.foreign_keys.length === 0) return [];
  const tableName = toOracleIdent(tableSpec.name);
  return tableSpec.foreign_keys.map((fk, idx) => {
    const [colName, ref] = Object.entries(fk)[0];
    // ref looks like: REFERENCES Invoice(Invoice_ID)
    const match = /REFERENCES\s+([A-Za-z0-9_"\-]+)\s*\(([^)]+)\)/i.exec(ref);
    if (!match) {
      throw new Error(`Invalid foreign key format for ${tableName}.${colName}: ${ref}`);
    }
    const refTable = toOracleIdent(match[1].replace(/"/g, ''));
    const refColumn = toOracleIdent(match[2].trim());
    const constraintName = `FK_${tableName}_${toOracleIdent(colName)}_${idx+1}`.slice(0, 30);
    return `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${toOracleIdent(colName)}) REFERENCES ${refTable}(${refColumn})`;
  });
}

function getDependencies(tableSpec) {
  // Return array of table names this table depends on (via FKs)
  if (!tableSpec.foreign_keys) return [];
  return tableSpec.foreign_keys.map(fk => {
    const ref = Object.values(fk)[0];
    const match = /REFERENCES\s+([A-Za-z0-9_"\-]+)\s*\(/i.exec(ref);
    if (!match) return null;
    return toOracleIdent(match[1].replace(/"/g, ''));
  }).filter(Boolean);
}

function topoSortTables(tableSpecs) {
  const nameToSpec = new Map();
  tableSpecs.forEach(t => nameToSpec.set(toOracleIdent(t.name), t));
  const indegree = new Map();
  const graph = new Map();

  tableSpecs.forEach(t => {
    const name = toOracleIdent(t.name);
    indegree.set(name, 0);
    graph.set(name, []);
  });

  tableSpecs.forEach(t => {
    const from = toOracleIdent(t.name);
    const deps = getDependencies(t);
    deps.forEach(dep => {
      // from depends on dep: edge dep -> from
      graph.get(dep)?.push(from);
      indegree.set(from, (indegree.get(from) || 0) + 1);
    });
  });

  const queue = [];
  indegree.forEach((deg, name) => { if (deg === 0) queue.push(name); });
  const order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(nameToSpec.get(n));
    for (const nei of graph.get(n) || []) {
      indegree.set(nei, indegree.get(nei) - 1);
      if (indegree.get(nei) === 0) queue.push(nei);
    }
  }

  if (order.length !== tableSpecs.length) {
    console.warn('⚠️  Possible circular dependency detected. Will create tables first, then add FKs.');
    return tableSpecs; // fallback to given order
  }
  return order;
}

async function dropIfExists(connection, tableName) {
  const res = await connection.execute(
    `SELECT COUNT(*) FROM user_tables WHERE table_name = :t`, [tableName.toUpperCase()]
  );
  if (res.rows[0][0] > 0) {
    await connection.execute(`DROP TABLE ${tableName} CASCADE CONSTRAINTS PURGE`);
    console.log(`🗑️  Dropped existing table ${tableName}`);
  }
}

async function main() {
  const jsonPath = path.join(__dirname, 'sql_tables.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const spec = JSON.parse(raw);
  const tables = spec.tables || [];

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Create tables in dependency order (without FKs)
    const order = topoSortTables(tables);
    for (const t of order) {
      const name = toOracleIdent(t.name);
      await dropIfExists(connection, name);
      const createSql = buildCreateTableSQL(t);
      await connection.execute(createSql);
      console.log(`✅ Created table ${name}`);
    }

    // Add foreign keys after all tables exist
    for (const t of tables) {
      const fkStmts = buildForeignKeyStatements(t);
      for (const stmt of fkStmts) {
        await connection.execute(stmt);
        console.log(`🔗 ${stmt}`);
      }
    }

    await connection.commit();
    console.log('🎉 All tables created and constraints applied successfully.');
  } catch (err) {
    console.error('❌ Error during table creation:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
}

main();


