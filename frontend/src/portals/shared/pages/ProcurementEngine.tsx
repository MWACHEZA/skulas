import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';

export type ProcurementMode = 'REQUEST_ONLY' | 'ADMIN_APPROVE' | 'BURSAR_APPROVE' | 'STORE_ISSUE' | 'FULL';

interface Props {
  mode?: ProcurementMode;
}

interface RequisitionItem {
  sku?: string;
  name?: string;
  itemName?: string;
  quantity?: number;
  qty?: number;
  reason?: string;
}

interface Requisition {
  id: string;
  refNumber: string;
  title: string;
  status: string;
  estimatedAmount?: number;
  requesterRole?: string;
  items?: RequisitionItem[] | string;
  rejectionReason?: string;
  createdAt: string;
  requester?: { id: string; name: string; role: string };
  requestedByStudent?: { id: string; name: string };
  hostelReq?: { id: string; name: string };
  matronApprovedBy?: { name: string };
  issuedBy?: { name: string };
  bursar?: { name: string };
  admin?: { name: string };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_HOD_BOARDING: { label: 'Waiting for Matron', bg: '#fef3c7', color: '#b45309' },
  PENDING_ADMIN: { label: 'Waiting for Admin', bg: '#e0f2fe', color: '#0369a1' },
  PENDING_BURSAR: { label: 'Waiting for Bursar', bg: '#f3e8ff', color: '#7e22ce' },
  APPROVED: { label: 'Approved (Pending Issue)', bg: '#dcfce7', color: '#15803d' },
  ISSUED: { label: 'Ready for Collection', bg: '#ccfbf1', color: '#0f766e' },
  RECEIVED: { label: 'Received & Completed', bg: '#f1f5f9', color: '#475569' },
  REJECTED: { label: 'Declined', bg: '#fee2e2', color: '#b91c1c' },
  PENDING: { label: 'Pending HOD', bg: '#fef3c7', color: '#b45309' },
  HOD_APPROVED: { label: 'HOD Approved', bg: '#e0f2fe', color: '#0369a1' },
  BURSAR_APPROVED: { label: 'Bursar Approved', bg: '#f3e8ff', color: '#7e22ce' }
};

