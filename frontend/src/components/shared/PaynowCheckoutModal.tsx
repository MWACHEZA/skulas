import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export type PaymentPurpose = 'FEES' | 'WALLET' | 'UNIFORM';
export type PaymentGatewayMethod = 'paynow' | 'ecocash' | 'onemoney' | 'innbucks';

export interface PaynowCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  purpose: PaymentPurpose;
  defaultAmount?: number;
  balanceDue?: number;
  currency?: string;
  userPhone?: string;
  userEmail?: string;
  onSuccess?: (reference: string, amount: number, receiptNumber?: string) => void;
}

type ContentProps = Omit<PaynowCheckoutModalProps, 'isOpen'>;

function PaynowCheckoutModalContent({
  onClose,
  studentId,
  studentName,
  purpose,
  defaultAmount,
  balanceDue,
  currency = 'USD',
  userPhone = '',
  userEmail = '',
  onSuccess
}: ContentProps) {
  const { showToast } = useToast();

  const initialAmount = defaultAmount && defaultAmount > 0
    ? defaultAmount.toFixed(2)
    : balanceDue && balanceDue > 0
    ? balanceDue.toFixed(2)
    : '50.00';

  const [amount, setAmount] = useState<string>(initialAmount);
  const [method, setMethod] = useState<PaymentGatewayMethod>('paynow');
  const [phone, setPhone] = useState<string>(userPhone || '');
  const [email] = useState<string>(userEmail || '');

  // Step flow: 'FORM' | 'PROCESSING' | 'WAITING_ECOCASH' | 'WAITING_PAYNOW_TAB' | 'SUCCESS' | 'FAILED'
  const [step, setStep] = useState<'FORM' | 'PROCESSING' | 'WAITING_ECOCASH' | 'WAITING_PAYNOW_TAB' | 'SUCCESS' | 'FAILED'>('FORM');
  const [activeReference, setActiveReference] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pollCountdown, setPollCountdown] = useState<number>(120);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling logic when waiting for payment completion
  useEffect(() => {
    if ((step === 'WAITING_ECOCASH' || step === 'WAITING_PAYNOW_TAB') && activeReference) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/api/payments/paynow/status/${activeReference}`);
          if (res.data?.paid || res.data?.status === 'PAID') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setReceiptNumber(res.data.receiptNumber || activeReference);
            setStep('SUCCESS');
            showToast('Payment verified and confirmed successfully!', 'success');
            if (onSuccess) {
              onSuccess(activeReference, parseFloat(amount), res.data.receiptNumber);
            }
          } else if (res.data?.status === 'FAILED' || res.data?.status === 'CANCELLED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setErrorMessage('Payment was cancelled or rejected by provider.');
            setStep('FAILED');
          }
        } catch {
          // ignore transient poll error
        }

        setPollCountdown(prev => {
          if (prev <= 1) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 2500);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [step, activeReference, amount, onSuccess, showToast]);

  const quickPillAmounts = [10, 25, 50, 100, 200];

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return showToast('Please enter a valid payment amount', 'warning');
    }

    if ((method === 'ecocash' || method === 'onemoney') && !phone.trim()) {
      return showToast('Mobile phone number is required for EcoCash / OneMoney push payment', 'warning');
    }

    setStep('PROCESSING');
    try {
      const res = await api.post('/api/payments/paynow/initiate', {
        studentId,
        amount: parsedAmount,
        purpose,
        paymentMethod: method,
        phone: phone.trim(),
        email: email.trim()
      });

      const { reference, redirectUrl: webUrl, instructions: inst } = res.data;
      setActiveReference(reference);
      setInstructions(inst || '');
      setRedirectUrl(webUrl || null);

      if (method === 'ecocash' || method === 'onemoney') {
        setStep('WAITING_ECOCASH');
      } else {
        setStep('WAITING_PAYNOW_TAB');
        if (webUrl) {
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err: unknown) {
      console.error('Paynow initiation error:', err);
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      setErrorMessage(apiErr.response?.data?.error || apiErr.message || 'Failed to connect to Paynow gateway');
      setStep('FAILED');
    }
  };

  const handleSimulateApproval = async () => {
    if (!activeReference) return;
    try {
      const res = await api.post(`/api/payments/paynow/simulate-approve/${activeReference}`);
      if (res.data?.success) {
        setReceiptNumber(res.data.session?.receiptNumber || activeReference);
        setStep('SUCCESS');
        showToast('Test payment simulated & verified successfully!', 'success');
        if (onSuccess) {
          onSuccess(activeReference, parseFloat(amount), res.data.session?.receiptNumber);
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      showToast(apiErr.response?.data?.error || apiErr.message || 'Simulation failed', 'error');
    }
  };

  const getPurposeLabel = () => {
    if (purpose === 'FEES') return 'School Tuition & Fees';
    if (purpose === 'WALLET') return 'Tuckshop & Dining Wallet';
    return 'Uniform / Bookstore Order';
  };

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 10000, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="portal-modal-card"
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header with gradient badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.2)', padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i className="fas fa-shield-alt" /> Secure Gateway
              </div>
              <h2 style={{ margin: '8px 0 2px', fontSize: '1.25rem', fontWeight: 800 }}>
                Paynow Instant Payment
              </h2>
              <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                {getPurposeLabel()} {studentName ? `• ${studentName}` : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
          {step === 'FORM' && (
            <form onSubmit={handleInitiate}>
              {/* Target Student & Balance info */}
              {balanceDue !== undefined && balanceDue > 0 && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Outstanding Balance</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      ${balanceDue.toFixed(2)} {currency}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(balanceDue.toFixed(2))}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pay Full Balance
                  </button>
                </div>
              )}

              {/* Amount Input */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Amount to Pay ({currency})
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b', fontSize: '1.2rem' }}>
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 34px',
                      borderRadius: 10,
                      border: '2px solid #cbd5e1',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Quick Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {quickPillAmounts.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(p.toFixed(2))}
                      style={{
                        background: amount === p.toFixed(2) ? '#2563eb' : '#f1f5f9',
                        color: amount === p.toFixed(2) ? '#ffffff' : '#475569',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ${p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gateway Channel Selection */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  Select Payment Method
                </label>
                <div style={{ display: 'grid', gap: 10 }}>
                  {/* Paynow Web: Visa / Mastercard / Zimswitch */}
                  <label
                    onClick={() => setMethod('paynow')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${method === 'paynow' ? '#2563eb' : '#e2e8f0'}`,
                      background: method === 'paynow' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="gatewayMethod"
                      checked={method === 'paynow'}
                      onChange={() => setMethod('paynow')}
                    />
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                      <i className="fas fa-credit-card" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        Paynow (Visa / Mastercard / Zimswitch)
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Instant online card & internet banking checkout
                      </div>
                    </div>
                  </label>

                  {/* EcoCash Mobile Money */}
                  <label
                    onClick={() => setMethod('ecocash')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${method === 'ecocash' ? '#059669' : '#e2e8f0'}`,
                      background: method === 'ecocash' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="gatewayMethod"
                      checked={method === 'ecocash'}
                      onChange={() => setMethod('ecocash')}
                    />
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                      <i className="fas fa-mobile-alt" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        EcoCash (Direct USSD Prompt)
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        PIN prompt pushed directly to your registered handset
                      </div>
                    </div>
                  </label>

                  {/* OneMoney */}
                  <label
                    onClick={() => setMethod('onemoney')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${method === 'onemoney' ? '#ea580c' : '#e2e8f0'}`,
                      background: method === 'onemoney' ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="gatewayMethod"
                      checked={method === 'onemoney'}
                      onChange={() => setMethod('onemoney')}
                    />
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                      <i className="fas fa-sim-card" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        OneMoney (NetOne Mobile)
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Instant mobile wallet push prompt
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mobile Phone Number (if EcoCash / OneMoney selected) */}
              {(method === 'ecocash' || method === 'onemoney') && (
                <div style={{ marginBottom: 18, animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mobile Number for PIN Prompt
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0771234567 or 0712345678"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    Enter standard Zimbabwean mobile format (e.g., 077X XXX XXX)
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <i className="fas fa-lock" />
                  Pay ${amount || '0'} Now
                </button>
              </div>
            </form>
          )}

          {step === 'PROCESSING' && (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{ display: 'inline-block', width: 56, height: 56, border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 18 }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Connecting to Paynow Secure Gateway...
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Encrypting transaction details and preparing your payment session.
              </p>
            </div>
          )}

          {step === 'WAITING_ECOCASH' && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.15)'
                }}
              >
                <i className="fas fa-mobile-alt fa-shake" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Check Your Mobile Handset
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                {instructions || `A PIN authorization prompt has been pushed to your mobile device (${phone}). Please enter your PIN to approve $${amount}.`}
              </p>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 18, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                <div>Reference: <strong>{activeReference}</strong></div>
                <div style={{ marginTop: 4 }}>
                  Auto-checking status... ({pollCountdown}s remaining)
                </div>
              </div>

              {/* Simulated approval button for sandbox/dev testing */}
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={handleSimulateApproval}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-check-double" style={{ marginRight: 6 }} /> Simulate PIN Approval (Test Mode)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('FORM')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel & Change Payment Method
              </button>
            </div>
          )}

          {step === 'WAITING_PAYNOW_TAB' && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 0 8px rgba(37, 99, 235, 0.15)'
                }}
              >
                <i className="fas fa-external-link-alt" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Complete Payment on Paynow
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                A secure checkout page has been opened. Complete your Visa / Mastercard / Zimswitch payment, and this screen will update automatically.
              </p>

              {redirectUrl && (
                <div style={{ marginBottom: 18 }}>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#2563eb',
                      color: '#ffffff',
                      padding: '10px 18px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}
                  >
                    <i className="fas fa-credit-card" /> Reopen Paynow Window
                  </a>
                </div>
              )}

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 18, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                <div>Reference: <strong>{activeReference}</strong></div>
                <div style={{ marginTop: 4 }}>
                  Waiting for gateway callback... ({pollCountdown}s)
                </div>
              </div>

              {/* Simulated approval button for sandbox/dev testing */}
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={handleSimulateApproval}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-check-double" style={{ marginRight: 6 }} /> Simulate Card Payment Approval
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('FORM')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back to Selection
              </button>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  margin: '0 auto 18px',
                  boxShadow: '0 0 0 10px rgba(22, 163, 74, 0.15)'
                }}
              >
                <i className="fas fa-check" />
              </div>

              <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                Payment Confirmed!
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748b' }}>
                ${parseFloat(amount).toFixed(2)} has been credited to {getPurposeLabel().toLowerCase()}.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'left',
                  marginBottom: 24
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Official Receipt #</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{receiptNumber || activeReference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Amount Settled</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>${parseFloat(amount).toFixed(2)} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Method</span>
                  <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{method}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                }}
              >
                Done & Return
              </button>
            </div>
          )}

          {step === 'FAILED' && (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 0 8px rgba(220, 38, 38, 0.15)'
                }}
              >
                <i className="fas fa-exclamation-triangle" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Payment Could Not Be Completed
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                {errorMessage || 'The payment could not be processed. Please check your network connection or mobile wallet balance and try again.'}
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  style={{
                    flex: 2,
                    padding: '11px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaynowCheckoutModal(props: PaynowCheckoutModalProps) {
  if (!props.isOpen) return null;
  return <PaynowCheckoutModalContent {...props} />;
}
