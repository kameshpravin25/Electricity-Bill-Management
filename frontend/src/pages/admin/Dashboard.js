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
  const pendingBills = data?.pendingBills || [];

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
            <h2 className="section-title mb-2">Monthly Revenue</h2>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-white/30">
                No revenue data yet
              </div>
            ) : (() => {
              const maxAmount = Math.max(...monthlyData.map(([, a]) => a), 1);
              const W = 500, H = 180, padX = 50, padY = 20, padB = 30;
              const chartW = W - padX, chartH = H - padY - padB;
              const step = monthlyData.length > 1 ? chartW / (monthlyData.length - 1) : 0;

              const points = monthlyData.map(([, a], i) => ({
                x: padX + i * step,
                y: padY + chartH - (a / maxAmount) * chartH
              }));

              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
              const areaPath = `${linePath} L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`;

              const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
                y: padY + chartH - f * chartH,
                label: formatCurrency(f * maxAmount)
              }));

              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

              return (
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: '320px', maxHeight: '220px' }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {gridLines.map((g, i) => (
                      <g key={i}>
                        <line x1={padX} y1={g.y} x2={W} y2={g.y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
                        <text x={padX - 6} y={g.y + 3} textAnchor="end" className="fill-gray-400 dark:fill-white/30" style={{ fontSize: '8px' }}>{g.label}</text>
                      </g>
                    ))}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#areaGrad)" />

                    {/* Line */}
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data points & labels */}
                    {points.map((p, i) => {
                      const parts = monthlyData[i][0].split('-');
                      const mName = monthNames[parseInt(parts[1]) - 1];
                      return (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-gray-700 dark:fill-white/70" style={{ fontSize: '9px', fontWeight: 600 }}>
                            {formatCurrency(monthlyData[i][1])}
                          </text>
                          <text x={p.x} y={H - 6} textAnchor="middle" className="fill-gray-500 dark:fill-white/40" style={{ fontSize: '9px', fontWeight: 500 }}>
                            {mName}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Pending Bills */}
          {pendingBills.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <h2 className="section-title">Pending Bills</h2>
                <span className="badge-pending">{pendingBills.length} unpaid</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.map((b) => {
                      const isOverdue = new Date(b.dueDate) < new Date();
                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {(b.customerName || '?')[0].toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{b.customerName}</span>
                            </div>
                          </td>
                          <td className="text-gray-500 dark:text-white/40">#{b.id}</td>
                          <td>
                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-white/40'}`}>
                              {formatDate(b.dueDate)}
                              {isOverdue && <span className="ml-1.5 text-[10px] bg-red-50 dark:bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-md font-semibold">OVERDUE</span>}
                            </span>
                          </td>
                          <td><span className={b.status === 'Partially Paid' ? 'badge-partial' : 'badge-pending'}>{b.status}</span></td>
                          <td className="text-right text-gray-700 dark:text-white/60">{formatCurrency(b.grandTotal)}</td>
                          <td className="text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency(b.outstanding)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
