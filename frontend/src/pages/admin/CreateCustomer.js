import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, getTariffs, addMeter } from '../../services/supabaseService';
import { supabase } from '../../supabase';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ FirstName: '', MiddleName: '', LastName: '', Adhaar: '', Email: '', ContactNo: '', Address: '' });
  const [meterForm, setMeterForm] = React.useState({ createMeter: false, MeterType: 'Smart', InstallationDate: new Date().toISOString().split('T')[0], City: '', Pincode: '', Street: '', HouseNo: '', State: '', Tariff_ID: '' });
  const [tariffs, setTariffs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState({ type: '', text: '' });
  const [createdCredentials, setCreatedCredentials] = React.useState(null);

  React.useEffect(() => { (async () => { try { const t = await getTariffs(); setTariffs(t); } catch (e) {} })(); }, []);

  const generatePassword = () => `${form.FirstName || 'User'}@123`;

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg({ type: '', text: '' });
    if (!form.FirstName || !form.LastName || !form.Email || !form.ContactNo || !form.Address) { setMsg({ type: 'error', text: 'Please fill all required fields' }); return; }
    if (meterForm.createMeter && (!meterForm.City || !meterForm.Pincode || !meterForm.Street || !meterForm.HouseNo || !meterForm.State || !meterForm.Tariff_ID)) { setMsg({ type: 'error', text: 'Please fill all meter fields' }); return; }
    try {
      setLoading(true);
      const password = generatePassword();
      const customerId = await createCustomer(form);

      // Auto-create login credentials
      const { error: userError } = await supabase.from('users').insert({
        email: form.Email, password, role: 'customer', customer_id: customerId,
        first_name: form.FirstName, last_name: form.LastName
      });
      if (userError) console.warn('User creation failed:', userError.message);

      let meterId = null;
      if (meterForm.createMeter) {
        const tariff = tariffs.find(t => t.id === parseInt(meterForm.Tariff_ID));
        meterId = await addMeter({
          customerId, meterType: meterForm.MeterType, installationDate: meterForm.InstallationDate,
          city: meterForm.City, pincode: meterForm.Pincode, street: meterForm.Street,
          houseNo: meterForm.HouseNo, state: meterForm.State, tariffId: parseInt(meterForm.Tariff_ID),
          ratePerUnit: tariff?.ratePerUnit || 0, tariffDescription: tariff?.description || ''
        });
      }
      setCreatedCredentials({ email: form.Email, password, meterId });
      setMsg({ type: 'success', text: 'Customer created successfully' });
      setForm({ FirstName: '', MiddleName: '', LastName: '', Adhaar: '', Email: '', ContactNo: '', Address: '' });
      setMeterForm({ createMeter: false, MeterType: 'Smart', InstallationDate: new Date().toISOString().split('T')[0], City: '', Pincode: '', Street: '', HouseNo: '', State: '', Tariff_ID: '' });
    } catch (e) { setMsg({ type: 'error', text: e?.message || 'Error creating customer' }); }
    finally { setLoading(false); }
  };

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <button onClick={() => navigate('/admin/customers')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Customers
          </button>

          <div>
            <h1 className="page-title">New Customer</h1>
            <p className="page-subtitle">Create a customer account with login credentials</p>
          </div>

          {/* Credentials Display */}
          {createdCredentials && (
            <div className="card p-6 border-emerald-500/20 bg-emerald-500/5">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">Customer Login Credentials</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 dark:text-white/40">Email</span><div className="font-mono font-semibold text-gray-900 dark:text-white mt-0.5">{createdCredentials.email}</div></div>
                <div><span className="text-gray-500 dark:text-white/40">Password</span><div className="font-mono font-semibold text-gray-900 dark:text-white mt-0.5">{createdCredentials.password}</div></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-white/30 mt-3">Share these credentials with the customer to allow them to login.</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="card p-6">
              <h2 className="section-title mb-5">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'FirstName', label: 'First Name *', type: 'text' },
                  { key: 'LastName', label: 'Last Name *', type: 'text' },
                  { key: 'MiddleName', label: 'Middle Name', type: 'text' },
                  { key: 'Adhaar', label: 'Aadhaar Number', type: 'text' },
                  { key: 'Email', label: 'Email *', type: 'email' },
                  { key: 'ContactNo', label: 'Phone *', type: 'tel' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">{f.label}</label>
                    <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="input-premium" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Address *</label>
                  <textarea value={form.Address} onChange={e => setForm({ ...form, Address: e.target.value })} rows="2" className="input-premium" />
                </div>
              </div>
            </div>

            {/* Meter Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="section-title">Meter Installation</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={meterForm.createMeter} onChange={e => setMeterForm({ ...meterForm, createMeter: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-white/20 dark:bg-white/[0.04]" />
                  <span className="text-sm text-gray-600 dark:text-white/50">Add meter</span>
                </label>
              </div>

              {meterForm.createMeter && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Meter Type</label>
                    <select value={meterForm.MeterType} onChange={e => setMeterForm({ ...meterForm, MeterType: e.target.value })} className="input-premium">
                      <option value="Smart">Smart</option><option value="Digital">Digital</option><option value="Analog">Analog</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Tariff</label>
                    <select value={meterForm.Tariff_ID} onChange={e => setMeterForm({ ...meterForm, Tariff_ID: e.target.value })} className="input-premium" required>
                      <option value="">Select</option>
                      {tariffs.map(t => <option key={t.id} value={t.id}>{t.description} - ₹{t.ratePerUnit}/unit</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Install Date</label>
                    <input type="date" value={meterForm.InstallationDate} onChange={e => setMeterForm({ ...meterForm, InstallationDate: e.target.value })} className="input-premium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">House No</label>
                    <input type="text" value={meterForm.HouseNo} onChange={e => setMeterForm({ ...meterForm, HouseNo: e.target.value })} className="input-premium" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Street</label>
                    <input type="text" value={meterForm.Street} onChange={e => setMeterForm({ ...meterForm, Street: e.target.value })} className="input-premium" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">City</label>
                    <input type="text" value={meterForm.City} onChange={e => setMeterForm({ ...meterForm, City: e.target.value })} className="input-premium" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">State</label>
                    <input type="text" value={meterForm.State} onChange={e => setMeterForm({ ...meterForm, State: e.target.value })} className="input-premium" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Pincode</label>
                    <input type="text" value={meterForm.Pincode} onChange={e => setMeterForm({ ...meterForm, Pincode: e.target.value })} className="input-premium" required />
                  </div>
                </div>
              )}
            </div>

            {msg.text && <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{msg.text}</div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Creating...' : 'Create Customer'}</button>
              <button type="button" onClick={() => navigate('/admin/customers')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </Layout>
    </RequireAuth>
  );
}
