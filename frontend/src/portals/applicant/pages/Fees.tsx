import { useState } from 'react';

export default function ApplicantFees() {
  const [fees] = useState([
    { name: 'Application Processing Fee', amount: '$25.00', status: 'Paid', date: '2024-10-15', ref: 'PAY-8821' },
    { name: 'Entrance Aptitude Test Fee', amount: '$15.00', status: 'Pending', date: '-', ref: '-' },
    { name: 'Acceptance Deposit', amount: '$250.00', status: 'Upcoming', date: '-', ref: '-' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Fees & Payments</h1>
        <p>Manage application-related costs and track your payment history.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Payment Schedule</h2>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}>Pay Outstanding</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Service/Fee</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Ref Number</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ fontWeight: 700 }}>{f.amount}</td>
                  <td>
                    <span className={`portal-badge ${
                      f.status === 'Paid' ? 'success' : 
                      f.status === 'Pending' ? 'warning' : 'neutral'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td>{f.date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{f.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2>Payment Methods</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <i className="fas fa-university" style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)', marginBottom: 10 }}></i>
              <h4 style={{ margin: '0 0 5px' }}>Bank Transfer</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>CBZ Bank, Harare Branch</p>
            </div>
            <div style={{ border: '2px solid var(--school-primary, #3182ce)', borderRadius: 12, padding: 20, textAlign: 'center', background: '#ebf8ff' }}>
              <i className="fas fa-mobile-alt" style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)', marginBottom: 10 }}></i>
              <h4 style={{ margin: '0 0 5px' }}>Mobile Money</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#2c5282' }}>Ecocash / OneMoney</p>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <i className="fas fa-credit-card" style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)', marginBottom: 10 }}></i>
              <h4 style={{ margin: '0 0 5px' }}>Card Payment</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>Pay online via Paynow</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
