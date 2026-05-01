import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in session
    const stored = localStorage.getItem('ebill_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setRole(parsed.role);
      setProfile(parsed);
    }
    setLoading(false);
  }, []);

  const login = async (email, password, loginRole) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('role', loginRole)
      .single();

    if (error || !data) {
      throw new Error('Invalid email or password');
    }

    const userData = {
      id: data.id,
      email: data.email,
      role: data.role,
      customerId: data.customer_id,
      firstName: data.first_name,
      lastName: data.last_name
    };

    localStorage.setItem('ebill_user', JSON.stringify(userData));
    setUser(userData);
    setRole(data.role);
    setProfile(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ebill_user');
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ role: requiredRole, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-lg font-semibold">Access Denied</div>
      </div>
    );
  }

  return children;
}
