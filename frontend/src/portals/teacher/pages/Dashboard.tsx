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

      {/* Quick Actions Area */}
      <style>{`
        .teacher-quick-actions-container {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px 24px;
          margin-bottom: 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .teacher-quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .teacher-qa-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          gap: 8px;
          padding: 14px 10px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .teacher-qa-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .teacher-qa-btn i {
          font-size: 1.25rem;
          color: #0284c7;
        }
        .teacher-qa-btn.sick-bay i {
          color: #dc2626;
        }
        @media (max-width: 768px) {
          .teacher-quick-actions-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            margin-bottom: 0;
            border-radius: 16px 16px 0 0;
            border-bottom: none;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.12);
            padding: 10px 12px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(8px);
          }
          .teacher-quick-actions-container h3 {
            display: none;
          }
          .teacher-quick-actions-grid {
            display: flex;
            justify-content: space-around;
            gap: 6px;
          }
          .teacher-qa-btn {
            flex: 1;
            padding: 8px 4px;
            font-size: 0.72rem;
            border: none;
            background: transparent;
          }
          .teacher-qa-btn i {
            font-size: 1.1rem;
          }
        }
      `}</style>

      <div className="teacher-quick-actions-container">
        <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Daily Quick Actions
        </h3>
        <div className="teacher-quick-actions-grid">
          <button className="teacher-qa-btn" onClick={() => navigate('/teacher/classes')}>
            <i className="fas fa-chalkboard-teacher"></i>
            <span>My Classes</span>
          </button>
          <button className="teacher-qa-btn" onClick={() => navigate('/teacher/attendance')}>
            <i className="fas fa-clipboard-check"></i>
            <span>Attendance</span>
          </button>
          <button className="teacher-qa-btn" onClick={() => navigate('/teacher/grades')}>
            <i className="fas fa-edit"></i>
            <span>Marks Entry</span>
          </button>
          <button className="teacher-qa-btn" onClick={() => navigate('/teacher/curriculum')}>
            <i className="fas fa-book-open"></i>
            <span>Curriculum</span>
          </button>
          <button className="teacher-qa-btn sick-bay" onClick={() => navigate('/teacher/clinic?tab=refer')}>
            <i className="fas fa-first-aid"></i>
            <span>Sick Bay</span>
          </button>
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
    </div>
  );
}
