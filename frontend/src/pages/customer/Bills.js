import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerInvoices } from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth, useAuth } from '../../auth/AuthContext';

export default function Bills() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  React.useEffect(() => { if (profile?.customerId) fetchInvoices(); }, [profile]);

  const fetchInvoices = async () => {
    try { setLoading(true); const data = await getCustomerInvoices(profile.customerId); setInvoices(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatCurrency = (a) => `₹${parseFloat(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const filtered = invoices.filter(i => {
    let match = true;
    if (filterStatus) match = i.status === filterStatus;
    if (search) match = match && (`${i.id}`.includes(search) || formatDate(i.invoiceDate).toLowerCase().includes(search.toLowerCase()));
    return match;
  });

  const totalOutstanding = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.grandTotal - i.amountPaid), 0);

  if (loading) return (
    <RequireAuth role="customer"><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400 dark:text-white/30">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading bills...
        </div>
      </div>
    </Layout></RequireAuth>
  );

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Bills</h1>
              <p className="page-subtitle">{invoices.length} invoices, {formatCurrency(totalOutstanding)} outstanding</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="input-premium pl-11" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-premium w-40">
              <option value="">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partial</option>
            </select>
          </div>

          {/* Invoice List */}
          {filtered.length === 0 ? (
            <div className="card p-12 text-center text-sm text-gray-400 dark:text-white/30">No invoices found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => navigate(`/customer/invoice/${inv.id}`)}
                  className="w-full card card-hover p-5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-500 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">Invoice #{inv.id}</div>
                        <div className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                          {formatDate(inv.invoiceDate)} &middot; {inv.unitsConsumed} kWh
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.grandTotal)}</div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          inv.status === 'Paid' ? 'text-emerald-500' : inv.status === 'Partially Paid' ? 'text-orange-500' : 'text-amber-500'
                        }`}>{inv.status}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 dark:text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}
