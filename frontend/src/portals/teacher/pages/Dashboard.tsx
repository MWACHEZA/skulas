import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useLessonReminder } from '../../../hooks/useLessonReminder';
import { useTerminology } from '../../../hooks/useTerminology';
import MaintenanceRequestModal from '../../../components/shared/MaintenanceRequestModal';
import ClockInModal from '../../../components/attendance/ClockInModal';

interface DashboardData {
  stats: {
    totalStudents: number;
    totalClasses: number;
    activeAssignments: number;
  };
  classes: { id: string; name: string; level: string; role: string; _count: { students: number } }[];
  announcements: { id: string; title: string; body: string; createdAt: string }[];
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  useLessonReminder(user?.role);
  const { t, isMedical } = useTerminology();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/dashboard/teacher'),
      api.get('/api/staff-attendance/today')
    ])
    .then(([dashRes, attRes]) => {
      setData(dashRes.data);
      setAttendanceStatus(attRes.data);
    })
    .finally(() => setLoading(false));
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--school-primary, #0056b3)', opacity: 0.6 }}></i>
      <p style={{ color: '#718096' }}>Loading your dashboard...</p>
    </div>
  );
  
  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p>Here's what's happening in your {t('classes').toLowerCase()} today.</p>
          </div>
          <button 
            className="portal-btn-secondary" 
            style={{ padding: '8px 16px' }}
            onClick={() => setIsMaintModalOpen(true)}
          >
            <i className="fas fa-tools" style={{ marginRight: 8 }}></i>Report Issue
          </button>
        </div>
      </div>

      <div className="portal-stats-grid">
        {/* Attendance Card */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Daily attendance</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>0</h3>
            </div>
            <div style={{ background: 'rgba(49, 130, 206, 0.1)', color: 'var(--portal-primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-user-clock"></i>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
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
                background: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--school-primary, #0056b3)' : 'var(--school-accent, #2563eb)',
                borderColor: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--school-primary, #0056b3)' : 'var(--school-accent, #2563eb)'
              }}
            >
              <i className="fas fa-clock"></i>
              {(!attendanceStatus || attendanceStatus.timeOut) ? 'Clock IN' : 'Clock OUT'}
            </button>
          </div>
        </div>

        {/* Awards Card */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>My awards</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>0</h3>
            </div>
            <div style={{ background: 'rgba(56, 161, 105, 0.1)', color: 'var(--portal-success)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-award"></i>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={() => navigate('/teacher/awards')}
              className="portal-btn-secondary"
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
                color: '#2d3748',
                borderColor: '#e2e8f0',
                background: '#fff'
              }}
            >
              <i className="fas fa-chart-line"></i>
              10. Jun 2026
            </button>
          </div>
        </div>

        {/* Messages Card */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Unread message</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>No</h3>
            </div>
            <div style={{ background: 'rgba(237, 137, 54, 0.1)', color: '#ed8936', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fab fa-facebook-messenger"></i>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={() => navigate('/teacher/messages')}
              className="portal-btn-secondary"
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
                color: '#dd6b20',
                borderColor: '#fbd38d',
                background: '#fffaf0'
              }}
            >
              <i className="fas fa-envelope"></i>
              Inbox messages
            </button>
          </div>
        </div>

        {/* Leave Card */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>My leave</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>1</h3>
            </div>
            <div style={{ background: 'rgba(159, 122, 234, 0.1)', color: '#9f7aea', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-wallet"></i>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={() => navigate('/teacher/leave')}
              className="portal-btn-secondary"
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
                color: '#2d3748',
                borderColor: '#e2e8f0',
                background: '#fff'
              }}
            >
              <i className="fas fa-calendar-minus"></i>
              Go to My leave
            </button>
          </div>
        </div>
      </div>

      <div className="portal-grid-2">
        {/* My Classes */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className={`fas ${isMedical ? 'fa-hospital-user' : 'fa-door-open'}`} style={{ marginRight: 8, color: '#48bb78' }}></i>My {t('classes')}</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {!data?.classes?.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No classes assigned yet.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Class</th><th>Level</th><th>Role</th><th>Students</th><th></th></tr></thead>
                <tbody>
                  {data.classes.map((c: any) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/teacher/classes/${c.id}`)}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td><span className="portal-badge info">{c.level}</span></td>
                      <td><span style={{ fontSize: '0.85rem', color: '#4a5568' }}>{c.role}</span></td>
                      <td>{c._count.students} {t('students')}</td>
                      <td style={{ textAlign: 'right' }}>
                         <button className="portal-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>View</button>
                      </td>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: isMedical ? 'fa-notes-medical' : 'fa-clipboard-check', label: `Mark ${t('attendance')}`, color: '#48bb78', to: '/teacher/attendance' },
                { icon: 'fa-plus-circle', label: `Create ${t('assignment')}`, color: 'var(--school-primary, #3182ce)', to: '/teacher/assignments' },
                { icon: 'fa-edit', label: 'Enter Results', color: '#9f7aea', to: '/teacher/grades' },
                { icon: 'fa-bullhorn', label: 'Post Notice', color: '#ed8936', to: '/teacher/messages' },
              ].map(a => (
                <a key={a.label} href={a.to} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px',
                  background: '#f8faff', borderRadius: 12, border: '2px solid #e2e8f0', textDecoration: 'none',
                  color: '#2d3748', transition: 'all 0.2s', cursor: 'pointer',
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
                  <i className={`fas ${a.icon} fa-lg`}></i>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{a.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="portal-card" style={{ gridColumn: '1 / -1' }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: '#ed8936' }}></i>School Announcements</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {!data?.announcements?.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No announcements yet.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Title</th><th>Date</th></tr></thead>
                <tbody>
                  {data.announcements.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong><br /><span style={{ color: '#718096', fontSize: '0.82rem' }}>{a.body}</span></td>
                      <td style={{ whiteSpace: 'nowrap', color: '#718096' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <MaintenanceRequestModal 
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
      />

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
