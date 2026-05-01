import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as fs from '../../services/supabaseService';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({});
  const [editId, setEditId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState({ type: '', text: '' });

  React.useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try { setLoading(true); const d = await fs.getCustomers(); setCustomers(d); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? This action cannot be undone.')) return;
    try { await fs.deleteCustomer(id); fetchCustomers(); }
    catch (e) { alert(e.message); }
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setEditForm({ FirstName: c.FirstName, MiddleName: c.MiddleName, LastName: c.LastName, Adhaar: c.Adhaar, Email: c.Email, ContactNo: c.ContactNo, Address: c.Address });
    setShowEditModal(true);
    setMsg({ type: '', text: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await fs.updateCustomer(editId, editForm); setMsg({ type: 'success', text: 'Customer updated' }); setTimeout(() => { setShowEditModal(false); fetchCustomers(); }, 1000); }
    catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${c.FirstName} ${c.LastName}`.toLowerCase().includes(s) || (c.Email || '').toLowerCase().includes(s) || (c.ContactNo || '').includes(s);
  });

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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Customers</h1>
              <p className="page-subtitle">{customers.length} registered customers</p>
            </div>
            <button onClick={() => navigate('/admin/customers/new')} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Customer
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="input-premium pl-11"
            />
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 dark:text-white/30">
                {search ? 'No customers match your search' : 'No customers yet'}
              </div>
            ) : (
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Aadhaar</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium text-gray-900 dark:text-white">
                        {c.FirstName} {c.MiddleName || ''} {c.LastName}
                      </td>
                      <td className="text-gray-500 dark:text-white/40">{c.Email || '-'}</td>
                      <td>{c.ContactNo || '-'}</td>
                      <td className="text-gray-500 dark:text-white/40 text-xs tracking-wide">{c.Adhaar || '-'}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="section-title">Edit Customer</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'FirstName', label: 'First Name' }, { key: 'LastName', label: 'Last Name' },
                    { key: 'Email', label: 'Email' }, { key: 'ContactNo', label: 'Phone' },
                    { key: 'Adhaar', label: 'Aadhaar' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">{f.label}</label>
                      <input type="text" value={editForm[f.key] || ''} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} className="input-premium" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Address</label>
                  <textarea value={editForm.Address || ''} onChange={e => setEditForm({ ...editForm, Address: e.target.value })} rows="2" className="input-premium" />
                </div>
                {msg.text && <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{msg.text}</div>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}
