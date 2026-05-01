-- ============================================
-- DEMO DATA - Run in Supabase SQL Editor
-- Realistic Indian customer data for demo
-- ============================================

-- Customers
INSERT INTO customers (first_name, middle_name, last_name, adhaar, email, contact_no, address) VALUES
('Arjun', 'Kumar', 'Sharma', '234567890123', 'arjun.sharma@email.com', '9876543211', '12/A MG Road, Bangalore, Karnataka'),
('Priya', '', 'Nair', '345678901234', 'priya.nair@email.com', '9876543212', '45 Anna Nagar, Chennai, Tamil Nadu'),
('Rahul', 'Singh', 'Verma', '456789012345', 'rahul.verma@email.com', '9876543213', '78 Sector 15, Noida, Uttar Pradesh'),
('Sneha', '', 'Patel', '567890123456', 'sneha.patel@email.com', '9876543214', '23 SG Highway, Ahmedabad, Gujarat'),
('Vikram', 'Raj', 'Reddy', '678901234567', 'vikram.reddy@email.com', '9876543215', '56 Banjara Hills, Hyderabad, Telangana')
ON CONFLICT DO NOTHING;

-- Create login credentials for all customers
INSERT INTO users (email, password, role, customer_id, first_name, last_name) VALUES
('arjun.sharma@email.com', 'Arjun@123', 'customer', (SELECT id FROM customers WHERE email='arjun.sharma@email.com'), 'Arjun', 'Sharma'),
('priya.nair@email.com', 'Priya@123', 'customer', (SELECT id FROM customers WHERE email='priya.nair@email.com'), 'Priya', 'Nair'),
('rahul.verma@email.com', 'Rahul@123', 'customer', (SELECT id FROM customers WHERE email='rahul.verma@email.com'), 'Rahul', 'Verma'),
('sneha.patel@email.com', 'Sneha@123', 'customer', (SELECT id FROM customers WHERE email='sneha.patel@email.com'), 'Sneha', 'Patel'),
('vikram.reddy@email.com', 'Vikram@123', 'customer', (SELECT id FROM customers WHERE email='vikram.reddy@email.com'), 'Vikram', 'Reddy')
ON CONFLICT (email) DO NOTHING;

-- Meters for each customer
INSERT INTO meters (customer_id, meter_type, installation_date, city, pincode, street, house_no, state, tariff_id, rate_per_unit, tariff_description) VALUES
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), 'Smart', '2023-03-15', 'Bangalore', '560001', 'MG Road', '12/A', 'Karnataka', (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), 5.50, 'Residential'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), 'Digital', '2023-06-20', 'Chennai', '600028', 'Anna Nagar', '45', 'Tamil Nadu', (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), 5.50, 'Residential'),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), 'Smart', '2023-01-10', 'Noida', '201301', 'Sector 15', '78', 'Uttar Pradesh', (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), 8.00, 'Commercial'),
((SELECT id FROM customers WHERE email='sneha.patel@email.com'), 'Digital', '2023-09-05', 'Ahmedabad', '380015', 'SG Highway', '23', 'Gujarat', (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), 5.50, 'Residential'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), 'Smart', '2023-04-25', 'Hyderabad', '500034', 'Banjara Hills', '56', 'Telangana', (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), 8.00, 'Commercial');

-- ===== INVOICES =====

-- Arjun - 3 months of bills
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status) VALUES
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-02-01', '2026-02-28', 825.00, 41.25, 866.25, 866.25, 150, 'Paid'),
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-03-01', '2026-03-31', 715.00, 35.75, 750.75, 750.75, 130, 'Paid'),
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-04-01', '2026-04-30', 935.00, 46.75, 981.75, 0, 170, 'Pending');

-- Priya - 3 months
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status) VALUES
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-02-01', '2026-02-28', 440.00, 22.00, 462.00, 462.00, 80, 'Paid'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-03-01', '2026-03-31', 550.00, 27.50, 577.50, 577.50, 100, 'Paid'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-04-01', '2026-04-30', 605.00, 30.25, 635.25, 300.00, 110, 'Partially Paid');

-- Rahul - Commercial, higher usage
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status) VALUES
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-02-01', '2026-02-28', 2400.00, 120.00, 2520.00, 2520.00, 300, 'Paid'),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-03-01', '2026-03-31', 2800.00, 140.00, 2940.00, 2940.00, 350, 'Paid'),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-04-01', '2026-04-30', 3200.00, 160.00, 3360.00, 0, 400, 'Pending');

