import React from 'react';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { RequireAuth } from '../../auth/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = React.useState({
    totalCustomers: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalPaymentsReceived: 0
  });
  const [recentPayments, setRecentPayments] = React.useState([]);
  const [paymentsByMonth, setPaymentsByMonth] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.stats);
        setRecentPayments(response.data.recentPayments || []);
        setPaymentsByMonth(response.data.paymentsByMonth || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  // Calculate max payment for chart scaling (add 20% padding at top)
  const maxPayment = paymentsByMonth.length > 0 
    ? Math.max(...paymentsByMonth.map(p => parseFloat(p[1]) || 0)) * 1.2
    : 1;

  // Chart dimensions - increased for better visibility
  const chartHeight = 320;
  const chartWidth = 900;
  const paddingLeft = 90;
  const paddingRight = 50;
  const paddingTop = 50;
  const paddingBottom = 70;
  const availableWidth = chartWidth - paddingLeft - paddingRight;
  const barWidth = paymentsByMonth.length > 0 ? availableWidth / paymentsByMonth.length : 0;

  if (loading) {
    return (
      <RequireAuth role="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-300">Loading dashboard...</div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="admin">
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Customers</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCustomers}</div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Invoices</div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalInvoices}</div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Paid Invoices</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.paidInvoices}</div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Pending Invoices</div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingInvoices}</div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Payments</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalPaymentsReceived)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payments Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Recent Payments (Latest 5)</h2>
              {recentPayments.length === 0 ? (
                <div className="text-slate-600 dark:text-slate-400 text-center py-8">No payments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-slate-700 dark:text-slate-300">
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Invoice ID</th>
                        <th className="text-right py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Mode</th>
                        <th className="text-left py-2 px-3">TXN Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((payment, idx) => (
                        <tr key={idx} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-2 px-3 text-slate-900 dark:text-slate-200">{payment[0] || 'N/A'}</td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{payment[1] || 'N/A'}</td>
                          <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">{formatCurrency(payment[2])}</td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{formatDate(payment[3])}</td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{payment[4] || 'N/A'}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-xs">{payment[5] || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
              {/* Payments by Month - Simple Bar Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payments by Month</h2>
                  </div>
                  <div className="text-right bg-slate-50 dark:bg-slate-700/50 px-5 py-3 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Revenue</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(paymentsByMonth.reduce((sum, m) => sum + (parseFloat(m[1]) || 0), 0))}
                    </div>
                  </div>
                </div>
                {paymentsByMonth.length === 0 ? (
                  <div className="text-slate-600 dark:text-slate-400 text-center py-16">
                    <svg className="w-20 h-20 mx-auto mb-4 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="font-medium">No payment data available</p>
                  </div>
                ) : (
                  <div className="relative" style={{ height: `${chartHeight + paddingTop + paddingBottom}px` }}>
                    <svg 
                      width="100%" 
                      height={chartHeight + paddingTop + paddingBottom} 
                      viewBox={`0 0 ${chartWidth} ${chartHeight + paddingTop + paddingBottom}`} 
                      className="overflow-visible"
                      style={{ maxHeight: '500px' }}
                    >
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = paddingTop + chartHeight - (chartHeight * ratio);
                        return (
                          <line
                            key={ratio}
                            x1={paddingLeft}
                            x2={chartWidth - paddingRight}
                            y1={y}
                            y2={y}
                            stroke={isDarkMode ? "#475569" : "#cbd5e1"}
                            strokeWidth="1.5"
                            strokeDasharray="5 5"
                            opacity="0.7"
                          />
                        );
                      })}
                      
                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const value = maxPayment * ratio;
                        const y = paddingTop + chartHeight - (chartHeight * ratio);
                        return (
                          <text 
                            key={ratio}
                            x={paddingLeft - 15} 
                            y={y + 5} 
                            fill={isDarkMode ? "#e2e8f0" : "#334155"}
                            fontSize="14" 
                            textAnchor="end"
                            fontWeight="600"
                          >
                            {formatCurrency(value)}
                          </text>
                        );
                      })}
                      
                      {/* Bars */}
                      {paymentsByMonth.map((month, idx) => {
                        const value = parseFloat(month[1]) || 0;
                        const height = (value / maxPayment) * chartHeight;
                        const x = paddingLeft + (idx * barWidth) + (barWidth * 0.15);
                        const y = paddingTop + chartHeight - height;
                        const barDisplayWidth = barWidth * 0.7;
                        
                        // Format month label
                        const [year, monthNum] = month[0].split('-');
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
                        
                        return (
                          <g key={idx}>
                            {/* Bar */}
                            <rect
                              x={x}
                              y={y}
                              width={barDisplayWidth}
                              height={height}
                              fill="#3b82f6"
                              rx="6"
                              className="hover:opacity-90 cursor-pointer transition-all duration-200"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2))' }}
                            />
                            
                            {/* Value label on top */}
                            {value > 0 && (
                              <text
                                x={x + barDisplayWidth / 2}
                                y={y - 12}
                                fill={isDarkMode ? "#f1f5f9" : "#1e293b"}
                                fontSize="13"
                                textAnchor="middle"
                                fontWeight="700"
                              >
                                {formatCurrency(value)}
                              </text>
                            )}
                            
                            {/* Month label */}
                            <text
                              x={x + barDisplayWidth / 2}
                              y={chartHeight + paddingTop + 25}
                              fill={isDarkMode ? "#e2e8f0" : "#334155"}
                              fontSize="13"
                              textAnchor="middle"
                              fontWeight="600"
                            >
                              {monthLabel}
                            </text>
                            
                            {/* Tooltip */}
                            <title>{`${monthLabel}: ${formatCurrency(value)}`}</title>
                          </g>
                        );
                      })}
                      
                      {/* X-axis line */}
                      <line 
                        x1={paddingLeft} 
                        y1={chartHeight + paddingTop} 
                        x2={chartWidth - paddingRight} 
                        y2={chartHeight + paddingTop} 
                        stroke={isDarkMode ? "#64748b" : "#64748b"}
                        strokeWidth="2.5" 
                      />
                      
                      {/* Y-axis line */}
                      <line 
                        x1={paddingLeft} 
                        y1={paddingTop} 
                        x2={paddingLeft} 
                        y2={chartHeight + paddingTop} 
                        stroke={isDarkMode ? "#64748b" : "#64748b"}
                        strokeWidth="2.5" 
                      />
                      
                      {/* Axis labels */}
                      <text
                        x={chartWidth / 2}
                        y={chartHeight + paddingTop + 55}
                        fill={isDarkMode ? "#e2e8f0" : "#1e293b"}
                        fontSize="15"
                        textAnchor="middle"
                        fontWeight="700"
                      >
                        Month
                      </text>
                      <text
                        x={20}
                        y={chartHeight / 2 + paddingTop}
                        fill={isDarkMode ? "#e2e8f0" : "#1e293b"}
                        fontSize="15"
                        textAnchor="middle"
                        fontWeight="700"
                        transform={`rotate(-90 20 ${chartHeight / 2 + paddingTop})`}
                      >
                        Amount (₹)
                      </text>
                    </svg>
                  </div>
                )}
              </div>

              {/* Paid vs Pending Invoices - Simple Donut Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-slate-100">Invoice Status Distribution</h2>
                {stats.totalInvoices === 0 ? (
                  <div className="text-slate-600 dark:text-slate-400 text-center py-12">No invoice data available</div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    <div className="relative w-72 h-72 flex-shrink-0">
                      <svg width="288" height="288" viewBox="0 0 288 288" className="transform -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="144"
                          cy="144"
                          r="110"
                          fill="none"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                          strokeWidth="32"
                        />
                        
                        {/* Paid slice */}
                        <circle
                          cx="144"
                          cy="144"
                          r="110"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="32"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 110 * (stats.paidInvoices / stats.totalInvoices)} ${2 * Math.PI * 110}`}
                          strokeDashoffset={0}
                        />
                        
                        {/* Pending slice */}
                        {stats.pendingInvoices > 0 && (
                          <circle
                            cx="144"
                            cy="144"
                            r="110"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="32"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 110 * (stats.pendingInvoices / stats.totalInvoices)} ${2 * Math.PI * 110}`}
                            strokeDashoffset={-2 * Math.PI * 110 * (stats.paidInvoices / stats.totalInvoices)}
                          />
                        )}
                      </svg>
                      
                      {/* Center text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                            {stats.totalInvoices}
                          </div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Total
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Simple Legend */}
                    <div className="space-y-4 min-w-[200px]">
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Paid: <span className="text-green-600 dark:text-green-400">{stats.paidInvoices}</span>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {stats.totalInvoices > 0 ? ((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Pending: <span className="text-yellow-600 dark:text-yellow-400">{stats.pendingInvoices}</span>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {stats.totalInvoices > 0 ? ((stats.pendingInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
