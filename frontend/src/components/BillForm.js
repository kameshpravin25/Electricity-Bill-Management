import React, { useState, useEffect } from 'react';
import { billService } from '../services/api';
import './BillForm.css';

function BillForm({ bill, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    address: '',
    customer_id: '',
    bill_date: '',
    due_date: '',
    previous_reading: '',
    current_reading: '',
    rate_per_unit: '',
    status: 'Unpaid',
    payment_date: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bill) {
      setFormData({
        customer_name: bill.customer_name || '',
        address: bill.address || '',
        customer_id: bill.customer_id || '',
        bill_date: bill.bill_date ? bill.bill_date.split('T')[0] : '',
        due_date: bill.due_date ? bill.due_date.split('T')[0] : '',
        previous_reading: bill.previous_reading || '',
        current_reading: bill.current_reading || '',
        rate_per_unit: bill.rate_per_unit || '',
        status: bill.status || 'Unpaid',
        payment_date: bill.payment_date ? bill.payment_date.split('T')[0] : ''
      });
    }
  }, [bill]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateAmount = () => {
    const units = formData.current_reading - formData.previous_reading;
    return units * formData.rate_per_unit;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (bill) {
        // Update existing bill
        await billService.updateBill(bill.bill_id, {
          ...formData,
          current_reading: parseFloat(formData.current_reading),
          previous_reading: parseFloat(formData.previous_reading),
          rate_per_unit: parseFloat(formData.rate_per_unit)
        });
      } else {
        // Create new bill
        await billService.createBill({
          ...formData,
          current_reading: parseFloat(formData.current_reading),
          previous_reading: parseFloat(formData.previous_reading),
          rate_per_unit: parseFloat(formData.rate_per_unit)
        });
      }
      onSave();
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const unitsConsumed = formData.current_reading && formData.previous_reading
    ? formData.current_reading - formData.previous_reading
    : 0;
  const billAmount = unitsConsumed * formData.rate_per_unit;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="form-container" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{bill ? 'Edit Bill' : 'Add New Bill'}</h2>
          <button className="close-btn" onClick={onClose} title="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Customer ID *</label>
              <input
                type="text"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bill Date *</label>
              <input
                type="date"
                name="bill_date"
                value={formData.bill_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Previous Reading *</label>
              <input
                type="number"
                step="0.01"
                name="previous_reading"
                value={formData.previous_reading}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Current Reading *</label>
              <input
                type="number"
                step="0.01"
                name="current_reading"
                value={formData.current_reading}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="calculation-info">
            <div className="info-item">
              <span>Units Consumed:</span>
              <strong>{unitsConsumed}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Rate Per Unit (₹) *</label>
            <input
              type="number"
              step="0.01"
              name="rate_per_unit"
              value={formData.rate_per_unit}
              onChange={handleChange}
              required
            />
          </div>

          <div className="calculation-info">
            <div className="info-item">
              <span>Bill Amount:</span>
              <strong>₹{billAmount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {formData.status === 'Paid' && (
              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BillForm;

