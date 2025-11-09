import React from 'react';

export const AuthContext = React.createContext({
  token: null,
  role: null,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = React.useState(() => localStorage.getItem('token'));
  const [role, setRole] = React.useState(() => localStorage.getItem('role'));

  const setAuth = (t, r) => {
    setToken(t);
    setRole(r);
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
    if (r) localStorage.setItem('role', r); else localStorage.removeItem('role');
  };

  const logout = () => setAuth(null, null);

  const value = React.useMemo(() => ({ token, role, setAuth, logout }), [token, role]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}

export function RequireAuth({ role: requiredRole, children }) {
  const { token, role } = useAuth();
  if (!token) return <div className="p-6 text-slate-200">Please login.</div>;
  if (requiredRole && role !== requiredRole) return <div className="p-6 text-red-300">Forbidden.</div>;
  return children;
}


