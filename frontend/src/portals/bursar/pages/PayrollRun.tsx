import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

export default function BursarPayrollRun() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'run' | 'leave-impact' | 'payslips' | 'export'>('run');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [leaveImpacts, setLeaveImpacts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchPayrollRuns();
    fetchLeaveImpacts();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      const res = await api.get('/api/payroll/runs');
      setRuns(res.data || []);
      if (res.data?.length > 0) {
        fetchEntriesForRun(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaveImpacts = async () => {
    try {
      const res = await api.get('/api/leave/payroll-consequences');
      setLeaveImpacts(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEntriesForRun = async (runId: string) => {
    try {
      const res = await api.get(`/api/payroll/runs/${runId}/entries`);
      setEntries(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    setLoadingAction('generate');
    try {
      await api.post('/api/payroll/generate', { month: selectedMonth, year: selectedYear });
      showToast('Payroll generated successfully with all leave deductions and PAYE taxes applied.', 'success');
      fetchPayrollRuns();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to generate payroll run', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async (id: string) => {
    setLoadingAction(`approve-${id}`);
    try {
      await api.patch(`/api/payroll/runs/${id}/approve`);
      showToast('Payroll run approved by Head / Admin.', 'success');
      fetchPayrollRuns();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to approve payroll run', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBankExport = (runId: string) => {
    window.open(`/api/payroll/runs/${runId}/bank-export`, '_blank');
  };

  const latestRun = runs[0] || null;

  return (
    <>
      <div className="portal-page-header">
        <h1>Payroll Disbursement Suite</h1>
        <p>Manage monthly salary processing, automated leave consequence deductions, and statutory bank distributions.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        <button
          className={`portal-btn-${activeTab === 'run' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('run')}
        >
          <i className="fas fa-calculator" style={{ marginRight: 6 }}></i>
          Run Payroll
        </button>
        <button
          className={`portal-btn-${activeTab === 'leave-impact' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('leave-impact')}
        >
          <i className="fas fa-calendar-minus" style={{ marginRight: 6 }}></i>
          Leave Payroll Impact ({leaveImpacts.filter(l => l.estimatedDeduction > 0).length})
        </button>
        <button
          className={`portal-btn-${activeTab === 'payslips' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('payslips')}
        >
          <i className="fas fa-file-invoice-dollar" style={{ marginRight: 6 }}></i>
          Payslips & Breakdown
        </button>
        <button
          className={`portal-btn-${activeTab === 'export' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('export')}
        >
          <i className="fas fa-university" style={{ marginRight: 6 }}></i>
          Bank Export
        </button>
      </div>

      {activeTab === 'run' && (
        <>
          <div className="portal-grid-3">
            <div className="portal-card">
              <div className="portal-card-body">
                <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Total Net Payable</p>
                <h2 style={{ margin: 0, color: 'var(--school-primary, #3182ce)' }}>
                  ${(latestRun?.totalNet || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            <div className="portal-card">
              <div className="portal-card-body">
                <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Total Deductions & Tax (PAYE)</p>
                <h2 style={{ margin: 0, color: 'var(--portal-danger)' }}>
                  ${(latestRun?.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            <div className="portal-card">
              <div className="portal-card-body">
                <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Processed Staff Count</p>
                <h2 style={{ margin: 0, color: '#2d3748' }}>{latestRun?.employeesCount || 0}</h2>
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: 20 }}>
            <div className="portal-card-header">
              <h2><i className="fas fa-play-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Process New Payroll Run</h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: 15 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#4a5568', marginBottom: 4 }}>Month</label>
                  <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="portal-input"
                    style={{ width: 140 }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>Month {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#4a5568', marginBottom: 4 }}>Year</label>
                  <input 
                    type="number" 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="portal-input"
                    style={{ width: 100 }}
                  />
                </div>
                <div style={{ paddingTop: 20 }}>
                  <button 
                    className="portal-btn-primary" 
                    onClick={handleGenerate}
                    disabled={loadingAction === 'generate'}
                  >
                    {loadingAction === 'generate' ? 'Generating...' : 'Calculate & Generate Run'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: 20 }}>
            <div className="portal-card-header">
              <h2>Recent Payroll Batches</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Batch Period</th>
                    <th>Staff Count</th>
                    <th>Gross</th>
                    <th>Deductions / PAYE</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.month}/{r.year}</strong></td>
                      <td>{r.employeesCount}</td>
                      <td>${r.totalGross.toFixed(2)}</td>
                      <td>${r.totalDeductions.toFixed(2)}</td>
                      <td>${r.totalNet.toFixed(2)}</td>
                      <td>
                        <span className={`portal-badge ${r.status === 'Approved' ? 'success' : 'neutral'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.status !== 'Approved' && (
                            <button
                              className="portal-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => handleApprove(r.id)}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            className="portal-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => { fetchEntriesForRun(r.id); setActiveTab('payslips'); }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>
                        No payroll runs recorded yet. Generate your first run above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'leave-impact' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Approved Leaves & Salary Consequence Summary</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>
              Unpaid leave and sick leaves exceeding the 14-day threshold are automatically factored into payroll run calculations.
            </p>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Base Pay</th>
                  <th>Salary Impact</th>
                  <th>Deduction Amount</th>
                </tr>
              </thead>
              <tbody>
                {leaveImpacts.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div><strong>{l.employeeName}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>{l.employeeRole}</div>
                    </td>
                    <td><span className="portal-badge neutral">{l.leaveType}</span></td>
                    <td>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()} ({l.days} days)</td>
                    <td>${(l.basePay || 0).toFixed(2)}</td>
                    <td>
                      <span className={`portal-badge ${l.impactType === 'PAID' ? 'success' : 'danger'}`}>
                        {l.impactType}
                      </span>
                    </td>
                    <td>
                      {l.estimatedDeduction > 0 ? (
                        <strong style={{ color: 'var(--portal-danger)' }}>-${l.estimatedDeduction.toFixed(2)}</strong>
                      ) : (
                        <span style={{ color: '#a0aec0' }}>$0.00</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveImpacts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>
                      No approved staff leaves recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payslips' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Employee Paystubs & Deductions Breakdown</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Job Title</th>
                  <th>Basic Gross</th>
                  <th>Allowances</th>
                  <th>Deductions / PAYE</th>
                  <th>Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.employeeName}</strong></td>
                    <td>{e.jobTitle || 'Staff'}</td>
                    <td>${e.grossSalary.toFixed(2)}</td>
                    <td>${e.totalAllowances.toFixed(2)}</td>
                    <td>${e.totalDeductions.toFixed(2)}</td>
                    <td><strong style={{ color: 'var(--school-primary, #3182ce)' }}>${e.netSalary.toFixed(2)}</strong></td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>
                      Select a payroll batch or generate one to preview payslips.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Electronic Bank Batch File Export</h2>
          </div>
          <div className="portal-card-body">
            <p style={{ color: '#4a5568', marginBottom: 20 }}>
              Export bank-ready batch transfer CSV files for automated salary disbursements (CBZ, Stanbic, FBC, or CABS standard formats).
            </p>
            {latestRun ? (
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <div>
                  <strong>Active Batch: {latestRun.month}/{latestRun.year}</strong> — Net Payable: ${latestRun.totalNet.toFixed(2)}
                </div>
                <button
                  className="portal-btn-primary"
                  onClick={() => handleBankExport(latestRun.id)}
                >
                  <i className="fas fa-file-csv" style={{ marginRight: 6 }}></i>
                  Download Bank CSV Export
                </button>
              </div>
            ) : (
              <p style={{ color: '#a0aec0' }}>No payroll batches available for bank export.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

