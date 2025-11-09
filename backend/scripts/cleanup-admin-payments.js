/**
 * Cleanup script to remove Payment records that were incorrectly created
 * by the admin payment endpoint when creating invoices.
 * 
 * These payments should not exist because invoices should be created with
 * Status 'Pending' and no payment records until customers actually pay.
 * 
 * Run this script to delete payments that were created when invoices
 * had Status 'Pending' (meaning the payment was incorrectly created by admin).
 */

require('dotenv').config();
const oracledb = require('oracledb');

async function cleanupAdminPayments() {
  let conn;
  try {
    // Initialize Oracle Client
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

    // Find payments where the invoice still has Status 'Pending'
    // These are payments that were incorrectly created by admin
    const problematicPayments = await conn.execute(`
      SELECT p.Payment_ID, p.Invoice_ID, p.Amount_Paid, i.Status, i.Grand_Total
      FROM Payment p
      JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
      WHERE i.Status = 'Pending'
      ORDER BY p.Payment_ID
    `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log(`\nFound ${problematicPayments.rows.length} payments for Pending invoices:`);
    problematicPayments.rows.forEach(p => {
      console.log(`  Payment ${p.PAYMENT_ID}: Invoice ${p.INVOICE_ID}, Amount: ${p.AMOUNT_PAID}, Invoice Status: ${p.STATUS}, Grand Total: ${p.GRAND_TOTAL}`);
    });

    if (problematicPayments.rows.length === 0) {
      console.log('\n✅ No problematic payments found. Database is clean.');
      return;
    }

    console.log('\n⚠️  These payments will be DELETED because they were incorrectly created.');
    console.log('   The invoices will remain with Status "Pending" for customers to pay.');
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nDo you want to delete these payments? (yes/no): ', async (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('\n❌ Cleanup cancelled.');
          resolve();
          return;
        }

        try {
          // Delete the problematic payments
          for (const payment of problematicPayments.rows) {
            await conn.execute(
              'DELETE FROM Payment WHERE Payment_ID = :paymentId',
              [payment.PAYMENT_ID]
            );
            console.log(`✅ Deleted Payment ${payment.PAYMENT_ID} for Invoice ${payment.INVOICE_ID}`);
          }

          await conn.commit();
          console.log(`\n✅ Successfully deleted ${problematicPayments.rows.length} payment record(s).`);
          console.log('   Outstanding amounts should now be calculated correctly.');
        } catch (err) {
          await conn.rollback();
          console.error('\n❌ Error during cleanup:', err.message);
          throw err;
        }

        resolve();
      });
    });

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

cleanupAdminPayments();



