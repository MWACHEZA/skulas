import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
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
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 10pt; }
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
  student: { name: string; studentId?: string; class?: { name: string } };
  dueDate: string;
  discount: number;
  status: string;
  createdAt: string;
  lineItems: LedgerItem[];
}

export default function StudentLedgersPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/fees/ledgers');
      setLedgers(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load student financial ledgers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCleanInvoiceNo = (l: Ledger) => {
    const match = l.description?.match(/\[(INV-[^\]]+)\]/);
    if (match) return match[1];
    const year = new Date(l.createdAt).getFullYear();
    return `INV-${year}-${l.id.substring(0, 5).toUpperCase()}`;
  };

  const filteredLedgers = ledgers.filter(l => {
    const nameMatch = (l.student?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCleanInvoiceNo(l).toLowerCase().includes(searchQuery.toLowerCase());
    const classMatch = filterClass === 'ALL' || (l.student?.class?.name || '').includes(filterClass);
    return nameMatch && classMatch;
  });

  const uniqueClasses = Array.from(new Set(ledgers.map(l => l.student?.class?.name).filter(Boolean)));

  const lineItems = selectedLedger?.lineItems || [];
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const ledgerDiscount = selectedLedger?.discount || 0;
  const totalDue = Math.max(0, subtotal - ledgerDiscount);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header no-print" style={{ marginBottom: 24 }}>
        <div className="header-content">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-book-reader" style={{ color: 'var(--school-primary, #2563eb)' }} />
            {t('student')} Financial Ledgers & Statements
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            View-only audit ledger of student tuition debits, development levies, scholarships/discounts, and running statement balances (statutory educational VAT exempt).
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 400px' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
            <input
              type="text"
              className="portal-input"
              style={{ width: '100%', paddingLeft: 38 }}
              placeholder={`Search by ${t('student').toLowerCase()} name, reference, or invoice...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="portal-input"
            style={{ width: 180 }}
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
          >
            <option value="ALL">All Classes / Forms</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const headers = ['Invoice Reference', 'Description', t('student') + ' Name', t('class'), 'Billed Date', 'Due Date', 'Gross Amount', 'Discount', 'Net Total', 'Status'];
              const rows = filteredLedgers.map(l => {
                const itemsSum = (l.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                return [
                  getCleanInvoiceNo(l),
                  l.description || 'Tuition & Levies',
                  l.student?.name || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  itemsSum.toFixed(2),
                  (l.discount || 0).toFixed(2),
                  Math.max(0, itemsSum - (l.discount || 0)).toFixed(2),
                  l.status
                ];
              });
              exportToCSV('Student_Financial_Ledgers', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-csv mr-1" /> Export CSV
          </button>

          <button
            onClick={() => {
              const headers = ['Invoice Reference', 'Description', t('student') + ' Name', t('class'), 'Billed Date', 'Due Date', 'Gross Amount', 'Discount', 'Net Total', 'Status'];
              const rows = filteredLedgers.map(l => {
                const itemsSum = (l.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                return [
                  getCleanInvoiceNo(l),
                  l.description || 'Tuition & Levies',
                  l.student?.name || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  itemsSum.toFixed(2),
                  (l.discount || 0).toFixed(2),
                  Math.max(0, itemsSum - (l.discount || 0)).toFixed(2),
                  l.status
                ];
              });
              exportToWord('Student_Financial_Ledgers', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-word mr-1" /> Export Word
          </button>

          <button
            onClick={() => window.print()}
            className="portal-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-print mr-1" /> Print
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '14px 18px' }}>INVOICE REFERENCE</th>
              <th style={{ padding: '14px 18px' }}>DESCRIPTION</th>
              <th style={{ padding: '14px 18px' }}>{t('student').toUpperCase()} NAME</th>
              <th style={{ padding: '14px 18px' }}>SCHEDULE DATES</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>GROSS BILLED</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>DISCOUNT</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>NET DUE</th>
              <th style={{ padding: '14px 18px' }}>STATUS</th>
              <th style={{ padding: '14px 18px', textAlign: 'center' }}>STATEMENT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Loading financial ledgers...
                </td>
              </tr>
            ) : filteredLedgers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                  No student ledger accounts found.
                </td>
              </tr>
            ) : (
              filteredLedgers.map(ledger => {
                const itemsSum = (ledger.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                const discount = ledger.discount || 0;
                const net = Math.max(0, itemsSum - discount);
                const invoiceNo = getCleanInvoiceNo(ledger);

                return (
                  <tr key={ledger.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#2563eb' }}>
                      {invoiceNo}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#1e293b' }}>
                      {ledger.description || 'Term Tuition & Statutory Levies'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{ledger.student?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ledger.student?.class?.name || 'Unassigned'}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                      <div>Issued: {new Date(ledger.createdAt).toLocaleDateString()}</div>
                      <div style={{ color: '#dc2626' }}>Due: {new Date(ledger.dueDate).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(itemsSum)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', color: discount > 0 ? '#dc2626' : '#94a3b8' }}>
                      {discount > 0 ? `-${formatCurrency(discount)}` : '$0.00'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {formatCurrency(net)}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        background: ledger.status === 'paid' ? '#dcfce7' : ledger.status === 'partial' ? '#fef3c7' : '#fee2e2',
                        color: ledger.status === 'paid' ? '#166534' : ledger.status === 'partial' ? '#92400e' : '#b91c1c'
                      }}>
                        {ledger.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button
                        onClick={() => { setSelectedLedger(ledger); setIsModalOpen(true); }}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <i className="fas fa-file-invoice" /> View Statement
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View-Only Statement Modal Drilldown */}
      {isModalOpen && selectedLedger && (
        <div
          className="portal-modal-overlay"
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, maxWidth: 720, width: '100%', padding: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem' }}>
                  {getCleanInvoiceNo(selectedLedger)}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
                  {selectedLedger.student?.name}
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Class: <strong>{selectedLedger.student?.class?.name || 'Unassigned'}</strong> &bull; Due Date: <strong>{new Date(selectedLedger.dueDate).toLocaleDateString()}</strong>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                Itemized Tuition & Fee Allocations (VAT Exempt)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>Item Description</th>
                    <th style={{ padding: '10px 14px' }}>Assessment Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                        Single Tuition Package: {selectedLedger.description || 'Standard Term Fees'}
                      </td>
                    </tr>
                  ) : (
                    lineItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{item.item}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(item.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
                  <span>Gross Tuition & Fees:</span>
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(subtotal)}</strong>
                </div>
                {ledgerDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#dc2626' }}>
                    <span>Scholarship / Discount:</span>
                    <strong>-{formatCurrency(ledgerDiscount)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Value Added Tax (VAT):</span>
                  <span>Exempt (0%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#059669', borderTop: '2px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                  <span>Net Due:</span>
                  <span>{formatCurrency(totalDue)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }} className="no-print">
              <button onClick={() => window.print()} className="portal-btn-secondary" style={{ padding: '8px 16px' }}>
                <i className="fas fa-print mr-1" /> Print Statement
              </button>
              <button onClick={() => setIsModalOpen(false)} className="portal-btn-primary" style={{ padding: '8px 20px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
