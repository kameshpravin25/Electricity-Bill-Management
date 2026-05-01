import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerDashboard } from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth, useAuth } from '../../auth/AuthContext';

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (profile?.customerId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchData = async () => {
    try { setLoading(true); const d = await getCustomerDashboard(profile.customerId); setData(d); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatCurrency = (a) => `₹${parseFloat(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  if (loading) return (
    <RequireAuth role="customer"><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400 dark:text-white/30">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading...
        </div>
      </div>
    </Layout></RequireAuth>
  );

  const summary = data?.summary || {};
  const activeBill = data?.activeBill;
  const recentBills = data?.recentBills || [];
  const recentPayments = data?.recentPayments || [];
  const meters = data?.meters || [];

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="page-title">
              Welcome{data?.customer?.FirstName ? `, ${data.customer.FirstName}` : ''}
            </h1>
            <p className="page-subtitle">Here's your billing overview</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-label">Outstanding</div>
              <div className={`stat-value ${summary.currentOutstandingAmount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {formatCurrency(summary.currentOutstandingAmount)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Month</div>
              <div className="stat-value">{summary.currentMonthConsumption || 0} <span className="text-sm font-normal text-gray-400 dark:text-white/30">kWh</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Due Date</div>
              <div className="stat-value text-lg">{summary.nextDueDate ? formatDate(summary.nextDueDate) : 'None'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paid This Year</div>
              <div className="stat-value text-emerald-500">{formatCurrency(summary.totalPaidYTD)}</div>
            </div>
          </div>

          {/* Active Bill */}
          {activeBill && (
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="section-title">Current Bill</h2>
                  <p className="text-xs text-gray-500 dark:text-white/30 mt-0.5">Invoice #{activeBill.invoiceId}</p>
                </div>
                <span className={activeBill.status === 'Paid' ? 'badge-paid' : activeBill.status === 'Partially Paid' ? 'badge-partial' : 'badge-pending'}>
                  {activeBill.status}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/30 mb-1">Units Consumed</div>
                    <div className="text-lg font-semibold">{activeBill.unitsConsumed} kWh</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/30 mb-1">Base Amount</div>
                    <div className="text-lg font-semibold">{formatCurrency(activeBill.baseAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/30 mb-1">Tax</div>
                    <div className="text-lg font-semibold">{formatCurrency(activeBill.tax)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/30 mb-1">Grand Total</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(activeBill.grandTotal)}</div>
                  </div>
                </div>

                {activeBill.status !== 'Paid' && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-white/40">Amount Due</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(activeBill.grandTotal - activeBill.amountPaid)}</div>
                    </div>
                    <button
                      onClick={() => navigate(`/customer/invoice/${activeBill.invoiceId}`)}
                      className="btn-primary"
                    >
                      View & Pay
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bills */}
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <h2 className="section-title">Recent Bills</h2>
                <button onClick={() => navigate('/customer/bills')} className="text-xs font-medium text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white transition-colors">
                  View all
                </button>
              </div>
              {recentBills.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">No bills yet</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {recentBills.map((b, i) => (
                    <button key={i} onClick={() => navigate(`/customer/invoice/${b.invoiceId}`)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-left">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Invoice #{b.invoiceId}</div>
                        <div className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{formatDate(b.invoiceDate)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(b.grandTotal)}</div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${b.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{b.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
                <h2 className="section-title">Recent Payments</h2>
              </div>
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">No payments yet</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {recentPayments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(p.amountPaid)}</div>
                        <div className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{p.paymentMode} {p.transactionRef ? `- ${p.transactionRef}` : ''}</div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-white/30">{formatDate(p.paymentDate)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meters */}
          {meters.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-4">Your Meters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meters.map((m, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4 border border-gray-100 dark:border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Meter #{m.meterId}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/[0.08] font-medium">{m.meterType}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-white/40 space-y-1">
                      <div>Rate: {formatCurrency(m.ratePerUnit)}/unit</div>
                      <div>Tariff: {m.tariffDescription}</div>
                      <div>{m.address}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}
