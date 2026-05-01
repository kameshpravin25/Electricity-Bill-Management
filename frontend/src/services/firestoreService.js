import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, writeBatch, serverTimestamp
} from 'firebase/firestore';

// ─── Helper ───
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v.toDate) return v.toDate().toISOString();
  return v;
};

const snap = (d) => ({ id: d.id, ...d.data() });

// ─── CUSTOMERS ───
export const getCustomers = async () => {
  const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const getCustomer = async (id) => {
  const d = await getDoc(doc(db, 'customers', id));
  if (!d.exists()) throw new Error('Customer not found');
  return { id: d.id, ...d.data() };
};

export const createCustomer = async (data) => {
  const ref = await addDoc(collection(db, 'customers'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

export const updateCustomer = async (id, data) => {
  await updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteCustomer = async (id) => {
  await deleteDoc(doc(db, 'customers', id));
};

// ─── METERS ───
export const getCustomerMeters = async (customerId) => {
  const q = query(collection(db, 'meters'), where('customerId', '==', customerId));
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const addMeter = async (data) => {
  const ref = await addDoc(collection(db, 'meters'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

// ─── TARIFFS ───
export const getTariffs = async () => {
  const s = await getDocs(collection(db, 'tariffs'));
  return s.docs.map(snap);
};

// ─── INVOICES ───
export const getInvoices = async () => {
  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const getCustomerInvoices = async (customerId) => {
  const q = query(
    collection(db, 'invoices'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const getInvoice = async (id) => {
  const d = await getDoc(doc(db, 'invoices', id));
  if (!d.exists()) throw new Error('Invoice not found');
  return { id: d.id, ...d.data() };
};

export const createInvoice = async (data) => {
  const ref = await addDoc(collection(db, 'invoices'), {
    ...data,
    status: data.status || 'Pending',
    amountPaid: data.amountPaid || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

export const updateInvoice = async (id, data) => {
  await updateDoc(doc(db, 'invoices', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// ─── BILLS ───
export const getBills = async (customerId) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (customerId) constraints.unshift(where('customerId', '==', customerId));
  const q = query(collection(db, 'bills'), ...constraints);
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const createBill = async (data) => {
  const ref = await addDoc(collection(db, 'bills'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

// ─── PAYMENTS ───
export const getPayments = async () => {
  const q = query(collection(db, 'payments'), orderBy('paymentDate', 'desc'));
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const getCustomerPayments = async (customerId) => {
  const q = query(
    collection(db, 'payments'),
    where('customerId', '==', customerId),
    orderBy('paymentDate', 'desc')
  );
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const getInvoicePayments = async (invoiceId) => {
  const q = query(
    collection(db, 'payments'),
    where('invoiceId', '==', invoiceId),
    orderBy('paymentDate', 'desc')
  );
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const createPayment = async (data) => {
  const batch = writeBatch(db);

  // Create payment doc
  const payRef = doc(collection(db, 'payments'));
  batch.set(payRef, {
    ...data,
    paymentDate: data.paymentDate || serverTimestamp(),
    createdAt: serverTimestamp()
  });

  // Update invoice amountPaid & status
  if (data.invoiceId) {
    const invRef = doc(db, 'invoices', data.invoiceId);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
      const inv = invSnap.data();
      const newPaid = (inv.amountPaid || 0) + (data.amountPaid || 0);
      const newStatus = newPaid >= inv.grandTotal ? 'Paid' : 'Partially Paid';
      batch.update(invRef, {
        amountPaid: newPaid,
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    }
  }

  await batch.commit();
  return payRef.id;
};

export const getPayment = async (id) => {
  const d = await getDoc(doc(db, 'payments', id));
  if (!d.exists()) throw new Error('Payment not found');
  return { id: d.id, ...d.data() };
};

// ─── FEEDBACK ───
export const getFeedbacks = async (customerId) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (customerId) constraints.unshift(where('customerId', '==', customerId));
  const q = query(collection(db, 'feedbacks'), ...constraints);
  const s = await getDocs(q);
  return s.docs.map(snap);
};

export const createFeedback = async (data) => {
  const ref = await addDoc(collection(db, 'feedbacks'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

// ─── DASHBOARD STATS (Admin) ───
export const getAdminDashboardStats = async () => {
  const [custSnap, invSnap, paySnap] = await Promise.all([
    getDocs(collection(db, 'customers')),
    getDocs(collection(db, 'invoices')),
    getDocs(collection(db, 'payments'))
  ]);

  const invoices = invSnap.docs.map(d => d.data());
  const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const paidInvoices = invoices.filter(i => i.status === 'Paid').length;
  const pendingInvoices = invoices.filter(i => i.status !== 'Paid').length;
  const totalPaymentsReceived = payments.reduce((s, p) => s + (p.amountPaid || 0), 0);

  // Recent payments (last 5)
  const recentPayments = payments.slice(0, 5);

  // Payments by month
  const monthMap = {};
  payments.forEach(p => {
    const d = p.paymentDate?.toDate ? p.paymentDate.toDate() : new Date(p.paymentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + (p.amountPaid || 0);
  });
  const paymentsByMonth = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]));

  return {
    stats: {
      totalCustomers: custSnap.size,
      totalInvoices: invSnap.size,
      paidInvoices,
      pendingInvoices,
      totalPaymentsReceived
    },
    recentPayments,
    paymentsByMonth
  };
};

// ─── PAYMENT STATS (Admin) ───
export const getPaymentStats = async () => {
  const [paySnap, invSnap] = await Promise.all([
    getDocs(collection(db, 'payments')),
    getDocs(collection(db, 'invoices'))
  ]);
  const payments = paySnap.docs.map(d => d.data());
  const invoices = invSnap.docs.map(d => d.data());
  return {
    totalPayments: paySnap.size,
    totalAmountCollected: payments.reduce((s, p) => s + (p.amountPaid || 0), 0),
    pendingPayments: invoices.filter(i => i.status !== 'Paid').length
  };
};

// ─── CUSTOMER DASHBOARD ───
export const getCustomerDashboard = async (customerId) => {
  const [custDoc, invoices, payments, meters] = await Promise.all([
    getCustomer(customerId),
    getCustomerInvoices(customerId),
    getCustomerPayments(customerId),
    getCustomerMeters(customerId)
  ]);

  const pendingInvoices = invoices.filter(i => i.status !== 'Paid');
  const outstanding = pendingInvoices.reduce((s, i) => s + ((i.grandTotal || 0) - (i.amountPaid || 0)), 0);
  const activeBill = pendingInvoices[0] || null;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const totalPaidYTD = payments
    .filter(p => {
      const d = p.paymentDate?.toDate ? p.paymentDate.toDate() : new Date(p.paymentDate);
      return d >= yearStart;
    })
    .reduce((s, p) => s + (p.amountPaid || 0), 0);

  const lastPayment = payments[0] || null;
  const currentMonthConsumption = activeBill?.unitsConsumed || 0;

  return {
    success: true,
    customer: custDoc,
    summary: {
      currentOutstandingAmount: outstanding,
      currentMonthConsumption,
      nextDueDate: activeBill?.dueDate || null,
      lastPayment: lastPayment ? { amount: lastPayment.amountPaid, date: toDate(lastPayment.paymentDate) } : null,
      totalPaidYTD
    },
    activeBill: activeBill ? {
      invoiceId: activeBill.id,
      invoiceDate: toDate(activeBill.invoiceDate || activeBill.createdAt),
      dueDate: toDate(activeBill.dueDate),
      baseAmount: activeBill.baseAmount,
      tax: activeBill.tax,
      grandTotal: activeBill.grandTotal,
      amountPaid: activeBill.amountPaid || 0,
      unitsConsumed: activeBill.unitsConsumed,
      status: activeBill.status
    } : null,
    recentBills: invoices.slice(0, 5).map(i => ({
      invoiceId: i.id,
      invoiceDate: toDate(i.invoiceDate || i.createdAt),
      dueDate: toDate(i.dueDate),
      grandTotal: i.grandTotal,
      status: i.status
    })),
    recentPayments: payments.slice(0, 5).map(p => ({
      paymentId: p.id,
      paymentDate: toDate(p.paymentDate),
      amountPaid: p.amountPaid,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef
    })),
    meters: meters.map(m => ({
      meterId: m.id,
      meterType: m.meterType,
      installationDate: toDate(m.installationDate),
      ratePerUnit: m.ratePerUnit,
      address: m.address || `${m.street || ''} ${m.houseNo || ''}, ${m.city || ''}, ${m.state || ''} - ${m.pincode || ''}`,
      tariffDescription: m.tariffDescription,
      effectiveFrom: toDate(m.effectiveFrom),
      effectiveTo: toDate(m.effectiveTo)
    }))
  };
};

// ─── ADMIN: Create payment + invoice + bill in one transaction ───
export const createPaymentWithInvoice = async ({
  customerId, meterId, tariffId, unitsConsumed,
  paymentMode, transactionRef, dueDate, ratePerUnit
}) => {
  const units = parseFloat(unitsConsumed) || 0;
  const rate = parseFloat(ratePerUnit) || 0;
  const baseAmount = units * rate;
  const tax = baseAmount * 0.05;
  const grandTotal = baseAmount + tax;

  // Create bill
  const billId = await createBill({
    customerId, meterId,
    issueDate: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    ratePerUnit: rate,
    isPaid: false
  });

  // Create invoice
  const invoiceId = await createInvoice({
    customerId, billId, tariffId,
    invoiceDate: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    baseAmount, tax, grandTotal,
    amountPaid: 0,
    unitsConsumed: units,
    status: 'Pending'
  });

  return {
    success: true,
    invoiceId, billId,
    calculated: { baseAmount, tax, grandTotal, amountPaid: grandTotal }
  };
};

// ─── CUSTOMER INVOICE DETAIL ───
export const getCustomerInvoiceDetail = async (invoiceId, customerId) => {
  const inv = await getInvoice(invoiceId);
  if (inv.customerId !== customerId) throw new Error('Unauthorized');

  const payments = await getInvoicePayments(invoiceId);
  let meterInfo = null;
  if (inv.meterId || inv.billId) {
    const meters = await getCustomerMeters(customerId);
    meterInfo = meters[0] || null;
  }

  const outstanding = (inv.grandTotal || 0) - (inv.amountPaid || 0);

  return {
    success: true,
    invoice: {
      invoiceId: inv.id,
      invoiceDate: toDate(inv.invoiceDate || inv.createdAt),
      dueDate: toDate(inv.dueDate),
      baseAmount: inv.baseAmount,
      tax: inv.tax,
      grandTotal: inv.grandTotal,
      amountPaid: inv.amountPaid || 0,
      outstanding,
      unitsConsumed: inv.unitsConsumed,
      status: inv.status,
      billId: inv.billId
    },
    payments: payments.map(p => ({
      paymentId: p.id,
      paymentDate: toDate(p.paymentDate),
      amountPaid: p.amountPaid,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef
    })),
    meterInfo: meterInfo ? {
      meterId: meterInfo.id,
      meterType: meterInfo.meterType,
      installationDate: toDate(meterInfo.installationDate),
      ratePerUnit: meterInfo.ratePerUnit,
      address: meterInfo.address || `${meterInfo.street || ''} ${meterInfo.houseNo || ''}, ${meterInfo.city || ''}, ${meterInfo.state || ''}`,
      tariffDescription: meterInfo.tariffDescription
    } : null
  };
};
