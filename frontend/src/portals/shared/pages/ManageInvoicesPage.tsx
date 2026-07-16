import React, { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useReactToPrint } from 'react-to-print';
import { useTerminology } from '../../../hooks/useTerminology';

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
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
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
}

interface Invoice {
  id: string;
  student: { name: string; class: { name: string } };
  feeGroup: { name: string } | null;
  description: string;
  amount: number;
  discount: number;
  paid: number;
  status: string;
  dueDate: string;
  createdAt: string;
  payments: Payment[];
}

export default function ManageInvoicesPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateConfig, setTemplateConfig] = useState<any>({});
  const [school, setSchool] = useState<any>(null);
  
  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetchInvoices();
    fetchTemplate();
    fetchSchool();
  }, []);

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

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/fees/invoices');
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load invoices', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const balance = invoice.amount - invoice.discount - invoice.paid;
    setPaymentAmount(balance > 0 ? balance.toString() : '0');
    setPaymentMethod('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIdempotencyKey(crypto.randomUUID());
    setIsPaymentModalOpen(true);
  };

  const openPrintModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPrintModalOpen(true);
  };

  const handleAcceptPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    if (!paymentAmount || !paymentMethod) {
      return showToast('Amount and Payment Method are required', 'warning');
    }

    setProcessingPayment(true);
    try {
      await api.post(`/api/fees/invoices/${selectedInvoice.id}/pay`, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        date: paymentDate
      }, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      showToast('Payment recorded successfully', 'success');
      setIsPaymentModalOpen(false);
      fetchInvoices();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to record payment', 'error');
    
    } finally {
      setProcessingPayment(false);
    }
  };

  const netAmount = (inv: Invoice) => Math.max(0, inv.amount - inv.discount);
  const balance = (inv: Invoice) => Math.max(0, netAmount(inv) - inv.paid);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Manage Group Invoices</h1>
          <p>View generated student invoices, accept payments, and print receipts.</p>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-file-invoice-dollar mr-2"></i> All Invoices</h2>
          <div style={{ display: 'flex', gap: '8px' }} className="no-print">
            <button 
                onClick={() => {
                  const headers = ['Invoice Info', t('student') + ' Name', t('class'), 'Amount', 'Paid', 'Balance', 'Status'];
                  const rows = invoices.map(inv => [
                    inv.feeGroup?.name || 'Custom Invoice',
                    inv.student.name,
                    inv.student.class?.name || 'No Class',
                    inv.amount.toString(),
                    inv.paid.toString(),
                    (inv.amount - inv.discount - inv.paid).toString(),
                    inv.status
                  ]);
                  exportToCSV('Student_Invoices', headers, rows);
                }}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
                onClick={() => {
                  const headers = ['Invoice Info', t('student') + ' Name', t('class'), 'Amount', 'Paid', 'Balance', 'Status'];
                  const rows = invoices.map(inv => [
                    inv.feeGroup?.name || 'Custom Invoice',
                    inv.student.name,
                    inv.student.class?.name || 'No Class',
                    inv.amount.toString(),
                    inv.paid.toString(),
                    (inv.amount - inv.discount - inv.paid).toString(),
                    inv.status
                  ]);
                  exportToWord('Student_Invoices', headers, rows);
                }}
                className="portal-btn-secondary"
                style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                title="Export to Word"
            >
              <i className="fas fa-file-word"></i> Word
            </button>
            <button 
                onClick={() => window.print()}
                className="portal-btn-secondary"
                style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                title="Print / PDF"
            >
              <i className="fas fa-print"></i> Print/PDF
            </button>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Invoice Info</th>
                <th>{t('student')}</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse" style={{ opacity: 1 - (idx * 0.15) }}>
                    <td>
                      <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '80%', marginBottom: 8 }}></div>
                      <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: '40%' }}></div>
                    </td>
                    <td>
                      <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '70%', marginBottom: 8 }}></div>
                      <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: '50%' }}></div>
                    </td>
                    <td><div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '60%' }}></div></td>
                    <td><div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '50%' }}></div></td>
                    <td><div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '50%' }}></div></td>
                    <td><div style={{ height: 24, background: '#e2e8f0', borderRadius: 12, width: '60px' }}></div></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ height: 28, background: '#e2e8f0', borderRadius: 4, width: '90px' }}></div>
                        <div style={{ height: 28, background: '#e2e8f0', borderRadius: 4, width: '50px' }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No invoices found</td>
                </tr>
              ) : (
                (() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && invoices.length > 0) setCurrentPage(1);
                  return currentItems.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{inv.feeGroup?.name || 'Custom Invoice'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(inv.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.student.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.student.class?.name || 'No Class'}</div>
                    </td>
                    <td>
                      <div>{formatCurrency(inv.amount)}</div>
                      {inv.discount > 0 && <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>- {formatCurrency(inv.discount)}</div>}
                      {inv.discount > 0 && <div style={{ fontWeight: 900, color: '#0f172a' }}>Net: {formatCurrency(netAmount(inv))}</div>}
                    </td>
                    <td style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(inv.paid)}</td>
                    <td style={{ color: balance(inv) > 0 ? '#dc2626' : '#059669', fontWeight: 900 }}>{formatCurrency(balance(inv))}</td>
                    <td>
                      <span className={`status-badge ${inv.status}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Accept Payment"
                          onClick={() => openPaymentModal(inv)}
                          disabled={balance(inv) <= 0}
                        >
                          <i className="fas fa-hand-holding-usd"></i>
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="View"
                          onClick={() => openPrintModal(inv)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
          
          {invoices.length > 0 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, invoices.length)} of {invoices.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(invoices.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(invoices.length / itemsPerPage) || invoices.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accept Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Accept Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="close-btn"><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Student:</strong> {selectedInvoice.student.name}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Invoice:</strong> {selectedInvoice.feeGroup?.name || 'Custom'}</p>
                <p style={{ margin: 0 }}><strong>Balance Due:</strong> <span style={{ color: '#dc2626', fontWeight: 900 }}>{formatCurrency(balance(selectedInvoice))}</span></p>
              </div>
              <form onSubmit={handleAcceptPayment}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="portal-label">Payment Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="portal-input"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="portal-label">Payment Date</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Payment Method</label>
                  <select
                    className="portal-input"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    required
                  >
                    <option value="">-- Select Method --</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Ecocash">Ecocash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="portal-btn-ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={processingPayment}>
                    {processingPayment ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {isPrintModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '100%' }}>
            <div className="modal-header">
              <h2>View Invoice</h2>
              <button onClick={() => setIsPrintModalOpen(false)} className="close-btn"><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div ref={printRef} className="printable-area" style={{ padding: '40px', background: 'white' }}>
                {(() => {
                  const INVOICE_BUILTIN = [
                    { id: 'modern-clean',      color: '#0f172a', accent: '#f8fafc' },
                    { id: 'professional-blue', color: '#1e3a8a', accent: '#eff6ff' },
                    { id: 'classic-gray',      color: '#475569', accent: '#f1f5f9' },
                  ];
                  const iBuiltin = INVOICE_BUILTIN.find(i => i.id === templateConfig?.invoiceDesign) || INVOICE_BUILTIN[0];
                  const primaryCol = templateConfig?.primaryColor || iBuiltin.color;
                  const accentCol = iBuiltin.accent;
                  // Handle logo: assume school object has branding and customContent
                  const branding = school?.branding || {};
                  const schoolLogo = branding.logo;
                  const logoUrl = schoolLogo ? `/api/storage/file/${schoolLogo}` : null;
                  
                  return (
                    <div style={{
                      width: '100%', maxWidth: '800px', margin: '0 auto',
                      background: '#fff', borderRadius: '10px', overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      border: '1px solid #e2e8f0',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '32px', borderBottom: `2px solid ${accentCol}` }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          {logoUrl && templateConfig?.showLogo !== false ? (
                            <img src={logoUrl} alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '64px', height: '64px', background: primaryCol, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-university" style={{ color: '#fff', fontSize: '28px' }}></i>
                            </div>
                          )}
                          <div>
                            <div style={{ color: primaryCol, fontWeight: 900, fontSize: '1.5rem' }}>{school?.name || 'Academy Name'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>{school?.address || 'School Address'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{school?.email || 'contact@school.edu'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: primaryCol, fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INVOICE</div>
                          <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>
                            INV-{new Date(selectedInvoice.createdAt).getFullYear()}-{selectedInvoice.id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Bill To & Details */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 32px', background: accentCol }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Bill To</div>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem', marginTop: '6px' }}>{selectedInvoice.student.name}</div>
                          <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>
                            Class: {selectedInvoice.student.class?.name || 'No Class'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '24px', justifyContent: 'flex-end', fontSize: '0.9rem', color: '#475569', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700 }}>Date:</span> <span>{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '24px', justifyContent: 'flex-end', fontSize: '0.9rem', color: '#475569' }}>
                            <span style={{ fontWeight: 700 }}>Due Date:</span> <span>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ padding: '32px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${primaryCol}` }}>
                              <th style={{ textAlign: 'left', padding: '12px 8px', color: primaryCol, fontWeight: 900 }}>Description</th>
                              <th style={{ textAlign: 'right', padding: '12px 8px', color: primaryCol, fontWeight: 900 }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '16px 8px', color: '#374151', fontWeight: 600 }}>
                                {selectedInvoice.description || selectedInvoice.feeGroup?.name || 'Custom Invoice'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', padding: '16px 8px' }}>
                                {formatCurrency(selectedInvoice.amount)}
                              </td>
                            </tr>
                            {selectedInvoice.discount > 0 && (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '16px 8px', color: '#dc2626', fontWeight: 600 }}>Discount Applied</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626', padding: '16px 8px' }}>
                                  - {formatCurrency(selectedInvoice.discount)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 32px 32px' }}>
                        <div style={{ width: '300px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' }}>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Net Total</span>
                            <span style={{ color: '#1e293b', fontWeight: 700 }}>{formatCurrency(netAmount(selectedInvoice))}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' }}>
                            <span style={{ color: '#059669', fontWeight: 600 }}>Amount Paid</span>
                            <span style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(selectedInvoice.paid)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 12px', background: primaryCol, color: '#fff', borderRadius: '6px', marginTop: '16px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>BALANCE DUE</span>
                            <span style={{ fontWeight: 900, fontSize: '1.4rem' }}>{formatCurrency(balance(selectedInvoice))}</span>
                          </div>
                        </div>
                      </div>

                      {selectedInvoice.payments.length > 0 && (
                        <div style={{ padding: '0 32px 32px' }}>
                          <h3 style={{ margin: '0 0 16px 0', color: primaryCol, fontSize: '1rem', fontWeight: 800 }}>Payment History</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b' }}>Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b' }}>Method</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedInvoice.payments.map(p => (
                                <tr key={p.id}>
                                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#333' }}>{new Date(p.date).toLocaleDateString()}</td>
                                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#333' }}>{p.paymentMode}</td>
                                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#333', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ padding: '20px 32px', background: accentCol, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', maxWidth: '70%' }}>
                          {templateConfig?.footerText || 'Thank you for your business. Please ensure timely payment of all invoices.'}
                        </div>
                        {templateConfig?.enableQR !== false && (
                          <div style={{ width: '48px', height: '48px', background: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-qrcode" style={{ color: primaryCol, fontSize: '32px' }}></i>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="portal-btn-ghost" onClick={() => setIsPrintModalOpen(false)}>Close</button>
              <button className="portal-btn-primary" onClick={handlePrint}><i className="fas fa-print mr-2"></i> Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
