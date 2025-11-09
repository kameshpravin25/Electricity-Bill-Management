// backend/create-bill-tables.js
const oracledb = require('oracledb');

// Initialize Oracle Client
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

async function createTables() {
  let conn;
  try {
    console.log('🔗 Connecting to Oracle database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create electricity_bills table
    console.log('\n📝 Creating electricity_bills table...');
    const createBillsTable = `
      CREATE TABLE electricity_bills (
        bill_id NUMBER PRIMARY KEY,
        customer_name VARCHAR2(100) NOT NULL,
        address VARCHAR2(200) NOT NULL,
        customer_id VARCHAR2(50) NOT NULL,
        bill_date DATE NOT NULL,
        due_date DATE NOT NULL,
        previous_reading NUMBER(10,2) NOT NULL,
        current_reading NUMBER(10,2) NOT NULL,
        units_consumed NUMBER(10,2) NOT NULL,
        rate_per_unit NUMBER(10,2) NOT NULL,
        bill_amount NUMBER(12,2) NOT NULL,
        status VARCHAR2(20) DEFAULT 'Unpaid',
        payment_date DATE
      )
    `;

    try {
      await conn.execute(createBillsTable, [], { autoCommit: true });
      console.log('✅ electricity_bills table created successfully');
    } catch (err) {
      if (err.errorNum === 955) {
        console.log('⚠️  electricity_bills table already exists');
      } else {
        throw err;
      }
    }

    // Insert sample data
    console.log('\n📊 Inserting sample bill data...');
    const sampleBills = [
      [1, 'Rajesh Kumar', '123 MG Road, Bangalore', 'CUST001', new Date('2024-01-15'), new Date('2024-02-05'), 5000, 5200, 200, 5.5, 1100, 'Paid', new Date('2024-01-20')],
      [2, 'Priya Sharma', '456 Park Avenue, Delhi', 'CUST002', new Date('2024-01-20'), new Date('2024-02-10'), 4500, 4800, 300, 6.0, 1800, 'Unpaid', null],
      [3, 'Amit Patel', '789 Church Street, Mumbai', 'CUST003', new Date('2024-01-25'), new Date('2024-02-15'), 6800, 7100, 300, 7.5, 2250, 'Paid', new Date('2024-02-01')],
      [4, 'Sneha Reddy', '321 Commercial Street, Chennai', 'CUST004', new Date('2024-02-01'), new Date('2024-02-22'), 3500, 3800, 300, 5.5, 1650, 'Unpaid', null],
      [5, 'Vikram Singh', '567 Marine Drive, Kochi', 'CUST005', new Date('2024-02-05'), new Date('2024-02-26'), 7200, 7500, 300, 8.0, 2400, 'Paid', new Date('2024-02-10')],
      [6, 'Meera Nair', '890 Brigade Road, Bangalore', 'CUST006', new Date('2024-02-10'), new Date('2024-03-02'), 4200, 4600, 400, 6.5, 2600, 'Unpaid', null],
      [7, 'Arjun Menon', '234 Residency Road, Hyderabad', 'CUST007', new Date('2024-02-12'), new Date('2024-03-04'), 5100, 5300, 200, 7.0, 1400, 'Paid', new Date('2024-02-18')],
      [8, 'Kavitha Iyer', '678 Cunningham Road, Bangalore', 'CUST008', new Date('2024-02-15'), new Date('2024-03-07'), 5800, 6200, 400, 8.5, 3400, 'Unpaid', null],
      [9, 'Rohit Agarwal', '456 Malleswaram, Bangalore', 'CUST009', new Date('2024-02-18'), new Date('2024-03-10'), 3900, 4100, 200, 6.0, 1200, 'Paid', new Date('2024-02-25')],
      [10, 'Divya Gupta', '321 Koramangala, Bangalore', 'CUST010', new Date('2024-02-20'), new Date('2024-03-12'), 6500, 6900, 400, 9.0, 3600, 'Unpaid', null]
    ];

    for (const bill of sampleBills) {
      try {
        await conn.execute(
          `INSERT INTO electricity_bills (
            bill_id, customer_name, address, customer_id, bill_date, due_date,
            previous_reading, current_reading, units_consumed, rate_per_unit,
            bill_amount, status, payment_date
          ) VALUES (
            :id, :customer_name, :address, :customer_id, :bill_date, :due_date,
            :previous_reading, :current_reading, :units_consumed, :rate_per_unit,
            :bill_amount, :status, :payment_date
          )`,
          {
            id: bill[0],
            customer_name: bill[1],
            address: bill[2],
            customer_id: bill[3],
            bill_date: bill[4],
            due_date: bill[5],
            previous_reading: bill[6],
            current_reading: bill[7],
            units_consumed: bill[8],
            rate_per_unit: bill[9],
            bill_amount: bill[10],
            status: bill[11],
            payment_date: bill[12]
          }
        );
      } catch (err) {
        if (err.errorNum === 1) {
          console.log(`⚠️  Bill ${bill[0]} already exists, skipping...`);
        } else {
          throw err;
        }
      }
    }
    await conn.commit();
    console.log('✅ Sample data inserted successfully');

    // Verify the data
    console.log('\n🔍 Verifying data...');
    const result = await conn.execute('SELECT COUNT(*) as count FROM electricity_bills');
    console.log(`✅ Total bills in database: ${result.rows[0][0]}`);

    console.log('\n✨ Database setup complete!');
    console.log('\nYour electricity bill management system is ready!');
    console.log('\nBackend API endpoints:');
    console.log('  GET    /api/bills              - Get all bills');
    console.log('  GET    /api/bills/:id           - Get bill by ID');
    console.log('  POST   /api/bills              - Create new bill');
    console.log('  PUT    /api/bills/:id          - Update bill');
    console.log('  DELETE /api/bills/:id          - Delete bill');
    console.log('  GET    /api/bills/stats/summary - Get statistics');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('\n🔌 Database connection closed');
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

createTables();

