import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function MyPaymentSlip() {
  const [payslips, setPayslips] = useState<any[]>([]);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const res = await api.get('/api/payslips/my');
      setPayslips(res.data);
    } catch (error) {
      console.error('Error fetching payslips', error);
    
    }
  };

  const handleDownload = (slip: any) => {
    alert(`Downloading payslip for ${slip.period}`);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Payroll List</h1>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2>My payslip</h2>
        </div>
        <div className="portal-card-body">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>EMPLOYEE</th>
                <th>SUMMARY</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 50, color: '#a0aec0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <i className="fas fa-file-invoice-dollar fa-3x" style={{ color: '#ecc94b', marginBottom: 15 }}></i>
                    <span>No payslips found.</span>
                  </div>
                </td></tr>
              ) : (
                payslips.map((slip) => (
                  <tr key={slip.id}>
                    <td>{slip.id.substring(0, 8)}</td>
                    <td>You</td>
                    <td>
                      <div><strong>Basic Pay:</strong> Z${slip.basicPay}</div>
                      <div><strong>Net Pay:</strong> Z${slip.netPay}</div>
                    </td>
                    <td>{slip.period}</td>
                    <td>
                      <span style={{ 
                        background: slip.status === 'paid' ? 'var(--portal-success)' : '#ed8936', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        fontSize: '0.85rem' 
                      }}>
                        {slip.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button className="portal-btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDownload(slip)}>
                        <i className="fas fa-download"></i> View / Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
