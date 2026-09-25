import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import TabbedPage, { TabItem } from '../../../components/portals/shared/TabbedPage';
import EmptyState from '../../../components/shared/EmptyState';

// ── TYPES ──

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  term?: string;
  year?: number;
  createdAt: string;
}

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMode: string;
  description: string;
  status: 'Verified' | 'Pending Verification';
  isPending: boolean;
  createdAt: string;
}

interface StatementEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface MilestoneItem {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'DUE' | 'OVERDUE';
  paidDate?: string | null;
}

interface ActivePaymentPlan {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'OVERDUE';
  amount: number;
  dueDate: string;
  notes: string;
  createdAt: string;
  progressPct: number;
  totalPaidOnPlan: number;
  milestones: MilestoneItem[];
}

interface FeeCategoryItem {
  name: string;
  billed: number;
  paid: number;
  balance: number;
}

interface TuckshopCrossReference {
  name: string;
  balance: number;
  isLow: boolean;
  suggestedTopup: number;
  note: string;
}

interface FeeSummaryData {
  student: {
    id: string;
    name: string;
    studentId: string;
    className: string;
    schoolName: string;
  };
  currency: string;
  currencySymbol: string;
  altCurrency: string;
  altCurrencySymbol: string;
  exchangeRate: number;
  bankingDetails: {
    bankName: string;
    accountName: string;
    accountNumberUsd: string;
    accountNumberZig: string;
    branchCode: string;
    ecocashMerchantCode: string;
  };
  totals: {
    totalBilled: number;
    totalPaid: number;
    totalBalanceDue: number;
    zigBalanceDue: number;
  };
  dueDateWarning: {
    severity: 'green' | 'amber' | 'red';
    text: string;
    earliestDueDate: string | null;
    daysRemaining: number | null;
  };
  categories: FeeCategoryItem[];
  tuckshopCrossReference: TuckshopCrossReference;
  invoices: InvoiceItem[];
  receipts: ReceiptItem[];
  statement: StatementEntry[];
  activePaymentPlan: ActivePaymentPlan | null;
}

