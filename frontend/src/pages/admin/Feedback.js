import React from 'react';
import * as fs from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterRating, setFilterRating] = React.useState('');

  React.useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    try { setLoading(true); const data = await fs.getFeedbacks(); setFeedbacks(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = feedbacks.filter(f => {
    let match = true;
    if (search) {
      const s = search.toLowerCase();
      match = (f.text || '').toLowerCase().includes(s) || (f.customerName || '').toLowerCase().includes(s);
    }
    if (filterRating) match = match && f.rating === parseInt(filterRating);
    return match;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : '0';

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-white/10'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

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
              <h1 className="page-title">Feedback</h1>
              <p className="page-subtitle">{feedbacks.length} submissions, {avgRating} avg rating</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback..." className="input-premium pl-11" />
            </div>
            <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className="input-premium w-40">
              <option value="">All Ratings</option>
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>

          {/* Feedback list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="card p-12 text-center text-sm text-gray-400 dark:text-white/30">No feedback found</div>
            ) : filtered.map(f => (
              <div key={f.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-white/50">
                      {(f.customerName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{f.customerName || 'Anonymous'}</div>
                      <div className="text-xs text-gray-400 dark:text-white/30">{f.customerEmail || ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStars(f.rating)}
                    <div className="text-[10px] text-gray-400 dark:text-white/20 mt-1">{formatDate(f.createdAt)}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">{f.text}</p>
                {f.invoiceId && <div className="text-xs text-gray-400 dark:text-white/20 mt-2">Invoice #{f.invoiceId}</div>}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
