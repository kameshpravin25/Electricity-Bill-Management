import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function CreateCustomer() {
  const [form, setForm] = React.useState({
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Adhaar: '',
    Email: '',
    ContactNo: '',
    Address: ''
  });
  const [meterForm, setMeterForm] = React.useState({
    createMeter: false,
    MeterType: 'Smart',
    InstallationDate: new Date().toISOString().split('T')[0],
    City: '',
    Pincode: '',
    Street: '',
    HouseNo: '',
    State: '',
    Tariff_ID: ''
  });
  const [tariffs, setTariffs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingTariffs, setLoadingTariffs] = React.useState(true);
  const [msg, setMsg] = React.useState({ type: '', text: '' });
  const [createdCredentials, setCreatedCredentials] = React.useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoadingTariffs(true);
      const response = await api.get('/tariffs');
      if (response.data.success) {
        setTariffs(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
    } finally {
      setLoadingTariffs(false);
    }
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const onMeterChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setMeterForm({ ...meterForm, [name]: checked });
    } else {
      setMeterForm({ ...meterForm, [name]: value });
    }
  };

  const generateUsername = () => {
    const firstName = form.FirstName.toLowerCase().replace(/\s+/g, '');
    const lastName = form.LastName.toLowerCase().replace(/\s+/g, '');
    return `${firstName}${lastName.charAt(0)}`;
  };

  const generatePassword = () => {
    // Generate a default password: FirstName@123
    const firstName = form.FirstName.charAt(0).toUpperCase() + form.FirstName.slice(1).toLowerCase();
    return `${firstName}@123`;
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ type: 'success', text: `${label} copied to clipboard!` });
      setTimeout(() => {
        if (createdCredentials) {
          setMsg({ type: 'success', text: 'Customer created successfully!' });
        }
      }, 2000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to copy to clipboard' });
    }
  };

  const handleContinue = () => {
    setCreatedCredentials(null);
    navigate('/admin/customers');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    
    // Validation
    if (!form.FirstName || !form.LastName || !form.Email || !form.ContactNo || !form.Address) {
      setMsg({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    // Validate meter fields if meter creation is enabled
    if (meterForm.createMeter) {
      if (!meterForm.MeterType || !meterForm.InstallationDate || !meterForm.City || 
          !meterForm.Pincode || !meterForm.Street || !meterForm.HouseNo || !meterForm.State || !meterForm.Tariff_ID) {
        setMsg({ type: 'error', text: 'Please fill all meter fields when creating a meter' });
        return;
      }
    }

    try {
      setLoading(true);
      const username = generateUsername();
      const password = generatePassword();
      
      const payload = {
        ...form,
        Username: username,
        Password: password
      };

      // Add meter data if meter creation is enabled
      if (meterForm.createMeter) {
        payload.createMeter = true;
        payload.MeterType = meterForm.MeterType;
        payload.InstallationDate = meterForm.InstallationDate;
        payload.City = meterForm.City;
        payload.Pincode = meterForm.Pincode;
        payload.Street = meterForm.Street;
        payload.HouseNo = meterForm.HouseNo;
        payload.State = meterForm.State;
        payload.Tariff_ID = meterForm.Tariff_ID;
      }

      const response = await api.post('/admin/customer', payload);
      
      if (response.data.success) {
        // Store credentials for display
        setCreatedCredentials({ 
          username, 
          password,
          meterId: response.data.meterId 
        });
        setMsg({
          type: 'success',
          text: 'Customer created successfully!'
        });
        
        // Clear forms
        setForm({
          FirstName: '',
          MiddleName: '',
          LastName: '',
          Adhaar: '',
          Email: '',
          ContactNo: '',
          Address: ''
        });
        setMeterForm({
          createMeter: false,
          MeterType: 'Smart',
          InstallationDate: new Date().toISOString().split('T')[0],
          City: '',
          Pincode: '',
          Street: '',
          HouseNo: '',
          State: '',
          Tariff_ID: ''
        });
      }
    } catch (e) {
      setMsg({
        type: 'error',
        text: e?.response?.data?.error || 'Error creating customer'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="max-w-4xl">
          <div className="mb-6">
            <button
              onClick={() => navigate('/admin/customers')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Customers
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Add New Customer</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Fill in the customer details and optionally create a meter</p>
          </div>

          <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Customer Information Section */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Customer Information
              </h2>
              <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  First Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="FirstName"
                  value={form.FirstName}
                  onChange={onChange}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="MiddleName"
                  value={form.MiddleName}
                  onChange={onChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter middle name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Last Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="LastName"
                  value={form.LastName}
                  onChange={onChange}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  name="Adhaar"
                  value={form.Adhaar}
                  onChange={onChange}
                  maxLength="12"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter Aadhaar number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="Email"
                  value={form.Email}
                  onChange={onChange}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Contact Number <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="ContactNo"
                  value={form.ContactNo}
                  onChange={onChange}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="9876543210"
                />
              </div>
            </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Address <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <textarea
                    name="Address"
                    value={form.Address}
                    onChange={onChange}
                    required
                    rows="3"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter complete address"
                  />
                </div>
              </div>
            </div>

            {/* Meter Information Section */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Meter Information (Optional)
                  </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="createMeter"
                    checked={meterForm.createMeter}
                    onChange={onMeterChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Create Meter</span>
                </label>
              </div>

              {meterForm.createMeter && (
                <div className="space-y-4 mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Meter Type <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <select
                        name="MeterType"
                        value={meterForm.MeterType}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Smart">Smart</option>
                        <option value="Digital">Digital</option>
                        <option value="Analog">Analog</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Installation Date <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        name="InstallationDate"
                        value={meterForm.InstallationDate}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tariff Type <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      {loadingTariffs ? (
                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-600 dark:text-slate-400">
                          Loading tariffs...
                        </div>
                      ) : (
                        <select
                          name="Tariff_ID"
                          value={meterForm.Tariff_ID}
                          onChange={onMeterChange}
                          required={meterForm.createMeter}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">Select Tariff</option>
                          {tariffs.map((tariff) => (
                            <option key={tariff[0]} value={tariff[0]}>
                              {tariff[1]} - ₹{tariff[2]} per unit
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        City <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="City"
                        value={meterForm.City}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        State <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="State"
                        value={meterForm.State}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Pincode <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="Pincode"
                        value={meterForm.Pincode}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Enter pincode"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Street <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="Street"
                        value={meterForm.Street}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Enter street name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        House Number <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="HouseNo"
                        value={meterForm.HouseNo}
                        onChange={onMeterChange}
                        required={meterForm.createMeter}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Enter house number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions Section */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
              {msg.text && (
                <div
                  className={`p-4 rounded-lg mb-4 ${
                    msg.type === 'success'
                      ? 'bg-green-500/20 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 dark:border-green-500/30'
                      : 'bg-red-500/20 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 dark:border-red-500/30'
                  }`}
                >
                  {msg.text}
                </div>
              )}

              {createdCredentials && (
                <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500 dark:border-blue-400">
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Important: Save These Credentials
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Please note down the username and password below. You won't be able to see them again.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-300 dark:border-blue-600">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded text-lg font-mono text-slate-900 dark:text-slate-100">
                          {createdCredentials.username}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdCredentials.username, 'Username')}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-semibold transition-colors text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-300 dark:border-blue-600">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Password
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded text-lg font-mono text-slate-900 dark:text-slate-100">
                          {createdCredentials.password}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdCredentials.password, 'Password')}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-semibold transition-colors text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>

                    {createdCredentials.meterId && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-300 dark:border-green-600">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold">Meter created successfully! Meter ID: {createdCredentials.meterId}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center gap-2"
                    >
                      Continue to Customers List
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {!createdCredentials && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={loading || loadingTariffs}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Customer
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/customers')}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-6 py-3 rounded-lg text-slate-800 dark:text-white font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!createdCredentials && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> A default username and password will be automatically generated for the customer.
                    Username format: firstname + first letter of lastname (lowercase). Password format: FirstName@123
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </Layout>
    </RequireAuth>
  );
}
