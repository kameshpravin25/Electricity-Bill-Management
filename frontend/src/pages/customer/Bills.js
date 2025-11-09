import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function Bills() {
  const [invoices, setInvoices] = React.useState([]);
  const [filteredInvoices, setFilteredInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sortField, setSortField] = React.useState('issueDate');
  const [sortOrder, setSortOrder] = React.useState('desc');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchInvoices();
    
    // Listen for payment creation events from admin to refresh invoices
    const handlePaymentCreated = () => {
      fetchInvoices();
    };
    window.addEventListener('paymentCreated', handlePaymentCreated);
    
    // Auto-refresh every 30 seconds to catch updates
    const interval = setInterval(() => {
      fetchInvoices();
    }, 30000);
    
    return () => {
      window.removeEventListener('paymentCreated', handlePaymentCreated);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    applyFiltersAndSort();
  }, [invoices, sortField, sortOrder, filterStatus, filterDateFrom, filterDateTo]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customer/invoices');
      if (response.data.success) {
        setInvoices(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...invoices];

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(inv => new Date(inv.issueDate) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(inv => new Date(inv.issueDate) <= toDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate) : new Date(0);
          bVal = b.dueDate ? new Date(b.dueDate) : new Date(0);
          break;
        case 'issueDate':
          aVal = new Date(a.issueDate);
          bVal = new Date(b.issueDate);
          break;
        case 'amount':
          aVal = a.grandTotal;
          bVal = b.grandTotal;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(filtered);
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
      <span className={`px-2 py-1 rounded text-xs font-medium border ${className}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-slate-500">⇅</span>;
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <RequireAuth role="customer">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-slate-400">Loading bills...</div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-6">Bills & Invoices</h1>

          {/* Filters */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterStatus('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
            <thead className="bg-slate-700 text-left">
              <tr>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('issueDate')}>
                      <div className="flex items-center gap-2">
                        Invoice ID
                        <SortIcon field="issueDate" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Bill ID</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('issueDate')}>
                      <div className="flex items-center gap-2">
                        Issue Date
                        <SortIcon field="issueDate" />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('dueDate')}>
                      <div className="flex items-center gap-2">
                        Due Date
                        <SortIcon field="dueDate" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Base Amount</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('amount')}>
                      <div className="flex items-center gap-2">
                        Grand Total
                        <SortIcon field="amount" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice, idx) => (
                      <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-slate-200">#{invoice.invoiceId}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {invoice.billId ? `#${invoice.billId}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(invoice.issueDate)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {invoice.unitsConsumed || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatCurrency(invoice.baseAmount)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatCurrency(invoice.tax)}</td>
                        <td className="px-4 py-3 text-green-400 font-semibold">
                          {formatCurrency(invoice.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-blue-400">{formatCurrency(invoice.amountPaid)}</td>
                        <td className="px-4 py-3 text-red-400 font-semibold">
                          {formatCurrency(invoice.outstanding)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              to={`/customer/invoice/${invoice.invoiceId}`}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View
                            </Link>
                            {invoice.status !== 'Paid' && (
                              <button
                                onClick={() => navigate(`/customer/invoice/${invoice.invoiceId}`)}
                                className="text-green-400 hover:text-green-300 text-xs"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="px-4 py-8 text-center text-slate-400">
                        No invoices found
                      </td>
                </tr>
                  )}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
