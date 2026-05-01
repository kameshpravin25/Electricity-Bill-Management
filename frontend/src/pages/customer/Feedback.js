import React from 'react';
import { createFeedback, getFeedbacks } from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth, useAuth } from '../../auth/AuthContext';

export default function CustomerFeedback() {
  const { profile } = useAuth();
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ text: '', rating: 5 });
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState({ type: '', text: '' });

  React.useEffect(() => { if (profile?.customerId) fetchFeedbacks(); }, [profile]);

  const fetchFeedbacks = async () => {
    try { setLoading(true); const data = await getFeedbacks(profile.customerId); setFeedbacks(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg({ type: '', text: '' });
    if (!form.text.trim()) { setMsg({ type: 'error', text: 'Please enter your feedback' }); return; }
    try {
      setSubmitting(true);
      await createFeedback({ customerId: profile.customerId, customerName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(), customerEmail: profile.email || '', text: form.text.trim(), rating: form.rating });
      setMsg({ type: 'success', text: 'Feedback submitted' });
      setForm({ text: '', rating: 5 });
      fetchFeedbacks();
    } catch (e) { setMsg({ type: 'error', text: e?.message || 'Failed to submit' }); }
    finally { setSubmitting(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const renderStars = (rating, interactive = false) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" disabled={!interactive}
          onClick={() => interactive && setForm({ ...form, rating: s })}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}>
          <svg className={`w-5 h-5 ${s <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-white/10'}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );

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

  return (
    <RequireAuth role="customer">
      <Layout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="page-title">Feedback</h1>
            <p className="page-subtitle">Share your experience with us</p>
          </div>

          {/* Submit Form */}
          <div className="card p-6">
            <h2 className="section-title mb-5">Submit Feedback</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">Rating</label>
                {renderStars(form.rating, true)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Your Feedback</label>
                <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows="4" required placeholder="Tell us what you think..." className="input-premium" />
              </div>
              {msg.text && <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{msg.text}</div>}
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Feedback'}</button>
            </form>
          </div>

          {/* History */}
          <div>
            <h2 className="section-title mb-4">Your Feedbacks</h2>
            {feedbacks.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-400 dark:text-white/30">No feedbacks submitted yet</div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(f => (
                  <div key={f.id} className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      {renderStars(f.rating)}
                      <span className="text-xs text-gray-400 dark:text-white/20">{formatDate(f.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">{f.text}</p>
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
