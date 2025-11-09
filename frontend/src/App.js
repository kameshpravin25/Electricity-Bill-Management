import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCustomers from './pages/admin/Customers';
import CustomerDetail from './pages/admin/CustomerDetail';
import AdminPayments from './pages/admin/Payments';
import AdminFeedback from './pages/admin/Feedback';
import CreateCustomer from './pages/admin/CreateCustomer';
import CustomerDashboard from './pages/customer/Dashboard';
import Bills from './pages/customer/Bills';
import BillDetail from './pages/customer/BillDetail';
import Feedback from './pages/customer/Feedback';
import Layout from './components/Layout';

function Home() { return <Navigate to="/login" replace />; }

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/customer/:custId" element={<CustomerDetail />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/customers/new" element={<CreateCustomer />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/bills" element={<Bills />} />
            <Route path="/customer/bill/:billId" element={<BillDetail />} />
            <Route path="/customer/invoice/:invoiceId" element={<BillDetail />} />
            <Route path="/customer/feedback" element={<Feedback />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

