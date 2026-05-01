-- ============================================
-- SIMPLE Schema - Run this in Supabase SQL Editor
-- ============================================

-- Drop old policies first
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins manage customers" ON customers;
DROP POLICY IF EXISTS "Customers read own" ON customers;
DROP POLICY IF EXISTS "Anyone can read tariffs" ON tariffs;
DROP POLICY IF EXISTS "Admins manage tariffs" ON tariffs;
DROP POLICY IF EXISTS "Admins manage meters" ON meters;
DROP POLICY IF EXISTS "Customers read own meters" ON meters;
DROP POLICY IF EXISTS "Admins manage invoices" ON invoices;
DROP POLICY IF EXISTS "Customers read own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins manage bills" ON bills;
DROP POLICY IF EXISTS "Customers read own bills" ON bills;
DROP POLICY IF EXISTS "Admins manage payments" ON payments;
DROP POLICY IF EXISTS "Customers read own payments" ON payments;
DROP POLICY IF EXISTS "Customers create payments" ON payments;
DROP POLICY IF EXISTS "Admins read feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Customers manage own feedback" ON feedbacks;

-- Drop old functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_customer_id() CASCADE;

-- Drop profiles table
DROP TABLE IF EXISTS profiles CASCADE;

-- Simple users table
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

-- Insert admin user
INSERT INTO users (email, password, role, first_name, last_name)
VALUES ('admin@ebill.com', 'Admin@123', 'admin', 'Admin', 'User');

-- Insert a sample customer
INSERT INTO customers (first_name, middle_name, last_name, adhaar, email, contact_no, address)
VALUES ('Kamesh', '', 'Pravin', '123456789012', 'kamesh@ebill.com', '9876543210', 'Chennai, Tamil Nadu');

-- Link customer login
INSERT INTO users (email, password, role, customer_id, first_name, last_name)
VALUES ('kamesh@ebill.com', 'Kamesh@123', 'customer', 1, 'Kamesh', 'Pravin');

-- Insert a sample meter
INSERT INTO meters (customer_id, meter_type, installation_date, city, pincode, street, house_no, state, tariff_id, rate_per_unit, tariff_description)
VALUES (1, 'Smart', '2024-06-01', 'Chennai', '600001', 'MG Road', '42A', 'Tamil Nadu', 1, 5.50, 'Residential');

-- Insert a sample invoice
INSERT INTO invoices (customer_id, bill_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status)
VALUES (1, NULL, 1, '2026-04-01', '2026-04-30', 550.00, 27.50, 577.50, 0, 100, 'Pending');
