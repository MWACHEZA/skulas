import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pagination } from '../../../components/shared/Pagination';
import ReceiptModal, { type ReceiptModalData, type ReceiptTemplateConfig, type ReceiptSchoolInfo } from '../../../components/shared/ReceiptModal';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useReactToPrint } from 'react-to-print';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAccountingQuery, invalidateAllAccountingKeys } from '../../../hooks/useAccountingQuery';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10pt; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
        th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h2 style="color: #0f172a; font-family: sans-serif;">${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface Payment {
  id: string;
  amount: number;
  date: string;
  paymentMode: string;
  reference?: string;
  receiptNumber?: string;
}

interface Invoice {
  id: string;
  student: { id?: string; studentId?: string; name: string; class?: { name: string } | null };
  feeGroup?: { name: string } | null;
  description: string;
  amount: number;
  discount: number;
  paid: number;
  status: string;
  dueDate: string;
  createdAt: string;
  payments: Payment[];
}

type InvoiceStatusFilter = 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';

const netAmount = (inv: Invoice) => Math.max(0, inv.amount - (inv.discount || 0));
const balance = (inv: Invoice) => Math.max(0, netAmount(inv) - (inv.paid || 0));

// Determine effective status including overdue
const getEffectiveStatus = (inv: Invoice): 'paid' | 'partial' | 'unpaid' | 'overdue' => {
  const bal = balance(inv);
  if (bal <= 0) return 'paid';
  const isOverdue = inv.dueDate ? new Date(inv.dueDate).getTime() < Date.now() : false;
  if (isOverdue) return 'overdue';
  if (inv.paid > 0) return 'partial';
  return 'unpaid';
};

export default function ManageInvoicesPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [templateConfig, setTemplateConfig] = useState<ReceiptTemplateConfig | null>(null);
  const [school, setSchool] = useState<ReceiptSchoolInfo | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptModalData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('USD Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const { data: rawInvoices = [], isLoading: loading, refetch: fetchInvoices } = useAccountingQuery<Invoice[]>({
    key: 'fees:invoices',
    fetcher: async () => {
      const { data } = await api.get('/api/fees/invoices');
      return Array.isArray(data) ? data : [];
    }
  });

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await api.get('/api/finance/payment-methods');
      setPaymentMethods(Array.isArray(data) ? data.filter((m: { id: string; name: string; isActive?: boolean }) => m.isActive !== false) : []);
    } catch { /* fallback to standard payment options */ }
  };

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get('/api/reports/template');
      if (data && data.config) setTemplateConfig(data.config);
    } catch { /* silent */ }
  };

  const fetchSchool = async () => {
    try {
      const { data } = await api.get('/api/schools/me');
      setSchool(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchInvoices();
    fetchTemplate();
    fetchSchool();
    fetchPaymentMethods();
  }, [fetchInvoices]);

  // Distinct classes for dropdown
  const classOptions = useMemo(() => {
    const classes = new Set<string>();
    rawInvoices.forEach(inv => {
      if (inv.student?.class?.name) classes.add(inv.student.class.name);
    });
    return Array.from(classes).sort();
  }, [rawInvoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter(inv => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        inv.student?.name?.toLowerCase().includes(q) ||
        (inv.student?.studentId && inv.student.studentId.toLowerCase().includes(q)) ||
        (inv.id && inv.id.toLowerCase().includes(q)) ||
        (inv.feeGroup?.name && inv.feeGroup.name.toLowerCase().includes(q)) ||
        (inv.description && inv.description.toLowerCase().includes(q));

      const effStatus = getEffectiveStatus(inv);
      const matchStatus = statusFilter === 'ALL' || effStatus === statusFilter.toLowerCase();
      const matchClass = classFilter === 'ALL' || inv.student?.class?.name === classFilter;

      return matchQuery && matchStatus && matchClass;
    });
  }, [rawInvoices, searchQuery, statusFilter, classFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let paidCount = 0;

    rawInvoices.forEach(inv => {
      const net = netAmount(inv);
      const paid = inv.paid || 0;
      const bal = balance(inv);
      totalInvoiced += net;
      totalPaid += paid;
      totalBalance += bal;
      if (bal <= 0) paidCount++;
    });

    const rate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
    return { totalInvoiced, totalPaid, totalBalance, paidCount, rate };
  }, [rawInvoices]);

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const bal = balance(invoice);
    setPaymentAmount(bal > 0 ? bal.toFixed(2) : '0.00');
    setPaymentMethod('USD Cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setIdempotencyKey(`pay_${Date.now()}_${invoice.id}`);
    setIsPaymentModalOpen(true);
  };

  const openPrintModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPrintModalOpen(true);
  };

  const handleAcceptPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      return showToast('Valid positive payment amount is required', 'warning');
    }
    if (!paymentMethod) {
      return showToast('Payment Method is required', 'warning');
    }

    setProcessingPayment(true);
    try {
      await api.post(`/api/fees/invoices/${selectedInvoice.id}/pay`, {
        amount: amt,
        method: paymentMethod,
        date: paymentDate,
        description: paymentReference.trim() || undefined
      }, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      showToast(`Payment of ${formatCurrency(amt)} recorded for ${selectedInvoice.student.name}`, 'success');
      setIsPaymentModalOpen(false);

      // Open official receipt modal immediately
      setSelectedReceipt({
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        date: paymentDate || new Date().toISOString(),
        studentName: selectedInvoice.student.name,
        studentId: selectedInvoice.student.studentId || selectedInvoice.student.id,
        className: selectedInvoice.student.class?.name || 'Class N/A',
        paymentMode: paymentMethod,
        reference: paymentReference || `INV-${selectedInvoice.id.slice(-6).toUpperCase()}`,
        amountPaid: amt,
        feeItems: [{
          desc: selectedInvoice.description || selectedInvoice.feeGroup?.name || 'School Fee Payment',
          amount: amt
        }],
        newBalance: Math.max(0, balance(selectedInvoice) - amt)
      });
      setIsReceiptModalOpen(true);

      // Refresh invoices and accounting cache
      fetchInvoices();
      invalidateAllAccountingKeys();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showToast(err.response?.data?.error || err.message || 'Failed to record payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Avatar initial color generator
  const getAvatarColor = (name: string) => {
    const colors = ['#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#e11d48', '#7c3aed', '#4f46e5', '#db2777'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="portal-container" style={{ padding: '0 0 40px 0', width: '100%' }}>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-file-invoice-dollar" />
            </span>
            Manage Student Invoices & Collections
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Live query and cashier terminal: track billed student fees, confirmed receipts, and record on-the-spot counter payments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print">
          <button
            type="button"
            onClick={fetchInvoices}
            className="portal-btn-secondary"
            style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff' }}
            title="Refresh Invoices"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Modern High-End KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Invoiced</span>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <i className="fas fa-file-invoice" />
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {formatCurrency(metrics.totalInvoiced)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Across <strong>{rawInvoices.length}</strong> active student invoices
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Collected</span>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <i className="fas fa-check-circle" />
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
            {formatCurrency(metrics.totalPaid)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            {metrics.paidCount} fully settled accounts
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outstanding Arrears</span>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <i className="fas fa-exclamation-triangle" />
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48', marginTop: 8 }}>
            {formatCurrency(metrics.totalBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: 4, fontWeight: 600 }}>
            Debtors aging enforcement required
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Collection Efficiency</span>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <i className="fas fa-chart-line" />
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {metrics.rate}%
          </div>
          <div style={{ marginTop: 6, width: '100%', height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, metrics.rate)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Filters and Search Bar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Search student, ID, ref, or fee..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', fontSize: '0.85rem' }} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 10, top: 10, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as InvoiceStatusFilter); setCurrentPage(1); }}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', fontWeight: 600, color: '#334155' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid in Full</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue Only</option>
            </select>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={e => { setClassFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', fontWeight: 600, color: '#334155' }}
            >
              <option value="ALL">All Classes / Grades</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print">
            <button
              onClick={() => {
                const headers = ['Invoice Ref', 'Student Name', 'Class', 'Due Date', 'Billed ($)', 'Paid ($)', 'Balance ($)', 'Status'];
                const rows = filteredInvoices.map(inv => [
                  inv.id.slice(0, 8),
                  inv.student.name,
                  inv.student.class?.name || 'Unassigned',
                  inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A',
                  inv.amount.toString(),
                  (inv.paid || 0).toString(),
                  balance(inv).toString(),
                  getEffectiveStatus(inv).toUpperCase()
                ]);
                exportToCSV('Student_Invoices_Registry', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv" style={{ color: '#059669' }} /> CSV
            </button>

            <button
              onClick={() => {
                const headers = ['Invoice Ref', 'Student Name', 'Class', 'Due Date', 'Billed ($)', 'Paid ($)', 'Balance ($)', 'Status'];
                const rows = filteredInvoices.map(inv => [
                  inv.id.slice(0, 8),
                  inv.student.name,
                  inv.student.class?.name || 'Unassigned',
                  inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A',
                  formatCurrency(inv.amount),
                  formatCurrency(inv.paid || 0),
                  formatCurrency(balance(inv)),
                  getEffectiveStatus(inv).toUpperCase()
                ]);
                exportToWord('Student_Invoices_Registry', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word" style={{ color: '#2563eb' }} /> Word
            </button>

            <button
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
              title="Print Current View"
            >
              <i className="fas fa-print" style={{ color: '#475569' }} /> Print
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Invoice Ref & Context</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>{t('student')} & Class</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Due Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Billed Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Paid to Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Balance Due</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={8} style={{ padding: '18px' }}>
                      <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: `${70 + (idx % 3) * 10}%`, animation: 'pulse 1.5s infinite' }} />
                    </td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 12 }}>
                      <i className="fas fa-inbox" />
                    </div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>No student invoices found</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                      {searchQuery || statusFilter !== 'ALL' || classFilter !== 'ALL'
                        ? 'Try adjusting your search criteria or resetting filters.'
                        : 'No billing invoices have been posted yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                (() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filteredInvoices.length > 0) setCurrentPage(1);

                  return currentItems.map(inv => {
                    const bal = balance(inv);
                    const effStatus = getEffectiveStatus(inv);
                    const studentName = inv.student?.name || 'Unknown Student';
                    const avatarColor = getAvatarColor(studentName);
                    const initials = studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                        {/* Invoice Info */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 6 }}>
                              {inv.id.slice(0, 8)}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                              {inv.description || inv.feeGroup?.name || 'Tuition & Amenities Fee'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>
                            Posted: {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Student & Class */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 16, background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                                {studentName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {inv.student?.class?.name && (
                                  <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                    {inv.student.class.name}
                                  </span>
                                )}
                                {inv.student?.studentId && (
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    {inv.student.studentId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, color: effStatus === 'overdue' ? '#dc2626' : '#334155' }}>
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'End of Term'}
                          </div>
                          {effStatus === 'overdue' && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <i className="fas fa-exclamation-circle" /> OVERDUE
                            </span>
                          )}
                        </td>

                        {/* Billed */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                            {formatCurrency(inv.amount)}
                          </div>
                          {inv.discount > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
                              - {formatCurrency(inv.discount)} disc.
                            </div>
                          )}
                        </td>

                        {/* Paid */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 800, color: (inv.paid || 0) > 0 ? '#16a34a' : '#94a3b8', fontSize: '0.92rem' }}>
                            {formatCurrency(inv.paid || 0)}
                          </span>
                        </td>

                        {/* Balance */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 900, color: bal > 0 ? '#dc2626' : '#16a34a', fontSize: '0.95rem' }}>
                            {formatCurrency(bal)}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          {effStatus === 'paid' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.72rem', fontWeight: 800 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981' }} />
                              PAID
                            </span>
                          )}
                          {effStatus === 'partial' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.72rem', fontWeight: 800 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#f59e0b' }} />
                              PARTIAL
                            </span>
                          )}
                          {effStatus === 'unpaid' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', fontSize: '0.72rem', fontWeight: 800 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#f43f5e' }} />
                              UNPAID
                            </span>
                          )}
                          {effStatus === 'overdue' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.72rem', fontWeight: 800 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#ef4444' }} />
                              OVERDUE
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }} className="no-print">
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            {/* Accept Payment */}
                            <button
                              type="button"
                              onClick={() => openPaymentModal(inv)}
                              disabled={bal <= 0}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #a7f3d0',
                                background: bal > 0 ? '#ecfdf5' : '#f8fafc',
                                color: bal > 0 ? '#059669' : '#cbd5e1',
                                cursor: bal > 0 ? 'pointer' : 'not-allowed',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'all 0.15s ease'
                              }}
                              title={bal > 0 ? 'Accept Counter Payment' : 'Invoice fully settled'}
                            >
                              <i className="fas fa-hand-holding-usd" />
                              <span>Pay</span>
                            </button>

                            {/* View Breakdown */}
                            <button
                              type="button"
                              onClick={() => openPrintModal(inv)}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#4338ca',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem'
                              }}
                              title="View Invoice Document"
                            >
                              <i className="fas fa-eye" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredInvoices.length > 0 && !loading && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing <strong>{Math.min(filteredInvoices.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to <strong>{Math.min(filteredInvoices.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredInvoices.length}</strong> invoices
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => { setItemsPerPage(size); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* Accept Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden', animation: 'scaleUp 0.15s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-cash-register" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Record Counter Payment</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Atomic double-entry receipt allocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', padding: 4 }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Student and Invoice Context Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Student Name:</span>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedInvoice.student.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Class & ID:</span>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {selectedInvoice.student.class?.name || 'Unassigned'} • {selectedInvoice.student.studentId || selectedInvoice.student.id?.slice(0, 8)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fee Target:</span>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {selectedInvoice.description || selectedInvoice.feeGroup?.name || 'Tuition Fee'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Remaining Balance:</span>
                  <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626' }}>
                    {formatCurrency(balance(selectedInvoice))}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleAcceptPayment}>
                {/* Amount */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Payment Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance(selectedInvoice)}
                    className="portal-input"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '1.05rem', fontWeight: 800, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* Date & Mode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      className="portal-input"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Payment Mode
                    </label>
                    <select
                      className="portal-input"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', fontWeight: 600 }}
                    >
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="USD Cash">USD Cash</option>
                          <option value="ZiG Cash">ZiG Cash</option>
                          <option value="EcoCash">EcoCash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="POS Swipe">POS Swipe</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Reference Notes */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Transaction Reference / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EcoCash ref # or Bank deposit slip #"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    className="portal-btn-ghost"
                    onClick={() => setIsPaymentModalOpen(false)}
                    style={{ padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="portal-btn-primary"
                    disabled={processingPayment}
                    style={{
                      padding: '9px 24px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      cursor: processingPayment ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {processingPayment ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-circle" />}
                    <span>{processingPayment ? 'Processing...' : 'Confirm & Print Receipt'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {isPrintModalOpen && selectedInvoice && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 820, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Official Student Invoice Document</h3>
              <button onClick={() => setIsPrintModalOpen(false)} style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div ref={printRef} style={{ padding: 36, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                {(() => {
                  const institutionName = school?.name || 'Lobengula Primary';
                  const schoolAddress = school?.address || 'Bulawayo, Zimbabwe';
                  const schoolEmail = school?.email || 'accounts@school.ac.zw';
                  const schoolLogo = school?.branding?.logo || school?.logo;
                  const logoUrl = schoolLogo ? `/api/storage/file/${schoolLogo}` : null;

                  return (
                    <div>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: '2px solid #0f172a' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem' }}>
                              {institutionName.slice(0, 3).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{institutionName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{schoolAddress}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{schoolEmail}</div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>INVOICE</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                            INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Bill To & Details */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Billed Student</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{selectedInvoice.student.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                            Class: {selectedInvoice.student.class?.name || 'Unassigned'} • Student ID: {selectedInvoice.student.studentId || selectedInvoice.student.id}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#475569' }}>
                          <div><strong>Issue Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                          <div style={{ marginTop: 4 }}><strong>Due Date:</strong> {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'End of Term'}</div>
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ padding: '24px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Item Description</th>
                              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 12px', fontWeight: 600, color: '#0f172a' }}>
                                {selectedInvoice.description || selectedInvoice.feeGroup?.name || 'Tuition & Amenities Fee'}
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                {formatCurrency(selectedInvoice.amount)}
                              </td>
                            </tr>
                            {selectedInvoice.discount > 0 && (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 600 }}>Scholarship / Discount Applied</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 800 }}>- {formatCurrency(selectedInvoice.discount)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
                        <div style={{ width: 280 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                            <span style={{ color: '#64748b' }}>Gross Billed:</span>
                            <span style={{ fontWeight: 700 }}>{formatCurrency(netAmount(selectedInvoice))}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                            <span style={{ color: '#16a34a' }}>Paid to Date:</span>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(selectedInvoice.paid || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#0f172a', color: '#fff', borderRadius: 8, marginTop: 10 }}>
                            <span style={{ fontWeight: 800 }}>BALANCE DUE:</span>
                            <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>{formatCurrency(balance(selectedInvoice))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                        Official Institutional Invoice • Generated by ACADEX Financial Suite • Powered by Santana IT Solutions
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="portal-btn-ghost" onClick={() => setIsPrintModalOpen(false)}>Close</button>
              <button
                type="button"
                className="portal-btn-primary"
                onClick={handlePrint}
                style={{ padding: '8px 20px', borderRadius: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <i className="fas fa-print" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedReceipt}
        templateConfig={templateConfig}
        school={school}
      />
    </div>
  );
}
