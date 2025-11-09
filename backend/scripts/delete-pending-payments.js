/**
 * Quick cleanup script to delete Payment records for invoices with Status 'Pending'
 * These payments were incorrectly created by the admin payment endpoint before the fix.
 * 
 * Run this to clean up existing data so outstanding amounts calculate correctly.
 */

require('dotenv').config();
const oracledb = require('oracledb');

async function deletePendingPayments() {
  let conn;
  try {
    const basePath = process.env.ORACLE_LIB_DIR || 'C:\\Users\\jaiak\\Downloads\\instantclient-basic-windows.x64-21.19.0.0.0dbru';
    const subPath = basePath + '\\instantclient_21_19';
    let libDir = basePath;
    const fs = require('fs');
    if (fs.existsSync(subPath) && fs.existsSync(subPath + '\\oci.dll')) {
      libDir = subPath;
    }
    oracledb.initOracleClient({ libDir });

    conn = await oracledb.getConnection({
      user: process.env.DB_USER || 'chummame',
      password: process.env.DB_PASSWORD || 'password',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    });

    // Find and delete payments for Pending invoices
    const deleteResult = await conn.execute(`
      DELETE FROM Payment 
      WHERE Invoice_ID IN (
        SELECT Invoice_ID FROM Invoice WHERE Status = 'Pending'
      )
    `, [], { autoCommit: false });

    await conn.commit();

    console.log(`✅ Deleted ${deleteResult.rowsAffected} payment record(s) for Pending invoices.`);
    console.log('✅ Outstanding amounts should now calculate correctly.');
    console.log('✅ New invoices created by admin will NOT have Payment records until customers pay.');

  } catch (err) {
    console.error('Error:', err);
    if (conn) {
      try {
        await conn.rollback();
      } catch (e) {
        console.error('Error rolling back:', e);
      }
    }
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

deletePendingPayments();

