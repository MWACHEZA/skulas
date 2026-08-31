import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import ClockInModal from '../../../components/attendance/ClockInModal';
import { SetupProgressBanner } from '../../../components/common/SetupProgressBanner';
import { RoleOrientationModal } from '../../../components/common/RoleOrientationModal';
import '../../../styles/portal.css';

interface DashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  pendingApplications: number;
  recentApplications: { id: string; applicantName: string; appType: string; status: string; createdAt: string }[];
  announcements: { id: string; title: string; body: string; createdAt: string; author?: { name: string } }[];
  stats: {
    totalStudents: number;
    totalTeachers: number;
    pendingApplications: number;
    totalRevenue: number;
    reportsCount: number;
  };
}

interface AttendanceStatus {
  id?: string;
  timeIn?: string;
  timeOut?: string | null;
  status?: string;
  lateReason?: string | null;
}

export default function AdminDashboard() {
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
    let ignore = false;
    Promise.all([
      api.get('/api/dashboard/admin'),
      api.get('/api/staff-attendance/today')
    ])
    .then(([dashRes, attRes]) => {
      if (!ignore) {
        setData(dashRes.data);
        setAttendanceStatus(attRes.data);
      }
    })
    .catch(err => {
      if (!ignore) console.error(err);
    })
    .finally(() => {
      if (!ignore) setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return (
    <div className="portal-dashboard-loading">
      <i className="fas fa-spinner fa-spin fa-3x portal-dashboard-spinner"></i>
      <p className="portal-dashboard-loading-text">Loading admin dashboard...</p>
    </div>
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.name}. Here's your {isMedical ? 'institution' : 'school'} overview.</p>
      </div>

      <SetupProgressBanner />
      <RoleOrientationModal />

      <div className="portal-stats-grid">
        {/* Clock In / Out Card */}
        <div className="portal-stat-card portal-clock-card">
          <div className="portal-clock-flex-between">
            <div>
              <p className="portal-clock-label">Daily attendance</p>
              <h3 className={`portal-clock-status-text ${(!attendanceStatus || attendanceStatus.timeOut) ? 'clocked-out' : 'clocked-in'}`}>
                {(!attendanceStatus || attendanceStatus.timeOut) ? 'Not Clocked In' : 'Clocked In'}
              </h3>
            </div>
            <div className="portal-clock-icon-box">
              <i className="fas fa-user-clock"></i>
            </div>
          </div>
          <div className="portal-clock-btn-wrapper">
            <button 
              onClick={() => {
                if (attendanceStatus && !attendanceStatus.timeOut) setClockModalAction('OUT');
                else if (!attendanceStatus) setClockModalAction('IN');
              }}
              className={`portal-btn-primary portal-clock-btn ${(!attendanceStatus || attendanceStatus.timeOut) ? 'btn-clocked-out' : 'btn-clocked-in'}`}
            >
              <i className="fas fa-clock"></i>
              {(!attendanceStatus || attendanceStatus.timeOut) ? 'Clock IN' : 'Clock OUT'}
            </button>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className={`fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`}></i></div>
          <div className="portal-stat-info"><h3>{data?.stats?.totalStudents ?? '—'}</h3><p>Total {t('students')}</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className={`fas ${isMedical ? 'fa-hospital-user' : 'fa-chalkboard-teacher'}`}></i></div>
          <div className="portal-stat-info"><h3>{data?.stats?.totalTeachers ?? '—'}</h3><p>Total {t('teachers')}</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue portal-stat-icon-purple-light"><i className={`fas ${isMedical ? 'fa-file-medical-alt' : 'fa-file-invoice'}`}></i></div>
          <div className="portal-stat-info"><h3>{data?.stats?.reportsCount ?? '—'}</h3><p>{t('reports')} Published</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-file-alt"></i></div>
          <div className="portal-stat-info"><h3>{data?.stats?.pendingApplications ?? '—'}</h3><p>Pending Applications</p></div>
        </div>
      </div>

      <div className="portal-grid-2">
        {/* Recent Applications */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-file-alt portal-icon-margin-right portal-icon-purple"></i>Recent Applications</h2>
            <a href="/admin/applications" className="portal-header-link">View All</a>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            {!data?.recentApplications?.length ? (
              <div className="portal-card-empty-pad">No applications yet.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>{t('applicant')}</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
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
                      <td className="portal-text-muted portal-text-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-bolt portal-icon-margin-right portal-icon-warning"></i>Quick Actions</h2>
          </div>
          <div className="portal-card-body">
            <div className="portal-quick-actions-grid">
              {[
                { icon: isMedical ? 'fa-user-nurse' : 'fa-user-plus', label: `Add New ${t('student')}`, to: '/admin/students' },
                { icon: isMedical ? 'fa-hospital-user' : 'fa-chalkboard-teacher', label: `Manage ${t('teachers')}`, to: '/admin/teachers' },
                { icon: 'fa-file-alt', label: 'Review Applications', to: '/admin/applications' },
                { icon: 'fa-bullhorn', label: 'Post Announcement', to: '/admin/announcements' },
                { icon: isMedical ? 'fa-file-medical-alt' : 'fa-chart-bar', label: `Generate ${t('reports')}`, to: '/admin/reports' },
                { icon: 'fa-palette', label: `Design ${isMedical ? 'Report Card' : 'Report Card'}`, to: '/admin/document-templates' },
                { icon: 'fa-cog', label: `${isMedical ? 'Institution' : 'School'} Settings`, to: '/admin/settings' },
              ].map(a => (
                <a key={a.label} href={a.to} className="portal-quick-action-item">
                  <i className={`fas ${a.icon} portal-quick-action-icon`}></i>
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="portal-card portal-card-full-width">
          <div className="portal-card-header">
            <h2><i className="fas fa-newspaper portal-icon-margin-right portal-icon-amber"></i>{isMedical ? 'Institutional' : 'School'} Announcements</h2>
            <a href="/admin/announcements" className="portal-header-link">Manage</a>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            {!data?.announcements?.length ? (
              <div className="portal-card-empty-pad">No announcements. Create one!</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Title</th><th>Published By</th><th>Date</th></tr></thead>
                <tbody>
                  {(Array.isArray(data.announcements) ? data.announcements : []).map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong><br /><span className="portal-text-muted-sm">{a.body}</span></td>
                      <td className="portal-text-muted">{a.author?.name ?? 'Admin'}</td>
                      <td className="portal-text-muted portal-text-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
