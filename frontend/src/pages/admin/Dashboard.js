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

  const formatCurrency = (a) => {
    const n = parseFloat(a || 0);
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

  if (loading) return (
    <RequireAuth role="admin"><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400 dark:text-white/30">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    </Layout></RequireAuth>
  );

  const stats = data?.stats || {};
  const recentPayments = data?.recentPayments || [];
  const monthlyData = data?.paymentsByMonth || [];

  const statCards = [
    { label: 'Customers', value: stats.totalCustomers || 0, color: 'text-gray-900 dark:text-white', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', iconColor: 'text-blue-500' },
    { label: 'Invoices', value: stats.totalInvoices || 0, color: 'text-gray-900 dark:text-white', bg: 'bg-purple-50 dark:bg-purple-500/10', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', iconColor: 'text-purple-500' },
    { label: 'Paid', value: stats.paidInvoices || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-emerald-500' },
    { label: 'Pending', value: stats.pendingInvoices || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-amber-500' },
    { label: 'Revenue', value: formatCurrency(stats.totalPaymentsReceived), isText: true, color: 'text-gray-900 dark:text-white', bg: 'bg-gray-50 dark:bg-white/[0.04]', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-gray-500 dark:text-white/50' },
  ];

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
            {statCards.map((s, i) => (
              <div key={i} className={`${i === 4 ? 'col-span-2 lg:col-span-1' : ''} card p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">{s.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <svg className={`w-4 h-4 ${s.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                </div>
                <div className={`${s.isText ? 'text-xl' : 'text-2xl'} font-bold ${s.color}`}>
                  {s.isText ? s.value : s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Revenue */}
          <div className="card p-6">
            <h2 className="section-title mb-6">Monthly Revenue</h2>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-white/30">
                No revenue data yet
              </div>
            ) : (() => {
              const maxAmount = Math.max(...monthlyData.map(([, a]) => a), 1);
              const chartHeight = 160;
              return (
                <div className="max-w-xl mx-auto">
                  <div className="flex items-end justify-center gap-2" style={{ height: `${chartHeight}px` }}>
                    {monthlyData.map(([month, amount], idx) => {
                      const h = Math.max(Math.round((amount / maxAmount) * chartHeight), 12);
                      return (
                        <div key={idx} className="flex flex-col items-center justify-end" style={{ height: '100%', width: '56px' }}>
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-white/50 mb-1.5">{formatCurrency(amount)}</span>
                          <div
                            className="w-8 rounded-lg bg-blue-500 dark:bg-blue-400 hover:bg-blue-600 dark:hover:bg-blue-300 transition-colors"
                            style={{ height: `${h}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-2 mt-3 border-t border-gray-100 dark:border-white/[0.06] pt-3">
                    {monthlyData.map(([month], idx) => {
                      const parts = month.split('-');
                      const name = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1]) - 1];
                      return (
                        <div key={idx} className="text-center" style={{ width: '56px' }}>
                          <div className="text-[11px] font-medium text-gray-500 dark:text-white/40">{name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recent Payments */}
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
              <h2 className="section-title">Recent Payments</h2>
              <span className="text-xs text-gray-400 dark:text-white/20">{recentPayments.length} records</span>
            </div>
            {recentPayments.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-200 dark:text-white/10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm text-gray-400 dark:text-white/30">No payments recorded yet</p>
                <p className="text-xs text-gray-300 dark:text-white/15 mt-1">Payments will appear here once customers pay their bills</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-white/40">
                              {(p.customerName || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{p.customerName || '-'}</span>
                          </div>
                        </td>
                        <td className="text-gray-500 dark:text-white/40">#{p.invoiceId || '-'}</td>
                        <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amountPaid)}</td>
                        <td><span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs font-medium text-gray-600 dark:text-white/50">{p.paymentMode || '-'}</span></td>
                        <td className="text-gray-500 dark:text-white/40 text-xs">{formatDate(p.paymentDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
