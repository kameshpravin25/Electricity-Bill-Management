import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerInvoiceDetail, createPayment } from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth, useAuth } from '../../auth/AuthContext';

export default function BillDetail() {
  const { invoiceId, billId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [payForm, setPayForm] = React.useState({ amount: '', paymentMode: 'UPI', transactionRef: '' });
  const [paying, setPaying] = React.useState(false);
  const [msg, setMsg] = React.useState({ type: '', text: '' });

  const id = invoiceId || billId;

  React.useEffect(() => { if (profile?.customerId && id) fetchDetail(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, id]);

  const fetchDetail = async () => {
    try { setLoading(true); const d = await getCustomerInvoiceDetail(id, profile.customerId); setData(d); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault(); setMsg({ type: '', text: '' });
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { setMsg({ type: 'error', text: 'Enter a valid amount' }); return; }
    try {
      setPaying(true);
      await createPayment({ customerId: profile.customerId, invoiceId: parseInt(id), amountPaid: amount, paymentMode: payForm.paymentMode, transactionRef: payForm.transactionRef });
      setMsg({ type: 'success', text: 'Payment successful' });
      setPayForm({ amount: '', paymentMode: 'UPI', transactionRef: '' });
      setTimeout(() => { setShowPayModal(false); setMsg({ type: '', text: '' }); fetchDetail(); }, 1500);
    } catch (e) { setMsg({ type: 'error', text: e?.message || 'Payment failed' }); }
    finally { setPaying(false); }
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

  const inv = data?.invoice;
  const payments = data?.payments || [];
  const meter = data?.meterInfo;

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back button */}
          <button onClick={() => navigate('/customer/bills')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Bills
          </button>

          {inv && (
            <>
              {/* Invoice Header */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="page-title">Invoice #{inv.invoiceId}</h1>
                    <p className="page-subtitle">Issued {formatDate(inv.invoiceDate)} &middot; Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <span className={inv.status === 'Paid' ? 'badge-paid' : inv.status === 'Partially Paid' ? 'badge-partial' : 'badge-pending'}>
                    {inv.status}
                  </span>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-white/40">Units Consumed</span>
                    <span className="font-medium text-gray-900 dark:text-white">{inv.unitsConsumed} kWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-white/40">Base Amount</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(inv.baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-white/40">Tax (5%)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(inv.tax)}</span>
                  </div>
                  <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Grand Total</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(inv.grandTotal)}</span>
                  </div>
                  {inv.amountPaid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400">Amount Paid</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{formatCurrency(inv.amountPaid)}</span>
                    </div>
                  )}
                  {inv.outstanding > 0 && (
                    <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3 flex justify-between">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Balance Due</span>
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(inv.outstanding)}</span>
                    </div>
                  )}
                </div>

                {inv.status !== 'Paid' && (
                  <button onClick={() => { setPayForm({ ...payForm, amount: inv.outstanding || inv.grandTotal }); setShowPayModal(true); }} className="btn-primary w-full mt-6">
                    Pay {formatCurrency(inv.outstanding || inv.grandTotal)}
                  </button>
                )}
              </div>

              {/* Meter Info */}
              {meter && (
                <div className="card p-6">
                  <h2 className="section-title mb-4">Meter Details</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 dark:text-white/40">Meter ID</span><div className="font-medium mt-0.5">#{meter.meterId}</div></div>
                    <div><span className="text-gray-500 dark:text-white/40">Type</span><div className="font-medium mt-0.5">{meter.meterType}</div></div>
                    <div><span className="text-gray-500 dark:text-white/40">Rate</span><div className="font-medium mt-0.5">{formatCurrency(meter.ratePerUnit)}/unit</div></div>
                    <div><span className="text-gray-500 dark:text-white/40">Tariff</span><div className="font-medium mt-0.5">{meter.tariffDescription}</div></div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div className="card overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
                  <h2 className="section-title">Payment History</h2>
                </div>
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">No payments recorded</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                    {payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amountPaid)}</div>
                          <div className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{p.paymentMode} {p.transactionRef ? `- ${p.transactionRef}` : ''}</div>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-white/30">{formatDate(p.paymentDate)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pay Modal */}
        {showPayModal && (
          <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
            <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="section-title">Make Payment</h2>
                <button onClick={() => setShowPayModal(false)} className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handlePay} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Amount</label>
                  <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className="input-premium text-lg font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Payment Mode</label>
                  <select value={payForm.paymentMode} onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })} className="input-premium">
                    {['UPI', 'Card', 'Net Banking', 'Cash'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Reference (optional)</label>
                  <input type="text" value={payForm.transactionRef} onChange={e => setPayForm({ ...payForm, transactionRef: e.target.value })} placeholder="Transaction ID" className="input-premium" />
                </div>
                {msg.text && <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{msg.text}</div>}
                <button type="submit" disabled={paying} className="btn-primary w-full disabled:opacity-50">{paying ? 'Processing...' : 'Pay Now'}</button>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}