export default function ProcurementEngine({ mode: initialMode }: Props) {
  const { user, isLeader } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine effective mode based on user role if not strictly passed
  const effectiveMode: ProcurementMode = initialMode || (
    user?.role === 'SCHOOL_ADMIN' ? 'ADMIN_APPROVE' :
    user?.role === 'BURSAR' ? 'BURSAR_APPROVE' :
    'REQUEST_ONLY'
  );

  const [activeTab, setActiveTab] = useState<'requests' | 'approvals' | 'history'>(
    (searchParams.get('tab') as any) || (effectiveMode === 'REQUEST_ONLY' ? 'requests' : 'approvals')
  );

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for New Request
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqEstimatedAmount, setReqEstimatedAmount] = useState('');
  const [reqDepartment, setReqDepartment] = useState('');

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReqForReject, setSelectedReqForReject] = useState<Requisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchRequisitions();
  }, [effectiveMode, activeTab]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/procurement/requisitions');
      setRequisitions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load requisitions', err);
      showToast('Failed to load requisitions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'requests' | 'approvals' | 'history') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Actions
  const handleApprove = async (req: Requisition) => {
    try {
      await api.post(`/api/procurement/requisitions/${req.id}/approve-stage`);
      showToast(`Request ${req.refNumber || req.title} approved`, 'success');
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve request', 'error');
    }
  };

  const handleIssue = async (req: Requisition) => {
    try {
      await api.post(`/api/procurement/requisitions/${req.id}/issue`);
      showToast(`Supplies for ${req.refNumber} marked as ISSUED`, 'success');
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue items', 'error');
    }
  };

  const handleOpenReject = (req: Requisition) => {
    setSelectedReqForReject(req);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedReqForReject) return;
    setRejecting(true);
    try {
      await api.post(`/api/procurement/requisitions/${selectedReqForReject.id}/matron-reject`, {
        reason: rejectionReason
      });
      showToast('Requisition has been declined', 'info');
      setShowRejectModal(false);
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to decline request', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) {
      showToast('Title is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/procurement/requisitions', {
        title: reqTitle,
        description: reqDescription,
        estimatedAmount: parseFloat(reqEstimatedAmount) || 0,
        department: reqDepartment || user?.role || 'General'
      });
      showToast('Requisition submitted for approval', 'success');
      setShowModal(false);
      setReqTitle('');
      setReqDescription('');
      setReqEstimatedAmount('');
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit requisition', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requisitions
  const filtered = requisitions.filter(r => {
    const matchesSearch = 
      (r.refNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.requester?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.requestedByStudent?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    if (activeTab === 'approvals') {
      if (effectiveMode === 'ADMIN_APPROVE') {
        return matchesSearch && matchesStatus && (r.status === 'PENDING_ADMIN' || r.status === 'BURSAR_APPROVED');
      }
      if (effectiveMode === 'BURSAR_APPROVE') {
        return matchesSearch && matchesStatus && (r.status === 'PENDING_BURSAR' || r.status === 'HOD_APPROVED');
      }
      if (effectiveMode === 'STORE_ISSUE') {
        return matchesSearch && matchesStatus && r.status === 'APPROVED';
      }
    }

    return matchesSearch && matchesStatus;
  });

  const canApprove = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canReleaseFunds = user?.role === 'BURSAR' || user?.role === 'SCHOOL_ADMIN';
  const canIssue = user?.role === 'ANCILLARY' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'BURSAR';

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-boxes" style={{ color: 'var(--school-primary, #0284c7)' }} />
            Procurement & Requisitions Hub
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Centralized requisition tracking, multi-tier approvals, fund release, and stock issuance.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="portal-btn portal-btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <i className="fas fa-plus" />
            Raise Requisition
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => handleTabChange('requests')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            color: activeTab === 'requests' ? 'var(--school-primary, #0284c7)' : '#64748b',
            borderBottom: activeTab === 'requests' ? '3px solid var(--school-primary, #0284c7)' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-list-alt" style={{ marginRight: 8 }} />
          All Requisitions ({requisitions.length})
        </button>

        {(canApprove || canReleaseFunds || canIssue) && (
          <button
            type="button"
            onClick={() => handleTabChange('approvals')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'approvals' ? 700 : 500,
              color: activeTab === 'approvals' ? 'var(--school-primary, #0284c7)' : '#64748b',
              borderBottom: activeTab === 'approvals' ? '3px solid var(--school-primary, #0284c7)' : '3px solid transparent',
              marginBottom: '-2px',
              fontSize: '0.95rem'
            }}
          >
            <i className="fas fa-check-double" style={{ marginRight: 8 }} />
            Pending Action Queue
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '14px 18px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search ref #, title, or requester..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#334155' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_ADMIN">Waiting for Admin</option>
          <option value="PENDING_BURSAR">Waiting for Bursar</option>
          <option value="APPROVED">Approved (Ready to Issue)</option>
          <option value="ISSUED">Issued</option>
          <option value="RECEIVED">Received</option>
          <option value="REJECTED">Declined</option>
        </select>
      </div>

      {/* Requisitions Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 8 }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0284c7)' }} />
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading procurement requisitions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <i className="fas fa-inbox fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>No Requisitions Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            {activeTab === 'approvals' ? 'Your approval queue is currently empty.' : 'Click "Raise Requisition" to create one.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Ref #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Title & Scope</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Requester</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const badge = STATUS_CONFIG[r.status] || { label: r.status, bg: '#f1f5f9', color: '#475569' };
                const isStudentReq = r.requesterRole === 'STUDENT_LEADER';
                const requesterName = isStudentReq ? r.requestedByStudent?.name : r.requester?.name;

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                      {r.refNumber || `REQ-${r.id.slice(-6).toUpperCase()}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.title}</div>
                      {r.hostelReq && (
                        <span style={{ fontSize: '0.8rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                          <i className="fas fa-hotel" style={{ marginRight: 4 }} />
                          {r.hostelReq.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: 500 }}>{requesterName || 'Staff Member'}</div>
                      <span style={{ fontSize: '0.75rem', color: isStudentReq ? '#b45309' : '#64748b' }}>
                        {isStudentReq ? 'Student Leader' : r.requester?.role || 'Staff'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                      {isStudentReq ? (
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Store Requisition (0.00)</span>
                      ) : (
                        formatCurrency(r.estimatedAmount || 0)
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.color,
                        display: 'inline-block'
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* Admin Approval Button */}
                        {canApprove && (r.status === 'PENDING_ADMIN' || r.status === 'BURSAR_APPROVED') && (
                          <button
                            type="button"
                            onClick={() => handleApprove(r)}
                            style={{ padding: '5px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                        )}

                        {/* Bursar Release Funds Button */}
                        {canReleaseFunds && (r.status === 'PENDING_BURSAR' || r.status === 'HOD_APPROVED') && (
                          <button
                            type="button"
                            onClick={() => handleApprove(r)}
                            style={{ padding: '5px 12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Release Funds
                          </button>
                        )}

                        {/* Store Issue Button */}
                        {canIssue && r.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleIssue(r)}
                            style={{ padding: '5px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Issue Items
                          </button>
                        )}

                        {/* Decline Button */}
                        {(canApprove || canReleaseFunds) && (r.status === 'PENDING_ADMIN' || r.status === 'PENDING_BURSAR') && (
                          <button
                            type="button"
                            onClick={() => handleOpenReject(r)}
                            style={{ padding: '5px 12px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Requisition */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 540, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              Raise New Requisition
            </h2>
            <form onSubmit={handleCreateRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab Consumables Term 1"
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Estimated Budget ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={reqEstimatedAmount}
                  onChange={e => setReqEstimatedAmount(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Department / Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Science, Boarding, IT, Administration"
                  value={reqDepartment}
                  onChange={e => setReqDepartment(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Description & Justification</label>
                <textarea
                  rows={3}
                  placeholder="Provide details on required supplies and reason for purchase..."
                  value={reqDescription}
                  onChange={e => setReqDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="portal-btn portal-btn-primary"
                  style={{ padding: '9px 20px', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Decline Requisition */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 460 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b', marginBottom: 12 }}>
              Decline Requisition
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16 }}>
              Please provide a specific reason for declining request <strong>{selectedReqForReject?.refNumber}</strong>:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Budget ceiling reached, item already in store, or defer to Term 2..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 18 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmReject}
                style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                {rejecting ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
