import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

export default function ParentFees() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const statements = [
    { term: 'Term 1, 2024', billed: 1200, paid: 1200, balance: 0, status: 'Settled' },
    { term: 'Term 2, 2024', billed: 1250, paid: 0, balance: 1250, status: 'Unpaid' },
  ];

  const transactions = [
    { date: '2024-01-15', ref: 'PAY-882194', method: 'Bank Transfer', amount: 1200, status: 'Verified' },
    { date: '2024-05-10', ref: 'PAY-991023', method: 'Ecocash', amount: 450, status: 'Pending Verification' },
  ];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
        showToast('Proof of payment uploaded successfully! Our bursar team will verify it shortly.', 'success');
        setLoading(false);
    }, 1500);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Fees & Payments</h1>
        <p>Review financial statements, manage payments, and upload proof of transactions.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info"><h3>$1,250</h3><p>Total Outstanding</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-double"></i></div>
          <div className="portal-stat-info"><h3>$1,650</h3><p>Total Paid (2024)</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-clock"></i></div>
          <div className="portal-stat-info"><h3>$0</h3><p>Credit Balance</p></div>
        </div>
      </div>

      <div className="portal-grid-12-18">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Payment Gateway */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-credit-card" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Secure Online Payment</h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'grid', gap: 12 }}>
                <button className="portal-btn-secondary" style={{ padding: '15px', justifyContent: 'flex-start', background: '#f8f9ff', borderColor: 'var(--school-primary, #3182ce)' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                    <i className="fas fa-university fa-lg" style={{ color: 'var(--school-primary, #3182ce)', width: 24 }}></i>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Instant Bank Transfer</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Secure immediate settlement</div>
                    </div>
                </button>
                <button className="portal-btn-secondary" style={{ padding: '15px', justifyContent: 'flex-start' }} onClick={() => alert('This feature is currently under development or disabled.')}>
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
               <form onSubmit={handleUpload}>
                  <div className="portal-form-group">
                     <label>Select Document (PDF/Image)</label>
                     <input type="file" className="portal-input" accept="image/*,application/pdf" capture="environment" required />
                  </div>
                  <div className="portal-form-group">
                     <label>Reference / Transaction No</label>
                     <input type="text" className="portal-input" placeholder="e.g. EBX-102938" required />
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                     {loading ? 'Uploading...' : 'Upload Proof of Payment'}
                  </button>
               </form>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Statements */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Fee Statements</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead><tr><th>Term Period</th><th>Billed</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {statements.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.term}</td>
                      <td>${s.billed}</td>
                      <td>${s.paid}</td>
                      <td><span className={`portal-badge ${s.status === 'Settled' ? 'success' : 'danger'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction History */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-history" style={{ marginRight: 8, color: '#805ad5' }}></i>Recent Transactions</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead><tr><th>Date</th><th>Ref</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td>
                      <td style={{ fontSize: '0.75rem', color: '#718096' }}>{t.ref}</td>
                      <td style={{ fontWeight: 600 }}>${t.amount}</td>
                      <td><span className={`portal-badge ${t.status === 'Verified' ? 'success' : 'warning'}`} style={{ fontSize: '0.65rem' }}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

