import { supabase } from '../supabase';

// ─── CUSTOMERS ───
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(c => ({
    id: c.id, FirstName: c.first_name, MiddleName: c.middle_name,
    LastName: c.last_name, Adhaar: c.adhaar, Email: c.email,
    ContactNo: c.contact_no, Address: c.address, createdAt: c.created_at
  }));
};

export const getCustomer = async (id) => {
  const { data, error } = await supabase
    .from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return {
    id: data.id, FirstName: data.first_name, MiddleName: data.middle_name,
    LastName: data.last_name, Adhaar: data.adhaar, Email: data.email,
    ContactNo: data.contact_no, Address: data.address
  };
};

export const createCustomer = async (form) => {
  const { data, error } = await supabase.from('customers').insert({
    first_name: form.FirstName, middle_name: form.MiddleName,
    last_name: form.LastName, adhaar: form.Adhaar, email: form.Email,
    contact_no: form.ContactNo, address: form.Address
  }).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateCustomer = async (id, form) => {
  const { error } = await supabase.from('customers').update({
    first_name: form.FirstName, middle_name: form.MiddleName,
    last_name: form.LastName, adhaar: form.Adhaar, email: form.Email,
    contact_no: form.ContactNo, address: form.Address, updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
};

export const deleteCustomer = async (id) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
};

// ─── METERS ───
export const getCustomerMeters = async (customerId) => {
  const { data, error } = await supabase
    .from('meters').select('*').eq('customer_id', customerId);
  if (error) throw error;
  return data.map(m => ({
    id: m.id, customerId: m.customer_id, meterType: m.meter_type,
    installationDate: m.installation_date, city: m.city, pincode: m.pincode,
    street: m.street, houseNo: m.house_no, state: m.state,
    tariffId: m.tariff_id, ratePerUnit: m.rate_per_unit,
    tariffDescription: m.tariff_description
  }));
};

export const addMeter = async (data) => {
  const { data: result, error } = await supabase.from('meters').insert({
    customer_id: data.customerId, meter_type: data.meterType,
    installation_date: data.installationDate, city: data.city,
    pincode: data.pincode, street: data.street, house_no: data.houseNo,
    state: data.state, tariff_id: data.tariffId,
    rate_per_unit: data.ratePerUnit, tariff_description: data.tariffDescription
  }).select('id').single();
  if (error) throw error;
  return result.id;
};

// ─── TARIFFS ───
export const getTariffs = async () => {
  const { data, error } = await supabase.from('tariffs').select('*');
  if (error) throw error;
  return data.map(t => ({
    id: t.id, description: t.description, ratePerUnit: t.rate_per_unit,
    effectiveFrom: t.effective_from, effectiveTo: t.effective_to
  }));
};

// ─── INVOICES ───
export const getInvoices = async () => {
  const { data, error } = await supabase
    .from('invoices').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapInvoice);
};

export const getCustomerInvoices = async (customerId) => {
  const { data, error } = await supabase
    .from('invoices').select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapInvoice);
};

export const getInvoice = async (id) => {
  const { data, error } = await supabase
    .from('invoices').select('*').eq('id', id).single();
  if (error) throw error;
  return mapInvoice(data);
};

const mapInvoice = (i) => ({
  id: i.id, customerId: i.customer_id, billId: i.bill_id,
  tariffId: i.tariff_id, invoiceDate: i.invoice_date, dueDate: i.due_date,
  baseAmount: parseFloat(i.base_amount), tax: parseFloat(i.tax),
  grandTotal: parseFloat(i.grand_total), amountPaid: parseFloat(i.amount_paid || 0),
  unitsConsumed: parseFloat(i.units_consumed), status: i.status,
  createdAt: i.created_at
});

export const createInvoice = async (data) => {
  const { data: result, error } = await supabase.from('invoices').insert({
    customer_id: data.customerId, bill_id: data.billId, tariff_id: data.tariffId,
    invoice_date: data.invoiceDate || new Date().toISOString(),
    due_date: data.dueDate, base_amount: data.baseAmount, tax: data.tax,
    grand_total: data.grandTotal, amount_paid: data.amountPaid || 0,
    units_consumed: data.unitsConsumed, status: data.status || 'Pending'
  }).select('id').single();
  if (error) throw error;
  return result.id;
};

export const updateInvoice = async (id, data) => {
  const updateObj = { updated_at: new Date().toISOString() };
  if (data.amountPaid !== undefined) updateObj.amount_paid = data.amountPaid;
  if (data.status !== undefined) updateObj.status = data.status;
  const { error } = await supabase.from('invoices').update(updateObj).eq('id', id);
  if (error) throw error;
};

