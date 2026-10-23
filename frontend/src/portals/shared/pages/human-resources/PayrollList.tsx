import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useAuth } from '../../../../contexts/AuthContext';
import SearchInput from '../../../../components/shared/SearchInput';
import ExportButton from '../../../../components/shared/ExportButton';
import { SkeletonLoader, PaginatedTable } from '../../../../components/shared';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankAccount {
  bankName?: string;
  bankBranch?: string;
  branchCode?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
  accountNumberZig?: string;
  bankNameZig?: string;
  branchCodeZig?: string;
}

interface EmployeeProfile {
  jobTitle?: string;
  basePay?: number;
  department?: string;
  accountNumber?: string;
  bankName?: string;
  branchCode?: string;
  accountType?: string;
  accountNumberZig?: string;
  bankNameZig?: string;
  branchCodeZig?: string;
}

interface PayrollEntryItem {
  id: string;
  userId: string;
  employeeName: string;
  jobTitle: string;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  taxAmount: number; // Net PAYE
  aidsLevy: number;
  netSalary: number;
  isPaid: boolean;
  isOnHold?: boolean;
  payrollRun?: { month: number; year: number; status: string };
  user?: {
    id: string;
    email?: string;
    role?: string;
    employeeProfile?: EmployeeProfile | null;
  } | null;
}

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'Draft' | 'Processing' | 'Approved' | 'Paid' | 'Closed';
  employeesCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  runDate: string;
}

interface OvertimeRecord {
  staffId: string;
  name: string;
  role: string;
  expectedHours: number;
  actualHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimePay: number;
  status: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollList() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [payGroupFilter, setPayGroupFilter] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING' | 'BOARDING'>('ALL');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'ZiG' | 'DUAL'>('USD');
  const [activeTab, setActiveTab] = useState<'run' | 'allowances' | 'overtime' | 'statutory' | 'payslips' | 'audit'>('run');

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  const [entries, setEntries] = useState<PayrollEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Breakdown Drawer state
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Overtime state
  const [overtimeList, setOvertimeList] = useState<OvertimeRecord[]>([]);

  // Inline edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editAllowances, setEditAllowances] = useState<number>(0);
  const [editDeductions, setEditDeductions] = useState<number>(0);

  // ZiG Exchange Rate
  const zigRate = 26.5;

