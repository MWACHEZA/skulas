import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { SkeletonLoader } from '../../../components/shared';

interface Fee {
  id?: string;
  term: string;
  year: number;
  amount: number;
  paid: number;
  status: string;
  dueDate?: string;
  description?: string;
}

export default function StudentFees() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ecocash' | 'bank' | 'card'>('ecocash');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [phoneNo, setPhoneNo] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = () => {
    setLoading(true);
    api.get('/api/students/me/dashboard')
      .then(r => {
        const feeList = r.data.fees || [];
        setFees(feeList);
        const totalBilled = feeList.reduce((s: number, f: Fee) => s + f.amount, 0);
        const totalPaid = feeList.reduce((s: number, f: Fee) => s + f.paid, 0);
        setPayAmount(Math.max(0, totalBilled - totalPaid));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      return showToast('Please enter a valid payment amount', 'error');
    }

    setProcessingPayment(true);
    setTimeout(() => {
      setProcessingPayment(false);
      setPaymentModalOpen(false);
      showToast(`Payment of ${formatCurrency(payAmount)} submitted successfully via ${paymentMethod.toUpperCase()}!`, 'success');
      
      // Update state locally to reflect instantaneous payment
      if (fees.length > 0) {
        const updated = [...fees];
        updated[0].paid = Math.min(updated[0].amount, (updated[0].paid || 0) + payAmount);
        updated[0].status = updated[0].paid >= updated[0].amount ? 'paid' : 'partial';
        setFees(updated);
      }
    }, 1500);
  };

  const totalBilled = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);
  const isCleared = outstanding <= 0;
  const clearancePct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

  if (loading) {
    return (
      <div className="portal-container" style={{ maxWidth: 1250, margin: '0 auto', padding: '24px 0' }}>
        <SkeletonLoader type="stats" count={3} />
        <div style={{ marginTop: 24 }}>
          <SkeletonLoader type="table" rows={4} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container" style={{ maxWidth: 1250, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            <i className="fas fa-file-invoice-dollar mr-2" style={{ color: '#0284c7' }}></i>Student Fees & Statements
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Review institutional invoices, tuition breakdowns, and make digital payments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            className="portal-btn-ghost"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-print mr-2"></i>Print Statement
          </button>
          {!isCleared && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="portal-btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.88rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <i className="fas fa-credit-card mr-2"></i>Make Payment
            </button>
          )}
        </div>
      </div>

      {/* Clearance Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 12,
        background: isCleared ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${isCleared ? '#86efac' : '#fca5a5'}`,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: isCleared ? '#dcfce7' : '#fee2e2',
            color: isCleared ? '#15803d' : '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            <i className={`fas ${isCleared ? 'fa-shield-check' : 'fa-exclamation-triangle'}`}></i>
          </div>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: isCleared ? '#14532d' : '#7f1d1d' }}>
              {isCleared ? 'Full Financial Clearance' : `Outstanding Balance: ${formatCurrency(outstanding)}`}
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: isCleared ? '#166534' : '#991b1b' }}>
              {isCleared
                ? 'Your student account is in good standing. Automated gate entry and exam sitting are fully approved.'
                : 'Tuition arrears exist on your record. Clear outstanding balance to avoid automated security gate restrictions.'}
            </p>
          </div>
        </div>

        {!isCleared && (
          <button
            onClick={() => setPaymentModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Pay Now →
          </button>
        )}
      </div>

      {/* 4 KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Invoiced</span>
          <h3 style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {formatCurrency(totalBilled)}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Academic Session</span>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</span>
          <h3 style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
            {formatCurrency(totalPaid)}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>{clearancePct}% Settled</span>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: `4px solid ${isCleared ? '#16a34a' : '#ef4444'}` }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Current Balance</span>
          <h3 style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800, color: isCleared ? '#16a34a' : '#ef4444' }}>
            {formatCurrency(outstanding)}
          </h3>
          <span style={{ fontSize: '0.75rem', color: isCleared ? '#16a34a' : '#b91c1c', fontWeight: 700 }}>
            {isCleared ? 'Zero Arrears' : 'Payment Due'}
          </span>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #7c3aed' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Billing Terms</span>
          <h3 style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed' }}>
            {fees.length}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active Ledger Invoices</span>
        </div>
      </div>

      {/* Fee Statement Table */}
      <div className="portal-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-receipt mr-2" style={{ color: '#0284c7' }}></i>Institutional Invoices & Fee Breakdown
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin mr-2"></i>Loading fee ledgers...
          </div>
        ) : fees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>No fee records currently invoiced to this student.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Term / Cycle</th>
                  <th>Fee Description</th>
                  <th>Total Due</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f, i) => {
                  const bal = Math.max(0, f.amount - (f.paid || 0));
                  const isPaid = bal === 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        Term {f.term} ({f.year || new Date().getFullYear()})
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                        {f.description || 'Standard Tuition, Boarding & Operational Levies'}
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(f.amount)}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(f.paid)}</td>
                      <td style={{ fontWeight: 800, color: isPaid ? '#16a34a' : '#dc2626' }}>
                        {formatCurrency(bal)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: isPaid ? '#dcfce7' : f.paid > 0 ? '#fef3c7' : '#fee2e2',
                          color: isPaid ? '#15803d' : f.paid > 0 ? '#b45309' : '#b91c1c'
                        }}>
                          {isPaid ? 'Fully Paid' : f.paid > 0 ? 'Partial Payment' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Tuition & Fee Payment
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                  Select Payment Gateway
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'ecocash', label: 'EcoCash', icon: 'fa-mobile-alt' },
                    { id: 'bank', label: 'Bank Transfer', icon: 'fa-university' },
                    { id: 'card', label: 'Card / POS', icon: 'fa-credit-card' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 8,
                        border: paymentMethod === m.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: paymentMethod === m.id ? '#f0f9ff' : '#ffffff',
                        color: paymentMethod === m.id ? '#0369a1' : '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <i className={`fas ${m.icon}`} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              {paymentMethod === 'ecocash' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    EcoCash Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="077... or 078..."
                    required
                    value={phoneNo}
                    onChange={e => setPhoneNo(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <div>Bank: <strong>Stanbic Bank / CBZ Bank</strong></div>
                  <div>Account: <strong>9140003847291</strong></div>
                  <div>Reference: <strong>Your Student ID</strong></div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="portal-btn-secondary"
                  style={{ flex: 1, padding: 10 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="portal-btn-primary"
                  style={{ flex: 1, padding: 10, background: '#0284c7', borderColor: '#0284c7', fontWeight: 800 }}
                >
                  {processingPayment ? 'Processing...' : `Confirm & Pay ${formatCurrency(payAmount)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
