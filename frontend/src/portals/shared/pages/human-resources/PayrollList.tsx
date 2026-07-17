import React, { useState } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
interface PayrollEntry {
  id: string;
  employeeName: string;
  jobTitle: string;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  isPaid: boolean;
  user?: {
    employeeProfile?: {
      bankName?: string;
      bankBranch?: string;
      branchCode?: string;
      accountType?: string;
      accountNumber?: string;
      accountHolderName?: string;
    } | null;
  } | null;
}

export default function PayrollList() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/payroll/entries?month=${month}&year=${year}`);
      setEntries(response.data);
      setSearched(true);
    } catch (error) {
      console.error('Failed to fetch payroll list', error);
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h3>Employee Payroll Registry</h3>
        <p>Select month and year to view generated payroll details</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div>
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="portal-input"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="portal-input"
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={getInfo}
            disabled={loading}
            className="portal-btn-primary" 
            style={{ flex: 1, background: 'var(--portal-success)', borderColor: 'var(--portal-success)', height: '52px', borderRadius: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} GET INFO
          </button>
          
          <button 
            onClick={async () => {
              if (await toastConfirm(`Generate payroll for ${months[month-1]} ${year}?`)) {
                setLoading(true);
                try {
                  await api.post('/api/payroll/generate', { month, year });
                  showToast('Payroll generated successfully!', 'success');
                  getInfo();
                } catch (err: any) {
                  showToast(err.response?.data?.error || 'Failed to generate payroll', 'error');
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            className="portal-btn-primary" 
            style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <i className="fas fa-cog"></i> GENERATE
          </button>
        </div>
      </div>

      {searched && entries.length === 0 && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 500 }}>
          <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i> Sorry! No payroll entries found for the selected period.
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table className="management-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>JOB TITLE</th>
                <th>BANK DETAILS</th>
                <th>BASIC</th>
                <th>ALLOWANCES</th>
                <th>DEDUCTIONS</th>
                <th>NET SALARY</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{entry.employeeName}</td>
                  <td>{entry.jobTitle}</td>
                  <td>
                    {entry.user?.employeeProfile?.accountNumber ? (
                      <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                        {entry.user.employeeProfile.accountType ? `[${entry.user.employeeProfile.accountType}] ` : ''}
                        {entry.user.employeeProfile.bankName} 
                        {entry.user.employeeProfile.branchCode ? ` (${entry.user.employeeProfile.branchCode})` : ''} 
                        {` - ${entry.user.employeeProfile.accountNumber}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Not Provided</span>
                    )}
                  </td>
                  <td>${entry.grossSalary.toFixed(2)}</td>
                  <td style={{ color: 'var(--portal-success)', fontWeight: 600 }}>+${entry.totalAllowances.toFixed(2)}</td>
                  <td style={{ color: 'var(--portal-danger)', fontWeight: 600 }}>-${entry.totalDeductions.toFixed(2)}</td>
                  <td style={{ fontWeight: 800, color: '#1e293b' }}>${entry.netSalary.toFixed(2)}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: entry.isPaid ? 'rgba(56, 161, 105, 0.1)' : 'rgba(229, 62, 62, 0.1)', 
                      color: entry.isPaid ? 'var(--portal-success)' : 'var(--portal-danger)'
                    }}>
                      {entry.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Payslip" onClick={() => showToast('This feature is currently under development or disabled.', 'warning')}>
                      <i className="fas fa-file-invoice"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {entries.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, entries.length)} of {entries.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || entries.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
