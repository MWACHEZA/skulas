import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import TabbedPage from '../../../components/portals/shared/TabbedPage';
import ExportButton from '../../../components/shared/ExportButton';
import SearchInput from '../../../components/shared/SearchInput';

export default function TeacherLeave() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [deptLeaves, setDeptLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    attachmentUrl: ''
  });

  // Admin / Dept search filters
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isHod = user?.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD'].includes(r.toUpperCase())) || user?.role === 'SCHOOL_ADMIN';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchMyData();
    if (isHod) fetchDeptLeaves();
    if (isAdmin) fetchAllLeaves();
  }, []);

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

  const calculatedDays = useMemo(() => {
    if (!leaveForm.startDate || !leaveForm.endDate) return 1;
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [leaveForm.startDate, leaveForm.endDate]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    if (leaveForm.type.toLowerCase() === 'sick' && calculatedDays > 2 && !leaveForm.attachmentUrl.trim()) {
      showToast('Medical certificate attachment is mandatory for sick leave exceeding 2 days', 'warning');
      return;
    }

    setApplying(true);
    try {
      await api.post('/api/leave', {
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        days: calculatedDays,
        reason: leaveForm.reason.trim(),
        attachmentUrl: leaveForm.attachmentUrl.trim() || undefined
      });
      showToast('Leave application submitted successfully', 'success');
      setShowApplyModal(false);
      setLeaveForm({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        attachmentUrl: ''
      });
      fetchMyData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to submit leave application', 'error');
    } finally {
      setApplying(false);
    }
  };

  const approveLeave = async (id: string, level: 'hod' | 'admin') => {
    try {
      await api.patch(`/api/leave/${id}/${level === 'hod' ? 'hod-approve' : 'approve'}`);
      showToast('Leave approved successfully', 'success');
      if (level === 'hod') fetchDeptLeaves();
      if (level === 'admin') fetchAllLeaves();
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
      if (level === 'admin') fetchAllLeaves();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Rejection failed', 'error');
    }
  };

  const MyLeaveTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Balances Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {['annual', 'sick', 'compassionate', 'maternity', 'study', 'unpaid'].map(type => {
          const total = balance ? (balance[`${type}Total`] ?? 0) : '—';
          const used = balance ? (balance[`${type}Used`] ?? 0) : '—';
          const rem = balance ? (Number(total) - Number(used)) : '—';

          return (
            <div key={type} className="portal-stat-card" style={{ padding: '16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize', fontWeight: 600 }}>{type} Leave</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>
                {rem} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>days left</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Used: {used} / Total: {total}</div>
            </div>
          );
        })}
      </div>

      {/* Header and Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>My Leave Applications</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>View past leave submissions and current approval status.</p>
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
            <p style={{ marginTop: 8 }}>Loading leave data...</p>
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
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Days</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>
                    {l.leaveType || l.type}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                    {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                    {l.days} {l.days === 1 ? 'day' : 'days'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', maxWidth: 260 }}>
                    {l.reason}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: l.status.includes('approve') ? '#dcfce7' : l.status.includes('reject') ? '#fee2e2' : '#fef3c7',
                      color: l.status.includes('approve') ? '#15803d' : l.status.includes('reject') ? '#b91c1c' : '#b45309'
                    }}>
                      {l.status === 'pending_hod' ? 'Pending HOD' : l.status === 'pending_head' ? 'Pending Head' : l.status}
                    </span>
                  </td>
                </tr>
              ))}
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
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Review pending leave requests from department staff.</p>
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
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason</th>
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
                    {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()} ({l.days}d)
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>{l.reason}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'hod')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Approve</button>
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
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                    {l.user?.name || l.userId}
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{l.leaveType || l.type}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>
                    {new Date(l.startDate).toLocaleDateString()} &ndash; {new Date(l.endDate).toLocaleDateString()} ({l.days}d)
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: l.status === 'approved' ? '#dcfce7' : l.status.includes('reject') ? '#fee2e2' : '#fef3c7',
                      color: l.status === 'approved' ? '#15803d' : l.status.includes('reject') ? '#b91c1c' : '#b45309'
                    }}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {l.status === 'pending_head' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'admin')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Final Approve</button>
                        <button className="portal-btn-secondary" onClick={() => rejectLeave(l.id, 'admin')} style={{ padding: '6px 14px', fontSize: '0.85rem', color: '#dc2626' }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'my', label: 'My Leave', content: <MyLeaveTab /> },
    ...(isHod ? [{ id: 'dept', label: 'Department', content: <DeptTab /> }] : []),
    ...(isAdmin ? [{ id: 'all', label: 'All Leaves', content: <AdminTab /> }] : [])
  ];

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <TabbedPage
        title="Leave Management"
        subtitle="Apply for institutional leave, monitor allowances, and review department approvals."
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
              maxWidth: 540,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
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
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Apply for Leave</h3>
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
                  Leave Type *
                </label>
                <select
                  required
                  value={leaveForm.type}
                  onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
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
                  Requested duration: <strong>{calculatedDays} days</strong>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Reason / Purpose *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide context for this leave request..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {leaveForm.type === 'sick' && calculatedDays > 2 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>
                    Medical Certificate / Document Link * (Required for sick leave &gt; 2 days)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Document URL or reference (e.g. clinic notes / medical certificate)"
                    value={leaveForm.attachmentUrl}
                    onChange={e => setLeaveForm({ ...leaveForm, attachmentUrl: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #f87171', fontSize: '0.9rem' }}
                  />
                </div>
              )}

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
    </div>
  );
}
