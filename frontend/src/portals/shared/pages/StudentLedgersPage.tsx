import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';

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

interface LedgerItem {
  id: string;
  item: string;
  amount: number;
  date: string;
}

interface Ledger {
  id: string;
  description: string;
  student: { name: string; class: { name: string } };
  dueDate: string;
  vatPercentage: number;
  discount: number;
  status: string;
  createdAt: string;
  lineItems: LedgerItem[];
}

export default function StudentLedgersPage() {
  const { t } = useTerminology();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Creation Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [vatPercentage, setVatPercentage] = useState('');
  const [discount, setDiscount] = useState('');
  const [status, setStatus] = useState('unpaid');
  const [formLineItems, setFormLineItems] = useState([{ item: '', amount: '', date: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLedgers();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    } else {
      setStudents([]);
      setSelectedStudent('');
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes');
    
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const { data } = await api.get(`/api/students?classId=${classId}`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load students');
    
    }
  };

  const handleAddLineItem = () => {
    setFormLineItems([...formLineItems, { item: '', amount: '', date: '' }]);
  };

  const handleLineItemChange = (index: number, field: string, value: string) => {
    const updated = [...formLineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    const updated = [...formLineItems];
    updated.splice(index, 1);
    setFormLineItems(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedStudent || !dueDate) {
      return showToast(`Title, ${t('student').toLowerCase()}, and due date are required`, 'error');
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/fees/ledger', {
        title,
        studentId: selectedStudent,
        dueDate,
        vatPercentage: vatPercentage || 0,
        discount: discount || 0,
        status,
        lineItems: formLineItems
      });
      showToast(`${t('student')} ledger created successfully!`, 'success');
      // Reset
      setTitle('');
      setSelectedStudent('');
      setSelectedClass('');
      setDueDate('');
      setVatPercentage('');
      setDiscount('');
      setFormLineItems([{ item: '', amount: '', date: '' }]);
      setIsCreateModalOpen(false);
      fetchLedgers();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create ledger', 'error');
    
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/fees/ledgers');
      setLedgers(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load ledgers', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const lineItems = selectedLedger?.lineItems || [];
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const ledgerVatPercentage = selectedLedger?.vatPercentage || 0;
  const ledgerVatAmount = subtotal * (ledgerVatPercentage / 100);
  const ledgerDiscount = selectedLedger?.discount || 0;
  const totalDue = subtotal + ledgerVatAmount - ledgerDiscount;

  return (
    <div className="portal-container">
      <div className="portal-page-header no-print">
        <div className="header-content">
          <h1>{t('student')} Ledgers</h1>
          <p>This is a ledger (a collection of financial accounts or a summary of purchased items) page. You can view, print, and download details.</p>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
            <i className="fas fa-file-invoice-dollar mr-2"></i> All {t('student')} Ledgers
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="portal-btn-primary"
              style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <i className="fas fa-plus"></i> CREATE LEDGER
            </button>
            <button 
              onClick={() => {
                const headers = ['Invoice No', 'Title', t('student') + ' Name', t('class'), 'Created Date', 'Due Date', 'VAT %', 'Discount', 'Status'];
                const rows = ledgers.map(l => [
                  `#${l.id.substring(0, 8).toUpperCase()}`,
                  l.description,
                  l.student?.name || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  `${l.vatPercentage}%`,
                  l.discount.toString(),
                  l.status
                ]);
                exportToCSV('Student_Ledgers', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Invoice No', 'Title', t('student') + ' Name', t('class'), 'Created Date', 'Due Date', 'VAT %', 'Discount', 'Status'];
                const rows = ledgers.map(l => [
                  `#${l.id.substring(0, 8).toUpperCase()}`,
                  l.description,
                  l.student?.name || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  `${l.vatPercentage}%`,
                  l.discount.toString(),
                  l.status
                ]);
                exportToWord('Student_Ledgers', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>INVOICE NO</th>
                <th>TITLE</th>
                <th>{t('student').toUpperCase()}</th>
                <th>DATES</th>
                <th>VAT %</th>
                <th>DISCOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                </tr>
              ) : ledgers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>No ledgers found</td>
                </tr>
              ) : (
                ledgers.map(ledger => (
                  <tr key={ledger.id}>
                    <td style={{ fontWeight: 900 }}>#{ledger.id.substring(0, 8).toUpperCase()}</td>
                    <td>{ledger.description}</td>
                    <td>
                      <div style={{ fontWeight: 900 }}>{ledger.student?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ledger.student?.class?.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>Created: {new Date(ledger.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--portal-danger)' }}>Due: {new Date(ledger.dueDate).toLocaleDateString()}</div>
                    </td>
                    <td>{ledger.vatPercentage}%</td>
                    <td>{formatCurrency(ledger.discount)}</td>
                    <td>
                      <span className={`status-badge ${ledger.status === 'paid' ? 'status-paid' : ledger.status === 'partial' ? 'status-partial' : 'status-unpaid'}`}>
                        {ledger.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => { setSelectedLedger(ledger); setIsModalOpen(true); }}
                        className="portal-btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px' }}
                      >
                        <i className="fas fa-eye mr-2"></i> View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedLedger && (
        <div className="portal-modal-overlay no-print" onClick={() => setIsModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200 printable-area" 
            style={{ maxWidth: '800px', width: '90%', padding: '32px', position: 'relative', background: 'white', color: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Controls (No Print) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }} className="no-print">
              <button 
                onClick={() => window.print()} 
                className="portal-btn-primary" 
                style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <i className="fas fa-print"></i> PRINT INVOICE
              </button>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="portal-btn-ghost" 
                style={{ padding: '8px 16px', fontWeight: 800 }}
              >
                <i className="fas fa-times mr-2"></i> Close
              </button>
            </div>

            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#1d4ed8' }}>
                  {user?.schoolName || 'ACADEX Academy'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>
                  Official Ledger Statement / Invoice
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`status-badge ${selectedLedger.status === 'paid' ? 'status-paid' : selectedLedger.status === 'partial' ? 'status-partial' : 'status-unpaid'}`} style={{ fontSize: '1rem', padding: '6px 20px' }}>
                  {selectedLedger.status.toUpperCase()}
                </span>
                <div style={{ marginTop: '8px', fontWeight: 900, fontSize: '1.1rem' }}>
                  #{selectedLedger.id.substring(0, 8).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>Billed To:</h4>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e293b' }}>{selectedLedger.student?.name}</div>
                <div style={{ fontSize: '0.95rem', color: '#475569', marginTop: '4px', fontWeight: 700 }}>
                  {t('class')}: {selectedLedger.student?.class?.name || 'Unassigned'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>Invoice Details:</h4>
                <div style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 700 }}>
                  <strong>Date Issued:</strong> {new Date(selectedLedger.createdAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--portal-danger)', marginTop: '6px', fontWeight: 700 }}>
                  <strong>Due Date:</strong> {new Date(selectedLedger.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ledger Title / Context:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>{selectedLedger.description}</div>
            </div>

            {/* Line Items Table */}
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>Statement Items:</h4>
            <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 900 }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 900 }}>Transaction Date</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 900 }}>Debit Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 900 }}>{item.item}</td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{new Date(item.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 900 }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Gross Subtotal:</span>
                  <span style={{ fontWeight: 900, color: '#1e293b' }}>{formatCurrency(subtotal)}</span>
                </div>
                {ledgerVatPercentage > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>VAT ({ledgerVatPercentage}%):</span>
                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{formatCurrency(ledgerVatAmount)}</span>
                  </div>
                )}
                {ledgerDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#dc2626' }}>
                    <span style={{ fontWeight: 700 }}>Discount Applied:</span>
                    <span style={{ fontWeight: 900 }}>-{formatCurrency(ledgerDiscount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 900, color: '#1e293b' }}>Balance Due:</span>
                  <span style={{ fontWeight: 900, color: '#059669' }}>{formatCurrency(totalDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="portal-modal-overlay no-print" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: '800px', width: '90%', padding: '24px', position: 'relative', background: 'white', color: '#1e293b', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                Create {t('student')} Ledger
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="portal-label">Title <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">{t('class')} <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} required>
                    <option value="">Select a {t('class').toLowerCase()}</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">{t('student')} <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass} required>
                    <option value="">Select a {t('class').toLowerCase()} first</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div className="form-group">
                  <label className="portal-label">Due Date <span style={{color:'red'}}>*</span></label>
                  <input type="date" className="portal-input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Vat Percentage</label>
                  <input type="number" className="portal-input" value={vatPercentage} onChange={e => setVatPercentage(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label className="portal-label">Discount</label>
                  <input type="number" className="portal-input" value={discount} onChange={e => setDiscount(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label className="portal-label">Status <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={status} onChange={e => setStatus(e.target.value)} required>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#e0f2fe', padding: '12px 16px', borderRadius: '8px', color: '#0369a1', marginBottom: '24px', fontSize: '0.9rem' }}>
                When your account is debited, money is taken out of the account. The opposite of a debit is a credit.
              </div>

              <div style={{ marginBottom: '24px' }}>
                {formLineItems.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
                    <input type="text" className="portal-input" placeholder="Item" value={item.item} onChange={e => handleLineItemChange(index, 'item', e.target.value)} required />
                    <input type="number" className="portal-input" placeholder="Debit Amount" value={item.amount} onChange={e => handleLineItemChange(index, 'amount', e.target.value)} min="0" step="0.01" required />
                    <input type="date" className="portal-input" value={item.date} onChange={e => handleLineItemChange(index, 'date', e.target.value)} required />
                    {index === 0 ? (
                      <button type="button" onClick={handleAddLineItem} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', width: '36px', height: '36px', cursor: 'pointer' }}>
                        <i className="fas fa-plus"></i>
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleRemoveLineItem(index)} style={{ background: 'var(--portal-danger)', color: 'white', border: 'none', borderRadius: '4px', width: '36px', height: '36px', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="portal-btn-ghost" style={{ padding: '10px 20px', fontWeight: 800 }}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={isSubmitting} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  {isSubmitting ? 'SAVING...' : 'SAVE LEDGER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