-- Sneha
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status) VALUES
((SELECT id FROM customers WHERE email='sneha.patel@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-03-01', '2026-03-31', 385.00, 19.25, 404.25, 404.25, 70, 'Paid'),
((SELECT id FROM customers WHERE email='sneha.patel@email.com'), (SELECT id FROM tariffs WHERE description='Residential' LIMIT 1), '2026-04-01', '2026-04-30', 495.00, 24.75, 519.75, 0, 90, 'Pending');

-- Vikram
INSERT INTO invoices (customer_id, tariff_id, invoice_date, due_date, base_amount, tax, grand_total, amount_paid, units_consumed, status) VALUES
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-02-01', '2026-02-28', 1600.00, 80.00, 1680.00, 1680.00, 200, 'Paid'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-03-01', '2026-03-31', 1840.00, 92.00, 1932.00, 1932.00, 230, 'Paid'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM tariffs WHERE description='Commercial' LIMIT 1), '2026-04-01', '2026-04-30', 2000.00, 100.00, 2100.00, 1000.00, 250, 'Partially Paid');

-- ===== PAYMENTS (for paid invoices) =====
INSERT INTO payments (customer_id, invoice_id, amount_paid, payment_mode, transaction_ref, payment_date) VALUES
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='arjun.sharma@email.com') AND invoice_date='2026-02-01'), 866.25, 'UPI', 'TXN20260215001', '2026-02-15'),
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='arjun.sharma@email.com') AND invoice_date='2026-03-01'), 750.75, 'Card', 'TXN20260318002', '2026-03-18'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='priya.nair@email.com') AND invoice_date='2026-02-01'), 462.00, 'Net Banking', 'TXN20260220003', '2026-02-20'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='priya.nair@email.com') AND invoice_date='2026-03-01'), 577.50, 'UPI', 'TXN20260325004', '2026-03-25'),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='priya.nair@email.com') AND invoice_date='2026-04-01'), 300.00, 'UPI', 'TXN20260410005', '2026-04-10'),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='rahul.verma@email.com') AND invoice_date='2026-02-01'), 2520.00, 'Net Banking', 'TXN20260212006', '2026-02-12'),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='rahul.verma@email.com') AND invoice_date='2026-03-01'), 2940.00, 'Card', 'TXN20260315007', '2026-03-15'),
((SELECT id FROM customers WHERE email='sneha.patel@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='sneha.patel@email.com') AND invoice_date='2026-03-01'), 404.25, 'UPI', 'TXN20260322008', '2026-03-22'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='vikram.reddy@email.com') AND invoice_date='2026-02-01'), 1680.00, 'Card', 'TXN20260218009', '2026-02-18'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='vikram.reddy@email.com') AND invoice_date='2026-03-01'), 1932.00, 'Net Banking', 'TXN20260320010', '2026-03-20'),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), (SELECT id FROM invoices WHERE customer_id=(SELECT id FROM customers WHERE email='vikram.reddy@email.com') AND invoice_date='2026-04-01'), 1000.00, 'UPI', 'TXN20260412011', '2026-04-12');

-- ===== FEEDBACK =====
INSERT INTO feedbacks (customer_id, customer_name, customer_email, text, rating) VALUES
((SELECT id FROM customers WHERE email='arjun.sharma@email.com'), 'Arjun Sharma', 'arjun.sharma@email.com', 'Very smooth billing experience. The dashboard is easy to use and payments go through instantly.', 5),
((SELECT id FROM customers WHERE email='priya.nair@email.com'), 'Priya Nair', 'priya.nair@email.com', 'Good system overall. Would love to see SMS notifications for due dates.', 4),
((SELECT id FROM customers WHERE email='rahul.verma@email.com'), 'Rahul Verma', 'rahul.verma@email.com', 'Excellent platform for managing commercial electricity bills. The invoice breakdown is very detailed.', 5),
((SELECT id FROM customers WHERE email='sneha.patel@email.com'), 'Sneha Patel', 'sneha.patel@email.com', 'Nice interface but I wish there was a way to download invoices as PDF.', 3),
((SELECT id FROM customers WHERE email='vikram.reddy@email.com'), 'Vikram Reddy', 'vikram.reddy@email.com', 'The partial payment feature is really useful for managing cash flow. Great system!', 4),
((SELECT id FROM customers WHERE email='kamesh@ebill.com'), 'Kamesh Pravin', 'kamesh@ebill.com', 'Clean and professional billing system. Dark mode looks amazing.', 5);
