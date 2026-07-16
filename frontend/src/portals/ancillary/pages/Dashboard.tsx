import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import ClockInModal from '../../../components/attendance/ClockInModal';

export default function AncillaryDashboard() {
  const { user } = useAuth();
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  const primaryColor = user?.schoolBranding?.primaryColor || '#1e3a8a';
  const accentColor = user?.schoolBranding?.accentColor || '#f59e0b';

  useEffect(() => {
    fetchAttendance();
    fetchDashboardStats();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/api/staff-attendance/today');
      setAttendanceStatus(res.data);
    } catch (e) {
      console.error(e);
    
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/api/dashboard/ancillary');
      setStats(res.data.stats);
      setRecentTickets(res.data.recentTickets);
    } catch (e) {
      console.error('Fetch dashboard stats error:', e);
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1 style={{ color: primaryColor, fontWeight: 900 }}>Staff Dashboard</h1>
        <p style={{ color: '#64748b' }}>Welcome, {user?.name}. Manage daily operations and internal requests here.</p>
      </div>

      <div className="portal-stats-grid">
        {/* Attendance Card */}
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
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <i className={(!attendanceStatus || attendanceStatus.timeOut) ? "fas fa-sign-in-alt" : "fas fa-sign-out-alt"}></i>
              {(!attendanceStatus || attendanceStatus.timeOut) ? 'CLOCK IN NOW' : 'CLOCK OUT'}
            </button>
          </div>
        </div>

        {/* Open IT Tickets Card */}
        <div className="portal-stat-card" style={{ borderTop: `4px solid ${primaryColor}` }}>
          <div className="portal-stat-icon" style={{ background: `${primaryColor}1a`, color: primaryColor }}><i className="fas fa-laptop-medical"></i></div>
          <div className="portal-stat-info">
            <h3>{stats?.openTicketsCount ?? 0}</h3>
            <p>Open IT Tickets</p>
          </div>
        </div>

        {/* Pending Procurements Card */}
        <div className="portal-stat-card" style={{ borderTop: `4px solid ${accentColor}` }}>
          <div className="portal-stat-icon" style={{ background: `${accentColor}1a`, color: accentColor }}><i className="fas fa-shopping-cart"></i></div>
          <div className="portal-stat-info">
            <h3>{stats?.pendingProcurementsCount ?? 0}</h3>
            <p>Pending Procurements</p>
          </div>
        </div>

        {/* Tasks Assigned Card */}
        <div className="portal-stat-card" style={{ borderTop: `4px solid ${primaryColor}` }}>
          <div className="portal-stat-icon" style={{ background: `${primaryColor}1a`, color: primaryColor }}><i className="fas fa-tasks"></i></div>
          <div className="portal-stat-info">
            <h3>{stats?.assignedTasksCount ?? 0}</h3>
            <p>Tasks Assigned</p>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24, borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #cbd5e130', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ padding: '20px 25px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: primaryColor, margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            <i className="fas fa-clipboard-list"></i> Recent Support Tickets
          </h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No support tickets filed.</td>
                </tr>
              ) : (
                recentTickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 800, color: primaryColor }}>#{t.ticketNumber || t.id.slice(0, 8).toUpperCase()}</td>
                    <td>
                      <span className="status-badge" style={{ background: `${primaryColor}10`, color: primaryColor }}>
                        {t.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.subject}</td>
                    <td>
                      <span className={`portal-badge ${t.status === 'open' ? 'danger' : 'success'}`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {clockModalAction && (
        <ClockInModal 
          action={clockModalAction}
          onClose={() => setClockModalAction(null)}
          onSuccess={fetchAttendance}
        />
      )}
    </>
  );
}
