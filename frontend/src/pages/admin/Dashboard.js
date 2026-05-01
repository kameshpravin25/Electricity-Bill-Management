import React from 'react';
import { getAdminDashboardStats } from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminDashboard() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { setLoading(true); const d = await getAdminDashboardStats(); setData(d); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatCurrency = (a) => `₹${parseFloat(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

  if (loading) return (
    <RequireAuth role="admin"><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400 dark:text-white/30">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading dashboard...
        </div>
      </div>
    </Layout></RequireAuth>
  );

  const stats = data?.stats || {};
  const recentPayments = data?.recentPayments || [];

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of your electricity billing system</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="stat-card">
              <div className="stat-label">Customers</div>
              <div className="stat-value">{stats.totalCustomers || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Invoices</div>
              <div className="stat-value">{stats.totalInvoices || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paid</div>
              <div className="stat-value text-emerald-500">{stats.paidInvoices || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value text-amber-500">{stats.pendingInvoices || 0}</div>
            </div>
            <div className="stat-card col-span-2 lg:col-span-1">
              <div className="stat-label">Revenue</div>
              <div className="stat-value text-lg">{formatCurrency(stats.totalPaymentsReceived)}</div>
            </div>
          </div>

          {/* Revenue Chart (Simple bar chart) */}
          {data?.paymentsByMonth?.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-6">Monthly Revenue</h2>
              <div className="flex items-end gap-3 h-40">
                {data.paymentsByMonth.map(([month, amount]) => {
                  const maxAmount = Math.max(...data.paymentsByMonth.map(([,a]) => a));
                  const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-white/50">{formatCurrency(amount)}</span>
                      <div className="w-full rounded-t-lg bg-gray-900 dark:bg-white/20 transition-all duration-500" style={{ height: `${Math.max(height, 4)}%` }} />
                      <span className="text-[10px] text-gray-400 dark:text-white/30">{month.split('-')[1]}/{month.split('-')[0].slice(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="section-title">Recent Payments</h2>
            </div>
            {recentPayments.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 dark:text-white/30 text-sm">No payments recorded yet</div>
            ) : (
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Invoice</th>
                    <th className="text-right">Amount</th>
                    <th>Mode</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, i) => (
                    <tr key={i}>
                      <td className="font-medium text-gray-900 dark:text-white">{p.customerName || '-'}</td>
                      <td className="text-gray-500 dark:text-white/40">#{p.invoiceId || '-'}</td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amountPaid)}</td>
                      <td><span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-xs font-medium">{p.paymentMode || '-'}</span></td>
                      <td className="text-gray-500 dark:text-white/40">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
