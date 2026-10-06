import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import TabbedPage from '../../../components/portals/shared/TabbedPage';
import ExportButton from '../../../components/shared/ExportButton';
import SearchInput from '../../../components/shared/SearchInput';

interface LeaveTypeItem {
  code: string;
  name: string;
  defaultDays: number;
  paid: boolean;
  requiresAttachment: boolean;
  attachmentThresholdDays?: number;
  description: string;
}

interface CoverTeacherSuggestion {
  userId: string;
  name: string;
  department: string;
  isAvailable: boolean;
}

// Zimbabwe Statutory Public Holidays
const DEFAULT_HOLIDAYS = [
  '-01-01', '-02-21', '-04-18', '-05-01', '-05-25',
  '-08-10', '-08-11', '-12-22', '-12-25', '-12-26'
];

export default function TeacherLeave() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [deptLeaves, setDeptLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Catalog & Cover suggestions
  const [leaveCatalog, setLeaveCatalog] = useState<LeaveTypeItem[]>([]);
  const [coverSuggestions, setCoverSuggestions] = useState<CoverTeacherSuggestion[]>([]);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    coverTeacherId: '',
    dutiesAffected: '',
    attachmentUrl: ''
  });

  // Print Modal State
  const [printLeaveData, setPrintLeaveData] = useState<any | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Admin / Dept search filters
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isHod = user?.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD'].includes(r.toUpperCase())) || user?.role === 'SCHOOL_ADMIN';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isGovernance = isAdmin || user?.secondaryRoles?.some(r => ['SDC_CHAIR', 'BOARD_CHAIR', 'COUNCIL_CHAIR', 'BURSAR'].includes(r.toUpperCase()));

  useEffect(() => {
    fetchMyData();
    fetchLeaveTypes();
    fetchCoverSuggestions();
    if (isHod) fetchDeptLeaves();
    if (isAdmin || isGovernance) fetchAllLeaves();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get('/api/leave/types');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLeaveCatalog(res.data);
      }
    } catch (e) {
      console.warn('Using default catalog fallback', e);
    }
  };

  const fetchCoverSuggestions = async () => {
    try {
      const res = await api.get('/api/leave/suggest-cover');
      if (Array.isArray(res.data)) {
        setCoverSuggestions(res.data);
      }
    } catch (e) {
      console.warn('Could not load cover teacher suggestions', e);
    }
  };

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const [balRes, leavesRes] = await Promise.all([
        api.get('/api/leave/balance'),
        api.get('/api/leave/my')
      ]);
      setBalance(balRes.data);
      setMyLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptLeaves = async () => {
    try {
      const res = await api.get('/api/leave/department');
      setDeptLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await api.get('/api/leave/all');
      setAllLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Working-day calculator: auto-computes leave days excluding weekends and public holidays
  const calculatedDays = useMemo(() => {
    if (!leaveForm.startDate || !leaveForm.endDate) return 1;
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 1;

    const year = start.getFullYear();
    const holidays = new Set(DEFAULT_HOLIDAYS.map(h => `${year}${h}`));
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const finish = new Date(end);
    finish.setHours(0, 0, 0, 0);

    while (cur <= finish) {
      const dayOfWeek = cur.getDay(); // 0: Sun, 6: Sat
      const dateStr = cur.toISOString().split('T')[0];
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count > 0 ? count : 1;
  }, [leaveForm.startDate, leaveForm.endDate]);

  const selectedTypeConfig = useMemo(() => {
    return leaveCatalog.find(c => c.code === leaveForm.type) || {
      code: leaveForm.type,
      name: leaveForm.type.toUpperCase(),
      defaultDays: 30,
      paid: true,
      requiresAttachment: false,
      description: ''
    };
  }, [leaveCatalog, leaveForm.type]);

  const isAttachmentMandatory = useMemo(() => {
    const t = leaveForm.type.toLowerCase();
    if (t === 'sick') return calculatedDays > 2;
    if (t === 'maternity' || t === 'study') return true;
    return false;
  }, [leaveForm.type, calculatedDays]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    if (isAttachmentMandatory && !leaveForm.attachmentUrl.trim()) {
      if (leaveForm.type === 'sick') {
        showToast('Medical certificate attachment is mandatory for sick leave exceeding 2 days', 'warning');
      } else if (leaveForm.type === 'maternity') {
        showToast('Expected delivery date confirmation / medical report is mandatory for maternity leave', 'warning');
      } else if (leaveForm.type === 'study') {
        showToast('Institution admission / examination schedule attachment is mandatory for study leave', 'warning');
      }
      return;
    }

    setApplying(true);
    try {
      await api.post('/api/leave', {
        leaveType: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        days: calculatedDays,
        reason: leaveForm.reason.trim(),
        coverTeacherId: leaveForm.coverTeacherId || undefined,
        dutiesAffected: leaveForm.dutiesAffected.trim() || undefined,
        attachmentUrl: leaveForm.attachmentUrl.trim() || undefined
      });
      showToast('Leave application submitted successfully', 'success');
      setShowApplyModal(false);
      setLeaveForm({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        coverTeacherId: '',
        dutiesAffected: '',
        attachmentUrl: ''
      });
      fetchMyData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to submit leave application', 'error');
    } finally {
      setApplying(false);
    }
  };

  const approveLeave = async (id: string, level: 'hod' | 'admin' | 'governance') => {
    try {
      const endpoint = level === 'hod'
        ? `/api/leave/${id}/hod-approve`
        : level === 'governance'
        ? `/api/leave/${id}/governance-approve`
        : `/api/leave/${id}/approve`;

      const res = await api.patch(endpoint);
      if (res.data?.pendingGovernance) {
        showToast('Leave approved by Head; routed to Governance (SDC/Board Chair) for extended duration signoff', 'info');
      } else {
        showToast('Leave approved successfully', 'success');
      }
      if (level === 'hod') fetchDeptLeaves();
      fetchAllLeaves();
      fetchMyData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Approval failed', 'error');
    }
  };

  const rejectLeave = async (id: string, level: 'hod' | 'admin') => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.patch(`/api/leave/${id}/${level === 'hod' ? 'hod-reject' : 'reject'}`, { reason });
      showToast('Leave application rejected', 'info');
      if (level === 'hod') fetchDeptLeaves();
      fetchAllLeaves();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Rejection failed', 'error');
    }
  };

  const handlePrintLeave = async (id: string) => {
    setLoadingPrint(true);
    try {
      const res = await api.get(`/api/leave/${id}/print-data`);
      setPrintLeaveData(res.data);
    } catch (e: any) {
      showToast('Failed to load leave print details', 'error');
    } finally {
      setLoadingPrint(false);
    }
  };

  const effectiveTypes = leaveCatalog.length > 0 ? leaveCatalog : [
    { code: 'annual', name: 'Annual Leave', defaultDays: 30, paid: true, requiresAttachment: false, description: 'Statutory school holiday leave' },
    { code: 'sick', name: 'Sick Leave', defaultDays: 90, paid: true, requiresAttachment: true, description: 'Medical recovery' },
    { code: 'maternity', name: 'Maternity Leave', defaultDays: 98, paid: true, requiresAttachment: true, description: '98 days paid' },
    { code: 'paternity', name: 'Paternity Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: '5 days parental support' },
    { code: 'compassionate', name: 'Compassionate Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Bereavement' },
    { code: 'study', name: 'Study Leave', defaultDays: 14, paid: true, requiresAttachment: true, description: 'Professional exams' },
    { code: 'unpaid', name: 'Unpaid Leave', defaultDays: 365, paid: false, requiresAttachment: false, description: 'Unpaid sabbatical' },
    { code: 'in_lieu', name: 'Day-Off-in-Lieu', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Compensatory leave' },
    { code: 'special', name: 'Special Leave', defaultDays: 10, paid: true, requiresAttachment: false, description: 'National/court duties' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', bg: '#dcfce7', color: '#15803d', icon: 'fa-check-circle' };
      case 'pending_hod':
        return { label: 'Pending HOD', bg: '#fef3c7', color: '#b45309', icon: 'fa-user-clock' };
      case 'pending_head':
        return { label: 'Pending Head', bg: '#e0e7ff', color: '#4338ca', icon: 'fa-user-shield' };
      case 'pending_governance':
        return { label: 'Pending Governance (SDC/Board)', bg: '#fce7f3', color: '#be185d', icon: 'fa-landmark' };
      case 'rejected':
        return { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c', icon: 'fa-times-circle' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569', icon: 'fa-clock' };
    }
  };

  const MyLeaveTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Balances Grid: Tenant catalog aware */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        {effectiveTypes.map(t => {
          const type = t.code;
          const total = balance ? (balance[`${type}Total`] ?? t.defaultDays) : t.defaultDays;
          const used = balance ? (balance[`${type}Used`] ?? 0) : 0;
          const rem = Math.max(0, Number(total) - Number(used));

          return (
            <div key={type} className="portal-stat-card" style={{ padding: '14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{t.name}</span>
                {t.paid ? (
                  <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PAID</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>UNPAID</span>
                )}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: '6px 0 2px' }}>
                {rem} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>days left</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Used: {used} / {total} days</div>
            </div>
          );
        })}
      </div>

      {/* Header and Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>My Leave Applications</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>View past leave submissions, working day totals, relief teachers, and current approval status.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="portal-btn portal-btn-primary"
          style={{ padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-plus" /> Apply for Leave
        </button>
      </div>

      {/* Applications Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
            <p style={{ marginTop: 8 }}>Loading leave records...</p>
          </div>
        ) : myLeaves.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-calendar-check fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>No Leave Records</h3>
            <p style={{ fontSize: '0.9rem', marginTop: 4 }}>You have not submitted any leave applications for this academic year.</p>
          </div>
        ) : (
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Dates</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Working Days</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason & Duties</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.map(l => {
                const badge = getStatusBadge(l.status);
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>
                      {l.leaveType || l.type}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {l.days} {l.days === 1 ? 'day' : 'working days'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', maxWidth: 260 }}>
                      {l.reason}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <i className={`fas ${badge.icon}`} /> {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => handlePrintLeave(l.id)}
                        className="portal-btn portal-btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <i className="fas fa-print" /> Print Form
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const DeptTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Department Approvals</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Review pending leave requests from department staff and verify cover arrangements.</p>
        </div>
        <ExportButton data={deptLeaves} filename="dept_leaves" visibleFormats={isAdmin ? ['excel', 'pdf', 'csv'] : ['excel', 'pdf']} />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {deptLeaves.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            No pending department leave requests.
          </div>
        ) : (
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Staff</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Dates</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Working Days</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason & Cover</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deptLeaves.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                    {l.user?.name || l.userId}
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{l.leaveType || l.type}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>
                    {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{l.days}d</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>{l.reason}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'hod')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>HOD Approve</button>
                      <button className="portal-btn-secondary" onClick={() => rejectLeave(l.id, 'hod')} style={{ padding: '6px 14px', fontSize: '0.85rem', color: '#dc2626' }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const AdminTab = () => {
    const filtered = allLeaves.filter(l => {
      const matchesSearch = !adminSearch.trim() ||
        (l.user?.name && l.user.name.toLowerCase().includes(adminSearch.toLowerCase())) ||
        (l.leaveType && l.leaveType.toLowerCase().includes(adminSearch.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <SearchInput value={adminSearch} onChange={setAdminSearch} placeholder="Search all staff leaves..." />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="pending_hod">Pending HOD</option>
              <option value="pending_head">Pending Head Approval</option>
              <option value="pending_governance">Pending Governance (SDC/Board)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <ExportButton data={filtered} filename="all_leaves" visibleFormats={['excel', 'pdf', 'csv']} />
        </div>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Staff</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Dates</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Working Days</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const badge = getStatusBadge(l.status);
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                      {l.user?.name || l.userId}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{l.leaveType || l.type}</td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>
                      {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{l.days}d</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {l.status === 'pending_head' && (
                          <>
                            <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'admin')} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>Head Approve</button>
                            <button className="portal-btn-secondary" onClick={() => rejectLeave(l.id, 'admin')} style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#dc2626' }}>Reject</button>
                          </>
                        )}
                        {l.status === 'pending_governance' && isGovernance && (
                          <button
                            className="portal-btn-primary"
                            onClick={() => approveLeave(l.id, 'governance')}
                            style={{ padding: '5px 12px', fontSize: '0.8rem', background: '#be185d', borderColor: '#be185d' }}
                          >
                            <i className="fas fa-signature" /> Governance Signoff
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintLeave(l.id)}
                          className="portal-btn portal-btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                          title="Print Leave Application Form"
                        >
                          <i className="fas fa-print" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CoverArrangementsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Staff Cover & Relief Arrangements</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Classroom coverage scheduled during approved staff leaves, ensuring continuous learning without teacherless periods.
          </p>
        </div>
        <span className="portal-badge info" style={{ fontWeight: 700 }}>Active Term Rotations</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Coverage for My Absences */}
        <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-user-shield" style={{ color: '#0284c7' }} /> Cover For My Classes (When on Leave)
          </h4>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Leave Date</th>
                <th style={{ padding: 10 }}>Assigned Cover Teacher</th>
                <th style={{ padding: 10 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.filter(l => l.coverTeacherId).slice(0, 5).map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10 }}>{new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()}</td>
                  <td style={{ padding: 10, color: '#15803d', fontWeight: 700 }}>
                    {coverSuggestions.find(c => c.userId === l.coverTeacherId)?.name || 'Assigned Peer'}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>CONFIRMED</span>
                  </td>
                </tr>
              ))}
              {myLeaves.filter(l => l.coverTeacherId).length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                    No relief cover teachers assigned to current requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Available Cover Teachers */}
        <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-users" style={{ color: '#15803d' }} /> Available Department Relief Teachers
          </h4>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coverSuggestions.map(c => (
              <div key={c.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.department}</div>
                </div>
                {c.isAvailable ? (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10 }}>
                    AVAILABLE
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 10 }}>
                    ON LEAVE
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'my', label: 'My Leave', content: <MyLeaveTab /> },
    { id: 'cover', label: 'Cover Arrangements', content: <CoverArrangementsTab /> },
    ...(isHod ? [{ id: 'dept', label: 'Department Approvals', content: <DeptTab /> }] : []),
    ...(isAdmin || isGovernance ? [{ id: 'all', label: 'All Leaves & Governance', content: <AdminTab /> }] : [])
  ];

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <TabbedPage
        title="Leave Management"
        subtitle="Apply for institutional leave, monitor allowances, compute working days, and manage governance approvals."
        tabs={tabs}
        defaultTab="my"
      />

      {/* ── MODAL: Apply for Leave ── */}
      {showApplyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                Apply for Institutional Leave
              </h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Leave Type (Tenant Catalog) *
                </label>
                <select
                  required
                  value={leaveForm.type}
                  onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  {effectiveTypes.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.paid ? 'Paid' : 'Unpaid'}) — {t.description}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {leaveForm.startDate && leaveForm.endDate && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e40af' }}>
                  <i className="fas fa-calculator" /> Working days requested: <strong>{calculatedDays} working day(s)</strong> (excludes Saturdays, Sundays & public holidays).
                </div>
              )}

              {/* Cover Teacher / Relief Field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Relief / Cover Teacher (From Timetable Suggestions)
                </label>
                <select
                  value={leaveForm.coverTeacherId}
                  onChange={e => setLeaveForm({ ...leaveForm, coverTeacherId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="">-- Select Cover Teacher (Optional) --</option>
                  {coverSuggestions.map(c => (
                    <option key={c.userId} value={c.userId}>
                      {c.name} ({c.department}) — {c.isAvailable ? 'Available' : 'Busy / On Leave'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Classes / Duties Affected */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Classes & Duties Affected
                </label>
                <input
                  type="text"
                  placeholder="e.g. Form 3A Maths, Period 2; Form 4 Science Lab; Boarding Hostel Inspection"
                  value={leaveForm.dutiesAffected}
                  onChange={e => setLeaveForm({ ...leaveForm, dutiesAffected: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Reason / Purpose *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Provide context for this leave request..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {/* Mandatory or Optional Attachment */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isAttachmentMandatory ? '#991b1b' : '#334155',
                  marginBottom: 6
                }}>
                  {isAttachmentMandatory ? 'Mandatory Document Attachment *' : 'Supporting Document Attachment (Optional)'}
                  {leaveForm.type === 'sick' && calculatedDays > 2 && ' — Medical certificate required for sick leave > 2 days'}
                  {leaveForm.type === 'maternity' && ' — Expected delivery date confirmation / medical report required'}
                  {leaveForm.type === 'study' && ' — Admission or exam timetable required'}
                </label>
                <input
                  type="text"
                  required={isAttachmentMandatory}
                  placeholder="URL or document reference (e.g. https://storage.school.ac.zw/docs/medical_cert.pdf)"
                  value={leaveForm.attachmentUrl}
                  onChange={e => setLeaveForm({ ...leaveForm, attachmentUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isAttachmentMandatory ? '1px solid #f87171' : '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="portal-btn portal-btn-secondary"
                  style={{ padding: '10px 18px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="portal-btn portal-btn-primary"
                  style={{ padding: '10px 22px', fontWeight: 700 }}
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Printable Leave Application Form ── */}
      {printLeaveData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 750,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Print Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20, textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', textTransform: 'uppercase' }}>
                {printLeaveData.school?.name || 'INSTITUTIONAL LEAVE APPLICATION'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Official Staff Leave Authorization & Working-Day Record
              </p>
            </div>

            {/* Applicant & Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: '0.9rem' }}>
              <div><strong>Applicant:</strong> {printLeaveData.applicant?.name}</div>
              <div><strong>Staff Role / Dept:</strong> {printLeaveData.applicant?.role} &bull; {printLeaveData.leave?.department || 'Teaching'}</div>
              <div><strong>Leave Type:</strong> <span style={{ textTransform: 'capitalize' }}>{printLeaveData.leave?.leaveType}</span></div>
              <div><strong>Working Days Count:</strong> {printLeaveData.leave?.days} day(s)</div>
              <div><strong>Leave Period:</strong> {new Date(printLeaveData.leave?.startDate).toLocaleDateString()} to {new Date(printLeaveData.leave?.endDate).toLocaleDateString()}</div>
              <div><strong>Relief / Cover Teacher:</strong> {printLeaveData.coverTeacher?.name || 'None Assigned'}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <strong>Stated Reason & Duties:</strong>
              <p style={{ margin: '6px 0 0', color: '#334155' }}>{printLeaveData.leave?.reason || 'Standard statutory leave.'}</p>
            </div>

            {/* Sign-off Blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 30, borderTop: '1px solid #e2e8f0', paddingTop: 20, fontSize: '0.8rem' }}>
              <div style={{ border: '1px dashed #cbd5e1', padding: 12, borderRadius: 6 }}>
                <strong>1. HOD Endorsement:</strong>
                <div style={{ marginTop: 24, borderBottom: '1px solid #94a3b8' }}></div>
                <div style={{ marginTop: 4, color: '#64748b' }}>
                  {printLeaveData.leave?.hodApprovedAt ? `Approved on ${new Date(printLeaveData.leave?.hodApprovedAt).toLocaleDateString()}` : 'Pending Signature'}
                </div>
              </div>
              <div style={{ border: '1px dashed #cbd5e1', padding: 12, borderRadius: 6 }}>
                <strong>2. Head of Institution:</strong>
                <div style={{ marginTop: 24, borderBottom: '1px solid #94a3b8' }}></div>
                <div style={{ marginTop: 4, color: '#64748b' }}>
                  {printLeaveData.leave?.headApprovedAt ? `Approved on ${new Date(printLeaveData.leave?.headApprovedAt).toLocaleDateString()}` : 'Pending Signature'}
                </div>
              </div>
              <div style={{ border: '1px dashed #cbd5e1', padding: 12, borderRadius: 6 }}>
                <strong>3. SDC / Board Chair:</strong>
                <div style={{ marginTop: 24, borderBottom: '1px solid #94a3b8' }}></div>
                <div style={{ marginTop: 4, color: '#64748b' }}>
                  {printLeaveData.leave?.days > 14 ? 'Required (>14 days)' : 'Exempt (<=14 days)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setPrintLeaveData(null)}
                className="portal-btn portal-btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="portal-btn portal-btn-primary"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <i className="fas fa-print" /> Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
