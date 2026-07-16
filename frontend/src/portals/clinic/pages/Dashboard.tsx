import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function ClinicDashboard() {
  const [stats, setStats] = useState({
    activeComplaints: 0,
    appointmentsToday: 0,
    emergencies: 0,
    prescriptions: 15 // Mock fallback or static
  });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, appRes, emRes] = await Promise.all([
        api.get('/api/clinic/complaints'),
        api.get('/api/clinic/appointments'),
        api.get('/api/clinic/emergencies')
      ]);

      const activeComps = compRes.data || [];
      const apps = appRes.data || [];
      const ems = emRes.data || [];

      // Filter appointments for today
      const todayStr = new Date().toDateString();
      const appsToday = apps.filter((a: any) => new Date(a.date).toDateString() === todayStr);

      setStats({
        activeComplaints: activeComps.length,
        appointmentsToday: appsToday.length,
        emergencies: ems.length,
        prescriptions: 15 // static mock
      });

      setComplaints(activeComps.slice(0, 5));
      setAppointments(apps.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch clinic dashboard data', err);
    
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--portal-success)', opacity: 0.6 }}></i>
        <p style={{ color: '#718096' }}>Loading clinic dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Clinic Dashboard</h1>
        <p>Overview of today's health metrics and active complaints.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-heartbeat"></i></div>
          <div className="portal-stat-info"><h3>{stats.activeComplaints}</h3><p>Active Complaints</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-calendar-check"></i></div>
          <div className="portal-stat-info"><h3>{stats.appointmentsToday}</h3><p>Appointments Today</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-ambulance"></i></div>
          <div className="portal-stat-info"><h3>{stats.emergencies}</h3><p>Emergencies</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-pills"></i></div>
          <div className="portal-stat-info"><h3>{stats.prescriptions}</h3><p>Prescriptions Dispensed</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-clock" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>Recent Health Complaints</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Role</th>
                  <th>Symptom</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No recent complaints</td></tr>
                ) : complaints.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{c.user?.name || 'Unknown User'}</td>
                    <td>{c.user?.role || 'Patient'}</td>
                    <td>{c.symptoms || c.title || 'General'}</td>
                    <td>{new Date(c.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-calendar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Upcoming Appointments</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Role</th>
                  <th>Reason</th>
                  <th>Time / Date</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No upcoming appointments</td></tr>
                ) : appointments.map((a, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{a.user?.name || 'Unknown User'}</td>
                    <td>{a.user?.role || 'Patient'}</td>
                    <td>{a.appointment || 'Checkup'}</td>
                    <td>{new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
