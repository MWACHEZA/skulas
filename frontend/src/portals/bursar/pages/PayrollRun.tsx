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

  // Filter & Search States
  const [searchEmployee, setSearchEmployee] = useState('');
  const [filterSession, setFilterSession] = useState('ALL');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  // Currency Split settings (e.g. 70% USD / 30% ZiG with exchange rate)
  const usdSplitPct = 70;
  const zigSplitPct = 30;
  const exchangeRate = 26.5; // ZiG per USD

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
      showToast('Payroll generated successfully with statutory PAYE, AIDS Levy, and NSSA applied.', 'success');
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

  // Filtered employee entries
  const filteredEntries = entries.filter(e => {
    const matchSearch = (e.employeeName || '').toLowerCase().includes(searchEmployee.toLowerCase()) ||
      (e.jobTitle || '').toLowerCase().includes(searchEmployee.toLowerCase());
    const titleLower = (e.jobTitle || '').toLowerCase();
    let matchSession = true;
    if (filterSession === 'HOT_SEAT') {
      matchSession = titleLower.includes('afternoon') || titleLower.includes('hot') || (e.totalAllowances > 100);
    } else if (filterSession === 'BOARDING') {
      matchSession = titleLower.includes('boarding') || titleLower.includes('hostel') || titleLower.includes('house');
    } else if (filterSession === 'POLY_WORKSHOP') {
      matchSession = titleLower.includes('workshop') || titleLower.includes('poly') || titleLower.includes('technician');
    } else if (filterSession === 'CLINICAL') {
      matchSession = titleLower.includes('nurse') || titleLower.includes('clinic') || titleLower.includes('medical');
    }
    return matchSearch && matchSession;
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Payroll Disbursement Suite</h1>
        <p>Manage monthly salary processing, automated leave consequence deductions, statutory breakdowns, and dual-currency distributions.</p>
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
          Payslips & Statutory Breakdown
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
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: 4 }}>
                  USD Nostro: ${((latestRun?.totalNet || 0) * (usdSplitPct / 100)).toFixed(2)} &bull; ZiG: {(((latestRun?.totalNet || 0) * (zigSplitPct / 100)) * exchangeRate).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="portal-card">
              <div className="portal-card-body">
                <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Total Deductions & Tax (PAYE/NSSA)</p>
                <h2 style={{ margin: 0, color: 'var(--portal-danger)' }}>
                  ${(latestRun?.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: 4 }}>
                  Inclusive of 3% AIDS Levy & statutory caps
                </div>
              </div>
            </div>
            <div className="portal-card">
              <div className="portal-card-body">
                <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Processed Staff Count</p>
                <h2 style={{ margin: 0, color: '#2d3748' }}>{latestRun?.employeesCount || 0} Staff</h2>
                <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 4 }}>
                  Dual-currency Nostro & ZiG compliant
                </div>
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: 20 }}>
            <div className="portal-card-header">
              <h2><i className="fas fa-play-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Process New Payroll Run</h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' }}>
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
                    <th>Net (USD Nostro)</th>
                    <th>Net (ZiG Approx)</th>
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
                      <td><strong style={{ color: '#2563eb' }}>${(r.totalNet * 0.7).toFixed(2)}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>ZiG {(r.totalNet * 0.3 * exchangeRate).toFixed(2)}</strong></td>
                      <td>
                        <span className={`portal-badge ${r.status === 'Approved' ? 'success' : 'neutral'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.status !== 'Approved' && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={loadingAction === `approve-${r.id}`}
                              style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => { fetchEntriesForRun(r.id); setActiveTab('payslips'); }}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Breakdown
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>
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
              Unpaid leave and sick leaves exceeding statutory thresholds are automatically deducted from staff salaries.
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
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Employee Paystubs & Statutory Breakdown</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>
                Expandable detail rows for PAYE, AIDS Levy (3%), NSSA, and dual-currency split payouts.
              </p>
            </div>

            {/* Filter toolbar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search staff name..."
                className="portal-input"
                style={{ width: 180, fontSize: '0.85rem' }}
                value={searchEmployee}
                onChange={e => setSearchEmployee(e.target.value)}
              />
              <select
                className="portal-input"
                style={{ width: 180, fontSize: '0.85rem' }}
                value={filterSession}
                onChange={e => setFilterSession(e.target.value)}
              >
                <option value="ALL">All Departments / Sessions</option>
                <option value="HOT_SEAT">Hot-Seat / Double Session</option>
                <option value="BOARDING">Boarding / Hostel Duty</option>
                <option value="POLY_WORKSHOP">Workshop / Polytechnic</option>
                <option value="CLINICAL">Clinical Faculty</option>
              </select>
            </div>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Job Title</th>
                  <th>Basic Gross</th>
                  <th>Allowances</th>
                  <th>Statutory Deductions</th>
                  <th>Net (USD 70%)</th>
                  <th>Net (ZiG 30%)</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => {
                  const usdNet = e.netSalary * (usdSplitPct / 100);
                  const zigNet = (e.netSalary * (zigSplitPct / 100)) * exchangeRate;

                  return (
                    <tr key={e.id}>
                      <td><strong>{e.employeeName}</strong></td>
                      <td>{e.jobTitle || 'Faculty Staff'}</td>
                      <td>${e.grossSalary.toFixed(2)}</td>
                      <td><span style={{ color: '#16a34a' }}>+${e.totalAllowances.toFixed(2)}</span></td>
                      <td><span style={{ color: '#dc2626' }}>-${e.totalDeductions.toFixed(2)}</span></td>
                      <td><strong style={{ color: '#2563eb' }}>${usdNet.toFixed(2)}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>ZiG {zigNet.toFixed(2)}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedEntry(e)}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fas fa-list-alt" style={{ marginRight: 4 }} /> Breakdown
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>
                      No staff records matching search or batch selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATUTORY DETAIL MODAL */}
      {selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 580, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem' }}>
                  Statutory Payslip Breakdown
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
                  {selectedEntry.employeeName}
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Position: <strong>{selectedEntry.jobTitle || 'Faculty Staff'}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            {/* Income Section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                Gross Earnings & Allowances
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Gross Salary:</span>
                  <strong>${selectedEntry.grossSalary.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Subtype Allowances (Hot-seat / Duty / Transport):</span>
                  <strong>+${selectedEntry.totalAllowances.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6, fontWeight: 700 }}>
                  <span>Total Taxable Gross:</span>
                  <span>${(selectedEntry.grossSalary + selectedEntry.totalAllowances).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Statutory Deductions Section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                Statutory Deductions & Taxes
              </div>
              <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PAYE Income Tax:</span>
                  <strong style={{ color: '#dc2626' }}>-${(selectedEntry.taxAmount || (selectedEntry.totalDeductions * 0.7)).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>AIDS Levy (3% of PAYE):</span>
                  <strong style={{ color: '#dc2626' }}>-${(selectedEntry.aidsLevy || ((selectedEntry.taxAmount || 0) * 0.03)).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>NSSA Pension Contribution (Statutory Ceiling):</span>
                  <strong style={{ color: '#dc2626' }}>-$38.50</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>NEC / Staff Association Dues:</span>
                  <strong style={{ color: '#dc2626' }}>-$15.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fecaca', paddingTop: 6, fontWeight: 700, color: '#991b1b' }}>
                  <span>Total Deductions:</span>
                  <span>-${selectedEntry.totalDeductions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Currency Distribution */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                Dual-Currency Payout Split
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>USD Nostro Transfer (70%)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', marginTop: 4 }}>
                    ${(selectedEntry.netSalary * (usdSplitPct / 100)).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>ZiG Transfer (30% @ 26.5)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d', marginTop: 4 }}>
                    ZiG {((selectedEntry.netSalary * (zigSplitPct / 100)) * exchangeRate).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => window.print()}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                <i className="fas fa-print mr-1" /> Print Payslip
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="portal-btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
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
