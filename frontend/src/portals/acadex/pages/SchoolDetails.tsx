import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface SchoolData {
  id: string;
  code: string;
  name: string;
  type: string;
  country: string;
  address?: string;
  phone?: string;
  email: string;
  website?: string;
  status: string;
  plan?: {
    id: string;
    name: string;
    price: number;
    features: string[];
  };
  branding?: any;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isLocked: boolean;
  createdAt: string;
  passwordLastChanged?: string;
}

interface StatsData {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalDepartments: number;
  supportTickets: number;
}

interface BillingData {
  ratePerStudent: number;
  activeStudents: number;
  monthlyPlatformBill: number;
  annualPlatformBill: number;
  currency: string;
  status: string;
}

interface LogItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  status: string;
  details?: any;
}

export default function AcadexSchoolDetails() {
  const { code, schoolId } = useParams();
  const targetId = code || schoolId;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: '',
    planName: 'Professional'
  });
  const [isSuspendWarningOpen, setIsSuspendWarningOpen] = useState(false);

  useEffect(() => {
    if (targetId) {
      fetchDetails();
    }
  }, [targetId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/acadex/schools/${targetId}`);
      setSchool(data.school);
      setAdministrators(data.administrators || []);
      setStats(data.stats);
      setBilling(data.billing);
      setRecentLogs(data.recentLogs || []);

      if (data.school) {
        setEditForm({
          name: data.school.name || '',
          email: data.school.email || '',
          phone: data.school.phone || '',
          address: data.school.address || '',
          type: data.school.type || '',
          planName: data.school.plan?.name || 'Professional'
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch school details:', err);
      showToast(err.response?.data?.error || 'Failed to load school profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!school) return;
    setUpdating(true);
    try {
      await api.patch(`/api/schools/${school.code}`, { status: newStatus });
      showToast(`School status updated to ${newStatus.toUpperCase()}`, 'success');
      fetchDetails();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
      setIsSuspendWarningOpen(false);
    }
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setUpdating(true);
    try {
      await api.patch(`/api/schools/${school.code}`, editForm);
      showToast('School profile updated successfully', 'success');
      setIsEditOpen(false);
      fetchDetails();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update school', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!userId) {
      showToast('No administrator account associated with this school', 'warning');
      return;
    }

    try {
      const { data } = await api.post(`/api/auth/impersonate/${userId}`);
      localStorage.setItem('acadex_token', data.token);
      localStorage.setItem('acadex_user', JSON.stringify(data.user));
      showToast(`Impersonating ${data.user.name}...`, 'info');
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start impersonation session', 'error');
    }
  };

  const handleDelete = async () => {
    if (!school) return;
    if (!window.confirm(`PERMANENTLY TERMINATE TENANT ${school.name} (${school.code})? All data will be marked deleted.`)) {
      return;
    }

    setUpdating(true);
    try {
      await api.delete(`/api/schools/${school.code}`);
      showToast('School instance terminated successfully', 'success');
      navigate('/acadex/schools');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete school', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: 'var(--portal-primary)' }}></i>
        <p style={{ marginTop: 15, color: '#64748b' }}>Loading tenant profile and live metrics...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#dc2626' }}></i>
        <h2 style={{ marginTop: 15 }}>School Not Found</h2>
        <p style={{ color: '#64748b' }}>The requested school instance identifier could not be located in the database.</p>
        <button className="portal-btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/acadex/schools')}>
          Return to School Registry
        </button>
      </div>
    );
  }

  const primaryAdmin = administrators[0];

  return (
    <div className="school-details-page">
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button className="portal-btn-secondary" onClick={() => navigate('/acadex/schools')} style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0 }}>{school.name}</h1>
              <span className={`portal-badge ${school.status === 'active' ? 'success' : 'danger'}`}>
                {school.status.toUpperCase()}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>
              License ID: <strong style={{ color: 'var(--portal-primary)', fontFamily: 'monospace' }}>{school.code}</strong> • {school.country} • {school.type.toUpperCase()}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-secondary" onClick={() => setIsEditOpen(true)}>
            <i className="fas fa-edit" style={{ marginRight: 6 }}></i> Edit School Info
          </button>
          {primaryAdmin && (
            <button className="portal-btn-secondary" onClick={() => handleImpersonate(primaryAdmin.id)}>
              <i className="fas fa-user-secret" style={{ marginRight: 6 }}></i> Impersonate Admin
            </button>
          )}
          {school.status === 'active' ? (
            <button className="portal-btn-secondary" style={{ color: '#f59e0b' }} onClick={() => setIsSuspendWarningOpen(true)}>
              <i className="fas fa-pause-circle" style={{ marginRight: 6 }}></i> Suspend School
            </button>
          ) : (
            <button className="portal-btn-primary" onClick={() => handleStatusChange('active')}>
              <i className="fas fa-play-circle" style={{ marginRight: 6 }}></i> Activate School
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="portal-stats-grid" style={{ marginBottom: 25 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{(stats?.activeStudents || 0).toLocaleString()}</h3>
            <p>Active Students ({stats?.totalStudents || 0} Total)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="portal-stat-info">
            <h3>${(billing?.monthlyPlatformBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p>Monthly SaaS Bill ($2.00 / student)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{(stats?.totalTeachers || 0).toLocaleString()}</h3>
            <p>Faculty & Teachers</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <i className="fas fa-life-ring"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{(stats?.supportTickets || 0).toLocaleString()}</h3>
            <p>Support Tickets</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-3" style={{ marginBottom: 25 }}>
        {/* Subscription & Billing Card */}
        <div className="portal-card" style={{ gridColumn: 'span 2' }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>SaaS Subscription & Billing</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
                  {school.plan?.name || 'Standard'} Plan
                </h3>
                <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: '0.9rem' }}>
                  Monthly billing calculation: <strong>{(billing?.activeStudents || 0)} active students × $2.00/mo</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--portal-primary)' }}>
                  ${(billing?.monthlyPlatformBill || 0).toFixed(2)}
                  <small style={{ fontSize: '0.85rem', color: '#64748b' }}>/mo</small>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Annual Value: ${(billing?.annualPlatformBill || 0).toFixed(2)}/yr
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>Enabled Platform Modules</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {(school.plan?.features || ['Core Academic LMS', 'Student Information System', 'Tuition Billing Engine', 'Automated Attendance', 'AI Santa Assistant']).map((f: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#334155' }}>
                    <i className="fas fa-check-circle" style={{ color: '#059669' }}></i> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Danger Zone */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-shield-alt" style={{ marginRight: 8, color: '#f59e0b' }}></i>Administrative Controls</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {primaryAdmin && (
                <button
                  className="portal-btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleImpersonate(primaryAdmin.id)}
                >
                  <i className="fas fa-user-secret" style={{ marginRight: 8 }}></i> Impersonate Admin
                </button>
              )}
              <button
                className="portal-btn-secondary"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setIsEditOpen(true)}
              >
                <i className="fas fa-sliders-h" style={{ marginRight: 8 }}></i> Edit School Info
              </button>
              <button
                className="portal-btn-secondary"
                style={{ justifyContent: 'flex-start', color: school.status === 'active' ? '#f59e0b' : '#059669' }}
                onClick={() => school.status === 'active' ? setIsSuspendWarningOpen(true) : handleStatusChange('active')}
                disabled={updating}
              >
                <i className={school.status === 'active' ? 'fas fa-pause-circle' : 'fas fa-play-circle'} style={{ marginRight: 8 }}></i>
                {school.status === 'active' ? 'Suspend Tenant Access' : 'Reactivate Tenant Access'}
              </button>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
              <button
                className="portal-btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#dc2626' }}
                onClick={handleDelete}
                disabled={updating}
              >
                <i className="fas fa-trash-alt" style={{ marginRight: 8 }}></i> Terminate School Instance
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Institutional Details */}
      <div className="portal-grid-2" style={{ marginBottom: 25 }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Institution Profile</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Official Email</label>
                <strong>{school.email}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Phone Number</label>
                <strong>{school.phone || '—'}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Country</label>
                <strong>{school.country}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Institution Type</label>
                <strong>{school.type.toUpperCase()}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Physical Address</label>
                <strong>{school.address || '—'}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Provisioned Date</label>
                <span>{new Date(school.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Administrators Table */}
        <div className="portal-card" style={{ overflow: 'visible' }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-user-shield" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>School Administrators ({administrators.length})</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {administrators.length > 0 ? (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {administrators.map(admin => (
                    <tr key={admin.id}>
                      <td style={{ fontWeight: 600 }}>{admin.name}</td>
                      <td style={{ fontSize: '0.85rem' }}>{admin.email}</td>
                      <td>
                        <span className={`portal-badge ${admin.isLocked ? 'danger' : 'success'}`}>
                          {admin.isLocked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleImpersonate(admin.id)}
                        >
                          <i className="fas fa-user-secret"></i> Impersonate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ padding: 20, color: '#64748b', margin: 0 }}>No administrators registered for this school.</p>
            )}
          </div>
        </div>
      </div>

      {/* Live School Activity Logs */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Recent School Activity & Audit Logs</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {recentLogs.length > 0 ? (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td style={{ fontSize: '0.85rem' }}>{log.actor}</td>
                    <td>
                      <span className={`portal-badge ${log.status === 'SUCCESS' ? 'success' : 'danger'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: 20, color: '#64748b', margin: 0 }}>No audit logs recorded for this school instance yet.</p>
          )}
        </div>
      </div>

      {/* Edit School Info Modal */}
      {isEditOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 600 }}>
            <div className="portal-modal-header">
              <h2>Edit School Information</h2>
              <button className="portal-modal-close" onClick={() => setIsEditOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateSchool}>
              <div className="portal-modal-body">
                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>School Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="portal-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact Email</label>
                    <input
                      type="email"
                      className="portal-input"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="portal-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone</label>
                    <input
                      type="text"
                      className="portal-input"
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="portal-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Institution Type</label>
                    <select
                      className="portal-input"
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="combined">Combined</option>
                      <option value="college">College / Tertiary</option>
                      <option value="university">University</option>
                      <option value="polytechnic">Polytechnic</option>
                      <option value="nursing">Nursing</option>
                    </select>
                  </div>

                  <div className="portal-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Subscription Plan</label>
                    <select
                      className="portal-input"
                      value={editForm.planName}
                      onChange={e => setEditForm({ ...editForm, planName: e.target.value })}
                    >
                      <option value="Starter">Starter Plan</option>
                      <option value="Professional">Professional Plan</option>
                      <option value="Enterprise">Enterprise Plan</option>
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Physical Address</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={editForm.address}
                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={updating}>
                  {updating ? <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {isSuspendWarningOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="portal-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ margin: 0, color: '#f59e0b' }}>Suspend School Access</h3>
            </div>
            <div className="portal-modal-body" style={{ textAlign: 'center', paddingTop: 10 }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: 16 }}></i>
              <p style={{ lineHeight: 1.5 }}>
                Are you sure you want to suspend access for <strong>{school.name}</strong>?
                Users and students from this school instance will be barred from logging in until reactivated.
              </p>
            </div>
            <div className="portal-modal-footer" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="portal-btn-secondary" onClick={() => setIsSuspendWarningOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" style={{ background: '#f59e0b' }} onClick={() => handleStatusChange('suspended')}>
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
