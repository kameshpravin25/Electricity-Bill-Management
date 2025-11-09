import React from 'react';
import api from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = React.useState('customer');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = role === 'admin' ? '/auth/admin/login' : '/auth/customer/login';
      const { data } = await api.post(url, { username, password });
      if (data && data.token) {
        const resolvedRole = data.role || role;
        setAuth(data.token, resolvedRole);
        navigate(resolvedRole === 'admin' ? '/admin' : '/customer', { replace: true });
        return;
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form onSubmit={onSubmit} className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-full bg-blue-600/20 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 grid place-items-center text-xl">👤</div>
          </div>
          <div className="flex mb-5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <button type="button" onClick={()=>setRole('customer')} className={`flex-1 px-4 py-2 text-sm ${role==='customer' ? 'bg-blue-600 dark:bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>Customer</button>
            <button type="button" onClick={()=>setRole('admin')} className={`flex-1 px-4 py-2 text-sm ${role==='admin' ? 'bg-blue-600 dark:bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>Admin</button>
          </div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Username</label>
          <input autoFocus value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Enter your username" className="w-full mb-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-slate-100" />
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full mb-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-slate-100" />
          {error && <div className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</div>}
          <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-colors py-3 font-semibold text-white">Sign In</button>
          <p className="text-xs mt-3 text-slate-600 dark:text-slate-400">Admin: admin / Admin@123 · Customers: raju / Cust1@123, suma / Cust2@123</p>
        </form>
      </div>
    </div>
  );
}


