import { useEffect, useState, useRef } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface Fee {
  term: string;
  year: number;
  amount: number;
  paid: number;
  status: string;
  dueDate?: string;
}

const statusColors: Record<string, string> = {
  paid: 'success', partial: 'warning', unpaid: 'danger', overdue: 'danger',
};

export default function StudentFees() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    api.get('/api/students/me/dashboard')
      .then(r => setFees(r.data.fees || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSimulatePayment = () => {
    setProcessingPayment(true);
    setTimeout(() => {
      setProcessingPayment(false);
      setPaymentModalOpen(false);
      showToast('Payment processed successfully via ' + paymentMethod, 'success');
      // Update local state to reflect payment (mock)
      if (fees.length > 0) {
        const updatedFees = [...fees];
        updatedFees[0].paid = updatedFees[0].amount;
        updatedFees[0].status = 'paid';
        setFees(updatedFees);
      }
    }, 2000);
  };

  const totalBilled = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <>
      <div className="portal-page-header">
        <h1>Fees & Payments</h1>
        <p>Your fee schedule and payment history</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="portal-stat-info"><h3>${totalBilled}</h3><p>Total Billed</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="portal-stat-info"><h3>${totalPaid}</h3><p>Total Paid</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info"><h3>${outstanding}</h3><p>Outstanding</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon teal"><i className="fas fa-percentage"></i></div>
          <div className="portal-stat-info">
            <h3>{totalBilled ? Math.round((totalPaid / totalBilled) * 100) : 0}%</h3>
            <p>Paid</p>
          </div>
        </div>
      </div>

      {outstanding > 0 && (
        <div className="portal-alert error" style={{ marginBottom: 20 }}>
          <i className="fas fa-exclamation-circle"></i>
          You have an outstanding balance of <strong>${outstanding}</strong>. Please contact the Bursar's office.
        </div>
      )}

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-receipt" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Fee Schedule</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}><i className="fas fa-spinner fa-spin"></i></div>
          ) : fees.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No fee records found.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr><th>Term</th><th>Year</th><th>Total Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {fees.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{f.term}</td>
                    <td>{f.year}</td>
                    <td>${f.amount}</td>
                    <td style={{ color: 'var(--portal-success)', fontWeight: 600 }}>${f.paid}</td>
                    <td style={{ color: f.amount - f.paid > 0 ? 'var(--portal-danger)' : 'var(--portal-success)', fontWeight: 700 }}>
                      ${f.amount - f.paid}
                    </td>
                    <td><span className={`portal-badge ${statusColors[f.status] || 'neutral'}`}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Payment Gateway */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-credit-card" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Secure Online Payment</h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'grid', gap: 12 }}>
                <button className="portal-btn-secondary" style={{ padding: '15px', justifyContent: 'flex-start', background: '#f8f9ff', borderColor: 'var(--school-primary, #3182ce)' }} 
                  onClick={() => { setPaymentMethod('Bank Transfer'); setPaymentModalOpen(true); }}>
                    <i className="fas fa-university fa-lg" style={{ color: 'var(--school-primary, #3182ce)', width: 24 }}></i>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Instant Bank Transfer</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Secure immediate settlement</div>
                    </div>
                </button>
                <button className="portal-btn-secondary" style={{ padding: '15px', justifyContent: 'flex-start' }} 
                  onClick={() => { setPaymentMethod('Mobile Money'); setPaymentModalOpen(true); }}>
                    <i className="fas fa-mobile-alt fa-lg" style={{ color: 'var(--portal-success)', width: 24 }}></i>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Mobile Money (Ecocash/Innbucks)</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Pay via your mobile phone</div>
                    </div>
                </button>
              </div>
            </div>
          </div>

          {/* Proof of Payment Upload */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-upload" style={{ marginRight: 8, color: '#ed8936' }}></i>Submit Proof of Payment</h2>
            </div>
            <div className="portal-card-body">
               <form ref={formRef} onSubmit={(e: any) => {
                  e.preventDefault();
                  showToast('Proof of payment submitted successfully! Our bursar team will verify it shortly.', 'success');
                  if (formRef.current) formRef.current.reset();
               }}>
                  <div className="portal-form-group">
                     <label>Select Document (PDF/Image)</label>
                     <input type="file" className="portal-input" required />
                  </div>
                  <div className="portal-form-group">
                     <label>Reference / Transaction No</label>
                     <input type="text" className="portal-input" placeholder="e.g. EBX-102938" required />
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                     Upload Proof of Payment
                  </button>
               </form>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-info-circle" style={{ marginRight: 8, color: '#805ad5' }}></i>Legacy Payment Info</h2>
            </div>
            <div className="portal-card-body">
              <h4 style={{ margin: '0 0 8px', color: '#333' }}>Bank Details</h4>
              <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, fontSize: '0.9rem', color: '#4a5568' }}>
                <strong>Bank:</strong> CBZ Bank<br/>
                <strong>Account:</strong> 01123456789012<br/>
                <strong>Branch:</strong> Kwame Nkrumah<br/>
                <strong>Ref:</strong> [Your Student ID]
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className={`fas ${paymentMethod === 'Bank Transfer' ? 'fa-university text-primary' : 'fa-mobile-alt text-success'}`}></i>
                Secure Payment Checkout
              </h2>
              <button className="portal-btn-ghost" onClick={() => setPaymentModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ padding: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Amount Due</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>${outstanding.toFixed(2)}</div>
              </div>
              
              <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                <label>Amount to Pay</label>
                <input type="number" className="portal-input" defaultValue={outstanding} max={outstanding} min={1} />
              </div>

              {paymentMethod === 'Mobile Money' && (
                <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                  <label>Ecocash / Innbucks Mobile Number</label>
                  <input type="text" className="portal-input" placeholder="e.g. 077X XXX XXX" />
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                    A prompt will be sent to your phone to authorize the transaction.
                  </p>
                </div>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                  <label>Card Number</label>
                  <input type="text" className="portal-input" placeholder="XXXX XXXX XXXX XXXX" />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input type="text" className="portal-input" placeholder="MM/YY" />
                    <input type="text" className="portal-input" placeholder="CVV" />
                  </div>
                </div>
              )}

              <button 
                className="portal-btn-primary w-full" 
                style={{ justifyContent: 'center', padding: '12px' }}
                onClick={handleSimulatePayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> Processing...</>
                ) : (
                  <><i className="fas fa-lock mr-2"></i> Confirm Payment</>
                )}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <i className="fas fa-shield-alt mr-1"></i> Secured by Paynow Gateway
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
