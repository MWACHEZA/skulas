import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import ClockInModal from '../../../components/attendance/ClockInModal';

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, isMedical } = useTerminology();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--portal-primary)', opacity: 0.6 }}></i>
      <p style={{ color: '#718096' }}>Loading admin dashboard...</p>
    </div>
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.name}. Here's your {isMedical ? 'institution' : 'school'} overview.</p>
      </div>

      <div className="portal-stats-grid">
        {/* Clock In / Out Card */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Daily attendance</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--portal-danger)' : 'var(--portal-success)' }}>
                {(!attendanceStatus || attendanceStatus.timeOut) ? 'Not Clocked In' : 'Clocked In'}
              </h3>
            </div>
            <div style={{ background: 'rgba(74, 85, 104, 0.1)', color: '#4a5568', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-user-clock"></i>
            </div>
          </div>
          <div style={{ marginTop: '16px', width: '100%' }}>
            <button 
              onClick={() => {
                if (attendanceStatus && !attendanceStatus.timeOut) setClockModalAction('OUT');
                else if (!attendanceStatus) setClockModalAction('IN');
              }}
              className="portal-btn-primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '0.85rem', 
                padding: '10px 14px', 
                borderRadius: '10px',
                fontWeight: 700,
                background: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--portal-danger)' : 'var(--portal-success)', 
                borderColor: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--portal-danger)' : 'var(--portal-success)',
                color: 'white'
              }}
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
          <div className="portal-stat-icon blue" style={{ background: 'rgba(111, 66, 193, 0.1)', color: '#6f42c1' }}><i className={`fas ${isMedical ? 'fa-file-medical-alt' : 'fa-file-invoice'}`}></i></div>
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
            <h2><i className="fas fa-file-alt" style={{ marginRight: 8, color: '#9f7aea' }}></i>Recent Applications</h2>
            <a href="/admin/applications" style={{ fontSize: '0.82rem', color: 'var(--portal-primary)', textDecoration: 'none' }}>View All</a>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {!data?.recentApplications?.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No applications yet.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>{t('applicant')}</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {(Array.isArray(data.recentApplications) ? data.recentApplications : []).map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.applicantName}</td>
                      <td style={{ color: '#718096' }}>{a.appType}</td>
                      <td>
                        <span className={`portal-badge ${a.status === 'pending' ? 'warning' : a.status === 'approved' ? 'success' : 'danger'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ color: '#718096', whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
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
            <h2><i className="fas fa-bolt" style={{ marginRight: 8, color: 'var(--portal-warning)' }}></i>Quick Actions</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { icon: isMedical ? 'fa-user-nurse' : 'fa-user-plus', label: `Add New ${t('student')}`, color: 'var(--school-primary, #3182ce)', to: '/admin/students' },
                { icon: isMedical ? 'fa-hospital-user' : 'fa-chalkboard-teacher', label: `Manage ${t('teachers')}`, color: '#48bb78', to: '/admin/teachers' },
                { icon: 'fa-file-alt', label: 'Review Applications', color: '#9f7aea', to: '/admin/applications' },
                { icon: 'fa-bullhorn', label: 'Post Announcement', color: '#ed8936', to: '/admin/announcements' },
                { icon: isMedical ? 'fa-file-medical-alt' : 'fa-chart-bar', label: `Generate ${t('reports')}`, color: 'var(--portal-danger)', to: '/admin/reports' },
                { icon: 'fa-palette', label: `Design ${isMedical ? 'Report Card' : 'Report Card'}`, color: '#667EEA', to: '/admin/document-templates' },
                { icon: 'fa-cog', label: `${isMedical ? 'Institution' : 'School'} Settings`, color: '#718096', to: '/admin/settings' },
              ].map(a => (
                <a key={a.label} href={a.to} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#f8faff', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none',
                  color: '#2d3748', fontWeight: 600, fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = a.color;
                    (e.currentTarget as HTMLElement).style.color = 'white';
                    (e.currentTarget as HTMLElement).style.borderColor = a.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#f8faff';
                    (e.currentTarget as HTMLElement).style.color = '#2d3748';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                  }}
                >
                  <i className={`fas ${a.icon}`} style={{ minWidth: 20, textAlign: 'center' }}></i>
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="portal-card" style={{ gridColumn: '1 / -1' }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-newspaper" style={{ marginRight: 8, color: '#ed8936' }}></i>{isMedical ? 'Institutional' : 'School'} Announcements</h2>
            <a href="/admin/announcements" style={{ fontSize: '0.82rem', color: 'var(--portal-primary)', textDecoration: 'none' }}>Manage</a>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {!data?.announcements?.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No announcements. Create one!</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Title</th><th>Published By</th><th>Date</th></tr></thead>
                <tbody>
                  {(Array.isArray(data.announcements) ? data.announcements : []).map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong><br /><span style={{ color: '#718096', fontSize: '0.82rem' }}>{a.body}</span></td>
                      <td style={{ color: '#718096' }}>{a.author?.name ?? 'Admin'}</td>
                      <td style={{ color: '#718096', whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
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
