import React from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function CustomerDetail() {
  const { custId } = useParams();
  const [data, setData] = React.useState({});
  React.useEffect(()=>{ (async()=>{ try { const r = await api.get(`/admin/customer/${custId}`); setData(r.data||{});} catch(e){} })(); }, [custId]);
  return (
    <RequireAuth role="admin">
      <Layout>
        <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Customer {custId}</h1>
        <pre className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded overflow-auto text-xs text-slate-900 dark:text-slate-100">{JSON.stringify(data,null,2)}</pre>
      </Layout>
    </RequireAuth>
  );
}