// ─── BILLS ───
export const getBills = async (customerId) => {
  let q = supabase.from('bills').select('*').order('created_at', { ascending: false });
  if (customerId) q = q.eq('customer_id', customerId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
};

export const createBill = async (data) => {
  const { data: result, error } = await supabase.from('bills').insert({
    customer_id: data.customerId, meter_id: data.meterId,
    issue_date: data.issueDate, due_date: data.dueDate,
    rate_per_unit: data.ratePerUnit, is_paid: data.isPaid || false
  }).select('id').single();
  if (error) throw error;
  return result.id;
};

// ─── PAYMENTS ───
export const getPayments = async () => {
  const { data, error } = await supabase
    .from('payments').select('*, customers(first_name, last_name)')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data.map(p => ({
    id: p.id, customerId: p.customer_id, invoiceId: p.invoice_id,
    amountPaid: parseFloat(p.amount_paid), paymentMode: p.payment_mode,
    transactionRef: p.transaction_ref, paymentDate: p.payment_date,
    customerName: p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : 'N/A'
  }));
};

export const getCustomerPayments = async (customerId) => {
  const { data, error } = await supabase
    .from('payments').select('*')
    .eq('customer_id', customerId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data.map(p => ({
    id: p.id, customerId: p.customer_id, invoiceId: p.invoice_id,
    amountPaid: parseFloat(p.amount_paid), paymentMode: p.payment_mode,
    transactionRef: p.transaction_ref, paymentDate: p.payment_date
  }));
};

export const getInvoicePayments = async (invoiceId) => {
  const { data, error } = await supabase
    .from('payments').select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data.map(p => ({
    id: p.id, paymentId: p.id, amountPaid: parseFloat(p.amount_paid),
    paymentMode: p.payment_mode, transactionRef: p.transaction_ref,
    paymentDate: p.payment_date
  }));
};

export const createPayment = async (data) => {
  // Insert payment
  const { data: payment, error } = await supabase.from('payments').insert({
    customer_id: data.customerId, invoice_id: data.invoiceId,
    amount_paid: data.amountPaid, payment_mode: data.paymentMode,
    transaction_ref: data.transactionRef
  }).select('id').single();
  if (error) throw error;

  // Update invoice
  if (data.invoiceId) {
    const inv = await getInvoice(data.invoiceId);
    const newPaid = (inv.amountPaid || 0) + (data.amountPaid || 0);
    const newStatus = newPaid >= inv.grandTotal ? 'Paid' : 'Partially Paid';
    await updateInvoice(data.invoiceId, { amountPaid: newPaid, status: newStatus });
  }
  return payment.id;
};

// ─── FEEDBACK ───
export const getFeedbacks = async (customerId) => {
  let q = supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
  if (customerId) q = q.eq('customer_id', customerId);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(f => ({
    id: f.id, customerId: f.customer_id, customerName: f.customer_name,
    customerEmail: f.customer_email, text: f.text, rating: f.rating,
    invoiceId: f.invoice_id, createdAt: f.created_at
  }));
};

export const createFeedback = async (data) => {
  const { data: result, error } = await supabase.from('feedbacks').insert({
    customer_id: data.customerId, customer_name: data.customerName,
    customer_email: data.customerEmail, text: data.text,
    rating: data.rating, invoice_id: data.invoiceId
  }).select('id').single();
  if (error) throw error;
  return result.id;
};

// ─── DASHBOARD STATS (Admin) ───
export const getAdminDashboardStats = async () => {
  const [{ data: custs }, { data: invs }, { data: pays }] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact' }),
    supabase.from('invoices').select('*'),
    supabase.from('payments').select('*, customers(first_name, last_name)')
      .order('payment_date', { ascending: false })
  ]);

  const paidInvoices = (invs || []).filter(i => i.status === 'Paid').length;
  const pendingInvoices = (invs || []).filter(i => i.status !== 'Paid').length;
  const payments = (pays || []).map(p => ({
    id: p.id, amountPaid: parseFloat(p.amount_paid), paymentDate: p.payment_date,
    paymentMode: p.payment_mode, invoiceId: p.invoice_id,
    customerName: p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : 'N/A'
  }));
  const totalPaymentsReceived = payments.reduce((s, p) => s + p.amountPaid, 0);
  const recentPayments = payments.slice(0, 5);

  const monthMap = {};
  payments.forEach(p => {
    const d = new Date(p.paymentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + p.amountPaid;
  });
  const paymentsByMonth = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]));

  return {
    stats: {
      totalCustomers: (custs || []).length,
      totalInvoices: (invs || []).length,
      paidInvoices, pendingInvoices, totalPaymentsReceived
    },
    recentPayments, paymentsByMonth
  };
};

// ─── PAYMENT STATS ───
export const getPaymentStats = async () => {
  const [{ data: pays }, { data: invs }] = await Promise.all([
    supabase.from('payments').select('amount_paid'),
    supabase.from('invoices').select('status')
  ]);
  return {
    totalPayments: (pays || []).length,
    totalAmountCollected: (pays || []).reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0),
    pendingPayments: (invs || []).filter(i => i.status !== 'Paid').length
  };
};

