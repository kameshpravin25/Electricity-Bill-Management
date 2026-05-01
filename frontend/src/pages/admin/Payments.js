import React from 'react';
import * as fs from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminPayments() {
  const [payments, setPayments] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [customerMeters, setCustomerMeters] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [stats, setStats] = React.useState({ totalPayments: 0, totalAmountCollected: 0, pendingPayments: 0 });
  const [form, setForm] = React.useState({ customerId: '', meterId: '', unitsConsumed: '', dueDate: '', ratePerUnit: '' });
  const [msg, setMsg] = React.useState({ type: '', text: '' });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [payData, custData, statsData] = await Promise.all([fs.getPayments(), fs.getCustomers(), fs.getPaymentStats()]);
      setPayments(payData); setCustomers(custData); setStats(statsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const onCustomerChange = async (customerId) => {
    setForm({ ...form, customerId, meterId: '', ratePerUnit: '' });
    if (customerId) {
      try { const m = await fs.getCustomerMeters(customerId); setCustomerMeters(m); }
      catch (e) { setCustomerMeters([]); }
    } else { setCustomerMeters([]); }
  };

  const onMeterChange = (meterId) => {
    const meter = customerMeters.find(m => m.id === parseInt(meterId));
    setForm({ ...form, meterId, ratePerUnit: meter?.ratePerUnit || '' });
  };

  const calcTotal = () => {
    const units = parseFloat(form.unitsConsumed) || 0;
    const rate = parseFloat(form.ratePerUnit) || 0;
    const base = units * rate; const tax = base * 0.05;
    return { base, tax, total: base + tax };
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setMsg({ type: '', text: '' });
    if (!form.customerId || !form.meterId || !form.unitsConsumed) { setMsg({ type: 'error', text: 'Fill required fields' }); return; }
    try {
      setSubmitting(true);
      const result = await fs.createPaymentWithInvoice({ customerId: parseInt(form.customerId), meterId: parseInt(form.meterId), unitsConsumed: form.unitsConsumed, dueDate: form.dueDate, ratePerUnit: form.ratePerUnit });
      setMsg({ type: 'success', text: `Invoice #${result.invoiceId} created` });
      setForm({ customerId: '', meterId: '', unitsConsumed: '', dueDate: '', ratePerUnit: '' }); setCustomerMeters([]);
      setTimeout(() => { setShowModal(false); setMsg({ type: '', text: '' }); fetchAll(); }, 1500);
    } catch (e) { setMsg({ type: 'error', text: e?.message || 'Failed' }); }
    finally { setSubmitting(false); }
  };

  const formatCurrency = (a) => `₹${parseFloat(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const { base, tax, total } = calcTotal();

  if (loading) return (
    <RequireAuth role="admin"><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400 dark:text-white/30">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading...
        </div>
      </div>
    </Layout></RequireAuth>
  );

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Billing</h1>
              <p className="page-subtitle">Manage invoices and payment records</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Invoice
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total Payments</div>
              <div className="stat-value">{stats.totalPayments}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Collected</div>
              <div className="stat-value text-emerald-500 text-lg">{formatCurrency(stats.totalAmountCollected)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value text-amber-500">{stats.pendingPayments}</div>
            </div>
          </div>

          {/* Payment History */}
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="section-title">Payment History</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 dark:text-white/30">No payments found</div>
            ) : (
              <table className="table-premium">
                <thead><tr><th>Customer</th><th>Invoice</th><th className="text-right">Amount</th><th>Mode</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{p.customerName}</td>
                      <td className="text-gray-500 dark:text-white/40">#{p.invoiceId || '-'}</td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amountPaid)}</td>
                      <td><span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-xs font-medium">{p.paymentMode}</span></td>
                      <td className="text-gray-500 dark:text-white/40">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Invoice Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); setMsg({ type: '', text: '' }); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="section-title">Create Invoice</h2>
                <button onClick={() => { setShowModal(false); setMsg({ type: '', text: '' }); }} className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Customer</label>
                    <select value={form.customerId} onChange={e => onCustomerChange(e.target.value)} required className="input-premium">
                      <option value="">Select</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.FirstName} {c.LastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Meter</label>
                    <select value={form.meterId} onChange={e => onMeterChange(e.target.value)} required disabled={!form.customerId} className="input-premium disabled:opacity-40">
                      <option value="">Select</option>
                      {customerMeters.map(m => <option key={m.id} value={m.id}>#{m.id} - {m.meterType}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Units Consumed</label>
                    <input type="number" value={form.unitsConsumed} onChange={e => setForm({ ...form, unitsConsumed: e.target.value })} required min="0" className="input-premium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="input-premium" />
                  </div>
                </div>

                {form.unitsConsumed && form.ratePerUnit && (
                  <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4 border border-gray-100 dark:border-white/[0.04] space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-white/40">{form.unitsConsumed} units x ₹{form.ratePerUnit}</span><span className="font-medium">{formatCurrency(base)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-white/40">Tax (5%)</span><span className="font-medium">{formatCurrency(tax)}</span></div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-white/[0.06] pt-2"><span>Total</span><span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(total)}</span></div>
                  </div>
                )}

                {msg.text && <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{msg.text}</div>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Creating...' : 'Create Invoice'}</button>
                  <button type="button" onClick={() => { setShowModal(false); setMsg({ type: '', text: '' }); }} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}
