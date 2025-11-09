import React from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function Feedback() {
  const [formData, setFormData] = React.useState({
    invoiceId: '',
    text: '',
    rating: 0
  });
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [hoveredRating, setHoveredRating] = React.useState(0);

  React.useEffect(() => {
    fetchFeedbacks();
    fetchInvoices();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const response = await api.get('/customer/feedback');
      if (response.data.success) {
        setFeedbacks(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/customer/invoices');
      if (response.data.success) {
        setInvoices(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!formData.text.trim()) {
      setMessage('Please enter your feedback');
      return;
    }

    if (formData.text.length > 500) {
      setMessage('Feedback text cannot exceed 500 characters');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        text: formData.text.trim(),
        rating: formData.rating > 0 ? formData.rating : null,
        invoiceId: formData.invoiceId || null
      };
      await api.post('/customer/feedback', payload);
      setMessage('Feedback submitted successfully!');
      setFormData({ invoiceId: '', text: '', rating: 0 });
      setHoveredRating(0);
      fetchFeedbacks();
    } catch (err) {
      setMessage(err?.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
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

  const renderStars = (rating, interactive = false, onRatingClick = null, onHover = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingClick && onRatingClick(star)}
            onMouseEnter={() => interactive && onHover && onHover(star)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
          >
            <svg
              className={`w-6 h-6 ${
                star <= (interactive ? hoveredRating || formData.rating : rating)
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
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
  return (
    <RequireAuth role="customer">
      <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-300">Loading...</div>
          </div>
      </Layout>
    </RequireAuth>
  );
}

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Feedback</h1>
            <p className="text-slate-400">Share your feedback and rating about our service</p>
          </div>

          {/* Feedback Form */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Submit Feedback</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invoice Selection (Optional) */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Invoice (Optional)
                </label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Select Invoice (Optional) --</option>
                  {invoices.map((inv) => (
                    <option key={inv.invoiceId} value={inv.invoiceId}>
                      Invoice #{inv.invoiceId} - {formatCurrency(inv.grandTotal)} ({formatDate(inv.issueDate)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating (1-5 Stars) */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Rating (1-5 stars)</label>
                <div className="flex items-center gap-4">
                  {renderStars(
                    formData.rating,
                    true,
                    (rating) => setFormData({ ...formData, rating }),
                    (rating) => setHoveredRating(rating)
                  )}
                  {formData.rating > 0 && (
                    <span className="text-sm text-slate-400">
                      {formData.rating} {formData.rating === 1 ? 'star' : 'stars'}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Feedback <span className="text-slate-500">(Max 500 characters)</span>
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  maxLength={500}
                  rows={5}
                  placeholder="Enter your feedback here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  required
                />
                <div className="text-xs text-slate-500 mt-1 text-right">
                  {formData.text.length}/500 characters
                </div>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-3 rounded ${
                    message.includes('success')
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>

          {/* Previous Feedbacks */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Your Previous Feedbacks</h2>
            {feedbacks.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No feedback submitted yet
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.feedbackId}
                    className="bg-slate-900 rounded-lg border border-slate-700 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {feedback.invoiceId ? (
                            <Link
                              to={`/customer/invoice/${feedback.invoiceId}`}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Invoice #{feedback.invoiceId}
                            </Link>
                          ) : (
                            <span className="text-slate-400 italic">General Feedback</span>
                          )}
                          {feedback.invoiceTotal && (
                            <span className="text-slate-500 text-sm">
                              ({formatCurrency(feedback.invoiceTotal)})
                            </span>
                          )}
                        </div>
                        {feedback.rating && (
                          <div className="mb-2">
                            {renderStars(feedback.rating)}
                          </div>
                        )}
                        <p className="text-slate-300 whitespace-pre-wrap">{feedback.text}</p>
                      </div>
                      <div className="text-sm text-slate-400 ml-4">
                        {formatDate(feedback.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
