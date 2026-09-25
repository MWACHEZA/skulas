import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import ClockInModal from '../../../components/attendance/ClockInModal';
import { SetupProgressBanner } from '../../../components/common/SetupProgressBanner';
import { RoleOrientationModal } from '../../../components/common/RoleOrientationModal';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

interface DashboardData {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    pendingApplications: number;
    totalRevenue: number;
    reportsCount: number;
  };
  todayActions?: {
    absentCount: number;
    absentStudents: number;
    absentStaff: number;
    clinicVisits: number;
    feePaymentsCount: number;
    feePaymentsTotal: number;
    lowStockAlerts: number;
  };
  needsApproval?: {
    admissions: number;
    paymentPlans: number;
    leaveRequests: number;
  };
  recentApplications: { id: string; applicantName: string; appType: string; status: string; createdAt: string }[];
  announcements: {
    id: string;
    title: string;
    content?: string;
    body?: string;
    publishedAt?: string;
    createdAt?: string;
    author?: { name: string };
  }[];
}

interface AttendanceStatus {
  id?: string;
  timeIn?: string;
  timeOut?: string | null;
  status?: string;
  lateReason?: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isMedical } = useTerminology();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/dashboard/admin'),
      api.get('/api/staff-attendance/today')
    ])
    .then(([dashRes, attRes]) => {
      setData(dashRes.data);
      setAttendanceStatus(attRes.data);
    })
    .catch(err => {
      console.error(err);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="portal-dashboard-loading">
      <i className="fas fa-spinner fa-spin fa-3x portal-dashboard-spinner"></i>
      <p className="portal-dashboard-loading-text">Loading action dashboard...</p>
    </div>
  );

  const todayActions = data?.todayActions || {
    absentCount: 0,
    absentStudents: 0,
    absentStaff: 0,
    clinicVisits: 0,
    feePaymentsCount: 0,
    feePaymentsTotal: 0,
    lowStockAlerts: 0
  };

  const needsApproval = data?.needsApproval || {
    admissions: data?.stats?.pendingApplications || 0,
    paymentPlans: 0,
    leaveRequests: 0
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Admin Dashboard</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Action center for {user?.schoolName || (isMedical ? 'Institution' : 'School')}. Check today's alerts and approvals.
          </p>
        </div>
      </div>

      <SetupProgressBanner />
      <RoleOrientationModal />

      {/* ============================================================== */}
      {/* 1. ACTION-ORIENTED TODAY ROW & ATTENDANCE CLOCK */}
      {/* ============================================================== */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i className="fas fa-calendar-day mr-2" style={{ color: '#2563eb' }}></i>Today's Operational Action Items
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* 1. Absent Today */}
          <Link 
            to="/admin/attendance?status=ABSENT&filter=today" 
            className="portal-card" 
            style={{ 
              padding: '16px 20px', 
              textDecoration: 'none', 
              color: 'inherit',
              borderLeft: '4px solid #ef4444',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Absent Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: todayActions.absentCount > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>
                {todayActions.absentCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {todayActions.absentStudents} {t('students')}, {todayActions.absentStaff} staff
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <i className="fas fa-user-times" style={{ fontSize: '1.2rem' }}></i>
            </div>
          </Link>

          {/* 2. Clinic Visits Today */}
          <Link 
            to="/admin/clinic?tab=visits&filter=today" 
            className="portal-card" 
            style={{ 
              padding: '16px 20px', 
              textDecoration: 'none', 
              color: 'inherit',
              borderLeft: '4px solid #06b6d4',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Clinic Visits</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0891b2', margin: '4px 0' }}>
                {todayActions.clinicVisits}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Logged in triage today
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
              <i className="fas fa-heartbeat" style={{ fontSize: '1.2rem' }}></i>
            </div>
          </Link>

          {/* 3. Fee Payments Today */}
          <Link 
            to="/admin/finance/billing?tab=receipts&filter=today" 
            className="portal-card" 
            style={{ 
              padding: '16px 20px', 
              textDecoration: 'none', 
              color: 'inherit',
              borderLeft: '4px solid #10b981',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fee Payments</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>
                {todayActions.feePaymentsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {formatCurrency(todayActions.feePaymentsTotal)} collected
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <i className="fas fa-receipt" style={{ fontSize: '1.2rem' }}></i>
            </div>
          </Link>

          {/* 4. Low Stock Alerts */}
          <Link 
            to="/admin/uniforms?tab=inventory&lowStock=true" 
            className="portal-card" 
            style={{ 
              padding: '16px 20px', 
              textDecoration: 'none', 
              color: 'inherit',
              borderLeft: '4px solid #f59e0b',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Low Stock Alerts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: todayActions.lowStockAlerts > 0 ? '#d97706' : '#10b981', margin: '4px 0' }}>
                {todayActions.lowStockAlerts}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Items below reorder point
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <i className="fas fa-box-open" style={{ fontSize: '1.2rem' }}></i>
            </div>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. NEEDS APPROVAL ROW */}
      {/* ============================================================== */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i className="fas fa-clipboard-check mr-2" style={{ color: '#8b5cf6' }}></i>Needs Administrative Approval
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Admissions Pipeline */}
          <Link 
            to="/admin/admissions?status=pending"
            className="portal-card"
            style={{
              padding: '18px 24px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#faf5ff',
              border: '1px solid #e9d5ff'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              <i className="fas fa-user-plus"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6b21a8' }}>
                {needsApproval.admissions} Admissions Awaiting Review
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7e22ce' }}>
                Applicants in queue for screening & admission
              </div>
            </div>
            <i className="fas fa-chevron-right" style={{ color: '#a855f7' }}></i>
          </Link>

          {/* Payment Plans */}
          <Link 
            to="/admin/finance/payment-plans?status=pending"
            className="portal-card"
            style={{
              padding: '18px 24px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              <i className="fas fa-file-contract"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                {needsApproval.paymentPlans} Payment Plan Requests
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                Parent installment plans needing authorization
              </div>
            </div>
            <i className="fas fa-chevron-right" style={{ color: '#22c55e' }}></i>
          </Link>

          {/* Leave Requests */}
          <Link 
            to="/admin/communication?tab=approvals&type=leave"
            className="portal-card"
            style={{
              padding: '18px 24px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#fffbeb',
              border: '1px solid #fde68a'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              <i className="fas fa-calendar-minus"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e' }}>
                {needsApproval.leaveRequests} Staff Leave Applications
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                Teacher & employee time-off requests
              </div>
            </div>
            <i className="fas fa-chevron-right" style={{ color: '#f59e0b' }}></i>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CORE DOMAIN SHORTCUTS (THE 16 CANONICAL HUBS) */}
      {/* ============================================================== */}
      <div className="portal-grid-2" style={{ marginBottom: 28 }}>
        {/* Recent Applications */}
        <div className="portal-card">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}><i className="fas fa-user-plus mr-2" style={{ color: '#8b5cf6' }}></i>Recent Admissions</h2>
            <Link to="/admin/admissions" className="portal-header-link" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Open Pipeline</Link>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            {!data?.recentApplications?.length ? (
              <div className="portal-card-empty-pad">No applications in pipeline.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>{t('applicant')}</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {(Array.isArray(data.recentApplications) ? data.recentApplications : []).map(a => (
                    <tr key={a.id}>
                      <td className="portal-font-semibold">{a.applicantName}</td>
                      <td className="portal-text-muted">{a.appType}</td>
                      <td>
                        <span className={`portal-badge ${a.status === 'pending' ? 'warning' : a.status === 'approved' ? 'success' : 'danger'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/admissions?id=${a.id}`} className="portal-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 16-Core Domain Hubs */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}><i className="fas fa-th-large mr-2" style={{ color: '#2563eb' }}></i>Core Administration Hubs</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {[
                { label: 'Students', to: '/admin/students', icon: 'fa-user-graduate', color: '#2563eb' },
                { label: 'Admissions', to: '/admin/admissions', icon: 'fa-user-plus', color: '#8b5cf6' },
                { label: 'Finance Summary', to: '/admin/finance/overview', icon: 'fa-chart-line', color: '#059669' },
                { label: 'Billing & Ledgers', to: '/admin/finance/billing', icon: 'fa-receipt', color: '#10b981' },
                { label: 'Payment Plans', to: '/admin/finance/payment-plans', icon: 'fa-handshake', color: '#0d9488' },
                { label: 'Wallets & Store', to: '/admin/finance/wallets', icon: 'fa-wallet', color: '#d97706' },
                { label: 'Academics Setup', to: '/admin/academics/setup', icon: 'fa-cogs', color: '#4f46e5' },
                { label: 'Marks & Reports', to: '/admin/academics/marks', icon: 'fa-marker', color: '#7c3aed' },
                { label: 'Timetable', to: '/admin/academics/timetable', icon: 'fa-calendar-alt', color: '#3b82f6' },
                { label: 'Attendance', to: '/admin/attendance', icon: 'fa-user-check', color: '#ef4444' },
                { label: 'Clinic', to: '/admin/clinic', icon: 'fa-heartbeat', color: '#06b6d4' },
                { label: 'Discipline', to: '/admin/discipline', icon: 'fa-shield-alt', color: '#b91c1c' },
                { label: 'Transport', to: '/admin/transport', icon: 'fa-bus', color: '#f59e0b' },
                { label: 'Inventory', to: '/admin/uniforms', icon: 'fa-boxes', color: '#14b8a6' },
                { label: 'Communication', to: '/admin/communication', icon: 'fa-comments', color: '#6366f1' },
                { label: 'System Users', to: '/admin/system', icon: 'fa-users-cog', color: '#475569' },
              ].map(h => (
                <Link
                  key={h.label}
                  to={h.to}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 8px',
                    borderRadius: 10,
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    textDecoration: 'none',
                    color: '#1e293b',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    gap: 6
                  }}
                >
                  <i className={`fas ${h.icon}`} style={{ fontSize: '1.2rem', color: h.color }}></i>
                  <span>{h.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}><i className="fas fa-bullhorn mr-2" style={{ color: '#d97706' }}></i>Official Circulars & Announcements</h2>
          <Link to="/admin/communication?tab=announcements" className="portal-header-link" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Manage Bulletins</Link>
        </div>
        <div className="portal-card-body portal-card-body-flat">
          {!data?.announcements?.length ? (
            <div className="portal-card-empty-pad">No circulars published yet.</div>
          ) : (
            <table className="portal-table">
              <thead><tr><th>Title</th><th>Published By</th><th>Date</th></tr></thead>
              <tbody>
                {(Array.isArray(data.announcements) ? data.announcements : []).map(a => {
                  const dateStr = a.publishedAt || a.createdAt;
                  let displayDate = '—';
                  if (dateStr) {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                      displayDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                  }
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.title}</strong>
                        <br />
                        <span className="portal-text-muted-sm">{a.content || a.body || ''}</span>
                      </td>
                      <td className="portal-text-muted">{a.author?.name ?? 'Administration'}</td>
                      <td className="portal-text-muted portal-text-nowrap">{displayDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {clockModalAction && (
        <ClockInModal 
          action={clockModalAction}
          onClose={() => setClockModalAction(null)}
          onSuccess={fetchDashboardData}
        />
      )}
    </>
  );
}
