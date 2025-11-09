import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminCustomers() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showAddMeterModal, setShowAddMeterModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({});
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [customerMeters, setCustomerMeters] = React.useState([]);
  const [tariffs, setTariffs] = React.useState([]);
  const [meterForm, setMeterForm] = React.useState({
    MeterType: 'Smart',
    InstallationDate: new Date().toISOString().split('T')[0],
    City: '',
    Pincode: '',
    Street: '',
    HouseNo: '',
    State: '',
    Tariff_ID: ''
  });
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchCustomers();
    fetchTariffs();
    // Auto-refresh every 30 seconds to see new payments
    const interval = setInterval(() => {
      fetchCustomers();
    }, 30000);
    
    // Listen for custom event to refresh when payment is created
    const handlePaymentCreated = () => {
      fetchCustomers();
    };
    window.addEventListener('paymentCreated', handlePaymentCreated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('paymentCreated', handlePaymentCreated);
    };
  }, []);

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

  const fetchCustomerMeters = async (customerId) => {
    try {
      const response = await api.get(`/admin/customer/${customerId}/meters`);
      if (response.data.success) {
        setCustomerMeters(response.data.meters || []);
      }
    } catch (err) {
      console.error('Error fetching customer meters:', err);
      setCustomerMeters([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const r = await api.get('/admin/customers');
      setRows(r.data?.data || []);
    } catch (e) {
      console.error('Error fetching customers:', e);
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getBillStatusBadge = (status) => {
    if (status === 1 || status === '1') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Paid</span>;
    }
    if (status === 0 || status === '0') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Unpaid</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">N/A</span>;
  };

  const getInvoiceStatusBadge = (status) => {
    if (status === 'Paid') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Paid</span>;
    }
    if (status === 'Pending') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Pending</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">{status || 'N/A'}</span>;
  };

  const handleViewDetails = async (customerId) => {
    try {
      const response = await api.get(`/admin/customer/${customerId}`);
      setSelectedCustomer(response.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      alert('Failed to load customer details');
    }
  };

  const handleEdit = async (customerId) => {
    try {
      const response = await api.get(`/admin/customer/${customerId}`);
      const customer = response.data.customer?.[0];
      if (customer) {
        setEditForm({
          Cust_ID: customer[0],
          FirstName: customer[1] || '',
          MiddleName: customer[2] || '',
          LastName: customer[3] || '',
          Adhaar: customer[4] || '',
          Email: customer[5] || '',
          ContactNo: customer[6] || '',
          Address: customer[7] || ''
        });
        fetchCustomerMeters(customerId);
        setShowEditModal(true);
      }
    } catch (err) {
      console.error('Error fetching customer for edit:', err);
      alert('Failed to load customer details');
    }
  };

  const handleAddMeter = async (e) => {
    e.preventDefault();
    if (!editForm.Cust_ID) return;
    
    try {
      const response = await api.post(`/admin/customer/${editForm.Cust_ID}/meter`, meterForm);
      if (response.data.success) {
        alert(`Meter added successfully! Meter ID: ${response.data.meterId}`);
        setShowAddMeterModal(false);
        setMeterForm({
          MeterType: 'Smart',
          InstallationDate: new Date().toISOString().split('T')[0],
          City: '',
          Pincode: '',
          Street: '',
          HouseNo: '',
          State: '',
          Tariff_ID: ''
        });
        fetchCustomerMeters(editForm.Cust_ID);
      } else {
        alert(response.data.error || 'Failed to add meter');
      }
    } catch (err) {
      console.error('Add meter error:', err);
      alert(err?.response?.data?.error || 'Failed to add meter');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/admin/customer/${editForm.Cust_ID}`, editForm);
      if (response.data.success) {
        setShowEditModal(false);
        fetchCustomers();
        alert('Customer updated successfully!');
      } else {
        alert(response.data.error || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to update customer. Please try again.';
      alert(errorMsg);
    }
  };

  const handleDelete = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customerName}" (ID: ${customerId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/customer/${customerId}`);
      if (response.data.success) {
        fetchCustomers();
        alert('Customer deleted successfully!');
      } else {
        alert(response.data.error || 'Failed to delete customer');
      }
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to delete customer. Customer may have existing invoices or payments.';
      alert(errorMsg);
    }
  };

  if (loading) {
    return (
      <RequireAuth role="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-300">Loading customers...</div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Customers</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage all registered customers</p>
            </div>
            <button
              onClick={() => navigate('/admin/customers/new')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span> Add New Customer
            </button>
          </div>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-slate-600 dark:text-slate-400 text-lg">No customers found</div>
                <button
                  onClick={() => navigate('/admin/customers/new')}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Add your first customer
                </button>
              </div>
            ) : (
              rows.map((r, i) => {
                const customerName = `${r[1] || ''} ${r[2] || ''}`.trim();
                const customerId = r[0];
                return (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-xl"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{customerName || 'Unknown Customer'}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">ID: {customerId}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(customerId)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-400/20 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customerId, customerName)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/20 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300">{r[3] || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300">{r[4] || 'No contact'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300 flex-1">{r[5] || 'No address'}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">Latest Bill</div>
                          <div className="text-slate-900 dark:text-slate-200 font-medium">#{r[6] || 'N/A'}</div>
                          {getBillStatusBadge(r[7])}
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">Invoice Status</div>
                          <div className="mb-1">{getInvoiceStatusBadge(r[9])}</div>
                          <div className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(r[10])}</div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">Due Date</div>
                          <div className="text-slate-700 dark:text-slate-300">{formatDate(r[8])}</div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">Last Payment</div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs">{formatDate(r[13])}</div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs">{r[12] || 'N/A'}</div>
                        </div>
                        {r[11] && (
                          <div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">Units Consumed</div>
                            <div className="text-slate-700 dark:text-slate-300">{r[11]}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleViewDetails(customerId)}
                      className="w-full mt-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Full Details
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* View Details Modal */}
        {showModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Customer Details - ID: {selectedCustomer.customer?.[0]?.[0] || 'N/A'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Customer Information</h3>
                  {selectedCustomer.customer && selectedCustomer.customer[0] && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Name</div>
                        <div className="text-slate-900 dark:text-slate-200 font-medium">
                          {selectedCustomer.customer[0][1]} {selectedCustomer.customer[0][2] || ''} {selectedCustomer.customer[0][3] || ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Email</div>
                        <div className="text-slate-900 dark:text-slate-200">{selectedCustomer.customer[0][5] || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Contact No</div>
                        <div className="text-slate-900 dark:text-slate-200">{selectedCustomer.customer[0][6] || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Aadhaar</div>
                        <div className="text-slate-900 dark:text-slate-200">{selectedCustomer.customer[0][4] || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Address</div>
                        <div className="text-slate-900 dark:text-slate-200">{selectedCustomer.customer[0][7] || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bills */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Bills ({selectedCustomer.bills?.length || 0})</h3>
                  {selectedCustomer.bills && selectedCustomer.bills.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Bill ID</th>
                            <th className="px-4 py-2 text-left">Issue Date</th>
                            <th className="px-4 py-2 text-left">Due Date</th>
                            <th className="px-4 py-2 text-left">Rate/Unit</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.bills.map((bill, idx) => (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-200">{bill[0]}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(bill[1])}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(bill[2])}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">₹{bill[5] || 'N/A'}</td>
                              <td className="px-4 py-2">{getBillStatusBadge(bill[6])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-600 dark:text-slate-400 text-center py-4">No bills found</div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Invoices ({selectedCustomer.invoices?.length || 0})</h3>
                  {selectedCustomer.invoices && selectedCustomer.invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Invoice ID</th>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-right">Base Amount</th>
                            <th className="px-4 py-2 text-right">Tax</th>
                            <th className="px-4 py-2 text-right">Grand Total</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.invoices.map((inv, idx) => (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-200">{inv[0]}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(inv[1])}</td>
                              <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency(inv[2])}</td>
                              <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency(inv[3])}</td>
                              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(inv[4])}</td>
                              <td className="px-4 py-2">{getInvoiceStatusBadge(inv[6])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-600 dark:text-slate-400 text-center py-4">No invoices found</div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Payments ({selectedCustomer.payments?.length || 0})</h3>
                  {selectedCustomer.payments && selectedCustomer.payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Payment ID</th>
                            <th className="px-4 py-2 text-left">Invoice ID</th>
                            <th className="px-4 py-2 text-right">Amount Paid</th>
                            <th className="px-4 py-2 text-left">Payment Date</th>
                            <th className="px-4 py-2 text-left">Payment Mode</th>
                            <th className="px-4 py-2 text-left">Transaction Ref</th>
                            <th className="px-4 py-2 text-left">Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.payments.map((pay, idx) => (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-200">{pay[0]}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{pay[1]}</td>
                              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(pay[2])}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(pay[3])}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{pay[4] || 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300 text-xs">{pay[5] || 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{pay[6] || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-600 dark:text-slate-400 text-center py-4">No payments found</div>
                  )}
                </div>

                {/* Meters */}
                {selectedCustomer.meters && selectedCustomer.meters.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Meters ({selectedCustomer.meters.length})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Meter ID</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Installation Date</th>
                            <th className="px-4 py-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
                          {selectedCustomer.meters.map((meter, idx) => (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-200">{meter[0]}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{meter[2] || 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(meter[1])}</td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                {meter[5] || ''} {meter[6] || ''}, {meter[3] || ''}
                              </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
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

        {/* Edit Customer Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-2xl w-full">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Customer</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={editForm.FirstName || ''}
                      onChange={(e) => setEditForm({...editForm, FirstName: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={editForm.MiddleName || ''}
                      onChange={(e) => setEditForm({...editForm, MiddleName: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={editForm.LastName || ''}
                      onChange={(e) => setEditForm({...editForm, LastName: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Aadhaar</label>
                    <input
                      type="text"
                      value={editForm.Adhaar || ''}
                      onChange={(e) => setEditForm({...editForm, Adhaar: e.target.value})}
                      maxLength="12"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.Email || ''}
                      onChange={(e) => setEditForm({...editForm, Email: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contact No</label>
                    <input
                      type="tel"
                      value={editForm.ContactNo || ''}
                      onChange={(e) => setEditForm({...editForm, ContactNo: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Address</label>
                  <textarea
                    value={editForm.Address || ''}
                    onChange={(e) => setEditForm({...editForm, Address: e.target.value})}
                    required
                    rows="3"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                {/* Meters Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Meters ({customerMeters.length})</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddMeterModal(true)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Meter
                    </button>
                  </div>
                  {customerMeters.length > 0 ? (
                    <div className="space-y-2">
                      {customerMeters.map((meter) => (
                        <div key={meter.meterId} className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                Meter #{meter.meterId} - {meter.meterType}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {meter.street} {meter.houseNo}, {meter.city}, {meter.state} - {meter.pincode}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                Tariff: {meter.tariffDescription} - ₹{meter.ratePerUnit} per unit
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                      No meters found. Click "Add Meter" to add one.
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
                  >
                    Update Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-6 py-2 rounded-lg text-slate-800 dark:text-white font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Meter Modal */}
        {showAddMeterModal && editForm.Cust_ID && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Meter to Customer</h2>
                <button
                  onClick={() => {
                    setShowAddMeterModal(false);
                    setMeterForm({
                      MeterType: 'Smart',
                      InstallationDate: new Date().toISOString().split('T')[0],
                      City: '',
                      Pincode: '',
                      Street: '',
                      HouseNo: '',
                      State: '',
                      Tariff_ID: ''
                    });
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleAddMeter} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Meter Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={meterForm.MeterType}
                      onChange={(e) => setMeterForm({...meterForm, MeterType: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Smart">Smart</option>
                      <option value="Digital">Digital</option>
                      <option value="Analog">Analog</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Installation Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={meterForm.InstallationDate}
                      onChange={(e) => setMeterForm({...meterForm, InstallationDate: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tariff Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={meterForm.Tariff_ID}
                      onChange={(e) => setMeterForm({...meterForm, Tariff_ID: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Tariff</option>
                      {tariffs.map((tariff) => (
                        <option key={tariff[0]} value={tariff[0]}>
                          {tariff[1]} - ₹{tariff[2]} per unit
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meterForm.City}
                      onChange={(e) => setMeterForm({...meterForm, City: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meterForm.State}
                      onChange={(e) => setMeterForm({...meterForm, State: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter state"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={meterForm.Pincode}
                      onChange={(e) => setMeterForm({...meterForm, Pincode: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter pincode"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Street <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meterForm.Street}
                      onChange={(e) => setMeterForm({...meterForm, Street: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter street name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      House Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meterForm.HouseNo}
                      onChange={(e) => setMeterForm({...meterForm, HouseNo: e.target.value})}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter house number"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
                  >
                    Add Meter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMeterModal(false);
                      setMeterForm({
                        MeterType: 'Smart',
                        InstallationDate: new Date().toISOString().split('T')[0],
                        City: '',
                        Pincode: '',
                        Street: '',
                        HouseNo: '',
                        State: '',
                        Tariff_ID: ''
                      });
                    }}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-6 py-2 rounded-lg text-slate-800 dark:text-white font-semibold transition-colors"
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
