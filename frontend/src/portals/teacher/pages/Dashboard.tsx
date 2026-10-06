import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useLessonReminder } from '../../../hooks/useLessonReminder';
import { useTerminology } from '../../../hooks/useTerminology';
import MaintenanceRequestModal from '../../../components/shared/MaintenanceRequestModal';
import ClockInModal from '../../../components/attendance/ClockInModal';
import UrgentAnnouncementBanner from '../../../components/shared/UrgentAnnouncementBanner';
import AnnouncementsWidget from '../../../components/shared/AnnouncementsWidget';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  
  // Data
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [myClassesToday, setMyClassesToday] = useState<number>(0);
  const [attendanceToDo, setAttendanceToDo] = useState<number>(0);
  const [markingBacklog, setMarkingBacklog] = useState<number>(0);
  const [feeDefaulters, setFeeDefaulters] = useState<number>(0);

  useLessonReminder(user?.role);
  const { t, isMedical } = useTerminology();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    
    // Core data (attendance status)
    api.get('/api/staff-attendance/today')
      .then(res => setAttendanceStatus(res.data))
      .catch(console.error);

    // New 4 cards endpoints (placeholders with 0 if they fail/don't exist)
    // TODO: implement these endpoints if missing
    api.get('/api/timetable/today').then(res => setMyClassesToday(res.data?.count || 0)).catch(() => setMyClassesToday(0));
    api.get('/api/attendance/pending-today').then(res => setAttendanceToDo(res.data?.count || 0)).catch(() => setAttendanceToDo(0));
    api.get('/api/grades/pending-count').then(res => setMarkingBacklog(res.data?.count || 0)).catch(() => setMarkingBacklog(0));
    api.get('/api/fees/my-class-defaulters').then(res => setFeeDefaulters(res.data?.count || 0)).catch(() => setFeeDefaulters(0));

    setLoading(false);
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
    <div style={{ paddingBottom: '80px' }}>
      <UrgentAnnouncementBanner />
      
      <div className="portal-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p>Here's what's happening in your {t('classes').toLowerCase()} today.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => {
                if (attendanceStatus && !attendanceStatus.timeOut) setClockModalAction('OUT');
                else if (!attendanceStatus) setClockModalAction('IN');
              }}
              className="portal-btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                fontWeight: 600,
                background: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--school-primary)' : 'var(--school-accent)',
                borderColor: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--school-primary)' : 'var(--school-accent)'
              }}
            >
              <i className="fas fa-clock"></i>
              {(!attendanceStatus || attendanceStatus.timeOut) ? 'Clock IN' : 'Clock OUT'}
            </button>
          </div>
        </div>
      </div>

      <AnnouncementsWidget />

      <div className="portal-stats-grid" style={{ marginBottom: '32px' }}>
        {/* Card 1: My Classes Today */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Classes Today</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>{myClassesToday}</h3>
            </div>
            <div style={{ background: 'rgba(49, 130, 206, 0.1)', color: 'var(--portal-primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
          </div>
        </div>

        {/* Card 2: Attendance To Do */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Attendance Pending</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#e53e3e' }}>{attendanceToDo}</h3>
            </div>
            <div style={{ background: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-user-check"></i>
            </div>
          </div>
        </div>

        {/* Card 3: Marking Backlog */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Marking Backlog</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#dd6b20' }}>{markingBacklog}</h3>
            </div>
            <div style={{ background: 'rgba(221, 107, 32, 0.1)', color: '#dd6b20', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-edit"></i>
            </div>
          </div>
        </div>

        {/* Card 4: Fee Defaulters */}
        <div className="portal-stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>Fee Defaulters</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#2d3748' }}>{feeDefaulters}</h3>
            </div>
            <div style={{ background: 'rgba(159, 122, 234, 0.1)', color: '#9f7aea', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-wallet"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        zIndex: 900,
        flexWrap: 'wrap',
      }}>
        <button className="portal-btn-secondary" onClick={() => navigate('/teacher/classes')} style={{flex: '1 1 auto', minWidth: '120px', maxWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: '0.875rem'}}>
          <i className="fas fa-chalkboard-teacher"></i> My Classes
        </button>
        <button className="portal-btn-secondary" onClick={() => navigate('/teacher/attendance')} style={{flex: '1 1 auto', minWidth: '120px', maxWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: '0.875rem'}}>
          <i className="fas fa-clipboard-check"></i> Attendance
        </button>
        <button className="portal-btn-secondary" onClick={() => navigate('/teacher/grades')} style={{flex: '1 1 auto', minWidth: '120px', maxWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: '0.875rem'}}>
          <i className="fas fa-edit"></i> Marks Entry
        </button>
        <button className="portal-btn-secondary" onClick={() => navigate('/teacher/curriculum')} style={{flex: '1 1 auto', minWidth: '120px', maxWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: '0.875rem'}}>
          <i className="fas fa-book-open"></i> Curriculum
        </button>
        <button className="portal-btn-secondary" onClick={() => navigate('/teacher/clinic?tab=refer')} style={{flex: '1 1 auto', minWidth: '120px', maxWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: '0.875rem', color: '#c53030', borderColor: '#feb2b2'}}>
          <i className="fas fa-first-aid"></i> Sick Bay
        </button>
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
    </div>
  );
}
