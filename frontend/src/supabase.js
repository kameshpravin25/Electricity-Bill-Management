import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://csomysiefhliikclazck.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzb215c2llZmhsaWlrY2xhemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQzNjQsImV4cCI6MjA5MzIzMDM2NH0.IhuxFD5K2YgD-vSZGIrx-yTCx0Tu3IcJyuKly1WG8s4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
