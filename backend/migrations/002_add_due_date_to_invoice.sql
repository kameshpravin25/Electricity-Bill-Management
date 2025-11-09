-- Migration: Add Due_Date column to Invoice table
-- This allows invoices to have their own due date independent of bills
-- Note: If column already exists, this will fail with ORA-01430, which can be safely ignored

ALTER TABLE Invoice ADD (Due_Date DATE)

