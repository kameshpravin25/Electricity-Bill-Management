-- ============================================
-- Electricity Bill Management - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Profiles table (links to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  customer_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  adhaar TEXT,
  email TEXT,
  contact_no TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tariffs
CREATE TABLE tariffs (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  rate_per_unit DECIMAL(10,2) NOT NULL,
  effective_from DATE,
  effective_to DATE
);

-- Meters
CREATE TABLE meters (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  meter_type TEXT DEFAULT 'Smart',
  installation_date DATE,
  city TEXT,
  pincode TEXT,
  street TEXT,
  house_no TEXT,
  state TEXT,
  tariff_id INTEGER REFERENCES tariffs(id),
  rate_per_unit DECIMAL(10,2),
  tariff_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  meter_id INTEGER REFERENCES meters(id),
  issue_date DATE,
  due_date DATE,
  rate_per_unit DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  bill_id INTEGER REFERENCES bills(id),
  tariff_id INTEGER REFERENCES tariffs(id),
  invoice_date DATE,
  due_date DATE,
  base_amount DECIMAL(10,2),
  tax DECIMAL(10,2),
  grand_total DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  units_consumed DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id),
  amount_paid DECIMAL(10,2),
  payment_mode TEXT,
  transaction_ref TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks
CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  text TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  invoice_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get customer_id for current user
CREATE OR REPLACE FUNCTION get_customer_id()
RETURNS INTEGER AS $$
  SELECT customer_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Profiles: users can read own profile, admins can read all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Customers: admins full access, customers read own
CREATE POLICY "Admins manage customers" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Customers read own" ON customers FOR SELECT USING (id = get_customer_id());

-- Tariffs: readable by all authenticated
CREATE POLICY "Anyone can read tariffs" ON tariffs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage tariffs" ON tariffs FOR ALL USING (is_admin());

-- Meters: admins full, customers read own
CREATE POLICY "Admins manage meters" ON meters FOR ALL USING (is_admin());
CREATE POLICY "Customers read own meters" ON meters FOR SELECT USING (customer_id = get_customer_id());

-- Invoices: admins full, customers read own
CREATE POLICY "Admins manage invoices" ON invoices FOR ALL USING (is_admin());
CREATE POLICY "Customers read own invoices" ON invoices FOR SELECT USING (customer_id = get_customer_id());

-- Bills: admins full, customers read own
CREATE POLICY "Admins manage bills" ON bills FOR ALL USING (is_admin());
CREATE POLICY "Customers read own bills" ON bills FOR SELECT USING (customer_id = get_customer_id());

-- Payments: admins full, customers read own + create own
CREATE POLICY "Admins manage payments" ON payments FOR ALL USING (is_admin());
CREATE POLICY "Customers read own payments" ON payments FOR SELECT USING (customer_id = get_customer_id());
CREATE POLICY "Customers create payments" ON payments FOR INSERT WITH CHECK (customer_id = get_customer_id());

-- Feedbacks: admins read all, customers manage own
CREATE POLICY "Admins read feedbacks" ON feedbacks FOR SELECT USING (is_admin());
CREATE POLICY "Customers manage own feedback" ON feedbacks FOR ALL USING (customer_id = get_customer_id());

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Seed data
-- ============================================

-- Insert a default tariff
INSERT INTO tariffs (description, rate_per_unit, effective_from, effective_to)
VALUES ('Residential', 5.50, '2024-01-01', '2025-12-31');

INSERT INTO tariffs (description, rate_per_unit, effective_from, effective_to)
VALUES ('Commercial', 8.00, '2024-01-01', '2025-12-31');

INSERT INTO tariffs (description, rate_per_unit, effective_from, effective_to)
VALUES ('Industrial', 12.00, '2024-01-01', '2025-12-31');
