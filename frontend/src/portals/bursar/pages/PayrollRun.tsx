import { useState } from 'react';

export default function BursarPayrollRun() {
  const [activePayroll] = useState({
    period: 'October 2024',
    totalStaff: 82,
    totalGross: '$42,500.00',
    totalTax: '$6,375.00',
    totalNet: '$36,125.00',
    status: 'Draft'
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Payroll Disbursement Run</h1>
        <p>Review and authorize salary payments for the current billing cycle.</p>
      </div>

      <div className="portal-grid-3">
        <div className="portal-card">
          <div className="portal-card-body">
            <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Total Net Payable</p>
            <h2 style={{ margin: 0, color: 'var(--school-primary, #3182ce)' }}>{activePayroll.totalNet}</h2>
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-body">
            <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Tax Obligations (PAYE)</p>
            <h2 style={{ margin: 0, color: 'var(--portal-danger)' }}>{activePayroll.totalTax}</h2>
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-body">
            <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Staff Count</p>
            <h2 style={{ margin: 0, color: '#2d3748' }}>{activePayroll.totalStaff}</h2>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-play-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Start Payroll Run - {activePayroll.period}</h2>
          <span className="portal-badge neutral">{activePayroll.status}</span>
        </div>
        <div className="portal-card-body">
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: '0.9rem', color: '#4a5568' }}>
              Performing this operation will generate electronic paystubs for all active employees and update the financial ledger. 
              Ensure all leave deductions and bonus adjustments have been finalized.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 15 }}>
            <button className="portal-btn-primary" style={{ padding: '12px 24px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Authorize Disbursement</button>
            <button className="portal-btn-secondary" style={{ padding: '12px 24px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Simulate Pre-Run</button>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2>Detailed Breakdown</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Staff Count</th>
                <th>Gross Amount</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Teaching Staff</td>
                <td>42</td>
                <td>$28,000.00</td>
                <td>$23,800.00</td>
              </tr>
              <tr>
                <td>Admin & Support</td>
                <td>12</td>
                <td>$6,500.00</td>
                <td>$5,525.00</td>
              </tr>
              <tr>
                <td>Ancillary Staff</td>
                <td>28</td>
                <td>$8,000.00</td>
                <td>$6,800.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
