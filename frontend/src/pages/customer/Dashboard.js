import React from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function CustomerDashboard() {
  const [dashboardData, setDashboardData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [paymentForm, setPaymentForm] = React.useState({
    invoiceId: '',
    amount: '',
    paymentMode: 'UPI',
    transactionRef: ''
  });
  const [paymentMsg, setPaymentMsg] = React.useState('');
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [paymentReceipt, setPaymentReceipt] = React.useState(null);

  React.useEffect(() => {
    fetchDashboardData();
    
    // Listen for payment creation events from admin to refresh dashboard
    const handlePaymentCreated = () => {
      fetchDashboardData();
    };
    window.addEventListener('paymentCreated', handlePaymentCreated);
    
    // Auto-refresh every 30 seconds to catch updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => {
      window.removeEventListener('paymentCreated', handlePaymentCreated);
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customer/dashboard');
      if (response.data.success) {
        setDashboardData(response.data);
        // Pre-fill payment form if active bill exists
        if (response.data.activeBill) {
          const bill = response.data.activeBill;
          setPaymentForm({
            invoiceId: bill.invoiceId,
            amount: (bill.grandTotal - bill.amountPaid).toFixed(2),
            paymentMode: 'UPI',
            transactionRef: ''
          });
        }
      } else {
        console.error('Dashboard API returned success=false:', response.data);
        setDashboardData(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      console.error('Error details:', err.response?.data);
      setDashboardData(null);
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
      'Paid': 'bg-green-500/20 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50',
      'Pending': 'bg-yellow-500/20 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50',
      'Partially Paid': 'bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50'
    };
    const className = statusMap[status] || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${className}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentMsg('');
    try {
      const response = await api.post('/customer/pay', {
        invoiceId: Number(paymentForm.invoiceId),
        paymentMode: paymentForm.paymentMode,
        transactionRef: paymentForm.transactionRef || null,
        amount: Number(paymentForm.amount)
      });
      if (response.data.success) {
        setPaymentReceipt(response.data.receipt || response.data);
        setShowPaymentModal(false);
        setShowReceipt(true);
        setTimeout(() => {
          fetchDashboardData();
          setPaymentMsg('');
        }, 1500);
      }
    } catch (err) {
      setPaymentMsg(err?.response?.data?.error || 'Payment failed');
    }
  };

  if (loading) {
  return (
    <RequireAuth role="customer">
      <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-slate-600 dark:text-slate-400">Loading dashboard...</div>
        </div>
      </Layout>
    </RequireAuth>
  );
}

  if (!dashboardData) {
    return (
      <RequireAuth role="customer">
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Error loading dashboard data</h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Please try refreshing the page. If the problem persists, contact support.
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchDashboardData()}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  const { customer, summary, activeBill, recentBills, recentPayments, meters = [], meterInfo } = dashboardData;
  // Use the summary's outstanding amount which includes all pending invoices and their payments
  const outstanding = summary.currentOutstandingAmount || 0;
  // Calculate outstanding for active bill if it exists
  const activeBillOutstanding = activeBill ? (activeBill.grandTotal - activeBill.amountPaid) : 0;

  // Format customer name
  const getCustomerName = () => {
    if (!customer) return 'Customer';
    const { firstName, middleName, lastName } = customer;
    return `${firstName || ''} ${middleName || ''} ${lastName || ''}`.trim() || 'Customer';
  };

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Customer Profile Header */}
          {customer && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar/Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {getCustomerName().charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Customer Details */}
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                      Welcome, {getCustomerName()}!
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.contactNo && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{customer.contactNo}</span>
                        </div>
                      )}
                      {customer.customerId && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2m-2-4h.01M17 15h.01" />
                          </svg>
                          <span>ID: {customer.customerId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Address Section */}
                {customer.address && (
                  <div className="md:text-right">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Address</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 max-w-xs">
                      {customer.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Account Overview</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Outstanding Amount</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(outstanding)}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Month (Units)</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.currentMonthConsumption || 0}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Next Due Date</div>
              <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                {summary.nextDueDate ? formatDate(summary.nextDueDate) : 'N/A'}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Last Payment</div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {summary.lastPayment ? formatCurrency(summary.lastPayment.amount) : 'N/A'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {summary.lastPayment ? formatDate(summary.lastPayment.date) : ''}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Paid (YTD)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalPaidYTD)}</div>
            </div>
          </div>

          {/* Active / Current Bill Card */}
          {activeBill && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 mb-8 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Current Bill</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Invoice ID</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">#{activeBill.invoiceId}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Issue Date</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatDate(activeBill.invoiceDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Due Date</div>
                  <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                    {formatDate(activeBill.dueDate || activeBill.invoiceDate)}
                  </div>
                </div>
                {activeBill.unitsConsumed && (
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Units Consumed</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activeBill.unitsConsumed}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Base Amount</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(activeBill.baseAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Tax</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(activeBill.tax)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Grand Total</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(activeBill.grandTotal)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Amount Paid</div>
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(activeBill.amountPaid)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Outstanding Amount</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(activeBillOutstanding)}
                  </div>
                </div>
                {activeBillOutstanding > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Pay Now
                  </button>
                )}
                {activeBillOutstanding <= 0 && (
                  <div className="px-6 py-2 rounded-lg bg-green-500/20 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold border border-green-500/50">
                    Fully Paid
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Billing Timeline / Recent Bills */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Bills</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700 text-left">
                    <tr>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Invoice ID</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Issue Date</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Due Date</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Amount</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.length > 0 ? (
                      recentBills.map((bill, idx) => (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-4 py-2 text-slate-900 dark:text-slate-200">#{bill.invoiceId}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(bill.invoiceDate)}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(bill.dueDate)}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatCurrency(bill.grandTotal)}</td>
                          <td className="px-4 py-2">{getStatusBadge(bill.status)}</td>
                          <td className="px-4 py-2">
                            <Link
                              to={`/customer/bills`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">No bills found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Payments</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700 text-left">
                    <tr>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Payment ID</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Date</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Amount</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Mode</th>
                      <th className="px-4 py-2 text-slate-700 dark:text-slate-300">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length > 0 ? (
                      recentPayments.map((payment, idx) => (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-4 py-2 text-slate-900 dark:text-slate-200">#{payment.paymentId}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(payment.paymentDate)}</td>
                          <td className="px-4 py-2 text-green-600 dark:text-green-400 font-semibold">
                            {formatCurrency(payment.amountPaid)}
                          </td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{payment.paymentMode}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 text-xs">
                            {payment.transactionRef || 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">No payments found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Meters & Tariff Information */}
          {meters.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Meter & Tariff Information {meters.length > 1 && `(${meters.length} meters)`}
              </h2>
              <div className="space-y-6">
                {meters.map((meter, index) => (
                  <div key={meter.meterId || index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                    {meters.length > 1 && (
                      <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Meter #{index + 1}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Meter ID</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">#{meter.meterId}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Meter Type</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{meter.meterType}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Installation Date</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatDate(meter.installationDate)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Rate Per Unit</div>
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {meter.ratePerUnit ? formatCurrency(meter.ratePerUnit) + '/unit' : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Address</div>
                      <div className="text-slate-700 dark:text-slate-200">
                        {meter.address || (meter.street && meter.houseNo && meter.city && meter.state && meter.pincode 
                          ? `${meter.street} ${meter.houseNo}, ${meter.city}, ${meter.state} - ${meter.pincode}`
                          : 'N/A')}
                      </div>
                    </div>
                    {meter.tariffDescription && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tariff</div>
                        <div className="text-slate-700 dark:text-slate-200">{meter.tariffDescription}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Effective: {formatDate(meter.effectiveFrom)} - {formatDate(meter.effectiveTo) || 'Ongoing'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Fallback: Show meterInfo if meters array is empty but meterInfo exists (backward compatibility) */}
          {meters.length === 0 && meterInfo && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Meter & Tariff Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Meter ID</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">#{meterInfo.meterId}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Meter Type</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{meterInfo.meterType}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Installation Date</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatDate(meterInfo.installationDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Rate Per Unit</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {meterInfo.ratePerUnit ? formatCurrency(meterInfo.ratePerUnit) + '/unit' : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Address</div>
                <div className="text-slate-700 dark:text-slate-200">{meterInfo.address || 'N/A'}</div>
              </div>
              {meterInfo.tariffDescription && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tariff</div>
                  <div className="text-slate-700 dark:text-slate-200">{meterInfo.tariffDescription}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Effective: {formatDate(meterInfo.effectiveFrom)} - {formatDate(meterInfo.effectiveTo) || 'Ongoing'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && activeBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Make Payment</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Invoice ID</label>
                  <input
                    type="text"
                    value={paymentForm.invoiceId}
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-4 py-2 text-slate-900 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    readOnly
                    required
                    step="0.01"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-4 py-2 text-slate-900 dark:text-slate-300 cursor-not-allowed"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Outstanding: {formatCurrency(activeBill.grandTotal - activeBill.amountPaid)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-4 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Transaction Reference (Required)</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    placeholder="Enter transaction reference"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-4 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
                {paymentMsg && (
                  <div className={`text-sm p-2 rounded ${paymentMsg.includes('success') ? 'bg-green-500/20 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
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
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Receipt Modal */}
        {showReceipt && paymentReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-lg w-full shadow-xl">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-green-600 dark:text-green-400 text-5xl mb-3">✓</div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment Successful!</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">Payment Receipt</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 mb-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-600 dark:text-slate-400">Payment ID:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">#{paymentReceipt.paymentId || paymentReceipt.payment?.[0]}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-600 dark:text-slate-400">Invoice ID:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">#{paymentReceipt.invoiceId || paymentReceipt.payment?.[1]}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-600 dark:text-slate-400">Amount Paid:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                        {formatCurrency(paymentReceipt.amountPaid || paymentReceipt.payment?.[2])}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-600 dark:text-slate-400">Payment Date:</span>
                      <span className="text-slate-900 dark:text-slate-200">{formatDate(paymentReceipt.paymentDate || paymentReceipt.payment?.[3])}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-600 dark:text-slate-400">Payment Mode:</span>
                      <span className="text-slate-900 dark:text-slate-200">{paymentReceipt.paymentMode || paymentReceipt.payment?.[4]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Transaction Ref:</span>
                      <span className="text-slate-900 dark:text-slate-200 text-xs font-mono">
                        {paymentReceipt.transactionRef || paymentReceipt.payment?.[5] || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const receiptData = {
                        paymentId: paymentReceipt.paymentId || paymentReceipt.payment?.[0],
                        invoiceId: paymentReceipt.invoiceId || paymentReceipt.payment?.[1],
                        amount: paymentReceipt.amountPaid || paymentReceipt.payment?.[2],
                        date: paymentReceipt.paymentDate || paymentReceipt.payment?.[3],
                        paymentMode: paymentReceipt.paymentMode || paymentReceipt.payment?.[4],
                        transactionRef: paymentReceipt.transactionRef || paymentReceipt.payment?.[5],
                        customerName: paymentReceipt.customerName || 'N/A',
                        customerEmail: paymentReceipt.customerEmail || 'N/A'
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
                      const receiptData = paymentReceipt;
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Payment Receipt #${receiptData.paymentId || receiptData.payment?.[0]}</title>
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
                                <span class="detail-value">#${receiptData.paymentId || receiptData.payment?.[0]}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Invoice ID:</span>
                                <span class="detail-value">#${receiptData.invoiceId || receiptData.payment?.[1]}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Amount Paid:</span>
                                <span class="detail-value amount">₹${parseFloat(receiptData.amountPaid || receiptData.payment?.[2] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Payment Date:</span>
                                <span class="detail-value">${new Date(receiptData.paymentDate || receiptData.payment?.[3] || new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Payment Mode:</span>
                                <span class="detail-value">${receiptData.paymentMode || receiptData.payment?.[4] || 'N/A'}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Transaction Reference:</span>
                                <span class="detail-value">${receiptData.transactionRef || receiptData.payment?.[5] || 'N/A'}</span>
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
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Print Receipt
                  </button>
                  <button
                    onClick={() => {
                      setShowReceipt(false);
                      setPaymentReceipt(null);
                    }}
                    className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold transition"
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
