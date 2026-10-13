import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import SearchInput from '../../../../components/shared/SearchInput';
import ExportButton from '../../../../components/shared/ExportButton';
import { useModuleAccess } from '../../../../hooks/useModuleAccess';
import ViewingAsToggle from '../../../../components/shared/ViewingAsToggle';

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  leaveType?: string;
  days?: number;
  createdAt?: string;
  staff?: {
    id?: string;
    name?: string;
    role?: string;
    email?: string;
  };
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

export default function MyLeave() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { level, actingAs } = useModuleAccess('leave');

  const isPrivileged = level === 'full' || level === 'scoped' || ['BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'HR', 'FINANCE'].includes(user?.role || '');
  const [viewMode, setViewMode] = useState<'my' | 'institutional'>(isPrivileged ? 'institutional' : 'my');
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'annual'
  });

  useEffect(() => {
    fetchLeaves();
  }, [viewMode]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const endpoint = viewMode === 'institutional' && isPrivileged ? '/api/leave/all' : '/api/leave/my';
      const res = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : (res.data?.leaves || []);
      setLeaves(data);
    } catch (error) {
      console.error('Error fetching leaves', error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaves = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return leaves;
    return leaves.filter(l => {
      const reasonText = l.reason || '';
      const statusText = l.status || '';
      const staffName = l.staff?.name || l.user?.name || '';
      const roleText = l.staff?.role || l.user?.role || '';
      const typeText = l.leaveType || '';
      return reasonText.toLowerCase().includes(q) ||
        statusText.toLowerCase().includes(q) ||
        staffName.toLowerCase().includes(q) ||
        roleText.toLowerCase().includes(q) ||
        typeText.toLowerCase().includes(q);
    });
  }, [leaves, searchTerm]);

  const paginatedLeaves = useMemo(() => {
    return filteredLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLeaves, currentPage]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(l => (l.status || '').toLowerCase() === 'approved').length;
    const pending = leaves.filter(l => (l.status || '').toLowerCase() === 'pending').length;
    const rejected = leaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [leaves]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/api/leave/${editingId}`, formData);
        showToast('Leave application updated successfully', 'success');
      } else {
        await api.post('/api/leave', formData);
        showToast('Leave application submitted successfully', 'success');
      }
      fetchLeaves();
      setFormData({ startDate: '', endDate: '', reason: '', leaveType: 'annual' });
      setShowAddModal(false);
      setEditingId(null);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save leave application', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this leave application?')) {
      try {
        await api.delete(`/api/leave/${id}`);
        showToast('Leave application deleted', 'success');
        fetchLeaves();
      } catch (error) {
        showToast('Failed to delete leave application', 'error');
      }
    }
  };

  const handleEdit = (leave: LeaveRecord) => {
    setEditingId(leave.id);
    setFormData({
      startDate: leave.startDate ? format(new Date(leave.startDate), 'yyyy-MM-dd') : '',
      endDate: leave.endDate ? format(new Date(leave.endDate), 'yyyy-MM-dd') : '',
      reason: leave.reason || '',
      leaveType: leave.leaveType || 'annual'
    });
    setShowAddModal(true);
  };

  // Export Columns definition for ExportButton
  const exportColumns = useMemo(() => {
    const cols = [
      { header: 'Reference ID', key: 'id' },
      { header: 'Start Date', key: 'startDate', formatter: (val: string) => val ? format(new Date(val), 'yyyy-MM-dd') : '' },
      { header: 'End Date', key: 'endDate', formatter: (val: string) => val ? format(new Date(val), 'yyyy-MM-dd') : '' },
      { header: 'Reason', key: 'reason' },
      { header: 'Status', key: 'status' }
    ];
    if (viewMode === 'institutional') {
      cols.splice(1, 0, {
        header: 'Staff Member',
        key: 'staff',
        formatter: (_: any, row: LeaveRecord) => row.staff?.name || row.user?.name || 'Staff'
      });
      cols.splice(2, 0, {
        header: 'Role / Designation',
        key: 'staffRole',
        formatter: (_: any, row: LeaveRecord) => row.staff?.role || row.user?.role || '-'
      });
    }
    return cols;
  }, [viewMode]);

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>{viewMode === 'institutional' ? 'Institutional Staff Leave Management' : 'My Leave Applications'}</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            {viewMode === 'institutional'
              ? 'Review institutional staff leave applications, coverage, and administrative approvals.'
              : 'Track personal leave requests, entitlements, and approval progress.'}
          </p>
          {actingAs && <ViewingAsToggle actingAs={actingAs} />}
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ startDate: '', endDate: '', reason: '', leaveType: 'annual' });
              setShowAddModal(true);
            }}
            className="portal-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 600 }}
          >
            <i className="fas fa-plus-circle"></i> Apply for Leave
          </button>
        </div>
      </div>

      {/* Split-View Mode Toggle for HR / School Admin / HOD */}
      {isPrivileged && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            className={viewMode === 'institutional' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => { setViewMode('institutional'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <i className="fas fa-building mr-2" />
            {level === 'scoped' ? 'Department Staff Leave' : 'Institutional Staff Leave'}
          </button>
          <button
            className={viewMode === 'my' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => { setViewMode('my'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <i className="fas fa-user mr-2" />
            My Personal Leave
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL APPLICATIONS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: 4 }}>{viewMode === 'institutional' ? 'All recorded requests' : 'My lifetime applications'}</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>APPROVED LEAVES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>{stats.approved}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>Officially sanctioned</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>PENDING REVIEWS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>{stats.pending}</div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: 4 }}>Awaiting admin approval</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>REJECTED / DECLINED</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{stats.rejected}</div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>Returned or declined</div>
        </div>
      </div>

      {/* Main Leave Table Card */}
      <div className="portal-card" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            <i className="fas fa-list mr-2" style={{ marginRight: 8 }} />
            {viewMode === 'institutional' ? 'STAFF LEAVE AUDIT REGISTER' : 'PERSONAL LEAVE HISTORY'}
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
            <ExportButton
              data={filteredLeaves}
              filename={viewMode === 'institutional' ? 'Staff_Leave_Register' : 'My_Leave_Applications'}
              columns={exportColumns}
              title={viewMode === 'institutional' ? 'Staff Leave Audit Register' : 'My Leave Applications'}
            />
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 20 }}>
          {/* Shared Live-Search Component */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ width: 280 }}>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search staff, reason, status..."
              />
            </div>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>REF ID</th>
                {viewMode === 'institutional' && <th style={{ padding: '12px 14px' }}>STAFF MEMBER</th>}
                <th style={{ padding: '12px 14px' }}>START DATE</th>
                <th style={{ padding: '12px 14px' }}>END DATE</th>
                <th style={{ padding: '12px 14px' }}>REASON / NOTES</th>
                <th style={{ padding: '12px 14px' }}>STATUS</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={viewMode === 'institutional' ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin mr-2" /> Loading leave applications...
                  </td>
                </tr>
              ) : paginatedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'institutional' ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No leave records found matching current query.
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((leave) => {
                  const statusNormalized = (leave.status || 'Pending').toLowerCase();
                  const badgeClass = statusNormalized === 'approved' ? 'success' : statusNormalized === 'rejected' ? 'danger' : 'warning';
                  return (
                    <tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>
                        {leave.id.substring(0, 8).toUpperCase()}
                      </td>
                      {viewMode === 'institutional' && (
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: '#1e293b' }}>{leave.staff?.name || leave.user?.name || 'Staff Member'}</strong>
                          <br />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{leave.staff?.role || leave.user?.role || 'Staff'}</span>
                        </td>
                      )}
                      <td style={{ padding: '12px 14px' }}>{leave.startDate ? format(new Date(leave.startDate), 'yyyy-MM-dd') : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{leave.endDate ? format(new Date(leave.endDate), 'yyyy-MM-dd') : '—'}</td>
                      <td style={{ padding: '12px 14px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                        {leave.reason || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`portal-badge ${badgeClass}`} style={{ textTransform: 'capitalize' }}>
                          {leave.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '4px 8px', marginRight: 6, fontSize: '0.8rem' }}
                          onClick={() => handleEdit(leave)}
                          title="Edit leave details"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(leave.id)}
                          title="Delete leave application"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeaves.length)} of {filteredLeaves.length} records</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="portal-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span style={{ padding: '4px 10px', fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
                <button
                  className="portal-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leave Application Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 500, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {editingId ? 'Edit Leave Application' : 'Submit Leave Request'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingId(null); }}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Leave Type</label>
                <select
                  className="portal-select"
                  style={{ width: '100%', padding: '8px 12px' }}
                  value={formData.leaveType}
                  onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                >
                  <option value="annual">Annual Statutory Leave</option>
                  <option value="sick">Sick Leave (Medical)</option>
                  <option value="maternity">Maternity / Paternity Leave</option>
                  <option value="study">Study / Professional Exam Leave</option>
                  <option value="compassionate">Compassionate / Family Emergency</option>
                  <option value="unpaid">Unpaid Personal Leave</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Start Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>End Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Reason & Handover Details *</label>
                <textarea
                  className="portal-input"
                  style={{ width: '100%', minHeight: 80, padding: '8px 10px', resize: 'vertical' }}
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Detail grounds for leave and lesson handover..."
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={() => { setShowAddModal(false); setEditingId(null); }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {loading && <i className="fas fa-spinner fa-spin" />}
                  {editingId ? 'Update Leave' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
