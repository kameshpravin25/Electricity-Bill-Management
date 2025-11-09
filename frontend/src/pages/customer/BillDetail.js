import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function BillDetail() {
  const { invoiceId, billId } = useParams();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [paymentForm, setPaymentForm] = React.useState({
    invoiceId: '',
    amount: '',
    paymentMode: 'UPI',
    transactionRef: '',
    notes: ''
  });
  const [paymentMsg, setPaymentMsg] = React.useState('');
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [paymentReceipt, setPaymentReceipt] = React.useState(null);

  React.useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetail();
    } else if (billId) {
      // For backward compatibility, if billId is provided, we need to find the invoice
      // For now, we'll just show an error or redirect
      // In a real app, you'd fetch bills and find the related invoice
      console.log('Bill ID provided:', billId);
    }
  }, [invoiceId, billId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customer/invoice/${invoiceId}`);
      if (response.data.success) {
        setInvoiceData(response.data);
        // Pre-fill payment form
        const inv = response.data.invoice;
        setPaymentForm({
          invoiceId: inv.invoiceId,
          amount: inv.outstanding.toFixed(2),
          paymentMode: 'UPI',
          transactionRef: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Error fetching invoice detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Paid': 'bg-green-500/20 text-green-400 border-green-500/50',
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'Partially Paid': 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    };
    const className = statusMap[status] || 'bg-slate-700 text-slate-300 border-slate-600';
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium border ${className}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentMsg('');
    
    const paymentAmount = parseFloat(paymentForm.amount);
    if (!paymentForm.transactionRef || paymentForm.transactionRef.trim() === '') {
      setPaymentMsg('Transaction reference is required');
      return;
    }
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setPaymentMsg('Amount must be greater than 0');
      return;
    }
    
    // Round to 2 decimal places to avoid floating-point precision issues
    const roundedAmount = Math.round(paymentAmount * 100) / 100;
    const roundedOutstanding = Math.round(invoiceData.invoice.outstanding * 100) / 100;
    
    if (roundedAmount > roundedOutstanding) {
      setPaymentMsg(`Amount cannot exceed outstanding amount of ${formatCurrency(invoiceData.invoice.outstanding)}`);
      return;
    }

    try {
      const response = await api.post('/customer/pay', {
        invoiceId: Number(paymentForm.invoiceId),
        paymentMode: paymentForm.paymentMode,
        transactionRef: paymentForm.transactionRef.trim(),
        amount: paymentAmount,
        notes: paymentForm.notes || null
      });

      if (response.data.success) {
        setPaymentReceipt(response.data);
        setShowPaymentModal(false);
        setShowReceipt(true);
        // Refresh invoice data
        setTimeout(() => {
          fetchInvoiceDetail();
          setShowReceipt(false);
        }, 3000);
      }
    } catch (err) {
      setPaymentMsg(err?.response?.data?.error || 'Payment failed. Please try again.');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Create a simple PDF-like view in new window for printing
    const printWindow = window.open('', '_blank');
    const invoice = invoiceData.invoice;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.invoiceId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin: 20px 0; }
            .invoice-details table { width: 100%; border-collapse: collapse; }
            .invoice-details td { padding: 8px; border-bottom: 1px solid #ddd; }
            .total { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>E-Billing System</h1>
            <h2>Invoice #${invoice.invoiceId}</h2>
          </div>
          <div class="invoice-details">
            <table>
              <tr><td>Invoice Date:</td><td>${formatDate(invoice.invoiceDate)}</td></tr>
              <tr><td>Status:</td><td>${invoice.status}</td></tr>
              ${invoice.unitsConsumed ? `<tr><td>Units Consumed:</td><td>${invoice.unitsConsumed}</td></tr>` : ''}
              <tr><td>Base Amount:</td><td>${formatCurrency(invoice.baseAmount)}</td></tr>
              <tr><td>Tax:</td><td>${formatCurrency(invoice.tax)}</td></tr>
              <tr><td class="total">Grand Total:</td><td class="total">${formatCurrency(invoice.grandTotal)}</td></tr>
              <tr><td>Amount Paid:</td><td>${formatCurrency(invoice.amountPaid)}</td></tr>
              <tr><td class="total">Outstanding:</td><td class="total">${formatCurrency(invoice.outstanding)}</td></tr>
            </table>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <RequireAuth role="customer">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-slate-400">Loading invoice details...</div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  if (!invoiceData) {
  return (
    <RequireAuth role="customer">
      <Layout>
          <div className="text-red-400">Invoice not found</div>
      </Layout>
    </RequireAuth>
  );
}

  const { invoice, payments, meterInfo } = invoiceData;
  const ratePerUnit = meterInfo?.ratePerUnit || (invoice.unitsConsumed ? invoice.baseAmount / invoice.unitsConsumed : null);

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Invoice #{invoice.invoiceId}</h1>
              <div className="mt-2">{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="flex gap-3">
              {invoice.status !== 'Pending' && (
                <>
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={handlePrintInvoice}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition"
                  >
                    Print
                  </button>
                </>
              )}
              {invoice.status !== 'Paid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>

          {/* Invoice Breakdown */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-slate-400">Invoice Date</div>
                <div className="text-lg font-semibold text-slate-100">{formatDate(invoice.invoiceDate)}</div>
              </div>
              {invoice.billId && (
                <>
                  <div>
                    <div className="text-sm text-slate-400">Bill ID</div>
                    <div className="text-lg font-semibold text-slate-100">#{invoice.billId}</div>
                  </div>
                  {invoice.billIssueDate && (
                    <div>
                      <div className="text-sm text-slate-400">Bill Issue Date</div>
                      <div className="text-lg font-semibold text-slate-100">{formatDate(invoice.billIssueDate)}</div>
                    </div>
                  )}
                  {invoice.billDueDate && (
                    <div>
                      <div className="text-sm text-slate-400">Due Date</div>
                      <div className="text-lg font-semibold text-yellow-400">{formatDate(invoice.billDueDate)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="space-y-2">
                {invoice.unitsConsumed && ratePerUnit && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Units Consumed:</span>
                    <span className="text-slate-200">{invoice.unitsConsumed} units</span>
                  </div>
                )}
                {ratePerUnit && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Rate Per Unit:</span>
                    <span className="text-slate-200">{formatCurrency(ratePerUnit)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-300">Base Amount:</span>
                  <span className="text-slate-200">{formatCurrency(invoice.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tax (5%):</span>
                  <span className="text-slate-200">{formatCurrency(invoice.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-lg font-semibold text-slate-100">Grand Total:</span>
                  <span className="text-lg font-bold text-green-400">{formatCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Amount Paid:</span>
                  <span className="text-blue-400">{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-lg font-semibold text-slate-100">Outstanding:</span>
                  <span className="text-lg font-bold text-red-400">{formatCurrency(invoice.outstanding)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Bill & Meter Info */}
          {meterInfo && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Meter Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Meter ID</div>
                  <div className="text-lg font-semibold text-slate-100">#{meterInfo.meterId}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Meter Type</div>
                  <div className="text-lg font-semibold text-slate-100">{meterInfo.meterType}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Installation Date</div>
                  <div className="text-lg font-semibold text-slate-100">{formatDate(meterInfo.installationDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Rate Per Unit</div>
                  <div className="text-lg font-semibold text-green-400">
                    {formatCurrency(meterInfo.ratePerUnit)}/unit
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Address</div>
                <div className="text-slate-200">{meterInfo.address || 'N/A'}</div>
              </div>
              {meterInfo.tariffDescription && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Tariff</div>
                  <div className="text-slate-200">{meterInfo.tariffDescription}</div>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Payment History</h2>
            {payments && payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700 text-left">
                    <tr>
                      <th className="px-4 py-2">Payment ID</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Mode</th>
                      <th className="px-4 py-2">Transaction Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, idx) => (
                      <tr key={idx} className="border-t border-slate-700">
                        <td className="px-4 py-2 text-slate-200">#{payment.paymentId}</td>
                        <td className="px-4 py-2 text-slate-300">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-2 text-green-400 font-semibold">
                          {formatCurrency(payment.amountPaid)}
                        </td>
                        <td className="px-4 py-2 text-slate-300">{payment.paymentMode}</td>
                        <td className="px-4 py-2 text-slate-400 text-xs">
                          {payment.transactionRef || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">No payments yet</div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && invoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-100">Make Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentMsg('');
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Invoice ID</label>
                  <input
                    type="text"
                    value={paymentForm.invoiceId}
                    readOnly
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    readOnly
                    required
                    step="0.01"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-300 cursor-not-allowed"
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    Outstanding: {formatCurrency(invoice.outstanding)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Netbanking">Netbanking</option>
                    <option value="Wallet">Wallet</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Transaction Reference <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    required
                    placeholder="Enter transaction reference"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                  />
                </div>
                {paymentMsg && (
                  <div className={`text-sm p-2 rounded ${paymentMsg.includes('success') || !paymentMsg.includes('error') ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-400'}`}>
                    {paymentMsg}
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
                  >
                    Pay Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentMsg('');
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Receipt */}
        {showReceipt && paymentReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-lg w-full">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-green-400 text-5xl mb-3">✓</div>
                  <h3 className="text-2xl font-bold text-slate-100">Payment Successful!</h3>
                  <p className="text-slate-400 mt-2">Payment Receipt</p>
                </div>

                <div className="bg-slate-900 rounded-lg p-5 mb-4 border border-slate-700">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Payment ID:</span>
                      <span className="text-slate-200 font-medium">#{paymentReceipt.receipt?.paymentId || paymentReceipt.payment?.[0]}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Invoice ID:</span>
                      <span className="text-slate-200 font-medium">#{paymentReceipt.receipt?.invoiceId || paymentReceipt.payment?.[1]}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Amount Paid:</span>
                      <span className="text-green-400 font-bold text-lg">
                        {formatCurrency(paymentReceipt.receipt?.amountPaid || paymentReceipt.payment?.[2])}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Payment Date:</span>
                      <span className="text-slate-200">{formatDate(paymentReceipt.receipt?.paymentDate || paymentReceipt.payment?.[3])}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Payment Mode:</span>
                      <span className="text-slate-200">{paymentReceipt.receipt?.paymentMode || paymentReceipt.payment?.[4]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transaction Ref:</span>
                      <span className="text-slate-200 text-xs font-mono">
                        {paymentReceipt.receipt?.transactionRef || paymentReceipt.payment?.[5] || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const receipt = paymentReceipt.receipt || paymentReceipt;
                      const receiptData = {
                        paymentId: receipt.paymentId || receipt.payment?.[0],
                        invoiceId: receipt.invoiceId || receipt.payment?.[1],
                        amount: receipt.amountPaid || receipt.payment?.[2],
                        date: receipt.paymentDate || receipt.payment?.[3],
                        paymentMode: receipt.paymentMode || receipt.payment?.[4],
                        transactionRef: receipt.transactionRef || receipt.payment?.[5],
                        customerName: receipt.customerName || 'N/A',
                        customerEmail: receipt.customerEmail || 'N/A'
                      };
                      const receiptJson = JSON.stringify(receiptData, null, 2);
                      const blob = new Blob([receiptJson], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `payment_receipt_${receiptData.paymentId}_${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Download Receipt
                  </button>
                  <button
                    onClick={() => {
                      const receipt = paymentReceipt.receipt || paymentReceipt;
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Payment Receipt #${receipt.paymentId || receipt.payment?.[0]}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
                              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                              .receipt-title { font-size: 24px; font-weight: bold; color: #059669; }
                              .details { margin: 20px 0; }
                              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                              .detail-label { font-weight: bold; color: #666; }
                              .detail-value { color: #000; }
                              .amount { font-size: 20px; font-weight: bold; color: #059669; }
                              .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="receipt-title">PAYMENT RECEIPT</div>
                              <div style="color: #666; margin-top: 10px;">E-Billing System</div>
                            </div>
                            <div class="details">
                              <div class="detail-row">
                                <span class="detail-label">Payment ID:</span>
                                <span class="detail-value">#${receipt.paymentId || receipt.payment?.[0]}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Invoice ID:</span>
                                <span class="detail-value">#${receipt.invoiceId || receipt.payment?.[1]}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Amount Paid:</span>
                                <span class="detail-value amount">₹${parseFloat(receipt.amountPaid || receipt.payment?.[2] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Payment Date:</span>
                                <span class="detail-value">${new Date(receipt.paymentDate || receipt.payment?.[3] || new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Payment Mode:</span>
                                <span class="detail-value">${receipt.paymentMode || receipt.payment?.[4] || 'N/A'}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Transaction Reference:</span>
                                <span class="detail-value">${receipt.transactionRef || receipt.payment?.[5] || 'N/A'}</span>
                              </div>
                            </div>
                            <div class="footer">
                              <div>Thank you for your payment!</div>
                              <div style="margin-top: 5px;">Generated on ${new Date().toLocaleString('en-IN')}</div>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Print Receipt
                  </button>
                  <button
                    onClick={() => {
                      setShowReceipt(false);
                      setPaymentReceipt(null);
                      fetchInvoiceDetail();
                    }}
                    className="bg-slate-600 hover:bg-slate-500 text-slate-200 px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}
