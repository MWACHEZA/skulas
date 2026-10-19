import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useLessonReminder } from '../../../hooks/useLessonReminder';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import MaintenanceRequestModal from '../../../components/shared/MaintenanceRequestModal';
import { formatCurrency, getAvatarUrl } from '../../../utils/formatters';
import { SkeletonLoader } from '../../../components/shared';

interface DashboardData {
  student: { 
    id: string; 
    name: string; 
    studentId: string; 
    avatar?: string | null;
    boardingStatus?: string;
    house?: string | null;
    hostel?: string | null;
    class: { name: string; level: string } | null;
  };
  stats: { 
    attendanceRate: number; 
    avgScore: number; 
    feeBalance: number; 
    pendingAssignments: number; 
  };
  grades: Array<{ subject: { name: string }; score: number; grade: string; term: string }>;
  fees: Array<{ term: string; amount: number; paid: number; status: string }>;
  timetable: Array<{ dayOfWeek: number; startTime: string; endTime: string; room: string; subject: { name: string } }>;
  assignments: Array<{ 
    id: string; 
    title: string; 
    dueDate: string; 
    subject: { name: string }; 
    status: string;
    submissions?: Array<{
      grade?: number;
      autoScore?: number;
      status: string;
    }>;
  }>;
  announcements: Array<{ id: string; title: string; content: string; publishedAt: string }>;
}

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, isMedical } = useTerminology();
  useLessonReminder(user?.role);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = () => {
    setLoading(true);
    api.get('/api/students/me/dashboard')
      .then(res => {
        setData(res.data);
        setError('');
      })
      .catch(() => setError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
        <SkeletonLoader type="profile" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-alert error" style={{ margin: '20px auto', maxWidth: 600 }}>
        <i className="fas fa-exclamation-circle mr-2"></i> {error}
        <button onClick={fetchDashboard} className="portal-btn-ghost" style={{ marginLeft: 16 }}>Retry</button>
      </div>
    );
  }

  const todayDay = new Date().getDay() || 7; // 1=Mon ... 7=Sun
  const todaySlots = data.timetable.filter(s => s.dayOfWeek === todayDay);
  const avatarUrl = getAvatarUrl(data.student.avatar, user?.schoolCode);
  const isFeeCleared = data.stats.feeBalance <= 0;

  return (
    <div className="portal-container" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* 1. HERO IDENTITY BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: 24,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Avatar Frame */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#334155',
            border: '3px solid rgba(255, 255, 255, 0.25)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={data.student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#93c5fd' }}>
                {data.student.name.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Welcome back, {data.student.name.split(' ')[0]}! 👋
              </h1>
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(59, 130, 246, 0.25)',
                color: '#93c5fd',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 700
              }}>
                {data.student.class?.name || 'Class Enrolled'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                background: isFeeCleared ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                color: isFeeCleared ? '#86efac' : '#fca5a5',
                border: `1px solid ${isFeeCleared ? 'rgba(134, 239, 172, 0.4)' : 'rgba(252, 165, 165, 0.4)'}`,
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 700
              }}>
                <i className={`fas ${isFeeCleared ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
                {isFeeCleared ? 'Gate Clearance Approved' : 'Arrears Pending'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              ID: <strong style={{ color: '#ffffff' }}>{data.student.studentId}</strong>
              {data.student.house && <> · House: <strong style={{ color: '#cbd5e1' }}>{data.student.house}</strong></>}
              {data.student.hostel && <> · Hostel: <strong style={{ color: '#cbd5e1' }}>{data.student.hostel}</strong></>}
              {data.student.boardingStatus && <> · <strong>{data.student.boardingStatus}</strong></>}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button 
            className="portal-btn-ghost" 
            style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: 8 }}
            onClick={() => setIsMaintModalOpen(true)}
          >
            <i className="fas fa-tools mr-2"></i>Report Maintenance
          </button>
          <Link 
            to="/student/profile" 
            className="portal-btn-ghost" 
            style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}
          >
            <i className="fas fa-id-card mr-2"></i>My Digital ID
          </Link>
          <Link 
            to="/student/cbt" 
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}
          >
            <i className="fas fa-laptop-code"></i>Take CBT Exam
          </Link>
        </div>
      </div>

      {/* 2. STATS KPI GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Attendance Rate */}
        <div className="portal-card" style={{ padding: '18px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
                {data.stats.attendanceRate}%
              </h3>
              <span style={{ fontSize: '0.75rem', color: data.stats.attendanceRate >= 90 ? '#15803d' : '#b45309', fontWeight: 600 }}>
                {data.stats.attendanceRate >= 90 ? 'Regular & Punctual' : 'Below 90% Target'}
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-user-check"></i>
            </div>
          </div>
        </div>

        {/* Academic GPA / Avg Score */}
        <div className="portal-card" style={{ padding: '18px 20px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Academic Average</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>
                {data.stats.avgScore}%
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                Across {data.grades.length} Assessed Subjects
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
        </div>

        {/* Pending CBT & Assignments */}
        <div className="portal-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pending Tasks</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                {data.stats.pendingAssignments}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                Assignments & CBT Tests Due
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-clipboard-list"></i>
            </div>
          </div>
        </div>

        {/* Fee Standing */}
        <div className="portal-card" style={{ padding: '18px 20px', borderLeft: `4px solid ${isFeeCleared ? '#16a34a' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Fee Balance</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: isFeeCleared ? '#16a34a' : '#ef4444' }}>
                {formatCurrency(data.stats.feeBalance)}
              </h3>
              <span style={{ fontSize: '0.75rem', color: isFeeCleared ? '#16a34a' : '#b91c1c', fontWeight: 700 }}>
                {isFeeCleared ? 'Fully Paid & Cleared' : 'Outstanding Payment'}
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: isFeeCleared ? '#dcfce7' : '#fee2e2', color: isFeeCleared ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-receipt"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SHORTCUTS STRIP */}
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 24
      }}>
        <Link to="/student/cbt" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-laptop-code" style={{ color: '#2563eb' }}></i> Online Exams (CBT)
        </Link>
        <Link to="/student/timetable" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-calendar-alt" style={{ color: '#10b981' }}></i> Class Timetable
        </Link>
        <Link to="/student/fees" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-file-invoice-dollar" style={{ color: '#f59e0b' }}></i> Fees & Statements
        </Link>
        <Link to="/student/uniforms" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-tshirt" style={{ color: '#8b5cf6' }}></i> Uniform Attire & Sizing
        </Link>
        <Link to="/student/attendance" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-user-clock" style={{ color: '#06b6d4' }}></i> Attendance History
        </Link>
        <Link to="/student/clinic" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <i className="fas fa-heartbeat" style={{ color: '#ef4444' }}></i> Sick Bay / Clinic
        </Link>
      </div>

      {/* 4. MAIN CONTENT TWO-COLUMN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Today's Schedule Card */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fas ${isMedical ? 'fa-hospital' : 'fa-calendar-day'}`}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Today's Classes ({DAYS[todayDay] || 'Today'})
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {todaySlots.length} periods scheduled for your class stream
                  </span>
                </div>
              </div>
              <Link to="/student/timetable" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                Full Schedule →
              </Link>
            </div>

            {todaySlots.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 10 }}>
                <i className="fas fa-calendar-check fa-2x" style={{ opacity: 0.3, marginBottom: 8 }}></i>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No periods scheduled for today. Enjoy your study time!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todaySlots.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '0.78rem',
                        fontWeight: 800
                      }}>
                        {s.startTime} – {s.endTime}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                          {s.subject.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Room: <strong>{s.room || 'Main Hall'}</strong>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                      Confirmed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending CBT & Assignments */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-tasks"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Active Assignments & Tasks
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Items requiring your submission
                  </span>
                </div>
              </div>
              <Link to="/student/assignments" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                All Assignments →
              </Link>
            </div>

            {data.assignments.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 10 }}>
                <i className="fas fa-check-circle fa-2x" style={{ opacity: 0.3, marginBottom: 8, color: '#16a34a' }}></i>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No pending assignments! You're completely up to date.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.assignments.map(a => {
                  const due = new Date(a.dueDate);
                  const isOverdue = due < new Date();
                  const submission = a.submissions?.[0];
                  const grade = submission?.grade ?? submission?.autoScore;

                  return (
                    <div key={a.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: '#ffffff',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Subject: <strong style={{ color: '#475569' }}>{a.subject.name}</strong> · Due: {due.toLocaleDateString()}
                        </div>
                      </div>

                      {grade !== undefined ? (
                        <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontWeight: 800 }}>
                          Graded: {grade}%
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: isOverdue ? '#fee2e2' : '#fef3c7',
                          color: isOverdue ? '#991b1b' : '#92400e',
                          fontWeight: 800
                        }}>
                          {isOverdue ? 'Overdue' : 'Due Soon'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Grades Overview */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Recent Subject Performance
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Evaluations recorded for current session
                  </span>
                </div>
              </div>
              <Link to="/student/grades" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                Full Gradebook →
              </Link>
            </div>

            {data.grades.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No term grades published yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {data.grades.slice(0, 6).map((g, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                      {g.subject.name}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {g.score}%
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: g.score >= 80 ? '#dcfce7' : g.score >= 60 ? '#dbeafe' : '#fef3c7',
                        color: g.score >= 80 ? '#166534' : g.score >= 60 ? '#1e40af' : '#92400e'
                      }}>
                        {g.grade || (g.score >= 80 ? 'A' : g.score >= 60 ? 'B' : 'C')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fee Standing & Payment Status Card */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-wallet mr-2" style={{ color: '#0284c7' }}></i>Fee Statement
              </h3>
              <Link to="/student/fees" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                Make Payment →
              </Link>
            </div>

            <div style={{
              background: isFeeCleared ? '#f0fdf4' : '#fef2f2',
              border: `1.5px solid ${isFeeCleared ? '#86efac' : '#fca5a5'}`,
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Account Balance:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isFeeCleared ? '#15803d' : '#b91c1c' }}>
                  {formatCurrency(data.stats.feeBalance)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                {isFeeCleared 
                  ? 'All tuition and levies are settled. Automated gate pass is unrestricted.'
                  : 'Please complete outstanding dues to ensure uninterrupted exam and campus clearance.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.fees.slice(0, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Term {f.term}:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(f.paid)} / {formatCurrency(f.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Announcements */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-bullhorn mr-2" style={{ color: '#7c3aed' }}></i>School Notices
              </h3>
            </div>

            {data.announcements.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '16px 0' }}>
                No active announcements for your stream.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.announcements.map(ann => (
                  <div key={ann.id} style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    borderLeft: '3px solid #7c3aed'
                  }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                      {ann.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Help & Sick Bay Card */}
          <div className="portal-card" style={{ padding: '16px 18px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 800, color: '#1e40af' }}>
              <i className="fas fa-first-aid mr-2"></i>Feeling unwell on campus?
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.4 }}>
              Contact your class teacher or visit the infirmary directly for triage and medical care.
            </p>
            <Link
              to="/student/clinic"
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              Open Clinic & Wellness Hub →
            </Link>
          </div>
        </div>
      </div>

      <MaintenanceRequestModal 
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
      />
    </div>
  );
}