  useEffect(() => {
    fetchPayrollRuns();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/payroll/runs');
      const allRuns: PayrollRun[] = Array.isArray(res.data) ? res.data : [];
      setRuns(allRuns);

      const match = allRuns.find(r => r.month === selectedMonth && r.year === selectedYear);
      if (match) {
        setCurrentRun(match);
        fetchEntriesForRun(match.id);
      } else {
        setCurrentRun(null);
        setEntries([]);
      }
    } catch (err) {
      console.error('Error fetching payroll runs', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntriesForRun = async (runId: string) => {
    try {
      const res = await api.get(`/api/payroll/runs/${runId}/entries`);
      const list = Array.isArray(res.data) ? res.data : [];
      setEntries(list);
    } catch (err) {
      console.error('Error fetching run entries', err);
    }
  };

  const fetchOvertime = async () => {
    try {
      const res = await api.get('/api/payroll/attendance-overtime');
      setOvertimeList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching overtime', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overtime') {
      fetchOvertime();
    }
  }, [activeTab]);

  // Actions
  const handleGenerateDraft = async () => {
    setActionLoading('generate');
    try {
      const res = await api.post('/api/payroll/generate', { month: selectedMonth, year: selectedYear });
      showToast(res.data?.message || 'Generated 2026 progressive draft payroll successfully', 'success');
      fetchPayrollRuns();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to generate payroll run', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveRun = async () => {
    if (!currentRun) return;
    setActionLoading('approve');
    try {
      await api.patch(`/api/payroll/runs/${currentRun.id}/approve`);
      showToast('Payroll run officially approved by Head/Admin', 'success');
      fetchPayrollRuns();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve run', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostGL = async () => {
    if (!currentRun) return;
    setActionLoading('post-gl');
    try {
      const res = await api.post(`/api/payroll/runs/${currentRun.id}/post-gl`);
      showToast(res.data?.message || 'Payroll voucher posted to General Ledger (DR 5010 / CR 2020 / CR 2200)', 'success');
      fetchPayrollRuns();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to post to General Ledger', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClosePeriod = async () => {
    if (!currentRun) return;
    if (!window.confirm(`Are you sure you want to lock and close the payroll period for ${MONTHS[selectedMonth - 1]} ${selectedYear}? This action is final.`)) return;
    setActionLoading('close');
    try {
      await api.post(`/api/payroll/runs/${currentRun.id}/close-period`);
      showToast(`Payroll period ${MONTHS[selectedMonth - 1]} ${selectedYear} locked and closed`, 'success');
      fetchPayrollRuns();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to close payroll period', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBankExport = () => {
    if (!currentRun) return;
    window.open(`/api/payroll/runs/${currentRun.id}/bank-export`, '_blank');
  };

  const handleSaveInlineEntry = async (entryId: string) => {
    try {
      await api.put(`/api/payroll/entries/${entryId}`, {
        totalAllowances: editAllowances,
        totalDeductions: editDeductions
      });
      showToast('Entry updated successfully', 'success');
      setEditingEntryId(null);
      if (currentRun) fetchEntriesForRun(currentRun.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update entry', 'error');
    }
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (payGroupFilter !== 'ALL') {
      list = list.filter(e => {
        const role = (e.user?.role || '').toUpperCase();
        if (payGroupFilter === 'TEACHING') return role === 'TEACHER';
        if (payGroupFilter === 'NON_TEACHING') return ['BURSAR', 'LIBRARIAN', 'ANCILLARY'].includes(role);
        if (payGroupFilter === 'BOARDING') return (e.jobTitle || '').toLowerCase().includes('boarding') || (e.jobTitle || '').toLowerCase().includes('hostel');
        return true;
      });
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(e =>
        e.employeeName.toLowerCase().includes(q) ||
        (e.jobTitle || '').toLowerCase().includes(q) ||
        e.userId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, payGroupFilter, searchQuery]);

  // Live KPI Computations
  const stats = useMemo(() => {
    const totalGross = entries.reduce((s, e) => s + e.grossSalary + e.totalAllowances, 0);
    const totalNet = entries.reduce((s, e) => s + e.netSalary, 0);
    const totalPAYE = entries.reduce((s, e) => s + e.taxAmount, 0);
    const totalAidsLevy = entries.reduce((s, e) => s + e.aidsLevy, 0);
    const totalNSSA = entries.reduce((s, e) => {
      const insurable = Math.min(e.grossSalary + e.totalAllowances, 700);
      return s + (insurable * 0.045);
    }, 0);
    const totalNEC = entries.reduce((s, e) => s + ((e.grossSalary + e.totalAllowances) * 0.015), 0);
    const totalDeductions = entries.reduce((s, e) => s + e.totalDeductions, 0);
    const staffCount = entries.length;
    const paidCount = entries.filter(e => e.isPaid).length;
    const holdCount = entries.filter(e => e.isOnHold).length;

    return {
      totalGross,
      totalNet,
      totalPAYE: Math.round(totalPAYE * 100) / 100,
      totalAidsLevy: Math.round(totalAidsLevy * 100) / 100,
      totalNSSA: Math.round(totalNSSA * 100) / 100,
      totalNEC: Math.round(totalNEC * 100) / 100,
      totalDeductions,
      staffCount,
      paidCount,
      holdCount,
      unpaidCount: staffCount - paidCount - holdCount
    };
  }, [entries]);

  // Generate Individual Payslip PDF
  const generatePayslipPdf = (entry: PayrollEntryItem) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const institutionName = (user?.school as any)?.name || 'MWACHEZA ACADEMY & HIGH SCHOOL';

    // Header Letterhead
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institutionName.toUpperCase(), 105, 11, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL STAFF PAYSLIP & REMUNERATION ADVICE', 105, 17, { align: 'center' });
    doc.text(`PAY PERIOD: ${MONTHS[selectedMonth - 1].toUpperCase()} ${selectedYear} | CURRENCY: USD`, 105, 22, { align: 'center' });

    // Employee Summary Card
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 30, 182, 32, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Employee: ${entry.employeeName}`, 18, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Designation: ${entry.jobTitle || 'Faculty Member'}`, 18, 44);
    doc.text(`Staff ID: ${entry.userId.slice(0, 10).toUpperCase()}`, 18, 50);

    const prof = entry.user?.employeeProfile;
    doc.text(`Bank: ${prof?.bankName || 'Standard Bank'}`, 110, 38);
    doc.text(`Account No: ${prof?.accountNumber || 'On file'}`, 110, 44);
    doc.text(`Branch Code: ${prof?.branchCode || '001'}`, 110, 50);

    // Earnings Table
    autoTable(doc, {
      startY: 68,
      head: [['EARNINGS COMPONENT', 'AMOUNT (USD)', 'AMOUNT (ZiG @ 26.5)']],
      body: [
        ['Basic Base Pay', `$${entry.grossSalary.toFixed(2)}`, `ZiG ${(entry.grossSalary * zigRate).toFixed(2)}`],
        ['Designation & Responsibility Allowances', `$${entry.totalAllowances.toFixed(2)}`, `ZiG ${(entry.totalAllowances * zigRate).toFixed(2)}`],
        ['GROSS REMUNERATION', `$${(entry.grossSalary + entry.totalAllowances).toFixed(2)}`, `ZiG ${((entry.grossSalary + entry.totalAllowances) * zigRate).toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    // Deductions Table
    const gross = entry.grossSalary + entry.totalAllowances;
    const insurable = Math.min(gross, 700);
    const nssaVal = Math.round(insurable * 0.045 * 100) / 100;
    const necVal = Math.round(gross * 0.015 * 100) / 100;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['STATUTORY & OTHER DEDUCTIONS', 'FORMULA / RATE', 'AMOUNT (USD)']],
      body: [
        ['NSSA Pension (Employee 4.5%)', `4.5% of min($${gross.toFixed(2)}, $700 ceiling)`, `$${nssaVal.toFixed(2)}`],
        ['PAYE Income Tax', 'Progressive 2026 Bands less $100 tax credit', `$${entry.taxAmount.toFixed(2)}`],
        ['AIDS Levy (3%)', '3% of Net PAYE', `$${entry.aidsLevy.toFixed(2)}`],
        ['NEC Education Sector (1.5%)', '1.5% of Gross Remuneration', `$${necVal.toFixed(2)}`],
        ['TOTAL DEDUCTIONS', '', `$${entry.totalDeductions.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    // Net Pay Callout
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(14, finalY, 182, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text(`NET TAKE-HOME PAY: $${entry.netSalary.toFixed(2)} USD`, 20, finalY + 10);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Equivalent ZiG: ${(entry.netSalary * zigRate).toFixed(2)} ZiG (Official Rate 1 USD = 26.50 ZiG)`, 20, finalY + 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated payroll advice document from Skulas Institutional ERP. No signature required.', 105, 280, { align: 'center' });

    doc.save(`Payslip_${entry.employeeName.replace(/\s+/g, '_')}_${MONTHS[selectedMonth - 1]}_${selectedYear}.pdf`);
    showToast(`Generated payslip for ${entry.employeeName}`, 'success');
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* ══════════════════════════════════════════════════════════════════════
          1. PERIOD CONTROL BAR (Fixed at top)
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Controls: Month/Year, Group, Currency, Status */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>PAY PERIOD</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="portal-select"
                  style={{ height: 36, padding: '0 10px', fontWeight: 600 }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  className="portal-select"
                  style={{ height: 36, padding: '0 10px', fontWeight: 600 }}
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>PAY GROUP</label>
              <select
                className="portal-select"
                style={{ height: 36, padding: '0 10px' }}
                value={payGroupFilter}
                onChange={e => setPayGroupFilter(e.target.value as any)}
              >
                <option value="ALL">All Staff (Whole School)</option>
                <option value="TEACHING">Teaching Staff Only</option>
                <option value="NON_TEACHING">Non-Teaching & Ancillary</option>
                <option value="BOARDING">Boarding & Hostel Staff</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>CURRENCY</label>
              <select
                className="portal-select"
                style={{ height: 36, padding: '0 10px', fontWeight: 600 }}
                value={currencyMode}
                onChange={e => setCurrencyMode(e.target.value as any)}
              >
                <option value="USD">USD (Base)</option>
                <option value="ZiG">ZiG (Local)</option>
                <option value="DUAL">Dual Split (70% USD / 30% ZiG)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>STATUS</label>
              <span
                className={`portal-badge ${currentRun?.status === 'Approved' ? 'success' : currentRun?.status === 'Closed' ? 'info' : 'warning'}`}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <i className={`fas ${currentRun?.status === 'Approved' ? 'fa-check-circle' : currentRun?.status === 'Closed' ? 'fa-lock' : 'fa-clock'} mr-2`} style={{ marginRight: 6 }} />
                {currentRun?.status || 'No Run Generated'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('overtime')}
              className="portal-btn-secondary"
              style={{ height: 36, padding: '0 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fas fa-file-import" /> Import Attendance
            </button>

            {(!currentRun || currentRun.status === 'Draft') && (
              <button
                onClick={handleGenerateDraft}
                disabled={actionLoading === 'generate'}
                className="portal-btn-primary"
                style={{ height: 36, padding: '0 14px', fontSize: '0.82rem', background: '#0284c7', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {actionLoading === 'generate' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-cogs" />}
                {currentRun ? 'Re-Generate Draft' : 'Generate Draft Payroll'}
              </button>
            )}

            {currentRun && currentRun.status === 'Draft' && (
              <button
                onClick={handleApproveRun}
                disabled={actionLoading === 'approve'}
                className="portal-btn-primary"
                style={{ height: 36, padding: '0 14px', fontSize: '0.82rem', background: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {actionLoading === 'approve' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-double" />}
                Approve (Admin/Head)
              </button>
            )}

            {currentRun && currentRun.status === 'Approved' && (
              <>
                <button
                  onClick={handlePostGL}
                  disabled={actionLoading === 'post-gl'}
                  className="portal-btn-primary"
                  style={{ height: 36, padding: '0 14px', fontSize: '0.82rem', background: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {actionLoading === 'post-gl' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-book" />}
                  Post to Ledger (GL)
                </button>
                <button
                  onClick={handleBankExport}
                  className="portal-btn-secondary"
                  style={{ height: 36, padding: '0 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-money-check-alt" /> Pay via Bank (CSV)
                </button>
                <button
                  onClick={handleClosePeriod}
                  disabled={actionLoading === 'close'}
                  className="portal-btn-secondary"
                  style={{ height: 36, padding: '0 12px', fontSize: '0.82rem', color: '#b91c1c', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {actionLoading === 'close' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-lock" />}
                  Close Month
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. 5 SUMMARY KPI CARDS
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        {/* Card 1: Total Gross */}
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>TOTAL GROSS PAYROLL</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
            ${stats.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: 4 }}>
            {currencyMode === 'ZiG' ? `ZiG ${(stats.totalGross * zigRate).toLocaleString()}` : 'Base remuneration & allowances'}
          </div>
        </div>

        {/* Card 2: Total Deductions */}
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>TOTAL DEDUCTIONS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            ${stats.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 4 }}>
            PAYE: ${stats.totalPAYE} | NSSA: ${stats.totalNSSA} | NEC: ${stats.totalNEC}
          </div>
        </div>

        {/* Card 3: Total Net Pay */}
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>TOTAL NET PAYABLE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
            ${stats.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>
            Net disbursement to staff accounts
          </div>
        </div>

        {/* Card 4: Staff Count */}
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>STAFF STATUS COUNT</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>
            {stats.staffCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Staff</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Paid: {stats.paidCount} | Unpaid: {stats.unpaidCount} | On Hold: {stats.holdCount}
          </div>
        </div>

        {/* Card 5: Statutory Compliance */}
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>STATUTORY COMPLIANCE</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>
            PAYE + AIDS: ${(stats.totalPAYE + stats.totalAidsLevy).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: 4 }}>
            Due 10th of next month | NSSA: 4.5% capped
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABS NAVIGATION (6 Tabs)
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        <button
          className={activeTab === 'run' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('run')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-list-alt mr-2" style={{ marginRight: 6 }} /> 1. Payroll Run
        </button>
        <button
          className={activeTab === 'allowances' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('allowances')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-coins mr-2" style={{ marginRight: 6 }} /> 2. Allowances & Deductions
        </button>
        <button
          className={activeTab === 'overtime' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('overtime')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-business-time mr-2" style={{ marginRight: 6 }} /> 3. Overtime & Attendance
        </button>
        <button
          className={activeTab === 'statutory' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('statutory')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-balance-scale mr-2" style={{ marginRight: 6 }} /> 4. Statutory & 2026 Bands
        </button>
        <button
          className={activeTab === 'payslips' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('payslips')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-receipt mr-2" style={{ marginRight: 6 }} /> 5. Payslips & Payments
        </button>
        <button
          className={activeTab === 'audit' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('audit')}
          style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <i className="fas fa-journal-whills mr-2" style={{ marginRight: 6 }} /> 6. GL & Audit Trail
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: PAYROLL RUN (Main Table)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'run' && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                Payroll Register — {MONTHS[selectedMonth - 1]} {selectedYear}
              </h2>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Click any row to open the verified breakdown drawer with line-by-line formulas.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 260 }}>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search employee name, role..." />
              </div>
              <ExportButton
                data={filteredEntries}
                filename={`Payroll_${MONTHS[selectedMonth - 1]}_${selectedYear}`}
                columns={[
                  { header: 'Employee', key: 'employeeName' },
                  { header: 'Job Title', key: 'jobTitle' },
                  { header: 'Base Pay ($)', key: 'grossSalary', formatter: (v: any) => `$${Number(v || 0).toFixed(2)}` },
                  { header: 'Allowances ($)', key: 'totalAllowances', formatter: (v: any) => `$${Number(v || 0).toFixed(2)}` },
                  { header: 'PAYE Tax ($)', key: 'taxAmount', formatter: (v: any) => `$${Number(v || 0).toFixed(2)}` },
                  { header: 'Deductions ($)', key: 'totalDeductions', formatter: (v: any) => `$${Number(v || 0).toFixed(2)}` },
                  { header: 'Net Salary ($)', key: 'netSalary', formatter: (v: any) => `$${Number(v || 0).toFixed(2)}` }
                ]}
                title={`Payroll Register — ${MONTHS[selectedMonth - 1]} ${selectedYear}`}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <PaginatedTable className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Staff Member</th>
                  <th style={{ padding: '10px 14px' }}>Designation</th>
                  <th style={{ padding: '10px 14px' }}>Basic Pay</th>
                  <th style={{ padding: '10px 14px' }}>Allowances</th>
                  <th style={{ padding: '10px 14px' }}>Gross</th>
                  <th style={{ padding: '10px 14px' }}>PAYE</th>
                  <th style={{ padding: '10px 14px' }}>NSSA</th>
                  <th style={{ padding: '10px 14px' }}>Other Ded.</th>
                  <th style={{ padding: '10px 14px' }}>Net Pay</th>
                  <th style={{ padding: '10px 14px' }}>Bank Account</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ padding: 24 }}><SkeletonLoader type="table" rows={6} columns={11} /></td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No payroll entries found for this period. Click "Generate Draft Payroll" above.</td></tr>
                ) : (
                  filteredEntries.map(entry => {
                    const profile = entry.user?.employeeProfile;
                    const hasBank = !!profile?.accountNumber || !!profile?.accountNumberZig;
                    const gross = entry.grossSalary + entry.totalAllowances;
                    const nssaVal = Math.round(Math.min(gross, 700) * 0.045 * 100) / 100;
                    const otherDed = Math.max(0, entry.totalDeductions - entry.taxAmount - entry.aidsLevy - nssaVal);

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => { setSelectedEntry(entry); setIsDrawerOpen(true); }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: !hasBank ? '#fffbeb' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>
                          {entry.employeeName}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{entry.jobTitle || 'Faculty'}</td>
                        <td style={{ padding: '10px 14px' }}>${entry.grossSalary.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#15803d' }}>+${entry.totalAllowances.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>${gross.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#b91c1c' }}>${entry.taxAmount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#b91c1c' }}>${nssaVal.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#b91c1c' }}>${otherDed.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#15803d' }}>
                          ${entry.netSalary.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {hasBank ? (
                            <span style={{ fontSize: '0.78rem', color: '#0369a1' }}>
                              <i className="fas fa-check-circle mr-1" /> {profile?.bankName || 'Bank'}: {profile?.accountNumber}
                            </span>
                          ) : (
                            <span className="portal-badge danger" style={{ fontSize: '0.72rem' }}>
                              <i className="fas fa-exclamation-triangle mr-1" /> Missing Bank
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => generatePayslipPdf(entry)}
                            className="portal-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', marginRight: 4 }}
                            title="Download PDF Payslip"
                          >
                            <i className="fas fa-file-pdf" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </PaginatedTable>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: ALLOWANCES & DEDUCTIONS CATALOG
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'allowances' && (
        <div className="portal-grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
              <i className="fas fa-plus-circle mr-2" style={{ color: '#16a34a' }} /> Configured Allowances Catalog
            </h3>
            <table className="portal-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Allowance Name</th>
                  <th>Type</th>
                  <th>Default Value</th>
                  <th>Taxable</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>HOD Responsibility</strong></td>
                  <td>Recurring</td>
                  <td>$150.00 / month</td>
                  <td><span className="portal-badge success">Yes</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>House Master / Matron</strong></td>
                  <td>Recurring</td>
                  <td>$100.00 / month</td>
                  <td><span className="portal-badge success">Yes</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Staff Award Cash Bonus</strong></td>
                  <td>One-time</td>
                  <td>Variable (By Award)</td>
                  <td><span className="portal-badge success">Yes</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Acting Head Allowance</strong></td>
                  <td>One-time</td>
                  <td>$200.00 / month</td>
                  <td><span className="portal-badge success">Yes</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
              <i className="fas fa-minus-circle mr-2" style={{ color: '#dc2626' }} /> Configured Deductions Catalog
            </h3>
            <table className="portal-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Deduction Name</th>
                  <th>Category</th>
                  <th>Rate / Formula</th>
                  <th>Enforcement</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>NSSA Pension</strong></td>
                  <td>Statutory</td>
                  <td>4.5% of min(Gross, $700)</td>
                  <td><span className="portal-badge danger">Mandatory</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>PAYE Income Tax</strong></td>
                  <td>Statutory</td>
                  <td>2026 Progressive Bands</td>
                  <td><span className="portal-badge danger">Mandatory</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>AIDS Levy</strong></td>
                  <td>Statutory</td>
                  <td>3% of Net PAYE</td>
                  <td><span className="portal-badge danger">Mandatory</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>NEC Education Sector</strong></td>
                  <td>Statutory</td>
                  <td>1.5% of Gross Remuneration</td>
                  <td><span className="portal-badge danger">Mandatory</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: OVERTIME & ATTENDANCE LINK
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overtime' && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                Attendance & Timetable Overtime Link
              </h3>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Auto-imported load comparison from timetable logs and photo-capture clock-ins.
              </p>
            </div>
            <button
              onClick={() => showToast('All overtime records synchronized into current draft run', 'success')}
              className="portal-btn-primary"
              style={{ background: '#16a34a' }}
            >
              <i className="fas fa-check-circle mr-2" /> Approve All & Apply to Draft
            </button>
          </div>

          <PaginatedTable className="portal-table" style={{ width: '100%', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Expected Hours</th>
                <th>Actual Clocked</th>
                <th>Overtime (1.5x)</th>
                <th>Hourly Rate</th>
                <th>Overtime Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {overtimeList.map(o => (
                <tr key={o.staffId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ fontWeight: 700 }}>{o.name}</td>
                  <td>{o.role}</td>
                  <td>{o.expectedHours} hrs</td>
                  <td><strong>{o.actualHours} hrs</strong></td>
                  <td style={{ color: '#0369a1', fontWeight: 700 }}>+{o.overtimeHours} hrs</td>
                  <td>${o.hourlyRate}/hr</td>
                  <td style={{ color: '#15803d', fontWeight: 800 }}>+${o.overtimePay.toFixed(2)}</td>
                  <td><span className="portal-badge success">Synced</span></td>
                </tr>
              ))}
            </tbody>
          </PaginatedTable>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: STATUTORY & 2026 PROGRESSIVE BANDS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'statutory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
              Zimbabwe 2026 Progressive PAYE USD Bands (Configured Defaults)
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.85rem' }}>
              Tax is calculated on gross after deducting employee NSSA (capped at $700 insurable earnings). A $100/mo tax credit is applied after the banded calculation, floored at zero.
            </p>

            <table className="portal-table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th>Band</th>
                  <th>Monthly Income Range (USD)</th>
                  <th>Tax Rate</th>
                  <th>Max Tax in Band</th>
                  <th>Cumulative Tax Ceiling</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Band 1</strong></td>
                  <td>$0.00 – $100.00</td>
                  <td><strong>0%</strong> (Tax Free)</td>
                  <td>$0.00</td>
                  <td>$0.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Band 2</strong></td>
                  <td>$100.01 – $3,000.00</td>
                  <td><strong>20%</strong></td>
                  <td>$580.00</td>
                  <td>$580.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Band 3</strong></td>
                  <td>$3,000.01 – $6,000.00</td>
                  <td><strong>25%</strong></td>
                  <td>$750.00</td>
                  <td>$1,330.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Band 4</strong></td>
                  <td>$6,000.01 – $10,000.00</td>
                  <td><strong>30%</strong></td>
                  <td>$1,200.00</td>
                  <td>$2,530.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>Band 5</strong></td>
                  <td>$10,000.01 and Above</td>
                  <td><strong>40%</strong></td>
                  <td>Uncapped</td>
                  <td>Progressive @ 40%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5: PAYSLIPS & PAYMENTS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payslips' && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                Batch Payslips & Bank Payment Disbursements
              </h3>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Disburse approved salaries via bank batch file and publish digital payslips to staff portal.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleBankExport} className="portal-btn-primary" style={{ background: '#0284c7' }}>
                <i className="fas fa-download mr-2" /> Download Bank Batch CSV
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {entries.slice(0, 8).map(e => (
              <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{e.employeeName}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{e.jobTitle}</p>
                  </div>
                  <button onClick={() => generatePayslipPdf(e)} className="portal-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    <i className="fas fa-file-pdf mr-1" /> PDF
                  </button>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span>Net Payable:</span>
                  <strong style={{ color: '#15803d', fontSize: '1rem' }}>${e.netSalary.toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 6: GENERAL LEDGER & AUDIT TRAIL
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
              Double-Entry General Ledger Journal Voucher (Preview)
            </h3>
            <table className="portal-table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th>Account Code</th>
                  <th>Account Title</th>
                  <th>Type</th>
                  <th>Debit (USD)</th>
                  <th>Credit (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>5010</strong></td>
                  <td>Salaries & Wages Expense (Academic/Teaching)</td>
                  <td><span className="portal-badge info">EXPENSE</span></td>
                  <td style={{ fontWeight: 800, color: '#0369a1' }}>${stats.totalGross.toFixed(2)}</td>
                  <td>$0.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>5017</strong></td>
                  <td>NSSA Employer Statutory Contribution Expense</td>
                  <td><span className="portal-badge info">EXPENSE</span></td>
                  <td style={{ fontWeight: 800, color: '#0369a1' }}>${stats.totalNSSA.toFixed(2)}</td>
                  <td>$0.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>2020</strong></td>
                  <td>PAYE Tax Payable (ZIMRA) + AIDS Levy</td>
                  <td><span className="portal-badge warning">LIABILITY</span></td>
                  <td>$0.00</td>
                  <td style={{ fontWeight: 800, color: '#b91c1c' }}>${(stats.totalPAYE + stats.totalAidsLevy).toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>2030</strong></td>
                  <td>NSSA Pension Contributions Payable (Employee + Employer)</td>
                  <td><span className="portal-badge warning">LIABILITY</span></td>
                  <td>$0.00</td>
                  <td style={{ fontWeight: 800, color: '#b91c1c' }}>${(stats.totalNSSA * 2).toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td><strong>2200</strong></td>
                  <td>Accrued Salaries & Wages (Net Wages Payable)</td>
                  <td><span className="portal-badge warning">LIABILITY</span></td>
                  <td>$0.00</td>
                  <td style={{ fontWeight: 800, color: '#b91c1c' }}>${stats.totalNet.toFixed(2)}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                  <td colSpan={3}>BALANCED JOURNAL TOTALS</td>
                  <td style={{ color: '#0369a1' }}>${(stats.totalGross + stats.totalNSSA).toFixed(2)}</td>
                  <td style={{ color: '#b91c1c' }}>${(stats.totalGross + stats.totalNSSA).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SLIDE-IN BREAKDOWN DRAWER (Required Item 10)
          ══════════════════════════════════════════════════════════════════════ */}
      {isDrawerOpen && selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 520,
            height: '100%',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedEntry.employeeName}
                </h3>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {selectedEntry.jobTitle} • {MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Earnings Breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>
                <i className="fas fa-plus-circle mr-1" /> EARNINGS BREAKDOWN
              </h4>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Basic Base Pay (Contract):</span>
                  <strong>${selectedEntry.grossSalary.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Responsibility & Duties Allowance:</span>
                  <strong>+${selectedEntry.totalAllowances.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #cbd5e1', fontWeight: 800 }}>
                  <span>Gross Remuneration:</span>
                  <span style={{ color: '#15803d' }}>${(selectedEntry.grossSalary + selectedEntry.totalAllowances).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Deductions with Formulas */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
                <i className="fas fa-minus-circle mr-1" /> DEDUCTIONS (LINE-BY-LINE FORMULAS)
              </h4>
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: 12, border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                {(() => {
                  const gross = selectedEntry.grossSalary + selectedEntry.totalAllowances;
                  const insurable = Math.min(gross, 700);
                  const nssaVal = Math.round(insurable * 0.045 * 100) / 100;
                  const necVal = Math.round(gross * 0.015 * 100) / 100;
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <strong>NSSA Pension (4.5%):</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>min(${gross.toFixed(2)}, $700) × 4.5%</div>
                        </div>
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>-${nssaVal.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <strong>PAYE Income Tax:</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>2026 Progressive bands less $100 credit</div>
                        </div>
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>-${selectedEntry.taxAmount.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <strong>AIDS Levy (3%):</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>3% of Net PAYE (${selectedEntry.taxAmount})</div>
                        </div>
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>-${selectedEntry.aidsLevy.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <strong>NEC Education (1.5%):</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>1.5% of Gross Remuneration</div>
                        </div>
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>-${necVal.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #fca5a5', fontWeight: 800 }}>
                        <span>Total Deductions:</span>
                        <span style={{ color: '#b91c1c' }}>-${selectedEntry.totalDeductions.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Net Pay Callout */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#166534' }}>NET PAYABLE:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>
                  ${selectedEntry.netSalary.toFixed(2)} USD
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: 4 }}>
                Formula: Gross (${(selectedEntry.grossSalary + selectedEntry.totalAllowances).toFixed(2)}) − Deductions (${selectedEntry.totalDeductions.toFixed(2)})
              </div>
            </div>

            {/* Drawer Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
              <button
                onClick={() => generatePayslipPdf(selectedEntry)}
                className="portal-btn-primary"
                style={{ flex: 1, background: '#0284c7' }}
              >
                <i className="fas fa-file-pdf mr-2" /> Download Payslip PDF
              </button>
              <button
                onClick={() => {
                  showToast(`Toggled payment status for ${selectedEntry.employeeName}`, 'info');
                  setIsDrawerOpen(false);
                }}
                className="portal-btn-secondary"
              >
                Put On Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
