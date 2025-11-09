import React, { useState, useEffect } from 'react';
import { billService } from '../services/api';
import './BillList.css';

function BillList({ onEdit, refreshTrigger, setRefreshTrigger }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBills();
  }, [refreshTrigger]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await billService.getAllBills();
      if (response.success) {
        setBills(response.data);
      } else {
        setError('Failed to fetch bills');
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, customerName) => {
    if (window.confirm(`Are you sure you want to delete the bill for ${customerName}?`)) {
      try {
        await billService.deleteBill(id);
        fetchBills();
        if (setRefreshTrigger) {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.error('Error deleting bill:', err);
        alert('Failed to delete bill');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return <div className="loading">Loading bills...</div>;
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  if (bills.length === 0) {
    return <div className="empty-state">No bills found. Add a new bill to get started.</div>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Bill ID</th>
            <th>Customer Name</th>
            <th>Customer ID</th>
            <th>Bill Date</th>
            <th>Due Date</th>
            <th>Units</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.bill_id}>
              <td>{bill.bill_id}</td>
              <td>{bill.customer_name}</td>
              <td>{bill.customer_id}</td>
              <td>{formatDate(bill.bill_date)}</td>
              <td>{formatDate(bill.due_date)}</td>
              <td>{bill.units_consumed}</td>
              <td>{formatCurrency(bill.bill_amount)}</td>
              <td>
                <span className={`status-badge status-${bill.status.toLowerCase()}`}>
                  {bill.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="action-btn edit"
                    onClick={() => onEdit(bill)}
                  >
                    Edit
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(bill.bill_id, bill.customer_name)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BillList;

