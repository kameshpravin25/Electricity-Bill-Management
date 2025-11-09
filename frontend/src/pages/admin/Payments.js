import React from 'react';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminPayments() {
  const [payments, setPayments] = React.useState([]);
  const [filteredPayments, setFilteredPayments] = React.useState([]);
  const [stats, setStats] = React.useState({
    totalPayments: 0,
    totalAmountCollected: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [selectedPayment, setSelectedPayment] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = React.useState(false);
  const [customers, setCustomers] = React.useState([]);
  const [customerInvoices, setCustomerInvoices] = React.useState([]);
  const [customerMeters, setCustomerMeters] = React.useState([]);
  const [tariffs, setTariffs] = React.useState([]);
  
  // Add payment form state
  const [paymentForm, setPaymentForm] = React.useState({
    customerId: '',
    invoiceId: '',
    tariffId: '',
    meterId: '',
    unitsConsumed: '',
    paymentMode: 'Cash',
    transactionRef: '',
    createNewInvoice: true,
    dueDate: ''
  });
  const [calculatedAmount, setCalculatedAmount] = React.useState(0);
  const [selectedTariffRate, setSelectedTariffRate] = React.useState(0);
  
  // Search and filters
  const [searchText, setSearchText] = React.useState('');
  const [filterCustomer, setFilterCustomer] = React.useState('');
  const [filterInvoiceId, setFilterInvoiceId] = React.useState('');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const [filterMode, setFilterMode] = React.useState('');
  
  // Sorting
  const [sortField, setSortField] = React.useState('date');
  const [sortOrder, setSortOrder] = React.useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    fetchPayments();
    fetchStats();
    fetchCustomers();
    fetchTariffs();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchPayments();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    // Calculate amount when units consumed or tariff changes
    const units = parseFloat(paymentForm.unitsConsumed) || 0;
    const rate = selectedTariffRate || 0;
    const baseAmount = units * rate;
    const tax = baseAmount * 0.05; // 5% tax
    const total = baseAmount + tax;
    setCalculatedAmount(total);
  }, [paymentForm.unitsConsumed, selectedTariffRate]);

  React.useEffect(() => {
    // Update rate when tariff selection changes or meter changes
    if (paymentForm.meterId && customerMeters.length > 0) {
      const selectedMeter = customerMeters.find(m => m.meterId === parseInt(paymentForm.meterId));
      if (selectedMeter && selectedMeter.ratePerUnit) {
        setSelectedTariffRate(parseFloat(selectedMeter.ratePerUnit) || 0);
        // Auto-set tariffId from meter
        if (selectedMeter.tariffId) {
          setPaymentForm(prev => ({ ...prev, tariffId: String(selectedMeter.tariffId) }));
        }
      }
    } else if (paymentForm.tariffId && tariffs.length > 0) {
      const selectedTariff = tariffs.find(t => t[0] === parseInt(paymentForm.tariffId));
      if (selectedTariff) {
        setSelectedTariffRate(parseFloat(selectedTariff[2]) || 0);
      }
    } else {
      setSelectedTariffRate(0);
    }
  }, [paymentForm.tariffId, paymentForm.meterId, tariffs, customerMeters]);

  React.useEffect(() => {
    // Fetch invoices and meters when customer changes
    if (paymentForm.customerId) {
      fetchCustomerInvoices(paymentForm.customerId);
      fetchCustomerMeters(paymentForm.customerId);
    } else {
      setCustomerInvoices([]);
      setCustomerMeters([]);
    }
  }, [paymentForm.customerId]);

  React.useEffect(() => {
    applyFiltersAndSort();
  }, [payments, searchText, filterCustomer, filterInvoiceId, filterDateFrom, filterDateTo, filterMode, sortField, sortOrder]);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/admin/payments');
      if (response.data.success) {
        setPayments(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/payments/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching payment stats:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/admin/customers');
      if (response.data.success) {
        setCustomers(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchCustomerInvoices = async (customerId) => {
    try {
      const response = await api.get(`/admin/customer/${customerId}/invoices`);
      if (response.data.success) {
        setCustomerInvoices(response.data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
      setCustomerInvoices([]);
    }
  };

  const fetchCustomerMeters = async (customerId) => {
    try {
      const response = await api.get(`/admin/customer/${customerId}/meters`);
      if (response.data.success) {
        const meters = response.data.meters || [];
        setCustomerMeters(meters);
        // Auto-select first meter if available
        if (meters.length > 0 && !paymentForm.meterId) {
          setPaymentForm(prev => ({ ...prev, meterId: String(meters[0].meterId) }));
        }
      }
    } catch (err) {
      console.error('Error fetching customer meters:', err);
      setCustomerMeters([]);
    }
  };

  const fetchTariffs = async () => {
    try {
      const response = await api.get('/tariffs');
      if (response.data.success) {
        setTariffs(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting payment form:', paymentForm);
      const response = await api.post('/admin/payment', paymentForm);
      console.log('Payment response:', response.data);
      if (response.data.success) {
        alert(`Invoice created successfully!\nAmount: ${formatCurrency(response.data.calculated.amountPaid)}\nCustomer can now pay via customer portal.`);
        setShowAddPaymentModal(false);
        setPaymentForm({
          customerId: '',
          invoiceId: '',
          tariffId: '',
          unitsConsumed: '',
          paymentMode: 'Cash',
          transactionRef: '',
          createNewInvoice: true,
          dueDate: ''
        });
        setCalculatedAmount(0);
        setSelectedTariffRate(0);
        // Refresh payments list and stats
        fetchPayments();
        fetchStats();
        // Trigger event to refresh Customers page if it's open
        window.dispatchEvent(new CustomEvent('paymentCreated'));
      } else {
        alert(response.data.error || 'Failed to create payment');
      }
    } catch (err) {
      console.error('Payment creation error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to create payment. Please check the console for details.';
      alert(errorMsg);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...payments];

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(p => 
        (p[1] && p[1].toLowerCase().includes(searchLower)) || // Customer name
        (p[2] && String(p[2]).includes(searchText)) || // Invoice ID
        (p[5] && String(p[5]).includes(searchText)) || // Payment Mode
        (p[6] && String(p[6]).toLowerCase().includes(searchLower)) // Transaction Ref
      );
    }

    // Apply customer filter
    if (filterCustomer) {
      filtered = filtered.filter(p => p[1] && p[1].toLowerCase().includes(filterCustomer.toLowerCase()));
    }

    // Apply invoice ID filter
    if (filterInvoiceId) {
      filtered = filtered.filter(p => String(p[2]) === filterInvoiceId);
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(p => {
        const payDate = new Date(p[4]);
        return payDate >= fromDate;
      });
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => {
        const payDate = new Date(p[4]);
        return payDate <= toDate;
      });
    }

    // Apply payment mode filter
    if (filterMode) {
      filtered = filtered.filter(p => p[5] === filterMode);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'customer':
          aVal = a[1] || '';
          bVal = b[1] || '';
          break;
        case 'amount':
          aVal = parseFloat(a[3]) || 0;
          bVal = parseFloat(b[3]) || 0;
          break;
        case 'date':
        default:
          aVal = new Date(a[4]);
          bVal = new Date(b[4]);
          break;
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredPayments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleViewDetails = async (paymentId) => {
    try {
      const response = await api.get(`/admin/payment/${paymentId}`);
      if (response.data.success) {
        setSelectedPayment(response.data.payment);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
      alert('Failed to load payment details');
    }
  };

  const exportToCSV = () => {
    const headers = ['Payment ID', 'Customer Name', 'Invoice ID', 'Amount Paid', 'Payment Date', 'Payment Mode', 'Transaction Reference', 'Units Consumed', 'Status'];
    const csvRows = [
      headers.join(','),
      ...filteredPayments.map(p => [
        p[0] || '', // Payment ID
        `"${(p[1] || '').replace(/"/g, '""')}"`, // Customer Name (quoted for CSV)
        p[2] || '', // Invoice ID
        p[3] || 0, // Amount Paid
        p[4] ? new Date(p[4]).toLocaleDateString() : '', // Payment Date
        p[5] || '', // Payment Mode
        `"${(p[6] || '').replace(/"/g, '""')}"`, // Transaction Ref
        p[7] || '', // Units Consumed
        getPaymentStatus(p[8]) // Status
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getPaymentStatus = (invoiceStatus) => {
    if (invoiceStatus === 'Paid') return 'Paid';
    if (invoiceStatus === 'Pending') return 'Pending';
    return invoiceStatus || 'N/A';
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Paid</span>;
    }
    if (status === 'Pending') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Pending</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">{status || 'N/A'}</span>;
  };

  const getUniquePaymentModes = () => {
    const modes = new Set();
    payments.forEach(p => {
      if (p[5]) modes.add(p[5]);
    });
    return Array.from(modes).sort();
  };

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  if (loading) {
    return (
      <RequireAuth role="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-300">Loading payments...</div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Payments</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">View and manage all payment transactions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center gap-2"
              >
                <span className="text-xl">+</span> Add Payment
              </button>
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Payments</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalPayments}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Amount Collected</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalAmountCollected)}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Pending Payments</div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingPayments}</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  placeholder="Search by customer name, invoice ID, payment mode, or transaction reference..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Filter by name"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Invoice ID</label>
                  <input
                    type="text"
                    placeholder="Filter by invoice"
                    value={filterInvoiceId}
                    onChange={(e) => setFilterInvoiceId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date From</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date To</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Payment Mode</label>
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">All Modes</option>
                    {getUniquePaymentModes().map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchText || filterCustomer || filterInvoiceId || filterDateFrom || filterDateTo || filterMode) && (
                <button
                  onClick={() => {
                    setSearchText('');
                    setFilterCustomer('');
                    setFilterInvoiceId('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterMode('');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => {
                          setSortField('date');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        Payment/Invoice ID
                        {sortField === 'date' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => {
                          setSortField('customer');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        Customer Name
                        {sortField === 'customer' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Invoice ID</th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSortField('amount');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-2 hover:text-blue-400 transition-colors ml-auto"
                      >
                        Amount Paid / Invoice Total
                        {sortField === 'amount' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Payment Date</th>
                    <th className="px-4 py-3 text-left">Payment Mode</th>
                    <th className="px-4 py-3 text-left">Transaction Ref</th>
                    <th className="px-4 py-3 text-left">Units</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((payment, idx) => {
                      const recordType = payment[14] || 'payment'; // Record_Type column
                      const isInvoice = recordType === 'invoice';
                      const paymentId = payment[0]; // Payment_ID
                      const invoiceId = payment[2]; // Invoice_ID
                      
                      return (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-200 font-medium">
                            {isInvoice ? (
                              <span className="text-yellow-600 dark:text-yellow-400">Invoice {invoiceId}</span>
                            ) : (
                              `#${paymentId}`
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{payment[1] || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{invoiceId}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {isInvoice ? (
                              <span className="text-yellow-600 dark:text-yellow-400">{formatCurrency(payment[9])}</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">{formatCurrency(payment[3])}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(payment[4])}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{payment[5] || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-xs truncate">{payment[6] || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{payment[7] || 'N/A'}</td>
                          <td className="px-4 py-3">{getStatusBadge(payment[8])}</td>
                          <td className="px-4 py-3">
                            {isInvoice ? (
                              <span className="text-slate-500 dark:text-slate-500 text-sm">Pending Payment</span>
                            ) : (
                              <button
                                onClick={() => handleViewDetails(paymentId)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-slate-700 px-4 py-3 flex items-center justify-between border-t border-slate-600">
                <div className="text-slate-300 text-sm">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => {
                        if (idx > 0 && arr[idx - 1] !== page - 1) {
                          return (
                            <React.Fragment key={page}>
                              <span className="text-slate-400">...</span>
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details Modal */}
        {showModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">
                  Payment Details - ID: {selectedPayment[0] || 'N/A'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Payment Information */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-4">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg p-4">
                    <div>
                      <div className="text-sm text-slate-400">Payment ID</div>
                      <div className="text-slate-200 font-medium">{selectedPayment[0]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Invoice ID</div>
                      <div className="text-slate-200">{selectedPayment[1]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Amount Paid</div>
                      <div className="text-green-400 font-bold text-xl">{formatCurrency(selectedPayment[2])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Payment Date</div>
                      <div className="text-slate-200">{formatDateTime(selectedPayment[3])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Payment Mode</div>
                      <div className="text-slate-200">{selectedPayment[4] || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Transaction Reference</div>
                      <div className="text-slate-200 break-all">{selectedPayment[5] || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Units Consumed</div>
                      <div className="text-slate-200">{selectedPayment[6] || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Invoice Information */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-4">Invoice Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg p-4">
                    <div>
                      <div className="text-sm text-slate-400">Invoice ID</div>
                      <div className="text-slate-200">{selectedPayment[7]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Invoice Date</div>
                      <div className="text-slate-200">{formatDate(selectedPayment[8])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Base Amount</div>
                      <div className="text-slate-200">{formatCurrency(selectedPayment[9])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Tax</div>
                      <div className="text-slate-200">{formatCurrency(selectedPayment[10])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Grand Total</div>
                      <div className="text-green-400 font-bold">{formatCurrency(selectedPayment[11])}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Invoice Status</div>
                      <div>{getStatusBadge(selectedPayment[12])}</div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-4">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg p-4">
                    <div>
                      <div className="text-sm text-slate-400">Customer ID</div>
                      <div className="text-slate-200">{selectedPayment[13]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Name</div>
                      <div className="text-slate-200">{selectedPayment[14]} {selectedPayment[15] || ''} {selectedPayment[16]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Email</div>
                      <div className="text-slate-200">{selectedPayment[17] || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Contact No</div>
                      <div className="text-slate-200">{selectedPayment[18] || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm text-slate-400">Address</div>
                      <div className="text-slate-200">{selectedPayment[19] || 'N/A'}</div>
                    </div>
                    {selectedPayment[20] && (
                      <div>
                        <div className="text-sm text-slate-400">Aadhaar</div>
                        <div className="text-slate-200">{selectedPayment[20]}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-6 py-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full">
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">Add New Payment</h2>
                <button
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    setPaymentForm({
                      customerId: '',
                      invoiceId: '',
                      tariffId: '',
                      meterId: '',
                      unitsConsumed: '',
                      paymentMode: 'Cash',
                      transactionRef: '',
                      createNewInvoice: true,
                      dueDate: ''
                    });
                    setCalculatedAmount(0);
                    setCustomerMeters([]);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Customer <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={paymentForm.customerId}
                    onChange={(e) => setPaymentForm({...paymentForm, customerId: e.target.value, invoiceId: '', meterId: '', tariffId: ''})}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => {
                      const firstName = customer[1] || '';
                      const lastName = customer[2] || '';
                      const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
                      return (
                        <option key={customer[0]} value={customer[0]}>
                          {customerName} (ID: {customer[0]})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Meter Selection */}
                {customerMeters.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Meter <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={paymentForm.meterId}
                      onChange={(e) => setPaymentForm({...paymentForm, meterId: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Meter</option>
                      {customerMeters.map((meter) => (
                        <option key={meter.meterId} value={meter.meterId}>
                          Meter #{meter.meterId} - {meter.meterType} ({meter.city}, {meter.state}) - ₹{meter.ratePerUnit || 'N/A'} per unit
                        </option>
                      ))}
                    </select>
                    {selectedTariffRate > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Tariff rate from meter: ₹{selectedTariffRate} per unit
                      </p>
                    )}
                  </div>
                )}

                {/* Tariff Selection - Only show if no meters available */}
                {customerMeters.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tariff Type <span className="text-red-400">*</span>
                      <span className="text-xs text-slate-500 ml-2">(Required if customer has no meters)</span>
                    </label>
                    <select
                      value={paymentForm.tariffId}
                      onChange={(e) => setPaymentForm({...paymentForm, tariffId: e.target.value})}
                      required={customerMeters.length === 0}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Tariff</option>
                      {tariffs.map((tariff) => (
                        <option key={tariff[0]} value={tariff[0]}>
                          {tariff[1]} - ₹{tariff[2]} per unit
                        </option>
                      ))}
                    </select>
                    {selectedTariffRate > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Selected rate: ₹{selectedTariffRate} per unit
                      </p>
                    )}
                  </div>
                )}

                {/* Invoice Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Invoice</label>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={paymentForm.createNewInvoice}
                        onChange={(e) => setPaymentForm({...paymentForm, createNewInvoice: e.target.checked, invoiceId: ''})}
                        className="rounded"
                      />
                      <span className="text-sm">Create New Invoice</span>
                    </label>
                  </div>
                  {!paymentForm.createNewInvoice && (
                    <select
                      value={paymentForm.invoiceId}
                      onChange={(e) => setPaymentForm({...paymentForm, invoiceId: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Existing Invoice</option>
                      {customerInvoices
                        .filter(inv => inv[3] === 'Pending') // Only show pending invoices
                        .map((invoice) => (
                          <option key={invoice[0]} value={invoice[0]}>
                            Invoice #{invoice[0]} - {formatCurrency(invoice[2])} - {formatDate(invoice[1])}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Units Consumed */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Units Consumed <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.unitsConsumed}
                    onChange={(e) => setPaymentForm({...paymentForm, unitsConsumed: e.target.value})}
                    required
                    placeholder="Enter units consumed"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {selectedTariffRate > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Rate: ₹{selectedTariffRate} per unit
                    </p>
                  )}
                </div>

                {/* Calculated Amount Display */}
                {paymentForm.unitsConsumed && selectedTariffRate > 0 && (
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Base Amount ({paymentForm.unitsConsumed} units × ₹{selectedTariffRate}):</span>
                      <span className="text-slate-200">{formatCurrency((parseFloat(paymentForm.unitsConsumed) || 0) * selectedTariffRate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tax (5%):</span>
                      <span className="text-slate-200">{formatCurrency((parseFloat(paymentForm.unitsConsumed) || 0) * selectedTariffRate * 0.05)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-600">
                      <span className="text-slate-300">Total Amount:</span>
                      <span className="text-green-400">{formatCurrency(calculatedAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentMode: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Transaction Reference */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Transaction Reference (Optional)</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({...paymentForm, transactionRef: e.target.value})}
                    placeholder="Enter transaction reference if applicable"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Due Date <span className="text-slate-500 text-xs">(Optional - defaults to 20 days from today)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm({...paymentForm, dueDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Set payment due date for the customer. If not set, default is 20 days from today.
                  </p>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors flex-1"
                  >
                    Create Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPaymentModal(false);
                      setPaymentForm({
                        customerId: '',
                        invoiceId: '',
                        tariffId: '',
                        meterId: '',
                        unitsConsumed: '',
                        paymentMode: 'Cash',
                        transactionRef: '',
                        createNewInvoice: true,
                        dueDate: ''
                      });
                      setCalculatedAmount(0);
                      setCustomerMeters([]);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}
