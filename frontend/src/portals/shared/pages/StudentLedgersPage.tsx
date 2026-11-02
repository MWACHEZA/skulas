import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../../components/shared/Pagination';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

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
        th { background-color: #f2f2f2; font-weight: bold; }
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
  studentId?: string;
  studentName?: string;
  student?: { id?: string; studentId?: string; name: string; class?: { name: string } | null };
  dueDate: string;
  discount: number;
  status: string;
  createdAt: string;
  amount?: number;
  totalBilled?: number;
  billed?: number;
  totalPaid?: number;
  paid?: number;
  balance?: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    return `LED-${year}-${l.id.substring(0, 5).toUpperCase()}`;
  };

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(l => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = (l.student?.name || l.studentName || '').toLowerCase();
      const desc = (l.description || '').toLowerCase();
      const invNo = getCleanInvoiceNo(l).toLowerCase();
      const studentId = (l.student?.studentId || l.studentId || '').toLowerCase();

      const nameMatch = !q || studentName.includes(q) || desc.includes(q) || invNo.includes(q) || studentId.includes(q);
      const classMatch = filterClass === 'ALL' || (l.student?.class?.name || '').includes(filterClass);
      return nameMatch && classMatch;
    });
  }, [ledgers, searchQuery, filterClass]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    ledgers.forEach(l => {
      if (l.student?.class?.name) set.add(l.student.class.name);
    });
    return Array.from(set).sort();
  }, [ledgers]);

  // Overall metrics
  const ledgerMetrics = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    ledgers.forEach(l => {
      const gross = l.amount ?? l.totalBilled ?? (l.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
      const discount = l.discount || 0;
      const net = Math.max(0, gross - discount);
      const paid = l.paid ?? l.totalPaid ?? 0;
      const bal = Math.max(0, net - paid);

      totalBilled += net;
      totalPaid += paid;
      totalBalance += bal;
    });

    const rate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    return { totalBilled, totalPaid, totalBalance, rate };
  }, [ledgers]);

  const lineItems = selectedLedger?.lineItems || [];
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const ledgerDiscount = selectedLedger?.discount || 0;
  const totalDue = Math.max(0, subtotal - ledgerDiscount);
  const ledgerPaid = selectedLedger?.paid ?? selectedLedger?.totalPaid ?? 0;
  const ledgerBal = Math.max(0, totalDue - ledgerPaid);

  return (
    <div className="portal-container" style={{ padding: '0 0 40px 0', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="portal-page-header no-print" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-book-open" />
            </span>
            Student Financial Ledgers & Running Statements
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Official audit ledgers: tuition debits, development levies, confirmed fee payments, and running statement balances.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLedgers}
          className="portal-btn-secondary"
          style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff' }}
          title="Refresh Ledgers"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
          <span>Sync Ledgers</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gross Ledger Debits</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {formatCurrency(ledgerMetrics.totalBilled)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            From <strong>{ledgers.length}</strong> active ledger accounts
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Ledger Receipts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
            {formatCurrency(ledgerMetrics.totalPaid)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            {ledgerMetrics.rate}% settled to date
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Outstanding Net Due</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48', marginTop: 8 }}>
            {formatCurrency(ledgerMetrics.totalBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: 4, fontWeight: 600 }}>
            Pending collection from guardians
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Financial Health</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {ledgerMetrics.rate}%
          </div>
          <div style={{ marginTop: 6, width: '100%', height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ledgerMetrics.rate)}%`, height: '100%', background: '#0284c7', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px 16px 0 0', padding: '18px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'none' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 400px' }}>
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8', fontSize: '0.85rem' }} />
            <input
              type="text"
              className="portal-input"
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 38, borderRadius: 10, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}
              placeholder={`Search student name, ID, or reference...`}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select
            className="portal-input"
            style={{ width: 180, height: 38, borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, border: '1px solid #cbd5e1', background: '#fff' }}
            value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Classes / Forms</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const headers = ['Invoice Reference', 'Description', 'Student Name', 'Class', 'Issued Date', 'Due Date', 'Gross Billed', 'Discount', 'Net Due', 'Paid', 'Balance', 'Status'];
              const rows = filteredLedgers.map(l => {
                const gross = l.amount ?? l.totalBilled ?? (l.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                const discount = l.discount || 0;
                const net = Math.max(0, gross - discount);
                const paid = l.paid ?? l.totalPaid ?? 0;
                const bal = Math.max(0, net - paid);
                return [
                  getCleanInvoiceNo(l),
                  l.description || 'Tuition & Levies',
                  l.student?.name || l.studentName || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  gross.toFixed(2),
                  discount.toFixed(2),
                  net.toFixed(2),
                  paid.toFixed(2),
                  bal.toFixed(2),
                  l.status
                ];
              });
              exportToCSV('Student_Financial_Ledgers', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
          >
            <i className="fas fa-file-csv" style={{ color: '#059669' }} /> Export CSV
          </button>

          <button
            onClick={() => {
              const headers = ['Invoice Reference', 'Description', 'Student Name', 'Class', 'Issued Date', 'Due Date', 'Gross Billed', 'Discount', 'Net Due', 'Paid', 'Balance', 'Status'];
              const rows = filteredLedgers.map(l => {
                const gross = l.amount ?? l.totalBilled ?? (l.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                const discount = l.discount || 0;
                const net = Math.max(0, gross - discount);
                const paid = l.paid ?? l.totalPaid ?? 0;
                const bal = Math.max(0, net - paid);
                return [
                  getCleanInvoiceNo(l),
                  l.description || 'Tuition & Levies',
                  l.student?.name || l.studentName || 'N/A',
                  l.student?.class?.name || 'Unassigned',
                  new Date(l.createdAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  formatCurrency(gross),
                  formatCurrency(discount),
                  formatCurrency(net),
                  formatCurrency(paid),
                  formatCurrency(bal),
                  l.status
                ];
              });
              exportToWord('Student_Financial_Ledgers', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
          >
            <i className="fas fa-file-word" style={{ color: '#2563eb' }} /> Export Word
          </button>

          <button
            onClick={() => window.print()}
            className="portal-btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff' }}
          >
            <i className="fas fa-print" style={{ color: '#475569' }} /> Print
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="table" rows={6} columns={8} />
          </div>
        ) : (
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 18px' }}>INVOICE REF</th>
                  <th style={{ padding: '14px 18px' }}>DESCRIPTION</th>
                  <th style={{ padding: '14px 18px' }}>STUDENT & CLASS</th>
                  <th style={{ padding: '14px 18px' }}>SCHEDULE DATES</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>GROSS BILLED</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>PAID</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>BALANCE</th>
                  <th style={{ padding: '14px 18px' }}>STATUS</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }} className="no-print">STATEMENT</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 22, background: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 10 }}>
                        <i className="fas fa-book-open" />
                      </div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>No student ledger accounts found</div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                        {searchQuery || filterClass !== 'ALL' ? 'Adjust your search query or filter.' : 'All billing invoices will automatically generate ledger accounts.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const indexOfLastItem = currentPage * itemsPerPage;
                    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                    const currentItems = filteredLedgers.slice(indexOfFirstItem, indexOfLastItem);
                    if (currentItems.length === 0 && filteredLedgers.length > 0) setCurrentPage(1);

                    return currentItems.map(ledger => {
                      const gross = ledger.amount ?? ledger.totalBilled ?? (ledger.lineItems || []).reduce((s, it) => s + (it.amount || 0), 0);
                      const discount = ledger.discount || 0;
                      const net = Math.max(0, gross - discount);
                      const paid = ledger.paid ?? ledger.totalPaid ?? 0;
                      const bal = Math.max(0, net - paid);
                      const invoiceNo = getCleanInvoiceNo(ledger);
                      const studentName = ledger.student?.name || ledger.studentName || 'Student';

                      return (
                        <tr key={ledger.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                            {invoiceNo}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#1e293b', fontWeight: 600 }}>
                            {ledger.description || 'Term Tuition & Statutory Levies'}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{studentName}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                              {ledger.student?.class?.name || 'Unassigned'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#475569' }}>
                            <div>Issued: {new Date(ledger.createdAt).toLocaleDateString()}</div>
                            <div style={{ color: '#dc2626', marginTop: 2 }}>Due: {new Date(ledger.dueDate).toLocaleDateString()}</div>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(gross)}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: paid > 0 ? '#16a34a' : '#94a3b8' }}>
                            {formatCurrency(paid)}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 900, color: bal > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(bal)}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              padding: '3px 9px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                              background: ledger.status === 'paid' ? '#ecfdf5' : ledger.status === 'partial' ? '#fffbeb' : '#fff1f2',
                              color: ledger.status === 'paid' ? '#065f46' : ledger.status === 'partial' ? '#92400e' : '#9f1239',
                              border: `1px solid ${ledger.status === 'paid' ? '#a7f3d0' : ledger.status === 'partial' ? '#fde68a' : '#fecdd3'}`
                            }}>
                              {ledger.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'center' }} className="no-print">
                            <button
                              onClick={() => { setSelectedLedger(ledger); setIsModalOpen(true); }}
                              style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-file-invoice" /> Statement
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredLedgers.length > 0 && !loading && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing <strong>{Math.min(filteredLedgers.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to <strong>{Math.min(filteredLedgers.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredLedgers.length}</strong> accounts
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLedgers.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => { setItemsPerPage(size); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* Statement Modal */}
      {isModalOpen && selectedLedger && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-file-invoice" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Student Statement Breakdown</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Reference: {getCleanInvoiceNo(selectedLedger)}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Student Name:</span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{selectedLedger.student?.name || selectedLedger.studentName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Class / Form:</span>
                  <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>{selectedLedger.student?.class?.name || 'General Cohort'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Effective Status:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: ledgerBal <= 0 ? '#16a34a' : '#dc2626' }}>
                    {selectedLedger.status}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Line Items & Statutory Debits</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length > 0 ? (
                        lineItems.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.item}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ padding: '10px 12px', color: '#1e293b' }}>{selectedLedger.description || 'Tuition & Development Fee'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(selectedLedger.amount || 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: '#0f172a', color: '#fff', padding: '16px 20px', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>Gross Subtotal:</span>
                  <span>{formatCurrency(subtotal || selectedLedger.amount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span style={{ color: '#4ade80' }}>Confirmed Paid:</span>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>{formatCurrency(ledgerPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: 8, marginTop: 8 }}>
                  <span style={{ fontWeight: 800 }}>RUNNING BALANCE:</span>
                  <span style={{ fontWeight: 900, fontSize: '1.25rem', color: ledgerBal > 0 ? '#f87171' : '#4ade80' }}>
                    {formatCurrency(ledgerBal)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="portal-btn-ghost"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 700 }}
              >
                Close
              </button>
              <button
                type="button"
                className="portal-btn-primary"
                onClick={() => window.print()}
                style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fas fa-print" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
