import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { SearchInput, ExportButton } from '../../../components/shared';
import type { ExportColumn } from '../../../utils/exportService';
import '../../../styles/portal.css';

type BillingTab = 'invoices' | 'receipts' | 'ledgers';

export default function FinanceBilling() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const subtabParam = searchParams.get('subtab') as BillingTab | null;
  const tabParam = searchParams.get('tab');
  const activeTab: BillingTab = (subtabParam && ['invoices', 'receipts', 'ledgers'].includes(subtabParam))
    ? subtabParam
    : (tabParam && ['invoices', 'receipts', 'ledgers'].includes(tabParam) ? tabParam as BillingTab : 'invoices');
  const initialSearch = searchParams.get('search') || '';

  // Data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Emit Invoice Modal State
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [feeGroups, setFeeGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedFeeGroupId, setSelectedFeeGroupId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [description, setDescription] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'billing');
    next.set('subtab', tab);
    if (searchTerm) next.set('search', searchTerm);
    setSearchParams(next);
  };

  const openEmitModal = async () => {
    setShowEmitModal(true);
    try {
      const [groupsRes, studentsRes] = await Promise.all([
        api.get('/api/fees/groups'),
        api.get('/api/fees/students-list')
      ]);
      const grps = Array.isArray(groupsRes.data) ? groupsRes.data : groupsRes.data.groups || [];
      const stds = Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data.students || [];
      setFeeGroups(grps);
      setStudents(stds);
      if (grps.length > 0) {
        setSelectedFeeGroupId(grps[0].id);
        setCustomAmount(String(grps[0].amount || ''));
      }
      if (stds.length > 0) {
        setSelectedStudentId(stds[0].id);
      }
    } catch (err) {
      console.error('Failed to load fee groups or students:', err);
      showToast('Could not load fee groups or student list', 'error');
    }
  };

  const handleFeeGroupSelect = (groupId: string) => {
    setSelectedFeeGroupId(groupId);
    const grp = feeGroups.find(g => g.id === groupId);
    if (grp) {
      setCustomAmount(String(grp.amount || ''));
    }
  };

  const handleEmitInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeGroupId || !selectedStudentId || !customAmount) {
      showToast('Please select a fee group, student, and specify an amount', 'error');
      return;
    }
    setSubmittingInvoice(true);
    try {
      await api.post('/api/fees/invoice/custom', {
        feeGroupId: selectedFeeGroupId,
        studentIds: [selectedStudentId],
        customAmount: parseFloat(customAmount),
        dueDate: dueDate || undefined,
        discount: parseFloat(discount) || 0,
        description: description || undefined,
        paymentStatus: 'unpaid'
      });
      showToast('Fee invoice emitted successfully!', 'success');
      setShowEmitModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to emit invoice:', err);
      showToast(err.response?.data?.error || 'Failed to emit invoice', 'error');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Filtered datasets with debounced search
  const q = (debouncedSearch || '').trim().toLowerCase();

  const filteredInvoices = invoices.filter(inv => {
    const studentName = (inv.student?.user?.name || inv.student?.name || '').toLowerCase();
    const studentId = (inv.student?.studentId || '').toLowerCase();
    const invId = (inv.id || inv.invoiceNumber || '').toLowerCase();
    const matchesSearch = !q || studentName.includes(q) || studentId.includes(q) || invId.includes(q);
    const matchesStatus = statusFilter === 'ALL' || (inv.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReceipts = receipts.filter(rec => {
    const studentName = (rec.student?.user?.name || rec.student?.name || '').toLowerCase();
    const studentId = (rec.student?.studentId || '').toLowerCase();
    const ref = (rec.reference || rec.receiptNumber || '').toLowerCase();
    const matchesSearch = !q || studentName.includes(q) || studentId.includes(q) || ref.includes(q);
    const matchesMethod = methodFilter === 'ALL' || (rec.paymentMode || rec.method || '').toLowerCase().includes(methodFilter.toLowerCase());
    return matchesSearch && matchesMethod;
  });

  const filteredLedgers = ledgers.filter(led => {
    const studentName = (led.studentName || led.name || '').toLowerCase();
    const studentId = (led.studentId || '').toLowerCase();
    const matchesSearch = !q || studentName.includes(q) || studentId.includes(q);
    return matchesSearch;
  });

  // Export Columns
  const invoiceExportColumns: ExportColumn[] = useMemo(() => [
    { header: 'Invoice Number', formatter: inv => inv.invoiceNumber || inv.id?.slice(0, 8) },
    { header: 'Student Name', formatter: inv => inv.student?.user?.name || inv.student?.name || 'Student' },
    { header: 'Student ID', formatter: inv => inv.student?.studentId || '—' },
    { header: 'Class', formatter: inv => inv.student?.class?.name || '—' },
    { header: 'Due Date', formatter: inv => inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—' },
    { header: 'Billed Amount', formatter: inv => formatCurrency(inv.amount || 0) },
    { header: 'Amount Paid', formatter: inv => formatCurrency(inv.paid || 0) },
    { header: 'Balance Due', formatter: inv => formatCurrency((inv.amount || 0) - (inv.paid || 0)) },
    { header: 'Status', formatter: inv => (inv.status || ((inv.amount || 0) - (inv.paid || 0) <= 0 ? 'PAID' : (inv.paid || 0) > 0 ? 'PARTIAL' : 'UNPAID')).toUpperCase() },
  ], []);

  const receiptExportColumns: ExportColumn[] = useMemo(() => [
    { header: 'Receipt / Ref #', formatter: rec => rec.reference || rec.receiptNumber || '—' },
    { header: 'Student Name', formatter: rec => rec.student?.user?.name || rec.student?.name || 'Student' },
    { header: 'Student ID', formatter: rec => rec.student?.studentId || '—' },
    { header: 'Payment Date', formatter: rec => rec.date ? new Date(rec.date).toLocaleDateString() : rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : '—' },
    { header: 'Amount Received', formatter: rec => formatCurrency(rec.amount || 0) },
    { header: 'Payment Method', formatter: rec => rec.paymentMode || rec.method || 'Cash / Deposit' },
    { header: 'Cashier / Recorded By', formatter: rec => rec.recordedBy || 'Bursar Office' },
  ], []);

  const ledgerExportColumns: ExportColumn[] = useMemo(() => [
    { header: 'Student ID / STN', formatter: led => led.studentId || '—' },
    { header: 'Student Name', formatter: led => led.studentName || led.name || 'Student' },
    { header: 'Class', formatter: led => led.className || led.class?.name || '—' },
    { header: 'Total Invoiced', formatter: led => formatCurrency(led.totalInvoiced || led.billed || 0) },
    { header: 'Total Paid', formatter: led => formatCurrency(led.totalPaid || led.paid || 0) },
    { header: 'Current Balance', formatter: led => formatCurrency(led.balance || ((led.totalInvoiced || 0) - (led.totalPaid || 0))) },
  ], []);

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
          <button className="portal-btn-primary" onClick={openEmitModal}>
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
          <div style={{ flex: '1 1 280px', maxWidth: 450 }}>
            <SearchInput
              placeholder="Search by student name, ID, or receipt/invoice ref..."
              value={searchTerm}
              onChange={setSearchTerm}
              loading={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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

            {(searchTerm || statusFilter !== 'ALL' || methodFilter !== 'ALL') && (
              <button
                type="button"
                className="portal-btn-ghost"
                onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMethodFilter('ALL'); }}
              >
                Reset Filters
              </button>
            )}

            {activeTab === 'invoices' && (
              <ExportButton
                filename="fee_invoices_report"
                title="Student Fee Invoices Report"
                subtitle={`Filtered: ${filteredInvoices.length} of ${invoices.length} records`}
                columns={invoiceExportColumns}
                data={filteredInvoices}
                orientation="landscape"
              />
            )}
            {activeTab === 'receipts' && (
              <ExportButton
                filename="fee_receipts_report"
                title="Fee Payment Receipts Audit Report"
                subtitle={`Filtered: ${filteredReceipts.length} of ${receipts.length} records`}
                columns={receiptExportColumns}
                data={filteredReceipts}
                orientation="landscape"
              />
            )}
            {activeTab === 'ledgers' && (
              <ExportButton
                filename="student_ledgers_report"
                title="Student Balance Ledgers Report"
                subtitle={`Filtered: ${filteredLedgers.length} of ${ledgers.length} accounts`}
                columns={ledgerExportColumns}
                data={filteredLedgers}
                orientation="portrait"
              />
            )}
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
      {showEmitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, maxWidth: 520, width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                <i className="fas fa-file-invoice-dollar mr-2" style={{ color: '#2563eb' }}></i>
                Emit Custom Fee Invoice
              </h3>
              <button
                type="button"
                onClick={() => setShowEmitModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEmitInvoiceSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                  Fee Group / Vote Item *
                </label>
                <select
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={selectedFeeGroupId}
                  onChange={e => handleFeeGroupSelect(e.target.value)}
                  required
                >
                  {feeGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({formatCurrency(g.amount || 0)}) - {g.billingType || 'Term'} {g.year || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                  Target Student *
                </label>
                <select
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.studentId}) {s.class?.name ? `- ${s.class.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                    Custom Amount (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                    Discount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                  Payment Due Date
                </label>
                <input
                  type="date"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#334155' }}>
                  Description / Billing Notes
                </label>
                <input
                  type="text"
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Special term charge or approved waiver"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="portal-btn-ghost"
                  onClick={() => setShowEmitModal(false)}
                  disabled={submittingInvoice}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={submittingInvoice}
                >
                  {submittingInvoice ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>Emitting...
                    </>
                  ) : (
                    'Emit Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