export default function ParentFees() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<FeeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Sub-toggle for Tab 2
  const [tab2View, setTab2View] = useState<'invoices' | 'receipts'>('invoices');

  // Modals state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetAmount, setPayTargetAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'paynow' | 'ecocash' | 'bank_transfer'>('paynow');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const [showZigModal, setShowZigModal] = useState(false);
  const [zigRefNumber, setZigRefNumber] = useState('');
  const [isSubmittingZigRef, setIsSubmittingZigRef] = useState(false);

  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofMethod, setProofMethod] = useState('Instant Bank Transfer');
  const [proofRef, setProofRef] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);

  // Apply Plan Modal
  const [showApplyPlanModal, setShowApplyPlanModal] = useState(false);
  const [planAmount, setPlanAmount] = useState('');
  const [planDueDate, setPlanDueDate] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!activeEntity?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/fees/parent-summary?studentId=${activeEntity.id}`);
      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching parent fees summary:', err);
      showToast('Unable to load fees summary. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id, showToast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handlers
  const handleOpenPayModal = (amount?: number) => {
    const defaultAmt = amount ?? data?.totals.totalBalanceDue ?? 100;
    setPayTargetAmount(defaultAmt > 0 ? defaultAmt.toFixed(2) : '100.00');
    setShowPayModal(true);
  };

  const handleProcessPayment = () => {
    const val = parseFloat(payTargetAmount);
    if (isNaN(val) || val <= 0) {
      return showToast('Please enter a valid payment amount', 'warning');
    }
    setIsProcessingPay(true);
    setTimeout(() => {
      setIsProcessingPay(false);
      setShowPayModal(false);
      showToast(
        payMethod === 'paynow'
          ? 'Connecting to Paynow Secure Gateway...'
          : payMethod === 'ecocash'
          ? 'EcoCash prompt sent to your mobile phone.'
          : 'Bank transfer details confirmed. Upload proof once completed.',
        'success'
      );
    }, 1200);
  };

  const handleSubmitZigTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zigRefNumber.trim()) {
      return showToast('Please enter your ZiG bank transfer reference number', 'warning');
    }
    setIsSubmittingZigRef(true);
    setTimeout(async () => {
      try {
        await api.post('/api/fees/upload-proof', {
          studentId: activeEntity?.id,
          amount: data?.totals.totalBalanceDue || 0,
          paymentMode: 'ZiG Bank Transfer',
          reference: zigRefNumber,
          notes: `ZiG transfer at rate ${data?.exchangeRate} ZiG/USD`
        });
        showToast('ZiG transfer reference submitted for Bursar reconciliation! Balance will update upon verification.', 'success');
        setShowZigModal(false);
        setZigRefNumber('');
        fetchSummary();
      } catch {
        showToast('Failed to submit ZiG transfer reference', 'error');
      } finally {
        setIsSubmittingZigRef(false);
      }
    }, 1000);
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofAmount || parseFloat(proofAmount) <= 0) {
      return showToast('Please enter a valid amount paid', 'warning');
    }
    if (!proofRef.trim()) {
      return showToast('Please enter the bank/mobile transaction reference', 'warning');
    }

    setIsUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('studentId', activeEntity?.id || '');
      formData.append('amount', proofAmount);
      formData.append('paymentMode', proofMethod);
      formData.append('reference', proofRef);
      formData.append('notes', proofNotes);
      if (proofFile) {
        formData.append('document', proofFile);
      }

      await api.post('/api/fees/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('Proof of payment submitted! The Bursar will verify and update your balance.', 'success');
      setShowProofModal(false);
      setProofFile(null);
      setProofAmount('');
      setProofRef('');
      setProofNotes('');
      fetchSummary();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload proof of payment', 'error');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleApplyPaymentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planAmount || !planDueDate) {
      return showToast('Please enter the plan amount and proposed completion date', 'warning');
    }
    setIsSubmittingPlan(true);
    try {
      await api.post('/api/payment-plans', {
        studentId: activeEntity?.id,
        amount: parseFloat(planAmount),
        dueDate: planDueDate,
        notes: planNotes
      });
      showToast('Payment plan request submitted! The administration will review your schedule.', 'success');
      setShowApplyPlanModal(false);
      setPlanAmount('');
      setPlanDueDate('');
      setPlanNotes('');
      fetchSummary();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit payment plan request', 'error');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  if (!activeEntity) {
    return (
      <div className="portal-container" style={{ padding: 40, textAlign: 'center' }}>
        <EmptyState
          icon="fas fa-user-graduate"
          title="No Student Selected"
          description="Please select a student from your parent dashboard to view their fee accounts."
        />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="portal-container" style={{ padding: 60, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--school-primary, #2563eb)' }}></i>
        <p style={{ marginTop: 16, color: '#64748b', fontWeight: 600 }}>Loading fee accounts & statements...</p>
      </div>
    );
  }

  // Helper colors for due date severity
  const getSeverityBg = (sev: 'green' | 'amber' | 'red') => {
    switch (sev) {
      case 'red': return '#fef2f2';
      case 'amber': return '#fffbeb';
      case 'green': return '#f0fdf4';
    }
  };

  const getSeverityBorder = (sev: 'green' | 'amber' | 'red') => {
    switch (sev) {
      case 'red': return '#f87171';
      case 'amber': return '#fcd34d';
      case 'green': return '#86efac';
    }
  };

  const getSeverityColor = (sev: 'green' | 'amber' | 'red') => {
    switch (sev) {
      case 'red': return '#dc2626';
      case 'amber': return '#d97706';
      case 'green': return '#16a34a';
    }
  };

  // ══════════════════════════════════════════════════════════
  // TAB 1: OVERVIEW
  // ══════════════════════════════════════════════════════════
  const renderOverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Total Balance Due Card */}
      <div
        className="portal-card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          borderRadius: 16,
          padding: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Balance Outstanding
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: data?.totals.totalBalanceDue === 0 ? '#16a34a' : '#0f172a', margin: 0 }}>
                {data?.currencySymbol}
                {(data?.totals.totalBalanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>{data?.currency}</span>
            </div>

            {/* Live ZiG Conversion Display */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
                padding: '6px 12px',
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: '0.9rem',
                color: '#334155'
              }}
            >
              <i className="fas fa-coins" style={{ color: '#d97706' }}></i>
              <span>
                ZiG Equivalent:{' '}
                <strong>
                  {data?.altCurrencySymbol} {(data?.totals.zigBalanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>{' '}
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(@ {data?.exchangeRate.toFixed(2)} ZiG/USD)</span>
              </span>
            </div>
          </div>

          {/* Due date warning badge */}
          {data?.dueDateWarning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 12,
                background: getSeverityBg(data.dueDateWarning.severity),
                border: `1px solid ${getSeverityBorder(data.dueDateWarning.severity)}`,
                color: getSeverityColor(data.dueDateWarning.severity),
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <i
                className={`fas ${
                  data.dueDateWarning.severity === 'red'
                    ? 'fa-exclamation-triangle'
                    : data.dueDateWarning.severity === 'amber'
                    ? 'fa-clock'
                    : 'fa-check-circle'
                }`}
              ></i>
              <span>{data.dueDateWarning.text}</span>
            </div>
          )}
        </div>

        {/* Quick Actions Strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <button
            className="portal-btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700, gap: 8 }}
            onClick={() => handleOpenPayModal()}
          >
            <i className="fas fa-credit-card"></i> Pay Now (USD)
          </button>

          <button
            className="portal-btn-secondary"
            style={{
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: '#fef3c7',
              borderColor: '#fde68a',
              color: '#92400e',
              gap: 8
            }}
            onClick={() => setShowZigModal(true)}
          >
            <i className="fas fa-university"></i> Pay in ZiG
          </button>

          <button
            className="portal-btn-secondary"
            style={{ padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700, gap: 8 }}
            onClick={() => setShowProofModal(true)}
          >
            <i className="fas fa-file-upload"></i> Upload Proof of Payment
          </button>
        </div>
      </div>

      {/* Fee Category Breakdown */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2>
            <i className="fas fa-layer-group" style={{ marginRight: 8, color: 'var(--school-primary, #2563eb)' }}></i>
            Fee Category Breakdown
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current Academic Session</span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Total Billed</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data?.categories.map((cat, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: '#1e293b' }}>{cat.name}</td>
                  <td style={{ textAlign: 'right', color: '#64748b' }}>
                    {data.currencySymbol}{cat.billed.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    {data.currencySymbol}{cat.paid.toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: cat.balance > 0 ? '#dc2626' : '#16a34a'
                    }}
                  >
                    {data.currencySymbol}{cat.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Reference: Tuckshop & Dining Pocket Money Card */}
      {data?.tuckshopCrossReference && (
        <div
          className="portal-card"
          style={{
            background: data.tuckshopCrossReference.isLow ? '#fffbeb' : '#f8fafc',
            border: `1px solid ${data.tuckshopCrossReference.isLow ? '#fef08a' : '#e2e8f0'}`,
            borderRadius: 14,
            padding: 20
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: data.tuckshopCrossReference.isLow ? '#fef3c7' : '#e2e8f0',
                  color: data.tuckshopCrossReference.isLow ? '#d97706' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}
              >
                <i className="fas fa-utensils"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  {data.tuckshopCrossReference.name}
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 700,
                      background: data.tuckshopCrossReference.isLow ? '#fee2e2' : '#dcfce7',
                      color: data.tuckshopCrossReference.isLow ? '#b91c1c' : '#15803d'
                    }}
                  >
                    {data.tuckshopCrossReference.isLow ? 'Top-up Needed' : 'Healthy Balance'}
                  </span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Current Wallet Balance: <strong>${data.tuckshopCrossReference.balance.toFixed(2)}</strong>. {data.tuckshopCrossReference.note}
                </p>
              </div>
            </div>

            <button
              className="portal-btn-secondary"
              style={{ fontSize: '0.85rem', fontWeight: 700, gap: 8 }}
              onClick={() => navigate('/parent/wallet')}
            >
              <i className="fas fa-wallet"></i> Open Tuckshop Wallet
            </button>
          </div>
        </div>
      )}

      {/* Active Payment Plan Summary Jumper */}
      {data?.activePaymentPlan ? (
        <div
          className="portal-card"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 14,
            padding: 20
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#2563eb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}
              >
                <i className="fas fa-calendar-check"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>
                  Active Fee Payment Plan in Place
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#1e40af' }}>
                  Total Agreed: <strong>${data.activePaymentPlan.amount.toFixed(2)}</strong> | Completed: <strong>{data.activePaymentPlan.progressPct}%</strong>.
                  Check installment milestones and upcoming settlement dates.
                </p>
              </div>
            </div>

            <button
              className="portal-btn-primary"
              style={{ background: '#1d4ed8', borderColor: '#1e40af', gap: 8 }}
              onClick={() => {
                setSearchParams({ tab: 'payment-plan' }, { replace: true });
              }}
            >
              <span>View Payment Plan Schedule</span>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      ) : data?.totals.totalBalanceDue && data.totals.totalBalanceDue > 0 ? (
        <div
          className="portal-card"
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: 14,
            padding: 20
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                <i className="fas fa-hand-holding-usd" style={{ marginRight: 8, color: '#2563eb' }}></i>
                Need to pay in installments?
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                You can submit a formal payment plan agreement for review and approval by the school administration.
              </p>
            </div>
            <button
              className="portal-btn-secondary"
              style={{ fontSize: '0.85rem', fontWeight: 700 }}
              onClick={() => setShowApplyPlanModal(true)}
            >
              Apply for Payment Plan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TAB 2: INVOICES & RECEIPTS
  // ══════════════════════════════════════════════════════════
  const renderInvoicesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-toggle selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          <button
            style={{
              border: 'none',
              background: tab2View === 'invoices' ? '#ffffff' : 'transparent',
              color: tab2View === 'invoices' ? '#1e293b' : '#64748b',
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: tab2View === 'invoices' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={() => setTab2View('invoices')}
          >
            <i className="fas fa-file-invoice"></i> Invoices ({data?.invoices.length || 0})
          </button>
          <button
            style={{
              border: 'none',
              background: tab2View === 'receipts' ? '#ffffff' : 'transparent',
              color: tab2View === 'receipts' ? '#1e293b' : '#64748b',
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: tab2View === 'receipts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={() => setTab2View('receipts')}
          >
            <i className="fas fa-receipt"></i> Receipts ({data?.receipts.length || 0})
          </button>
        </div>

        <button className="portal-btn-secondary" onClick={() => setShowProofModal(true)}>
          <i className="fas fa-upload"></i> Submit Proof of Payment
        </button>
      </div>

      {tab2View === 'invoices' ? (
        <div className="portal-card" style={{ padding: 0 }}>
          {data?.invoices.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState icon="fas fa-file-invoice" title="No Invoices Yet" description="There are no fee invoices billed to this student account yet." />
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Total Amount</th>
                  <th>Balance Due</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.description}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {data?.currencySymbol}{inv.amount.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 700, color: inv.balance > 0 ? '#dc2626' : '#16a34a' }}>
                      {data?.currencySymbol}{inv.balance.toFixed(2)}
                    </td>
                    <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`portal-badge ${
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'partial'
                            ? 'warning'
                            : inv.status === 'overdue'
                            ? 'danger'
                            : 'neutral'
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <i className="fas fa-file-pdf"></i> View PDF
                        </button>
                        {inv.balance > 0 && (
                          <button
                            className="portal-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenPayModal(inv.balance)}
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="portal-card" style={{ padding: 0 }}>
          {data?.receipts.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState icon="fas fa-receipt" title="No Receipts Yet" description="No verified or pending payment receipts found on this account." />
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.receipts.map(rcp => (
                  <tr key={rcp.id}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{rcp.receiptNumber}</td>
                    <td>{new Date(rcp.date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{rcp.paymentMode}</span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rcp.description}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>
                      {data?.currencySymbol}{rcp.amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`portal-badge ${rcp.isPending ? 'warning' : 'success'}`}>
                        {rcp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="portal-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => setSelectedReceipt(rcp)}
                      >
                        <i className="fas fa-download"></i> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TAB 3: FULL STATEMENT (STUDENT LEDGER - READ ONLY)
  // ══════════════════════════════════════════════════════════
  const renderStatementTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Statement Header Card */}
      <div
        className="portal-card"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: 16,
          padding: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Official Student Ledger Statement
            </div>
            <h2 style={{ color: '#ffffff', margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
              {data?.student.name}
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 4 }}>
              Student ID: <strong>{data?.student.studentId}</strong> | {data?.student.className}
            </div>
          </div>

          <button
            className="portal-btn-secondary"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={() => window.print()}
          >
            <i className="fas fa-print"></i> Print Official Statement
          </button>
        </div>

        {/* Ledger Summary Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 16,
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Billed</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
              {data?.currencySymbol}{(data?.totals.totalBilled || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Payments</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
              {data?.currencySymbol}{(data?.totals.totalPaid || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Balance Due</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginTop: 2 }}>
              {data?.currencySymbol}{(data?.totals.totalBalanceDue || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="portal-card" style={{ padding: 0 }}>
        {data?.statement.length === 0 ? (
          <div style={{ padding: 40 }}>
            <EmptyState icon="fas fa-book-open" title="No Ledger Entries" description="No financial transactions recorded on this student's ledger yet." />
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '45%' }}>Description</th>
                <th style={{ width: '13%', textAlign: 'right' }}>Debit (Billed)</th>
                <th style={{ width: '13%', textAlign: 'right' }}>Credit (Paid)</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {data?.statement.map(st => (
                <tr key={st.id}>
                  <td>{new Date(st.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>{st.description}</td>
                  <td style={{ textAlign: 'right', color: st.debit > 0 ? '#1e293b' : '#94a3b8' }}>
                    {st.debit > 0 ? `${data.currencySymbol}${st.debit.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: st.credit > 0 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {st.credit > 0 ? `${data.currencySymbol}${st.credit.toFixed(2)}` : '—'}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: st.runningBalance > 0 ? '#dc2626' : '#16a34a'
                    }}
                  >
                    {data.currencySymbol}{st.runningBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TAB 4: PAYMENT PLAN (CONDITIONAL)
  // ══════════════════════════════════════════════════════════
  const renderPaymentPlanTab = () => {
    const plan = data?.activePaymentPlan;
    if (!plan) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Plan Header Card */}
        <div
          className="portal-card"
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            color: '#fff',
            borderRadius: 16,
            padding: 24
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    background: plan.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                    color: plan.status === 'APPROVED' ? '#15803d' : '#b45309'
                  }}
                >
                  <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
                  {plan.status}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#bfdbfe' }}>
                  Agreed on {new Date(plan.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h2 style={{ color: '#fff', margin: '8px 0 0', fontSize: '1.75rem', fontWeight: 800 }}>
                Total Plan Amount: ${plan.amount.toFixed(2)}
              </h2>
              {plan.notes && (
                <p style={{ margin: '6px 0 0', color: '#e0e7ff', fontSize: '0.9rem' }}>
                  Terms & Notes: {plan.notes}
                </p>
              )}
            </div>

            <button
              className="portal-btn-secondary"
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              onClick={() => setShowApplyPlanModal(true)}
            >
              Request Adjustment
            </button>
          </div>

          {/* Completion Progress Bar */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
              <span>Settlement Progress</span>
              <strong>{plan.progressPct}% Complete</strong>
            </div>
            <div style={{ width: '100%', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${plan.progressPct}%`,
                  height: '100%',
                  background: '#22c55e',
                  borderRadius: 6,
                  transition: 'width 0.5s ease'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Milestones / Installments List */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>
              <i className="fas fa-tasks" style={{ marginRight: 8, color: '#2563eb' }}></i>
              Payment Plan Milestones & Installments
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Final Target Date: {new Date(plan.dueDate).toLocaleDateString()}
            </span>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Promised Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {plan.milestones.map((m, idx) => (
                  <tr key={m.id || idx}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{m.title}</td>
                    <td>{new Date(m.dueDate).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 700 }}>${m.amount.toFixed(2)}</td>
                    <td>
                      {m.status === 'PAID' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: '#dcfce7',
                            color: '#15803d'
                          }}
                        >
                          <i className="fas fa-check"></i> Paid ✓
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: m.status === 'OVERDUE' ? '#fee2e2' : '#fef3c7',
                            color: m.status === 'OVERDUE' ? '#dc2626' : '#d97706'
                          }}
                        >
                          <i className={`fas ${m.status === 'OVERDUE' ? 'fa-exclamation-triangle' : 'fa-clock'}`}></i>
                          Due {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {m.status !== 'PAID' ? (
                        <button
                          className="portal-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          onClick={() => handleOpenPayModal(m.amount)}
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* School Policy Notice */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}
        >
          <i className="fas fa-shield-alt" style={{ color: '#2563eb', marginTop: 2, flexShrink: 0 }}></i>
          <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
            <strong>Payment Plan Compliance Notice:</strong> Timely fulfillment of each installment ensures continuous entry and uninterrupted academic participation for your child. If you anticipate any delay, please contact the Bursar's office before the milestone due date.
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // TAB DEFINITIONS
  // ══════════════════════════════════════════════════════════
  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'fas fa-chart-pie',
      content: renderOverviewTab()
    },
    {
      id: 'invoices',
      label: 'Invoices & Receipts',
      icon: 'fas fa-file-invoice-dollar',
      badge: (data?.invoices.filter(i => i.balance > 0).length || 0) > 0 ? data?.invoices.filter(i => i.balance > 0).length : undefined,
      content: renderInvoicesTab()
    },
    {
      id: 'statement',
      label: 'Full Statement',
      icon: 'fas fa-book',
      content: renderStatementTab()
    }
  ];

  // Tab 4 is CONDITIONAL: only rendered if activePaymentPlan exists!
  if (data?.activePaymentPlan) {
    tabs.push({
      id: 'payment-plan',
      label: 'Payment Plan',
      icon: 'fas fa-calendar-check',
      badge: 'Active',
      content: renderPaymentPlanTab()
    });
  }

  return (
    <>
      <TabbedPage
        title="Fees & Finances"
        subtitle={`Review statements, invoices, and settle school fees for ${data?.student.name || activeEntity.name}`}
        tabs={tabs}
        defaultTab="overview"
        paramName="tab"
        headerAction={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="portal-btn-secondary" onClick={() => fetchSummary()}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <button className="portal-btn-primary" onClick={() => handleOpenPayModal()}>
              <i className="fas fa-credit-card"></i> Pay Now
            </button>
          </div>
        }
      />

      {/* ── MODAL 1: PAY NOW (USD) ── */}
      {showPayModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 480 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-credit-card" style={{ marginRight: 8, color: '#2563eb' }}></i>Secure Fee Payment</h2>
              <button onClick={() => setShowPayModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div className="portal-form-group">
                <label>Amount to Pay ({data?.currency || 'USD'})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="portal-input"
                  value={payTargetAmount}
                  onChange={e => setPayTargetAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="portal-form-group">
                <label>Select Payment Gateway</label>
                <div style={{ display: 'grid', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      border: `2px solid ${payMethod === 'paynow' ? '#2563eb' : '#e2e8f0'}`,
                      background: payMethod === 'paynow' ? '#eff6ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === 'paynow'}
                      onChange={() => setPayMethod('paynow')}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>Paynow (Visa / Mastercard / Zimswitch)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Instant card and online bank settlement</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      border: `2px solid ${payMethod === 'ecocash' ? '#2563eb' : '#e2e8f0'}`,
                      background: payMethod === 'ecocash' ? '#eff6ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === 'ecocash'}
                      onChange={() => setPayMethod('ecocash')}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>EcoCash / Mobile Money</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Prompt sent directly to your phone</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setShowPayModal(false)}>
                Cancel
              </button>
              <button className="portal-btn-primary" onClick={handleProcessPayment} disabled={isProcessingPay}>
                {isProcessingPay ? 'Connecting Gateway...' : `Proceed to Pay $${payTargetAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PAY IN ZIG ── */}
      {showZigModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 540 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-university" style={{ marginRight: 8, color: '#d97706' }}></i>Pay School Fees in ZiG</h2>
              <button onClick={() => setShowZigModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              {/* ZiG Conversion Banner */}
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>Official ZiG Conversion</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#78350f', marginTop: 4 }}>
                  {data?.altCurrencySymbol} {(data?.totals.zigBalanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 2 }}>
                  Based on current school exchange rate: <strong>1 USD = {data?.exchangeRate.toFixed(2)} ZiG</strong>
                </div>
              </div>

              {/* School ZiG Bank Account Details */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#334155' }}>Official School ZiG Banking Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Bank Name:</span>
                    <div style={{ fontWeight: 700 }}>{data?.bankingDetails.bankName}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Account Name:</span>
                    <div style={{ fontWeight: 700 }}>{data?.bankingDetails.accountName}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>ZiG Account #:</span>
                    <div style={{ fontWeight: 700, color: '#2563eb' }}>{data?.bankingDetails.accountNumberZig}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Branch Code:</span>
                    <div style={{ fontWeight: 700 }}>{data?.bankingDetails.branchCode}</div>
                  </div>
                </div>
              </div>

              {/* Submit Transfer Reference */}
              <form onSubmit={handleSubmitZigTransfer}>
                <div className="portal-form-group">
                  <label>Your Bank Transfer / ZIPIT Reference Number *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. ZIG-9910283 or Bank Auth Code"
                    value={zigRefNumber}
                    onChange={e => setZigRefNumber(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
                    Always include your child's student ID (<strong>{data?.student.studentId}</strong>) in your bank reference.
                  </small>
                </div>
                <div className="portal-modal-footer" style={{ padding: 0, marginTop: 20 }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowZigModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="portal-btn-primary" disabled={isSubmittingZigRef}>
                    {isSubmittingZigRef ? 'Submitting...' : 'Submit ZiG Transfer Reference'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: UPLOAD PROOF OF PAYMENT ── */}
      {showProofModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 520 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-file-upload" style={{ marginRight: 8, color: '#2563eb' }}></i>Submit Proof of Payment</h2>
              <button onClick={() => setShowProofModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#1e40af' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                Uploaded proofs are reviewed and reconciled by the Bursar. Your fee balance will update once approved.
              </div>

              <form onSubmit={handleUploadProof}>
                <div className="portal-form-group">
                  <label>Amount Paid ({data?.currency || 'USD'}) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="portal-input"
                    placeholder="e.g. 500.00"
                    value={proofAmount}
                    onChange={e => setProofAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Payment Method *</label>
                  <select
                    className="portal-input"
                    value={proofMethod}
                    onChange={e => setProofMethod(e.target.value)}
                  >
                    <option value="Instant Bank Transfer">Instant Bank Transfer</option>
                    <option value="EcoCash">EcoCash</option>
                    <option value="ZIPIT">ZIPIT</option>
                    <option value="InnBucks">InnBucks</option>
                    <option value="Direct Bank Deposit">Direct Bank Deposit</option>
                    <option value="Cash at Bursar">Cash at Bursar Office</option>
                  </select>
                </div>

                <div className="portal-form-group">
                  <label>Transaction / Reference Number *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. EBX-9920192"
                    value={proofRef}
                    onChange={e => setProofRef(e.target.value)}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Receipt Document / Bank POP (PDF or Image)</label>
                  <input
                    type="file"
                    className="portal-input"
                    accept="image/*,application/pdf"
                    onChange={e => setProofFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="portal-form-group">
                  <label>Additional Notes (Optional)</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Any reference for the bursar..."
                    value={proofNotes}
                    onChange={e => setProofNotes(e.target.value)}
                  />
                </div>

                <div className="portal-modal-footer" style={{ padding: 0, marginTop: 20 }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowProofModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" disabled={isUploadingProof}>
                    {isUploadingProof ? 'Uploading...' : 'Submit for Verification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: INVOICE VIEWER ── */}
      {selectedInvoice && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 560 }}>
            <div className="portal-modal-header">
              <h2>Invoice: {selectedInvoice.invoiceNumber}</h2>
              <button onClick={() => setSelectedInvoice(null)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body" style={{ background: '#f8fafc', padding: 24, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{data?.student.schoolName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Official School Fee Invoice</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#2563eb' }}>{selectedInvoice.invoiceNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ margin: '16px 0', fontSize: '0.9rem' }}>
                <div>Billed To: <strong>{data?.student.name}</strong> ({data?.student.studentId})</div>
                <div>Class: <strong>{data?.student.className}</strong></div>
                <div>Due Date: <strong>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</strong></div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', textAlign: 'left', fontSize: '0.85rem' }}>
                    <th style={{ padding: 8 }}>Item Description</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}>{selectedInvoice.description}</td>
                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                      {data?.currencySymbol}{selectedInvoice.amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, fontSize: '1rem', fontWeight: 800 }}>
                <span>Balance Due: &nbsp;</span>
                <span style={{ color: selectedInvoice.balance > 0 ? '#dc2626' : '#16a34a' }}>
                  {data?.currencySymbol}{selectedInvoice.balance.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button className="portal-btn-primary" onClick={() => window.print()}><i className="fas fa-print"></i> Print</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: RECEIPT VIEWER ── */}
      {selectedReceipt && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 520 }}>
            <div className="portal-modal-header">
              <h2>Official Receipt: {selectedReceipt.receiptNumber}</h2>
              <button onClick={() => setSelectedReceipt(null)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body" style={{ background: '#f8fafc', padding: 24, borderRadius: 12 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{data?.student.schoolName}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>OFFICIAL PAYMENT RECEIPT</div>
                <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', background: '#dcfce7', color: '#15803d', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
                  <i className="fas fa-check-circle"></i> {selectedReceipt.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem', marginBottom: 20 }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Receipt Number</span>
                  <div style={{ fontWeight: 700 }}>{selectedReceipt.receiptNumber}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Date Received</span>
                  <div style={{ fontWeight: 700 }}>{new Date(selectedReceipt.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Student Name</span>
                  <div style={{ fontWeight: 700 }}>{data?.student.name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Payment Method</span>
                  <div style={{ fontWeight: 700 }}>{selectedReceipt.paymentMode}</div>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Amount Paid</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a', marginTop: 4 }}>
                  {data?.currencySymbol}{selectedReceipt.amount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setSelectedReceipt(null)}>Close</button>
              <button className="portal-btn-primary" onClick={() => window.print()}><i className="fas fa-print"></i> Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: APPLY FOR PAYMENT PLAN ── */}
      {showApplyPlanModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 520 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-hand-holding-usd" style={{ marginRight: 8, color: '#2563eb' }}></i>Apply for Payment Plan</h2>
              <button onClick={() => setShowApplyPlanModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#1e40af' }}>
                Submit a structured installment proposal. Once approved by the Bursar, your plan and milestones will appear under Tab 4.
              </div>

              <form onSubmit={handleApplyPaymentPlan}>
                <div className="portal-form-group">
                  <label>Total Plan Amount ($) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="portal-input"
                    placeholder="e.g. 500.00"
                    value={planAmount}
                    onChange={e => setPlanAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Proposed Completion / Final Due Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={planDueDate}
                    onChange={e => setPlanDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Reason / Notes for Administration</label>
                  <textarea
                    className="portal-input"
                    rows={3}
                    placeholder="Briefly state your installment settlement proposal..."
                    value={planNotes}
                    onChange={e => setPlanNotes(e.target.value)}
                  />
                </div>

                <div className="portal-modal-footer" style={{ padding: 0, marginTop: 20 }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowApplyPlanModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" disabled={isSubmittingPlan}>
                    {isSubmittingPlan ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
