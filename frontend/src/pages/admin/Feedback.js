import React from 'react';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState('');
  const [filterRating, setFilterRating] = React.useState('');
  const [filterCustomer, setFilterCustomer] = React.useState('');
  const [sortField, setSortField] = React.useState('date');
  const [sortOrder, setSortOrder] = React.useState('desc');

  React.useEffect(() => {
    fetchFeedbacks();
  }, []);

  React.useEffect(() => {
    applyFiltersAndSort();
  }, [feedbacks, searchText, filterRating, filterCustomer, sortField, sortOrder]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/feedback');
      if (response.data.success) {
        setFeedbacks(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...feedbacks];

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(f =>
        f.text.toLowerCase().includes(searchLower) ||
        f.customerName.toLowerCase().includes(searchLower) ||
        (f.invoiceId && String(f.invoiceId).includes(searchText))
      );
    }

    // Apply rating filter
    if (filterRating) {
      filtered = filtered.filter(f => f.rating === parseInt(filterRating));
    }

    // Apply customer filter
    if (filterCustomer) {
      filtered = filtered.filter(f =>
        f.customerName.toLowerCase().includes(filterCustomer.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'rating':
          aVal = a.rating || 0;
          bVal = b.rating || 0;
          break;
        case 'customer':
          aVal = a.customerName.toLowerCase();
          bVal = b.customerName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredFeedbacks(filtered);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-slate-500">No rating</span>;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-slate-500 fill-none'
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    );
  };

  const getRatingStats = () => {
    const stats = {
      total: feedbacks.length,
      withRating: feedbacks.filter(f => f.rating).length,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    const ratedFeedbacks = feedbacks.filter(f => f.rating);
    if (ratedFeedbacks.length > 0) {
      const sum = ratedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
      stats.average = (sum / ratedFeedbacks.length).toFixed(1);
      ratedFeedbacks.forEach(f => {
        stats.distribution[f.rating]++;
      });
    }

    return stats;
  };

  const stats = getRatingStats();

  if (loading) {
    return (
      <RequireAuth role="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-300">Loading feedbacks...</div>
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
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Feedback Management</h1>
            <p className="text-slate-400 mt-1">View and manage customer feedbacks</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Total Feedbacks</div>
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">With Rating</div>
              <div className="text-2xl font-bold text-blue-400">{stats.withRating}</div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Average Rating</div>
              <div className="text-2xl font-bold text-yellow-400">
                {stats.average > 0 ? `${stats.average}/5` : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">5 Star Ratings</div>
              <div className="text-2xl font-bold text-green-400">{stats.distribution[5]}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search feedback, customer, invoice..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Filter by customer name..."
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSortField('date');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded transition"
                >
                  Sort by Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => {
                    setSortField('rating');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded transition"
                >
                  Sort by Rating {sortField === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>

          {/* Feedbacks Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Feedback ID</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Rating</th>
                    <th className="px-4 py-3 text-left">Feedback</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                        No feedbacks found
                      </td>
                    </tr>
                  ) : (
                    filteredFeedbacks.map((feedback) => (
                      <tr
                        key={feedback.feedbackId}
                        className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-200">#{feedback.feedbackId}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300">{feedback.customerName}</div>
                          <div className="text-xs text-slate-500">{feedback.customerEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          {feedback.invoiceId ? (
                            <div>
                              <div className="text-blue-400 font-medium">
                                Invoice #{feedback.invoiceId}
                              </div>
                              {feedback.invoiceTotal && (
                                <div className="text-xs text-slate-500">
                                  {formatCurrency(feedback.invoiceTotal)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">General</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{renderStars(feedback.rating)}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300 max-w-md">
                            {feedback.text.length > 100 ? (
                              <>
                                {feedback.text.substring(0, 100)}...
                                <span className="text-blue-400 text-xs ml-2 cursor-pointer">
                                  View Full
                                </span>
                              </>
                            ) : (
                              feedback.text
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {formatDate(feedback.date)}
                        </td>
                      </tr>
                    ))
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

