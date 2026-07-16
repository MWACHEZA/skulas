import { useState } from 'react';

export default function BursarFinancialReconciliation() {
  const [reconciliations] = useState([
    { id: 'REC-2024-05', period: 'October 2024', totalIn: '$52,140.00', totalOut: '$38,200.00', variance: '$0.00', status: 'Balanced' },
    { id: 'REC-2024-04', period: 'September 2024', totalIn: '$48,900.00', totalOut: '$42,300.00', variance: '-$120.00', status: 'Flagged' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Financial Reconciliation</h1>
        <p>Cross-reference school bank statements with portal ledger entries to ensure total financial accuracy.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-balance-scale" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Monthly Reconciliations</h2>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}>+ New Reconciliation</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Total Inflow</th>
                <th>Total Outflow</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.period}</td>
                  <td>{r.totalIn}</td>
                  <td>{r.totalOut}</td>
                  <td style={{ color: r.variance === '$0.00' ? '#2f855a' : 'var(--portal-danger)', fontWeight: 700 }}>{r.variance}</td>
                  <td>
                    <span className={`portal-badge ${r.status === 'Balanced' ? 'success' : 'danger'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button className="portal-btn-secondary" style={{ padding: '6px 12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Review Logs</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
