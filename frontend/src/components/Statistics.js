import React, { useState, useEffect } from 'react';
import { billService } from '../services/api';
import './Statistics.css';

function Statistics({ refreshTrigger }) {
  const [stats, setStats] = useState({
    total_bills: 0,
    paid_bills: 0,
    unpaid_bills: 0,
    total_amount: 0,
    paid_amount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await billService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  const unpaidAmount = stats.total_amount - stats.paid_amount;

  return (
    <div className="stats-container">
      <div className="stat-card primary">
        <h3>Total Bills</h3>
        <div className="value">{stats.total_bills}</div>
        <div className="label">All bills in system</div>
      </div>

      <div className="stat-card success">
        <h3>Paid Bills</h3>
        <div className="value">{stats.paid_bills}</div>
        <div className="label">Fully paid</div>
      </div>

      <div className="stat-card warning">
        <h3>Unpaid Bills</h3>
        <div className="value">{stats.unpaid_bills}</div>
        <div className="label">Pending payment</div>
      </div>

      <div className="stat-card danger">
        <h3>Pending Amount</h3>
        <div className="value">₹{unpaidAmount.toLocaleString()}</div>
        <div className="label">Outstanding</div>
      </div>
    </div>
  );
}

export default Statistics;

