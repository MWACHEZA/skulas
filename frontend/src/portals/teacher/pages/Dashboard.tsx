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
  const [classes, setClasses] = useState<any[]>([]);
  const [myClassesToday, setMyClassesToday] = useState<number>(0);
  const [attendanceToDo, setAttendanceToDo] = useState<number>(0);
  const [markingBacklog, setMarkingBacklog] = useState<number>(0);

  useLessonReminder(user?.role);
  const { t } = useTerminology();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [attRes, classesRes] = await Promise.all([
        api.get('/api/staff-attendance/today').catch(() => ({ data: null })),
        api.get('/api/teachers/my-classes').catch(() => ({ data: [] }))
      ]);

      setAttendanceStatus(attRes.data);
      const myClasses = Array.isArray(classesRes.data) ? classesRes.data : [];
      setClasses(myClasses);
      setMyClassesToday(myClasses.length);

      // Async fetch for pending tasks
      api.get('/api/attendance/pending-today').then(res => setAttendanceToDo(res.data?.count || 0)).catch(() => setAttendanceToDo(0));
      api.get('/api/grades/pending-count').then(res => setMarkingBacklog(res.data?.count || 0)).catch(() => setMarkingBacklog(0));
    } catch (err) {
      console.error('Failed to load teacher dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const isClockedIn = Boolean(attendanceStatus && !attendanceStatus.timeOut);
  const totalStudents = classes.reduce((sum, c) => sum + (c._count?.students || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#0284c7' }} />
        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading educator dashboard...</p>
      </div>
    );
  }
  
  return (
    <div style={{ paddingBottom: '60px', maxWidth: '1400px', margin: '0 auto' }}>
      <UrgentAnnouncementBanner />
      
      {/* Hero Welcome Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(56, 189, 248, 0.16)', color: '#7dd3fc', fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
            <i className="fas fa-chalkboard-teacher" /> Faculty & Academic Portal
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'Teacher'} 👋
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: 600 }}>
            Here is your daily teaching schedule, attendance pending check, and quick curriculum shortcuts for today.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => {
              if (isClockedIn) setClockModalAction('OUT');
              else setClockModalAction('IN');
            }}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '11px 22px', 
              fontWeight: 800,
              fontSize: '0.9rem',
              borderRadius: 10,
              cursor: 'pointer',
              border: 'none',
              background: isClockedIn ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              boxShadow: isClockedIn ? '0 4px 12px rgba(217, 119, 6, 0.3)' : '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            <i className={`fas ${isClockedIn ? 'fa-sign-out-alt' : 'fa-fingerprint'}`} />
            {isClockedIn ? 'Clock OUT' : 'Clock IN'}
          </button>

          <button
            type="button"
            onClick={() => setIsMaintModalOpen(true)}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <i className="fas fa-tools" /> Maintenance
          </button>
        </div>
      </div>

      <AnnouncementsWidget />

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Card 1: My Classes */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Classes</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>{myClassesToday}</h3>
            </div>
            <div style={{ background: '#e0f2fe', color: '#0284c7', width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
            {totalStudents} students taught across streams
          </div>
        </div>

        {/* Card 2: Attendance Pending */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Roll Call Status</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.9rem', fontWeight: 800, color: attendanceToDo > 0 ? '#ef4444' : '#10b981' }}>
                {attendanceToDo > 0 ? `${attendanceToDo} Pending` : 'Up to Date'}
              </h3>
            </div>
            <div style={{ background: attendanceToDo > 0 ? '#fee2e2' : '#dcfce7', color: attendanceToDo > 0 ? '#dc2626' : '#15803d', width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-clipboard-check" />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b' }}>
            <span 
              onClick={() => navigate('/teacher/attendance')}
              style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}
            >
              Open Roll Call Register &rarr;
            </span>
          </div>
        </div>

        {/* Card 3: Marking Backlog */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grading Backlog</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.9rem', fontWeight: 800, color: markingBacklog > 0 ? '#d97706' : '#0f172a' }}>{markingBacklog}</h3>
            </div>
            <div style={{ background: '#fef3c7', color: '#b45309', width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-pen-nib" />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b' }}>
            <span 
              onClick={() => navigate('/teacher/grades?tab=marks-entry')}
              style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}
            >
              Review Grade Submissions &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Duty Status */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Faculty Attendance</p>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.9rem', fontWeight: 800, color: isClockedIn ? '#10b981' : '#64748b' }}>
                {isClockedIn ? 'Clocked In' : 'Not Clocked'}
              </h3>
            </div>
            <div style={{ background: isClockedIn ? '#dcfce7' : '#f1f5f9', color: isClockedIn ? '#15803d' : '#64748b', width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              <i className="fas fa-user-clock" />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: isClockedIn ? '#15803d' : '#64748b', fontWeight: 600 }}>
            {isClockedIn ? `In at ${new Date(attendanceStatus.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Clock in when arriving on campus'}
          </div>
        </div>
      </div>

      {/* Daily Quick Actions Bar */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '22px 24px',
          marginBottom: 28,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Daily Educator Workflows
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <button 
            type="button"
            onClick={() => navigate('/teacher/classes')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <span>My Classes</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/attendance')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-clipboard-check" />
            </div>
            <span>Take Roll Call</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/grades')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-edit" />
            </div>
            <span>Marks Entry</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/assignments')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-tasks" />
            </div>
            <span>Assignments</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/curriculum')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-book-open" />
            </div>
            <span>Curriculum</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/students')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-user-graduate" />
            </div>
            <span>Student Roster</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/teacher/clinic')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
              <i className="fas fa-ambulance" />
            </div>
            <span>Send to Sick Bay</span>
          </button>
        </div>
      </div>

      {/* Teaching Classes Overview */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              My Assigned Classes & Streams
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Direct access to rosters, roll call registers, and marks entry.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/teacher/classes')}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: 8,
              color: '#0284c7',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            View All &rarr;
          </button>
        </div>

        {classes.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-chalkboard fa-2x" style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No assigned classes found for your account.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {classes.map(c => (
              <div 
                key={c.id} 
                style={{ 
                  background: '#f8fafc', 
                  borderRadius: 10, 
                  border: '1px solid #e2e8f0', 
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    {c.role || 'Teacher'} • {c._count?.students || 0} students
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/attendance?classId=${c.id}`)}
                    title="Roll Call"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '6px 10px',
                      color: '#0284c7',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    <i className="fas fa-clipboard-check" /> Roll Call
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/classes/${c.id}`)}
                    title="Class Details"
                    style={{
                      background: '#0284c7',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 10px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    <i className="fas fa-door-open" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
