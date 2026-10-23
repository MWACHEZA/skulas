import { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/api';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';

interface AttendanceRecord {
  date: string;
  status: string;
  notes?: string;
  scanMethod?: string;
}

const statusColor = (s: string) => {
  const status = (s || '').toLowerCase();
  if (status === 'present') return '#16a34a';
  if (status === 'late') return '#d97706';
  if (status === 'absent') return '#dc2626';
  if (status === 'excused') return '#2563eb';
  return '#64748b';
};

const statusBg = (s: string) => {
  const status = (s || '').toLowerCase();
  if (status === 'present') return '#dcfce7';
  if (status === 'late') return '#fef3c7';
  if (status === 'absent') return '#fee2e2';
  if (status === 'excused') return '#dbeafe';
  return '#f1f5f9';
};

export default function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = () => {
    setLoading(true);
    api.get('/api/students/me/dashboard')
      .then(r => {
        const att = r.data.student?.attendance || r.data.attendance || [];
        setRecords(att);
      })
      .catch(err => {
        console.error('Failed to load attendance:', err);
      })
      .finally(() => setLoading(false));
  };

  const stats = useMemo(() => {
    const present = records.filter(r => r.status?.toLowerCase() === 'present').length;
    const late = records.filter(r => r.status?.toLowerCase() === 'late').length;
    const absent = records.filter(r => r.status?.toLowerCase() === 'absent').length;
    const excused = records.filter(r => r.status?.toLowerCase() === 'excused').length;
    const total = records.length;
    const rate = total ? Math.round(((present + late) / total) * 100) : 100;
    return { present, late, absent, excused, total, rate };
  }, [records]);

  const filtered = records.filter(r => {
    if (filterStatus === 'ALL') return true;
    return (r.status || '').toLowerCase() === filterStatus.toLowerCase();
  });

  if (loading) {
    return (
      <div className="portal-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
        <SkeletonLoader type="stats" count={4} />
        <div style={{ marginTop: 24 }}>
          <SkeletonLoader type="table" rows={6} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            <i className="fas fa-calendar-check mr-2" style={{ color: '#0284c7' }}></i>Student Attendance Register
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Monitor your daily roll-call compliance, punctuality, and official gate clock-in records.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Present Days</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{stats.present}</h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-check"></i>
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Late Arrivals</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{stats.late}</h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-clock"></i>
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Absences</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{stats.absent}</h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-times"></i>
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Standing Rate</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>{stats.rate}%</h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-percentage"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Guidance Banner */}
      <div className="portal-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
            Term Compliance Progress ({stats.rate}%)
          </span>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 6,
            background: stats.rate >= 90 ? '#dcfce7' : stats.rate >= 75 ? '#fef3c7' : '#fee2e2',
            color: stats.rate >= 90 ? '#15803d' : stats.rate >= 75 ? '#92400e' : '#b91c1c'
          }}>
            {stats.rate >= 90 ? 'Regular & Commended' : stats.rate >= 75 ? 'Acceptable' : 'Pastoral Review Required'}
          </span>
        </div>

        <div style={{ background: '#f1f5f9', borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            width: `${stats.rate}%`,
            height: '100%',
            background: stats.rate >= 90 ? '#16a34a' : stats.rate >= 75 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.6s ease'
          }} />
        </div>

        <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.45 }}>
          {stats.rate >= 90
            ? '🌟 Excellent record! Your punctuality and continuous attendance meet the institutional honors criteria.'
            : stats.rate >= 75
            ? '⚠️ Your roll-call attendance is currently between 75% and 89%. Please avoid unexcused morning absences.'
            : '🚨 Critical attendance rate below 75%. Please see your class teacher or Dean of Students regarding your medical or exeat excuses.'}
        </p>
      </div>

      {/* Filter Tabs & History Table */}
      <div className="portal-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-history mr-2" style={{ color: '#64748b' }}></i>Daily Attendance Log
          </h3>

          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'PRESENT', 'LATE', 'ABSENT'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: filterStatus === st ? '#0284c7' : '#ffffff',
                  color: filterStatus === st ? '#ffffff' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin mr-2"></i>Loading records...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
            <i className="fas fa-check-circle fa-2x" style={{ opacity: 0.25, marginBottom: 8 }}></i>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>No records matching this filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <PaginatedTable className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date & Day</th>
                  <th>Session / Class</th>
                  <th>Status</th>
                  <th>Check-In Method</th>
                  <th>Teacher / System Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const d = new Date(r.date);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                        Morning Roll Call
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: statusBg(r.status),
                          color: statusColor(r.status)
                        }}>
                          <i className={`fas ${r.status?.toLowerCase() === 'present' ? 'fa-check' : r.status?.toLowerCase() === 'late' ? 'fa-clock' : 'fa-times'}`} />
                          {r.status || 'Present'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {r.scanMethod ? (
                          <span><i className="fas fa-qrcode mr-1" style={{ color: '#0284c7' }}></i>{r.scanMethod}</span>
                        ) : (
                          <span><i className="fas fa-user-edit mr-1" style={{ color: '#64748b' }}></i>Teacher Register</span>
                        )}
                      </td>
                      <td style={{ color: r.notes ? '#334155' : '#94a3b8', fontStyle: r.notes ? 'normal' : 'italic', fontSize: '0.82rem' }}>
                        {r.notes || 'Normal attendance logged'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>
          </div>
        )}
      </div>
    </div>
  );
}
