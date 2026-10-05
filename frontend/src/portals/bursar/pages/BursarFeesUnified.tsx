import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeesBillingPage from '../../shared/pages/FeesBillingPage';
import ManageInvoicesPage from '../../shared/pages/ManageInvoicesPage';
import StudentLedgersPage from '../../shared/pages/StudentLedgersPage';
import BulkInvoicesPage from '../../shared/pages/BulkInvoicesPage';
import { useToast } from '../../../context/ToastContext';

export type BursarFeesTab = 'billing' | 'collection' | 'invoices' | 'ledgers' | 'bulk-invoices' | 'defaulters';

interface DefaulterRecord {
  id: string;
  studentId: string;
  name: string;
  form: string;
  boarding: 'Boarder' | 'Day';
  totalBilled: number;
  totalPaid: number;
  balance: number;
  daysOverdue: number;
  status: 'Current' | '30 Days' | '60 Days' | '90+ Days';
  guardianPhone: string;
  examBlocked: boolean;
}

export default function BursarFeesUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as BursarFeesTab) || 'billing';
  const [activeTab, setActiveTab] = useState<BursarFeesTab>(currentTab);
  const { showToast } = useToast();

  // -------------------------------------------------------------
  // TAB: Daily Rapid Collection State
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'ZiG' | 'ZAR'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'EcoCash' | 'Bank Transfer' | 'POS Swipe'>('Cash');
  const [referenceCode, setReferenceCode] = useState('');
  const [sendSmsReceipt, setSendSmsReceipt] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(26.5); // USD to ZiG rate
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Sample students database for instant keyboard-friendly search
  const studentDatabase = [
    { id: 'ST-001', name: 'Tanaka Ndlovu', form: 'Form 3A', boarding: 'Boarder', billed: 950, paid: 600, balance: 350, parentPhone: '+263771123456' },
    { id: 'ST-002', name: 'Ruvimbo Chitepo', form: 'Form 3A', boarding: 'Day', billed: 450, paid: 450, balance: 0, parentPhone: '+263772234567' },
    { id: 'ST-003', name: 'Blessing Sibanda', form: 'Form 3A', boarding: 'Boarder', billed: 950, paid: 200, balance: 750, parentPhone: '+263773345678' },
    { id: 'ST-004', name: 'Tadiwa Mutasa', form: 'Form 4B', boarding: 'Boarder', billed: 1050, paid: 500, balance: 550, parentPhone: '+263774456789' },
    { id: 'ST-005', name: 'Farai Moyo', form: 'Form 2C', boarding: 'Day', billed: 450, paid: 150, balance: 300, parentPhone: '+263775567890' },
  ];

  const searchResults = searchQuery.trim().length > 1
    ? studentDatabase.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()) || s.form.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // -------------------------------------------------------------
  // TAB: Defaulters / Debtors Aging State
  // -------------------------------------------------------------
  const [defaulterFilterForm, setDefaulterFilterForm] = useState('ALL');
  const [defaulterFilterBoarding, setDefaulterFilterBoarding] = useState('ALL');
  const [defaulters, setDefaulters] = useState<DefaulterRecord[]>([
    { id: 'def-1', studentId: 'ST-003', name: 'Blessing Sibanda', form: 'Form 3A', boarding: 'Boarder', totalBilled: 950, totalPaid: 200, balance: 750, daysOverdue: 92, status: '90+ Days', guardianPhone: '+263773345678', examBlocked: false },
    { id: 'def-2', studentId: 'ST-004', name: 'Tadiwa Mutasa', form: 'Form 4B', boarding: 'Boarder', totalBilled: 1050, totalPaid: 500, balance: 550, daysOverdue: 64, status: '60 Days', guardianPhone: '+263774456789', examBlocked: false },
    { id: 'def-3', studentId: 'ST-001', name: 'Tanaka Ndlovu', form: 'Form 3A', boarding: 'Boarder', totalBilled: 950, totalPaid: 600, balance: 350, daysOverdue: 35, status: '30 Days', guardianPhone: '+263771123456', examBlocked: false },
    { id: 'def-4', studentId: 'ST-005', name: 'Farai Moyo', form: 'Form 2C', boarding: 'Day', totalBilled: 450, totalPaid: 150, balance: 300, daysOverdue: 14, status: 'Current', guardianPhone: '+263775567890', examBlocked: false },
  ]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as BursarFeesTab;
    if (tabParam && ['billing', 'collection', 'invoices', 'ledgers', 'bulk-invoices', 'defaulters'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: BursarFeesTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Payment Handler
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please search and select a student first', 'warning');
      return;
    }
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setProcessingPayment(true);
    setTimeout(() => {
      // Calculate base USD equivalent
      const baseUSD = paymentCurrency === 'ZiG' ? Number((amt / exchangeRate).toFixed(2)) : amt;
      const receiptNo = `RCPT-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const receipt = {
        receiptNo,
        studentName: selectedStudent.name,
        studentId: selectedStudent.id,
        form: selectedStudent.form,
        amountPaid: amt,
        currency: paymentCurrency,
        baseUSD,
        method: paymentMethod,
        reference: referenceCode || 'CASH-TILL-1',
        newBalance: Math.max(0, selectedStudent.balance - baseUSD),
        timestamp: new Date().toLocaleString(),
        smsSent: sendSmsReceipt
      };

      setLastReceipt(receipt);
      setProcessingPayment(false);
      showToast(`Payment processed: ${receiptNo} for ${selectedStudent.name}. ${sendSmsReceipt ? 'SMS dispatch confirmed.' : ''}`, 'success');
      setPaymentAmount('');
      setReferenceCode('');
    }, 800);
  };

  // Defaulters Bulk Actions
  const handleBroadcastDefaultersSms = () => {
    showToast(`Dispatched overdue fee warning SMS to ${filteredDefaulters.length} parents via gateway`, 'success');
  };

  const handleGenerateDemandLetters = () => {
    showToast(`Generated batch Letter of Demand PDF for ${filteredDefaulters.length} accounts`, 'info');
  };

  const handleToggleExamBlock = (id: string) => {
    setDefaulters(defaulters.map(d => d.id === id ? { ...d, examBlocked: !d.examBlocked } : d));
    showToast('Exam clearance permit status updated', 'info');
  };

  const filteredDefaulters = defaulters.filter(d => {
    const matchForm = defaulterFilterForm === 'ALL' || d.form.includes(defaulterFilterForm);
    const matchBoarding = defaulterFilterBoarding === 'ALL' || d.boarding === defaulterFilterBoarding;
    return matchForm && matchBoarding;
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Bursar Fees & Revenue Center
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Fee structures, rapid counter cash collections, multi-currency invoicing, student ledgers, and debtors aging enforcement.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('collection')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'collection' ? 700 : 500,
            color: activeTab === 'collection' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'collection' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-cash-register" />
          Daily Counter Collection
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('billing')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'billing' ? 700 : 500,
            color: activeTab === 'billing' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'billing' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-receipt" />
          Fee Billing & Structures
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('invoices')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'invoices' ? 700 : 500,
            color: activeTab === 'invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-file-invoice" />
          Invoices & Receipts
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ledgers')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'ledgers' ? 700 : 500,
            color: activeTab === 'ledgers' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'ledgers' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-book-open" />
          Student Statements & Ledgers
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bulk-invoices')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'bulk-invoices' ? 700 : 500,
            color: activeTab === 'bulk-invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'bulk-invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-mail-bulk" />
          Term Bulk Invoicing
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('defaulters')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'defaulters' ? 700 : 500,
            color: activeTab === 'defaulters' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'defaulters' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-user-clock" />
          Debtors Aging & Defaulters ({defaulters.length})
        </button>
      </div>

      {/* Tab 1: Daily Rapid Collection UI */}
      {activeTab === 'collection' && (
        <div className="portal-grid-2" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Collection Terminal Card */}
          <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                <i className="fas fa-receipt mr-2" style={{ color: '#0284c7' }} />
                Counter Fee Cashier Terminal
              </h2>
              <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                Daily Exchange Rate: <strong>1 USD = {exchangeRate} ZiG</strong>
              </div>
            </div>

            {/* Fast Student Search */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Student Lookup (ID, Name, or Cohort)
              </label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <input
                  type="text"
                  autoFocus
                  className="portal-input"
                  style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '0.95rem', fontWeight: 600 }}
                  placeholder="Type student name (e.g. Tanaka) or ID (ST-001)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
              </div>

              {searchResults.length > 0 && (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 6, background: '#fff', maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery('');
                      }}
                      style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <div>
                        <strong>{s.name}</strong> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({s.id} &bull; {s.form})</span>
                      </div>
                      <span className={`portal-badge ${s.balance > 0 ? 'danger' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                        Owing: ${s.balance}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Ledger Overview */}
            {selectedStudent ? (
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{selectedStudent.name}</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                      {selectedStudent.id} &bull; {selectedStudent.form} &bull; <span className="portal-badge info">{selectedStudent.boarding}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Outstanding Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedStudent.balance > 0 ? '#b91c1c' : '#15803d' }}>
                      ${selectedStudent.balance} USD
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (~{(selectedStudent.balance * exchangeRate).toFixed(2)} ZiG)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', marginBottom: 20, color: '#64748b' }}>
                Search and select a student above to initiate payment entry.
              </div>
            )}

            {/* Payment Entry Form */}
            <form onSubmit={handleProcessPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="portal-input"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '1.1rem', fontWeight: 800, marginTop: 4 }}
                    placeholder="e.g. 150.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Currency</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: '10px 12px', marginTop: 4, fontWeight: 700 }}
                    value={paymentCurrency}
                    onChange={e => setPaymentCurrency(e.target.value as any)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ZiG">ZiG (Zimbabwe Gold)</option>
                    <option value="ZAR">ZAR (Rand)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tender / Channel</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: 10, marginTop: 4 }}
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="EcoCash">EcoCash Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer / RTGS</option>
                    <option value="POS Swipe">POS Debit Card Swipe</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ref / Bank Trace Code</label>
                  <input
                    type="text"
                    className="portal-input"
                    style={{ width: '100%', padding: 10, marginTop: 4 }}
                    placeholder="e.g. MP-849204 or Bank Slip"
                    value={referenceCode}
                    onChange={e => setReferenceCode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18, background: '#eff6ff', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="smsReceipt"
                  checked={sendSmsReceipt}
                  onChange={e => setSendSmsReceipt(e.target.checked)}
                />
                <label htmlFor="smsReceipt" style={{ fontSize: '0.85rem', color: '#1e40af', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                  Automatically dispatch instant SMS payment acknowledgment to parent ({selectedStudent?.parentPhone || '+26377xxxxxxx'})
                </label>
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', padding: 14, fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
                disabled={processingPayment || !selectedStudent}
              >
                {processingPayment ? (
                  <><i className="fas fa-spinner fa-spin mr-2" /> Posting Double Entry & Issuing Receipt...</>
                ) : (
                  <><i className="fas fa-check-circle mr-2" /> Post Payment & Generate Atomic Receipt</>
                )}
              </button>
            </form>
          </div>

          {/* Receipt Preview Card */}
          <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                <i className="fas fa-print mr-2" style={{ color: '#64748b' }} />
                Instant Receipt Preview
              </h3>
              {lastReceipt && (
                <button
                  className="portal-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print mr-1" /> Print Slip
                </button>
              )}
            </div>

            {lastReceipt ? (
              <div style={{ border: '2px dashed #cbd5e1', padding: 20, borderRadius: 8, background: '#fafafa', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>SANTANA ACADEMY HIGH SCHOOL</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>OFFICIAL BURSAR PAYMENT RECEIPT</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>
                    {lastReceipt.receiptNo}
                  </p>
                </div>

                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Date:</strong> {lastReceipt.timestamp}</div>
                  <div><strong>Student:</strong> {lastReceipt.studentName} ({lastReceipt.studentId})</div>
                  <div><strong>Class:</strong> {lastReceipt.form}</div>
                  <div><strong>Channel:</strong> {lastReceipt.method} ({lastReceipt.reference})</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 8 }}>
                    <strong>Amount Tendered:</strong> {lastReceipt.amountPaid} {lastReceipt.currency}
                  </div>
                  <div>
                    <strong>Base Equivalent:</strong> ${lastReceipt.baseUSD} USD
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 8 }}>
                    <strong>Remaining Ledger Balance:</strong> ${lastReceipt.newBalance} USD
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#15803d' }}>
                    {lastReceipt.smsSent ? '✓ SMS notification successfully dispatched' : 'SMS not requested'}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.7rem', color: '#64748b' }}>
                  Thank you for keeping your account current.
                </div>
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-receipt fa-3x" style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>Latest issued receipt will be rendered here for instant thermal print or parent dispatch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Structures */}
      {activeTab === 'billing' && <FeesBillingPage />}

      {/* Tab 3: Invoices & Receipts */}
      {activeTab === 'invoices' && <ManageInvoicesPage />}

      {/* Tab 4: Student Ledgers & Statements */}
      {activeTab === 'ledgers' && <StudentLedgersPage />}

      {/* Tab 5: Bulk Invoices */}
      {activeTab === 'bulk-invoices' && <BulkInvoicesPage />}

      {/* Tab 6: Debtors Aging & Defaulters */}
      {activeTab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls Bar */}
          <div className="portal-card" style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter by Form</label>
                  <select
                    className="portal-select"
                    style={{ padding: '6px 12px', marginTop: 4 }}
                    value={defaulterFilterForm}
                    onChange={e => setDefaulterFilterForm(e.target.value)}
                  >
                    <option value="ALL">All Forms</option>
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Boarding Category</label>
                  <select
                    className="portal-select"
                    style={{ padding: '6px 12px', marginTop: 4 }}
                    value={defaulterFilterBoarding}
                    onChange={e => setDefaulterFilterBoarding(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Boarder">Boarders Only</option>
                    <option value="Day">Day Scholars Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="portal-btn-secondary"
                  onClick={handleBroadcastDefaultersSms}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-sms" /> Bulk Warning SMS
                </button>
                <button
                  className="portal-btn-secondary"
                  onClick={handleGenerateDemandLetters}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-file-pdf" /> Letters of Demand
                </button>
              </div>
            </div>
          </div>

          {/* Aging Defaulters Table */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Debtors Aging Defaulters Register</h2>
              <span className="portal-badge danger" style={{ fontWeight: 700 }}>
                Total Outstanding: ${filteredDefaulters.reduce((s, d) => s + d.balance, 0)} USD
              </span>
            </div>

            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Student Name</th>
                  <th style={{ padding: 12 }}>Class & Cohort</th>
                  <th style={{ padding: 12 }}>Boarding</th>
                  <th style={{ padding: 12 }}>Billed Total</th>
                  <th style={{ padding: 12 }}>Outstanding Balance</th>
                  <th style={{ padding: 12 }}>Aging Bracket</th>
                  <th style={{ padding: 12 }}>Exam Clearance</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefaulters.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>
                      <div>{d.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.studentId} &bull; {d.guardianPhone}</div>
                    </td>
                    <td style={{ padding: 12 }}>{d.form}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`portal-badge ${d.boarding === 'Boarder' ? 'info' : 'secondary'}`}>
                        {d.boarding}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: '#475569' }}>${d.totalBilled}</td>
                    <td style={{ padding: 12, fontWeight: 800, color: '#b91c1c' }}>${d.balance}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`portal-badge ${d.status === '90+ Days' ? 'danger' : d.status === '60 Days' ? 'warning' : 'info'}`}>
                        {d.status} ({d.daysOverdue}d)
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => handleToggleExamBlock(d.id)}
                        style={{
                          background: d.examBlocked ? '#fee2e2' : '#f0fdf4',
                          border: `1px solid ${d.examBlocked ? '#fecaca' : '#bbf7d0'}`,
                          color: d.examBlocked ? '#b91c1c' : '#15803d',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {d.examBlocked ? 'Blocked' : 'Cleared'}
                      </button>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <button
                        className="portal-btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#0284c7' }}
                        onClick={() => {
                          setSelectedStudent({ id: d.studentId, name: d.name, form: d.form, boarding: d.boarding, billed: d.totalBilled, paid: d.totalPaid, balance: d.balance, parentPhone: d.guardianPhone });
                          handleTabChange('collection');
                        }}
                      >
                        <i className="fas fa-hand-holding-usd mr-1" /> Pay Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
