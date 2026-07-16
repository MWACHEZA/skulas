import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AcadexDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: 'Registered Schools', value: '...', icon: 'fas fa-school', color: '#38bdf8' },
    { label: 'Active Students', value: '...', icon: 'fas fa-user-graduate', color: '#c084fc' },
    { label: 'Monthly Revenue', value: '...', icon: 'fas fa-dollar-sign', color: '#34d399' },
    { label: 'Server Health', value: '99.9%', icon: 'fas fa-server', color: '#f87171' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/api/dashboard/acadex');
        setStats([
          { label: 'Registered Schools', value: data.stats.totalSchools.toString(), icon: 'fas fa-school', color: '#38bdf8' },
          { label: 'Active Students', value: data.stats.totalStudents.toLocaleString(), icon: 'fas fa-user-graduate', color: '#c084fc' },
          { label: 'Monthly Revenue', value: `$${data.stats.totalRevenue.toLocaleString()}`, icon: 'fas fa-dollar-sign', color: '#34d399' },
          { label: 'Server Health', value: data.stats.serverHealth, icon: 'fas fa-server', color: '#f87171' },
        ]);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      
    } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <div className="portal-page-header">
        <h1>Platform Overview</h1>
        <p>Real-time analytics and global management for all school instances on the Acadex network.</p>
      </div>

      <div className="portal-stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="portal-stat-card">
            <div className="portal-stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <i className={stat.icon}></i>
            </div>
            <div className="portal-stat-info">
              {loading && i < 3 ? <div className="skeleton" style={{ height: 28, width: 60, background: '#eee', borderRadius: 4 }}></div> : <h3>{stat.value}</h3>}
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-chart-area" style={{ marginRight: 8, color: '#38bdf8' }}></i>Growth Trends</h2>
          </div>
          <div className="portal-card-body">
             <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 15, paddingBottom: 20 }}>
                {[40, 65, 55, 90, 80, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(to top, #38bdf8, #818cf8)', borderRadius: '4px 4px 0 0' }}></div>
                ))}
             </div>
             <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>School Onboarding (Last 6 Months)</p>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-exclamation-triangle" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>Recent System Alerts</h2>
          </div>
          <div className="portal-card-body">
             <div className="portal-alert danger" style={{ marginBottom: 12 }}>
                <strong>Critical:</strong> Database migration failed on School Instance #AX-9921.
             </div>
             <div className="portal-alert warning" style={{ marginBottom: 12 }}>
                <strong>Warning:</strong> High latency detected in South Africa region cluster.
             </div>
             <div className="portal-alert info">
                <strong>Notice:</strong> 12 new schools applied for the Professional Plan today.
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
