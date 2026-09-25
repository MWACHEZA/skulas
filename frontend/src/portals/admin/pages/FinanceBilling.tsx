import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

type BillingTab = 'invoices' | 'receipts' | 'ledgers';

export default function FinanceBilling() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const activeTab = (searchParams.get('tab') as BillingTab) || 'invoices';
  const initialSearch = searchParams.get('search') || '';

  // Data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invoices') {
        const { data } = await api.get('/api/fees/invoices');
        setInvoices(Array.isArray(data) ? data : data.invoices || []);
      } else if (activeTab === 'receipts') {
        const { data } = await api.get('/api/fees/payments');
        setReceipts(Array.isArray(data) ? data : data.payments || []);
      } else if (activeTab === 'ledgers') {
        const { data } = await api.get('/api/fees/ledgers');
        setLedgers(Array.isArray(data) ? data : data.ledgers || []);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
      // Fallback empty array so UI still renders safely
      if (activeTab === 'invoices') setInvoices([]);
      else if (activeTab === 'receipts') setReceipts([]);
      else setLedgers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: BillingTab) => {
    setSearchParams({ tab, search: searchTerm });
  };

  // Filtered datasets
  const filteredInvoices = invoices.filter(inv => {
    const studentName = inv.student?.user?.name || inv.student?.name || '';
    const studentId = inv.student?.studentId || '';
    const invId = inv.id || inv.invoiceNumber || '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (inv.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReceipts = receipts.filter(rec => {
    const studentName = rec.student?.user?.name || rec.student?.name || '';
    const studentId = rec.student?.studentId || '';
    const ref = rec.reference || rec.receiptNumber || '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ref.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || (rec.paymentMode || rec.method || '').toLowerCase().includes(methodFilter.toLowerCase());
    return matchesSearch && matchesMethod;
  });

  const filteredLedgers = ledgers.filter(led => {
    const studentName = led.studentName || led.name || '';
    const studentId = led.studentId || '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          studentId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Fees Billing & Ledger Transactions</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Unified audit desk: query student invoices, confirmed receipts, and ledger statements in one view.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-primary" onClick={() => showToast('Feature to emit invoices is active under Billing Engine', 'info')}>
            <i className="fas fa-file-invoice-dollar mr-2"></i>Emit Fee Invoice
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {[
          { id: 'invoices', label: 'Invoices & Demands', icon: 'fas fa-file-invoice' },
          { id: 'receipts', label: 'Receipts & Paid Funds', icon: 'fas fa-check-circle' },
          { id: 'ledgers', label: 'Student Balance Ledgers', icon: 'fas fa-book-reader' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as BillingTab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & Cross-Cutting Filters */}
      <div className="portal-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 450 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }}></i>
            <input
              type="text"
              placeholder="Search by student name, ID, or receipt/invoice ref..."
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {activeTab === 'invoices' && (
              <select
                className="portal-input"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            )}

            {activeTab === 'receipts' && (
              <select
                className="portal-input"
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="ALL">All Payment Methods</option>
                <option value="cash">USD Cash</option>
                <option value="zig">ZiG / Local</option>
                <option value="paynow">Paynow</option>
                <option value="ecocash">EcoCash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            )}

            <button className="portal-btn-ghost" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMethodFilter('ALL'); }}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="portal-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: 12 }}></i>
            <p>Loading financial transactions...</p>
          </div>
        ) : (
          <>
            {/* View 1: Invoices */}
            {activeTab === 'invoices' && (
              <div className="portal-card-body portal-card-body-flat">
                {filteredInvoices.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No invoices matching query criteria.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Invoice Ref</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Due Date</th>
                        <th>Billed Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv, idx) => {
                        const bal = (inv.amount || 0) - (inv.paid || 0);
                        return (
                          <tr key={inv.id || idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoiceNumber || inv.id?.slice(0, 8)}</td>
                            <td>
                              <strong>{inv.student?.user?.name || inv.student?.name || 'Student'}</strong>
                              <br /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.student?.studentId}</span>
                            </td>
                            <td>{inv.student?.class?.name || 'Class'}</td>
                            <td style={{ color: '#64748b' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                            <td style={{ fontWeight: 700 }}>{formatCurrency(inv.amount || 0)}</td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(inv.paid || 0)}</td>
                            <td style={{ color: bal > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>{formatCurrency(bal)}</td>
                            <td>
                              <span className={`portal-badge ${bal <= 0 ? 'success' : inv.paid > 0 ? 'warning' : 'danger'}`}>
                                {bal <= 0 ? 'PAID' : inv.paid > 0 ? 'PARTIAL' : 'UNPAID'}
                              </span>
                            </td>
                            <td>
                              <Link to={`/admin/students/${inv.studentId || inv.student?.id}?tab=fees`} className="portal-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                View Ledger
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* View 2: Receipts / Payments */}
            {activeTab === 'receipts' && (
              <div className="portal-card-body portal-card-body-flat">
                {filteredReceipts.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No receipts recorded matching search.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Receipt # / Ref</th>
                        <th>Student</th>
                        <th>Payment Date</th>
                        <th>Amount Received</th>
                        <th>Method / Channel</th>
                        <th>Cashier / Collector</th>
                        <th>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceipts.map((rec, idx) => (
                        <tr key={rec.id || idx}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                            {rec.reference || rec.receiptNumber || `REC-${idx + 1000}`}
                          </td>
                          <td>
                            <strong>{rec.student?.user?.name || rec.student?.name || 'Student'}</strong>
                            <br /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.student?.studentId}</span>
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {rec.date ? new Date(rec.date).toLocaleDateString() : rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Today'}
                          </td>
                          <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                            {formatCurrency(rec.amount || 0)}
                          </td>
                          <td>
                            <span className="portal-badge info">
                              {rec.paymentMode || rec.method || 'Cash / Deposit'}
                            </span>
                          </td>
                          <td style={{ color: '#64748b' }}>{rec.recordedBy || 'Bursar Office'}</td>
                          <td>
                            <span className="portal-badge success">
                              <i className="fas fa-check-circle mr-1"></i>Settled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* View 3: Student Balance Ledgers */}
            {activeTab === 'ledgers' && (
              <div className="portal-card-body portal-card-body-flat">
                {filteredLedgers.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No student ledger accounts found.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Class / Grade</th>
                        <th>Total Billed</th>
                        <th>Total Settled</th>
                        <th>Current Arrears</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgers.map((led, idx) => {
                        const bal = (led.totalBilled || 0) - (led.totalPaid || 0);
                        return (
                          <tr key={led.studentId || idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{led.studentId}</td>
                            <td><strong>{led.studentName || led.name}</strong></td>
                            <td>{led.className || 'Class'}</td>
                            <td>{formatCurrency(led.totalBilled || 0)}</td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(led.totalPaid || 0)}</td>
                            <td style={{ color: bal > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>
                              {formatCurrency(bal)}
                            </td>
                            <td>
                              <Link to={`/admin/students/${led.studentId || led.id}?tab=fees`} className="portal-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                View Statement
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
