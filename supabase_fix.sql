-- ============================================
-- ALL-IN-ONE: Run this in Supabase SQL Editor
-- ============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  customer_id INTEGER REFERENCES customers(id),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on all tables
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE meters DISABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insert admin
INSERT INTO users (email, password, role, first_name, last_name)
VALUES ('admin@ebill.com', 'Admin@123', 'admin', 'Admin', 'User')
ON CONFLICT (email) DO NOTHING;

-- Insert customer
INSERT INTO customers (first_name, middle_name, last_name, adhaar, email, contact_no, address)
VALUES ('Kamesh', '', 'Pravin', '123456789012', 'kamesh@ebill.com', '9876543210', 'Chennai, Tamil Nadu')
ON CONFLICT DO NOTHING;

-- Link customer login
INSERT INTO users (email, password, role, customer_id, first_name, last_name)
VALUES (
  'kamesh@ebill.com', 'Kamesh@123', 'customer',
  (SELECT id FROM customers WHERE email = 'kamesh@ebill.com' LIMIT 1),
  'Kamesh', 'Pravin'
) ON CONFLICT (email) DO NOTHING;

-- Meter
INSERT INTO meters (customer_id, meter_type, installation_date, city, pincode, street, house_no, state, tariff_id, rate_per_unit, tariff_description)
VALUES (
  (SELECT id FROM customers WHERE email = 'kamesh@ebill.com' LIMIT 1),
  'Smart', '2024-06-01', 'Chennai', '600001', 'MG Road', '42A', 'Tamil Nadu',
  (SELECT id FROM tariffs LIMIT 1), 5.50, 'Residential'
);

-- Invoice
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status)
VALUES (
  (SELECT id FROM customers WHERE email = 'kamesh@ebill.com' LIMIT 1),
  (SELECT id FROM tariffs LIMIT 1),
  '2026-04-01', '2026-04-30', 550.00, 27.50, 577.50, 0, 100, 'Pending'
);
