import React, { useState } from 'react';
import api, { BASE_URL } from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useAuth } from '../../../../contexts/AuthContext';

interface BankAccount {
  bankName?: string;
  bankBranch?: string;
  branchCode?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
}

interface PayrollEntry {
  id: string;
  employeeName: string;
  jobTitle: string;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  isPaid: boolean;
  payrollRun?: { month: number; year: number };
  user?: {
    employeeProfile?: {
      // USD
      bankName?: string;
      bankBranch?: string;
      branchCode?: string;
      accountType?: string;
      accountNumber?: string;
      accountHolderName?: string;
      // ZiG
      bankNameZig?: string;
      bankBranchZig?: string;
      branchCodeZig?: string;
      accountTypeZig?: string;
      accountNumberZig?: string;
      accountHolderNameZig?: string;
    } | null;
  } | null;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function BankBadge({ label, account, color }: { label: string; account: BankAccount; color: string }) {
  if (!account.accountNumber) return null;
  return (
    <div style={{ fontSize: '0.75rem', marginBottom: '4px', padding: '3px 6px', borderRadius: '4px', background: color === 'blue' ? '#eff6ff' : '#fefce8', borderLeft: `3px solid ${color === 'blue' ? '#3b82f6' : '#f59e0b'}` }}>
      <span style={{ fontWeight: 700, color: color === 'blue' ? '#1d4ed8' : '#92400e' }}>{label}: </span>
      <span style={{ color: '#475569' }}>
        {account.bankName}{account.branchCode ? ` (${account.branchCode})` : ''} — {account.accountNumber}
        {account.accountType ? ` [${account.accountType}]` : ''}
      </span>
    </div>
  );
}

export default function PayrollList() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  // Payslip modal state
  const [payslipEntry, setPayslipEntry] = useState<PayrollEntry | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/payroll/entries?month=${month}&year=${year}`);
      setEntries(response.data);
      setSearched(true);
    } catch (error) {
      console.error('Failed to fetch payroll list', error);
      showToast('Failed to fetch payroll entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resolve the school logo URL from branding
  const schoolLogo = currentUser?.schoolBranding?.logo
    ? (currentUser.schoolBranding.logo.startsWith('http')
        ? currentUser.schoolBranding.logo
        : `${BASE_URL}/api/storage/file/${currentUser.schoolBranding.logo}`)
    : null;

  const handlePrintPayslip = (entry: PayrollEntry) => {
    const ep = entry.user?.employeeProfile;
    const schoolName = currentUser?.schoolName || 'School Name';
    const payMonth = entry.payrollRun?.month ?? month;
    const payYear = entry.payrollRun?.year ?? year;

    const logoHtml = schoolLogo
      ? `<img src="${schoolLogo}" alt="Logo" style="height:80px;display:block;margin:0 auto 10px" crossorigin="anonymous"/>`
      : '';

    const usdAccount = (ep?.accountNumber)
      ? `<tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;background:#eff6ff">💵 USD Account</td>
           <td style="padding:6px;border:1px solid #e2e8f0">${ep.bankName || ''} ${ep.branchCode ? `(${ep.branchCode})` : ''} — ${ep.accountNumber} [${ep.accountType || ''}]</td></tr>`
      : '';
    const zigAccount = (ep?.accountNumberZig)
      ? `<tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;background:#fefce8">🪙 ZiG Account</td>
           <td style="padding:6px;border:1px solid #e2e8f0">${ep.bankNameZig || ''} ${ep.branchCodeZig ? `(${ep.branchCodeZig})` : ''} — ${ep.accountNumberZig} [${ep.accountTypeZig || ''}]</td></tr>`
      : '';

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Payslip</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Times New Roman",Times,serif;padding:2cm;color:#000}
table{border-collapse:collapse;width:100%}@page{margin:2cm}@media print{body{padding:0}}</style></head>
<body>
  <div style="text-align:center;border-top:6px solid #1d4ed8;border-bottom:2px solid #1d4ed8;padding:16px 0 12px;margin-bottom:24px">
    ${logoHtml}
    <h1 style="font-size:1.8rem;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8">${schoolName}</h1>
    <h2 style="font-size:1.2rem;margin-top:6px">EMPLOYEE PAYSLIP — ${months[payMonth - 1].toUpperCase()} ${payYear}</h2>
  </div>
  <table style="margin-bottom:18px">
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;width:35%">Employee Name</td><td style="padding:6px;border:1px solid #e2e8f0">${entry.employeeName}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600">Job Title</td><td style="padding:6px;border:1px solid #e2e8f0">${entry.jobTitle}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600">Pay Period</td><td style="padding:6px;border:1px solid #e2e8f0">${months[payMonth - 1]} ${payYear}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600">Payment Status</td><td style="padding:6px;border:1px solid #e2e8f0">${entry.isPaid ? '✅ PAID' : '⏳ UNPAID'}</td></tr>
  </table>
  <table style="margin-bottom:18px">
    <thead><tr style="background:#1d4ed8;color:#fff"><th colspan="2" style="padding:8px;text-align:left">EARNINGS &amp; DEDUCTIONS</th></tr></thead>
    <tr><td style="padding:6px;border:1px solid #e2e8f0">Basic Salary</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right">$${entry.grossSalary.toFixed(2)}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;color:#059669">+ Allowances</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;color:#059669">$${entry.totalAllowances.toFixed(2)}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;color:#dc2626">- Deductions</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;color:#dc2626">$${entry.totalDeductions.toFixed(2)}</td></tr>
    <tr style="font-weight:800;background:#f0fdf4"><td style="padding:8px;border:2px solid #059669">NET SALARY</td><td style="padding:8px;border:2px solid #059669;text-align:right;font-size:1.2rem;color:#059669">$${entry.netSalary.toFixed(2)}</td></tr>
  </table>
  ${(usdAccount || zigAccount) ? `<table style="margin-bottom:18px">
    <thead><tr style="background:#1d4ed8;color:#fff"><th colspan="2" style="padding:8px;text-align:left">PAYMENT BANK ACCOUNTS</th></tr></thead>
    ${usdAccount}${zigAccount}
  </table>` : ''}
  <div style="text-align:center;margin-top:40px;border-top:1px solid #000;padding-top:12px;font-size:0.85rem;color:#555">
    This payslip is computer generated and does not require a signature. &bull; ${schoolName}
  </div>
</body></html>`;

    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) { showToast('Pop-up blocked. Please allow pop-ups.', 'warning'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => setTimeout(() => { win.print(); }, 400);
    setTimeout(() => { try { win.print(); } catch (_) {} }, 1000);
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h3>Employee Payroll Registry</h3>
        <p>Select month and year to view generated payroll details</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="portal-input">
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="portal-input">
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
              if (!window.confirm(`Generate payroll for ${months[month - 1]} ${year}?`)) return;
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
          <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>No payroll entries found for the selected period.
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table className="management-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>JOB TITLE</th>
                <th>BANK ACCOUNTS</th>
                <th>BASIC</th>
                <th>ALLOWANCES</th>
                <th>DEDUCTIONS</th>
                <th>NET SALARY</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map(entry => {
                const ep = entry.user?.employeeProfile;
                const hasUsd = !!ep?.accountNumber;
                const hasZig = !!ep?.accountNumberZig;
                return (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{entry.employeeName}</td>
                    <td>{entry.jobTitle}</td>
                    <td>
                      {!hasUsd && !hasZig ? (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Not Provided</span>
                      ) : (
                        <div>
                          <BankBadge label="USD" color="blue" account={{
                            bankName: ep?.bankName, branchCode: ep?.branchCode,
                            accountNumber: ep?.accountNumber, accountType: ep?.accountType
                          }} />
                          <BankBadge label="ZiG" color="amber" account={{
                            bankName: ep?.bankNameZig, branchCode: ep?.branchCodeZig,
                            accountNumber: ep?.accountNumberZig, accountType: ep?.accountTypeZig
                          }} />
                        </div>
                      )}
                    </td>
                    <td>${entry.grossSalary.toFixed(2)}</td>
                    <td style={{ color: 'var(--portal-success)', fontWeight: 600 }}>+${entry.totalAllowances.toFixed(2)}</td>
                    <td style={{ color: 'var(--portal-danger)', fontWeight: 600 }}>-${entry.totalDeductions.toFixed(2)}</td>
                    <td style={{ fontWeight: 800, color: '#1e293b' }}>${entry.netSalary.toFixed(2)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        background: entry.isPaid ? 'rgba(56, 161, 105, 0.1)' : 'rgba(229, 62, 62, 0.1)',
                        color: entry.isPaid ? 'var(--portal-success)' : 'var(--portal-danger)'
                      }}>
                        {entry.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="View Payslip"
                          onClick={() => setPayslipEntry(entry)}
                        >
                          <i className="fas fa-file-invoice"></i>
                        </button>
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Print Payslip"
                          onClick={() => handlePrintPayslip(entry)}
                        >
                          <i className="fas fa-print"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {entries.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, entries.length)} of {entries.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Previous</button>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Payslip Modal ─── */}
      {payslipEntry && (
        <div
          className="portal-modal-overlay"
          onClick={() => setPayslipEntry(null)}
          style={{ padding: '40px 20px', overflowY: 'auto', alignItems: 'flex-start' }}
        >
          <div
            className="portal-modal-card animate-in zoom-in duration-200"
            style={{ maxWidth: 720, width: '100%', margin: '0 auto', background: 'white', color: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}><i className="fas fa-file-invoice mr-2"></i>Payslip — {payslipEntry.employeeName}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handlePrintPayslip(payslipEntry)} className="portal-btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                  <i className="fas fa-print mr-1"></i> Print
                </button>
                <button onClick={() => setPayslipEntry(null)} className="portal-btn-ghost" style={{ padding: '8px', fontSize: '1.1rem', color: '#64748b' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Payslip Content */}
            <div style={{ padding: '32px 32px 24px' }}>

              {/* School Header */}
              <div style={{ textAlign: 'center', borderTop: '6px solid #1d4ed8', borderBottom: '2px solid #1d4ed8', padding: '16px 0 12px', marginBottom: '24px' }}>
                {schoolLogo && (
                  <img
                    src={schoolLogo}
                    alt="School Logo"
                    style={{ height: 80, display: 'block', margin: '0 auto 10px', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#1d4ed8' }}>
                  {currentUser?.schoolName || 'School Name'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '4px', color: '#475569' }}>
                  EMPLOYEE PAYSLIP — {months[(payslipEntry.payrollRun?.month ?? month) - 1].toUpperCase()} {payslipEntry.payrollRun?.year ?? year}
                </div>
              </div>

              {/* Employee Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  ['Employee Name', payslipEntry.employeeName],
                  ['Job Title', payslipEntry.jobTitle],
                  ['Pay Period', `${months[(payslipEntry.payrollRun?.month ?? month) - 1]} ${payslipEntry.payrollRun?.year ?? year}`],
                  ['Status', payslipEntry.isPaid ? '✅ PAID' : '⏳ UNPAID'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Earnings Breakdown */}
              <div style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ background: '#1d4ed8', color: 'white', padding: '10px 16px', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Earnings &amp; Deductions
                </div>
                {[
                  { label: 'Basic Salary', val: payslipEntry.grossSalary, color: '#1e293b', prefix: '$' },
                  { label: '+ Allowances', val: payslipEntry.totalAllowances, color: '#059669', prefix: '+$' },
                  { label: '- Deductions', val: payslipEntry.totalDeductions, color: '#dc2626', prefix: '-$' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: row.color, fontWeight: 600 }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 700 }}>{row.prefix}{row.val.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#f0fdf4', fontWeight: 900 }}>
                  <span style={{ color: '#166534', fontSize: '1rem' }}>NET SALARY</span>
                  <span style={{ color: '#166534', fontSize: '1.2rem' }}>${payslipEntry.netSalary.toFixed(2)}</span>
                </div>
              </div>

              {/* Bank Accounts */}
              {(() => {
                const ep = payslipEntry.user?.employeeProfile;
                const hasUsd = !!ep?.accountNumber;
                const hasZig = !!ep?.accountNumberZig;
                if (!hasUsd && !hasZig) return null;
                return (
                  <div style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ background: '#1d4ed8', color: 'white', padding: '10px 16px', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Payment Bank Accounts
                    </div>
                    {hasUsd && (
                      <div style={{ padding: '12px 16px', borderBottom: hasZig ? '1px solid #f1f5f9' : 'none', background: '#eff6ff' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '4px' }}><i className="fas fa-dollar-sign mr-1"></i>USD ACCOUNT</div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {ep?.bankName}{ep?.bankBranch ? ` — ${ep.bankBranch}` : ''}{ep?.branchCode ? ` (${ep.branchCode})` : ''}
                        </div>
                        <div style={{ color: '#475569', fontFamily: 'monospace' }}>
                          {ep?.accountNumber}{ep?.accountType ? ` [${ep.accountType}]` : ''}
                          {ep?.accountHolderName ? ` · ${ep.accountHolderName}` : ''}
                        </div>
                      </div>
                    )}
                    {hasZig && (
                      <div style={{ padding: '12px 16px', background: '#fefce8' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}><i className="fas fa-coins mr-1"></i>ZiG ACCOUNT</div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {ep?.bankNameZig}{ep?.bankBranchZig ? ` — ${ep.bankBranchZig}` : ''}{ep?.branchCodeZig ? ` (${ep.branchCodeZig})` : ''}
                        </div>
                        <div style={{ color: '#475569', fontFamily: 'monospace' }}>
                          {ep?.accountNumberZig}{ep?.accountTypeZig ? ` [${ep.accountTypeZig}]` : ''}
                          {ep?.accountHolderNameZig ? ` · ${ep.accountHolderNameZig}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                This payslip is computer generated. &bull; {currentUser?.schoolName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