// ─── CUSTOMER DASHBOARD ───
export const getCustomerDashboard = async (customerId) => {
  const [customer, invoices, payments, meters] = await Promise.all([
    getCustomer(customerId), getCustomerInvoices(customerId),
    getCustomerPayments(customerId), getCustomerMeters(customerId)
  ]);

  const pendingInvoices = invoices.filter(i => i.status !== 'Paid');
  const outstanding = pendingInvoices.reduce((s, i) => s + (i.grandTotal - i.amountPaid), 0);
  const activeBill = pendingInvoices[0] || null;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const totalPaidYTD = payments
    .filter(p => new Date(p.paymentDate) >= yearStart)
    .reduce((s, p) => s + p.amountPaid, 0);
  const lastPayment = payments[0] || null;

  return {
    success: true, customer,
    summary: {
      currentOutstandingAmount: outstanding,
      currentMonthConsumption: activeBill?.unitsConsumed || 0,
      nextDueDate: activeBill?.dueDate || null,
      lastPayment: lastPayment ? { amount: lastPayment.amountPaid, date: lastPayment.paymentDate } : null,
      totalPaidYTD
    },
    activeBill: activeBill ? {
      invoiceId: activeBill.id, invoiceDate: activeBill.invoiceDate,
      dueDate: activeBill.dueDate, baseAmount: activeBill.baseAmount,
      tax: activeBill.tax, grandTotal: activeBill.grandTotal,
      amountPaid: activeBill.amountPaid, unitsConsumed: activeBill.unitsConsumed,
      status: activeBill.status
    } : null,
    recentBills: invoices.slice(0, 5).map(i => ({
      invoiceId: i.id, invoiceDate: i.invoiceDate, dueDate: i.dueDate,
      grandTotal: i.grandTotal, status: i.status
    })),
    recentPayments: payments.slice(0, 5).map(p => ({
      paymentId: p.id, paymentDate: p.paymentDate, amountPaid: p.amountPaid,
      paymentMode: p.paymentMode, transactionRef: p.transactionRef
    })),
    meters: meters.map(m => ({
      meterId: m.id, meterType: m.meterType, installationDate: m.installationDate,
      ratePerUnit: m.ratePerUnit,
      address: `${m.street || ''} ${m.houseNo || ''}, ${m.city || ''}, ${m.state || ''} - ${m.pincode || ''}`,
      tariffDescription: m.tariffDescription
    }))
  };
};

// ─── CREATE PAYMENT WITH INVOICE ───
export const createPaymentWithInvoice = async ({
  customerId, meterId, tariffId, unitsConsumed, dueDate, ratePerUnit
}) => {
  const units = parseFloat(unitsConsumed) || 0;
  const rate = parseFloat(ratePerUnit) || 0;
  const baseAmount = units * rate;
  const tax = baseAmount * 0.05;
  const grandTotal = baseAmount + tax;

  const billId = await createBill({
    customerId, meterId,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    ratePerUnit: rate, isPaid: false
  });

  const invoiceId = await createInvoice({
    customerId, billId, tariffId,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    baseAmount, tax, grandTotal, amountPaid: 0, unitsConsumed: units, status: 'Pending'
  });

  return { success: true, invoiceId, billId, calculated: { baseAmount, tax, grandTotal } };
};

// ─── CUSTOMER INVOICE DETAIL ───
export const getCustomerInvoiceDetail = async (invoiceId, customerId) => {
  const inv = await getInvoice(invoiceId);
  if (String(inv.customerId) !== String(customerId)) throw new Error('Unauthorized');
  const payments = await getInvoicePayments(invoiceId);
  const meters = await getCustomerMeters(customerId);
  const meterInfo = meters[0] || null;
  const outstanding = inv.grandTotal - inv.amountPaid;

  return {
    success: true,
    invoice: {
      invoiceId: inv.id, invoiceDate: inv.invoiceDate, dueDate: inv.dueDate,
      baseAmount: inv.baseAmount, tax: inv.tax, grandTotal: inv.grandTotal,
      amountPaid: inv.amountPaid, outstanding, unitsConsumed: inv.unitsConsumed,
      status: inv.status, billId: inv.billId
    },
    payments: payments.map(p => ({
      paymentId: p.id, paymentDate: p.paymentDate, amountPaid: p.amountPaid,
      paymentMode: p.paymentMode, transactionRef: p.transactionRef
    })),
    meterInfo: meterInfo ? {
      meterId: meterInfo.id, meterType: meterInfo.meterType,
      installationDate: meterInfo.installationDate,
      ratePerUnit: meterInfo.ratePerUnit,
      address: `${meterInfo.street || ''} ${meterInfo.houseNo || ''}, ${meterInfo.city || ''}, ${meterInfo.state || ''}`,
      tariffDescription: meterInfo.tariffDescription
    } : null
  };
};
