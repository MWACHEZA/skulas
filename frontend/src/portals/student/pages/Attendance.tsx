import { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/api';

interface AttendanceRecord {
  date: string;
  status: string;
  notes?: string;
}

const statusColor = (s: string) => {
  const status = s?.toLowerCase();
  return status === 'present' ? 'var(--portal-success)' : status === 'late' ? 'var(--portal-warning)' : status === 'absent' ? 'var(--portal-danger)' : '#718096';
};

const statusLabel = (s: string) => {
  const status = s?.toLowerCase();
  return status === 'present' ? 'Present' : status === 'late' ? 'Late' : status === 'absent' ? 'Absent' : s;
};

export default function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/students/me/dashboard')
      .then(r => setRecords(r.data.student?.attendance || []))
      .catch(() => {
        // fallback: fetch attendance via student profile (already included in dashboard data)
        api.get('/api/students/me/dashboard').then(r => setRecords(r.data.attendance || []));
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const present = records.filter(r => r.status?.toLowerCase() === 'present').length;
    const late = records.filter(r => r.status?.toLowerCase() === 'late').length;
    const absent = records.filter(r => r.status?.toLowerCase() === 'absent').length;
    const total = records.length;
    const rate = total ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, total, rate };
  }, [records]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Attendance Record</h1>
        <p>Your attendance history for the current term</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-user-check"></i></div>
          <div className="portal-stat-info"><h3>{stats.present}</h3><p>Present Days</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-user-times"></i></div>
          <div className="portal-stat-info"><h3>{stats.absent}</h3><p>Absent Days</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-clock"></i></div>
          <div className="portal-stat-info"><h3>{stats.late}</h3><p>Late Arrivals</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-percentage"></i></div>
          <div className="portal-stat-info"><h3>{stats.rate}%</h3><p>Attendance Rate</p></div>
        </div>
      </div>

      {/* Attendance Rate Bar */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-chart-area" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Overall Attendance</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>Attendance Rate</span>
            <span style={{ fontWeight: 800, color: stats.rate >= 90 ? 'var(--portal-success)' : stats.rate >= 75 ? 'var(--portal-warning)' : 'var(--portal-danger)' }}>
              {stats.rate}%
            </span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 8, height: 16, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              width: `${stats.rate}%`, height: '100%', borderRadius: 8,
              background: stats.rate >= 90 ? 'var(--portal-success)' : stats.rate >= 75 ? 'var(--portal-warning)' : 'var(--portal-danger)',
              transition: 'width 1s ease',
            }} />
          </div>
          <p style={{ color: '#718096', margin: 0, fontSize: '0.875rem' }}>
            {stats.rate >= 90
              ? '✅ Excellent attendance! Keep it up.'
              : stats.rate >= 75
              ? '⚠️ Your attendance is below target. Try to attend more regularly.'
              : '🚨 Your attendance is critically low. Please consult your class teacher.'}
          </p>
        </div>
      </div>

      {/* Records Table */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-list-check" style={{ marginRight: 8, color: '#805ad5' }}></i>Attendance Log (Last 30 Days)</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}><i className="fas fa-spinner fa-spin"></i></div>
          ) : records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No attendance records found.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr><th>Date</th><th>Status</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: statusColor(r.status) }}>
                        <i className={`fas ${r.status === 'present' ? 'fa-check-circle' : r.status === 'late' ? 'fa-clock' : 'fa-times-circle'}`}></i>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td style={{ color: '#718096', fontStyle: r.notes ? 'normal' : 'italic' }}>{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
