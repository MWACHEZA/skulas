import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useLessonReminder } from '../../../hooks/useLessonReminder';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import MaintenanceRequestModal from '../../../components/shared/MaintenanceRequestModal';

interface DashboardData {
  student: { id: string; name: string; studentId: string; class: { name: string; level: string } | null };
  stats: { attendanceRate: number; avgScore: number; feeBalance: number; pendingAssignments: number };
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

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  
  const { user } = useAuth();
  const { t, isMedical } = useTerminology();
  useLessonReminder(user?.role);

  useEffect(() => {
    api.get('/api/students/me/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: '#718096' }}>
      <i className="fas fa-spinner fa-spin fa-2x"></i>
      <span>Loading your dashboard...</span>
    </div>
  );

  if (error || !data) return <div className="portal-alert error"><i className="fas fa-exclamation-circle"></i> {error}</div>;

  const todayDay = new Date().getDay() || 7; // 1=Mon ... 7=Sun
  const todaySlots = data.timetable.filter(s => s.dayOfWeek === todayDay);

  const feeStatusColor = (status: string) => 
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger';

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Welcome back, {data.student.name.split(' ')[0]}! 👋</h1>
            <p>{data.student.class?.name || ''} · {t('student')} ID: <strong>{data.student.studentId}</strong></p>
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

      {/* Stats */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-user-check"></i></div>
          <div className="portal-stat-info">
            <h3>{data.stats.attendanceRate}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-chart-line"></i></div>
          <div className="portal-stat-info">
            <h3>{data.stats.avgScore}%</h3>
            <p>Average Score</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-tasks"></i></div>
          <div className="portal-stat-info">
            <h3>{data.stats.pendingAssignments}</h3>
            <p>Pending {t('assignments')}</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-money-bill-wave"></i></div>
          <div className="portal-stat-info">
            <h3>${data.stats.feeBalance.toFixed(0)}</h3>
            <p>Fee Balance</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-2">
        {/* Today's Timetable */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className={`fas ${isMedical ? 'fa-hospital' : 'fa-calendar-day'}`} style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Today's {t('classes')}</h2>
            <Link to="/student/timetable" className="portal-view-all">Full {t('timetable')}</Link>
          </div>
          <div className="portal-card-body">
            {todaySlots.length === 0 ? (
              <p style={{ color: '#718096', margin: 0 }}>No classes scheduled today.</p>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Time</th><th>Subject</th><th>Room</th></tr></thead>
                <tbody>
                  {todaySlots.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.startTime}–{s.endTime}</td>
                      <td>{s.subject.name}</td>
                      <td style={{ color: '#718096' }}>{s.room || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: '#805ad5' }}></i>Announcements</h2>
          </div>
          <div className="portal-card-body">
            <div className="portal-announcement-list">
              {data.announcements.length === 0 && <p style={{ color: '#718096', margin: 0 }}>No announcements.</p>}
              {data.announcements.map(ann => (
                <div key={ann.id} className="portal-announcement-item">
                  <h4>{ann.title}</h4>
                  <p>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-clipboard-list" style={{ marginRight: 8, color: '#ed8936' }}></i>{t('assignments')}</h2>
            <Link to="/student/assignments" className="portal-view-all">View All</Link>
          </div>
          <div className="portal-card-body">
            {data.assignments.length === 0 ? (
              <p style={{ color: '#718096', margin: 0 }}>No active assignments.</p>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Title</th><th>Subject</th><th>Due</th></tr></thead>
                <tbody>
                  {data.assignments.map(a => {
                    const due = new Date(a.dueDate);
                    const isOverdue = due < new Date();
                    const submission = a.submissions?.[0];
                    const grade = submission?.grade ?? submission?.autoScore;

                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.title}</td>
                        <td>{a.subject.name}</td>
                        <td>
                          {grade !== undefined ? (
                            <span className="portal-badge success">Graded: {grade}%</span>
                          ) : (
                            <span className={`portal-badge ${isOverdue ? 'danger' : 'info'}`}>
                              {due.toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fees Summary */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-receipt" style={{ marginRight: 8, color: '#38b2ac' }}></i>Fees Summary</h2>
            <Link to="/student/fees" className="portal-view-all">View Details</Link>
          </div>
          <div className="portal-card-body">
            <table className="portal-table">
              <thead><tr><th>Term</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
              <tbody>
                {data.fees.map((f, i) => (
                  <tr key={i}>
                    <td>{f.term}</td>
                    <td>${f.amount}</td>
                    <td>${f.paid}</td>
                    <td><span className={`portal-badge ${feeStatusColor(f.status)}`}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grades */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-chart-bar" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Recent Grades – Term 1 2024</h2>
          <Link to="/student/grades" className="portal-view-all">View All Grades</Link>
        </div>
        <div className="portal-card-body">
          <table className="portal-table">
            <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Term</th></tr></thead>
            <tbody>
              {data.grades.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{g.subject.name}</td>
                  <td>{g.score}/100</td>
                  <td>
                    <span className={`portal-badge ${g.score >= 80 ? 'success' : g.score >= 60 ? 'info' : 'warning'}`}>
                      {g.grade}
                    </span>
                  </td>
                  <td style={{ color: '#718096' }}>{g.term}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <MaintenanceRequestModal 
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
      />
    </>
  );
}
