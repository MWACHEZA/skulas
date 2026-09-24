import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import '../../../styles/portal.css';

export default function AcadexDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalSchools: 0,
    activeSchools: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    serverHealth: '99.9%'
  });
  const [recentSchools, setRecentSchools] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/api/dashboard/acadex');
        setStats(data.stats);
        setRecentSchools(Array.isArray(data.schools) ? data.schools.slice(0, 5) : []);
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
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1>Acadex Platform Command Center</h1>
          <p>Real-time analytics, SaaS recurring billing, and multi-tenant management across all registered school environments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-secondary" onClick={() => navigate('/acadex/revenue')}>
            <i className="fas fa-chart-line" style={{ marginRight: 6 }}></i> View Revenue
          </button>
          <button className="portal-btn-primary" onClick={() => navigate('/acadex/provision')}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Provision School
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="portal-stats-grid" style={{ marginBottom: 25 }}>
        <div
          className="portal-stat-card cursor-pointer"
          onClick={() => navigate('/acadex/schools')}
          style={{ cursor: 'pointer' }}
          title="Click to view School Registry"
        >
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <i className="fas fa-school"></i>
          </div>
          <div className="portal-stat-info">
            {loading ? <div className="skeleton" style={{ height: 28, width: 60 }}></div> : <h3>{stats.totalSchools}</h3>}
            <p>Registered Schools ({stats.activeSchools} Active)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="portal-stat-info">
            {loading ? <div className="skeleton" style={{ height: 28, width: 60 }}></div> : <h3>{(stats.activeStudents || 0).toLocaleString()}</h3>}
            <p>Active Students ({(stats.totalStudents || 0).toLocaleString()} Total)</p>
          </div>
        </div>

        <div
          className="portal-stat-card cursor-pointer"
          onClick={() => navigate('/acadex/revenue')}
          style={{ cursor: 'pointer', border: '1px solid rgba(52, 211, 153, 0.4)' }}
          title="Click to inspect full SaaS billing & revenue breakdown"
        >
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="portal-stat-info">
            {loading ? (
              <div className="skeleton" style={{ height: 28, width: 80 }}></div>
            ) : (
              <h3>${(stats.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            )}
            <p>Monthly SaaS Revenue ($2/student) →</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(248, 113, 113, 0.15)', color: '#f87171' }}>
            <i className="fas fa-server"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{stats.serverHealth || '99.9%'}</h3>
            <p>Cluster Uptime & Health</p>
          </div>
        </div>
      </div>

      {/* Quick Access Action Deck */}
      <div className="portal-card" style={{ marginBottom: 25 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-bolt" style={{ marginRight: 8, color: '#f59e0b' }}></i>Platform Command Shortcuts</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <button
              className="portal-btn-secondary"
              style={{ padding: 14, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate('/acadex/revenue')}
            >
              <i className="fas fa-file-invoice-dollar" style={{ marginRight: 10, color: '#059669', fontSize: '1.1rem' }}></i>
              <div>
                <strong>Global Revenue Center</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MRR, ARR & tenant billing</div>
              </div>
            </button>

            <button
              className="portal-btn-secondary"
              style={{ padding: 14, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate('/acadex/schools')}
            >
              <i className="fas fa-university" style={{ marginRight: 10, color: '#2563eb', fontSize: '1.1rem' }}></i>
              <div>
                <strong>School Registry</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Manage all school tenants</div>
              </div>
            </button>

            <button
              className="portal-btn-secondary"
              style={{ padding: 14, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate('/acadex/provision')}
            >
              <i className="fas fa-plus-circle" style={{ marginRight: 10, color: '#8b5cf6', fontSize: '1.1rem' }}></i>
              <div>
                <strong>Provision School</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Deploy new tenant instance</div>
              </div>
            </button>

            <button
              className="portal-btn-secondary"
              style={{ padding: 14, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate('/acadex/logs')}
            >
              <i className="fas fa-history" style={{ marginRight: 10, color: '#d97706', fontSize: '1.1rem' }}></i>
              <div>
                <strong>Platform Logs</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Live system & audit events</div>
              </div>
            </button>

            <button
              className="portal-btn-secondary"
              style={{ padding: 14, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate('/acadex/settings')}
            >
              <i className="fas fa-sliders-h" style={{ marginRight: 10, color: '#475569', fontSize: '1.1rem' }}></i>
              <div>
                <strong>Platform Settings</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SaaS operations & superadmins</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Split Section: Growth Trends & Recent Tenants */}
      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-chart-area" style={{ marginRight: 8, color: '#38bdf8' }}></i>Platform Growth (Last 6 Months)</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 15, paddingBottom: 10 }}>
              {[45, 60, 68, 80, 92, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: `${h}%`, background: 'linear-gradient(to top, #38bdf8, #818cf8)', borderRadius: '4px 4px 0 0' }}></div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', margin: '8px 0 0' }}>
              Multi-tenant adoption and student enrollment trajectory
            </p>
          </div>
        </div>

        <div className="portal-card" style={{ overflow: 'visible' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2><i className="fas fa-university" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Recent Tenants</h2>
            <button className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => navigate('/acadex/schools')}>
              View All
            </button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSchools.map(s => (
                  <tr key={s.id || s.code}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{s.code || s.id}</div>
                    </td>
                    <td><span className="portal-badge info">{s.plan}</span></td>
                    <td>
                      <span className={`portal-badge ${s.status === 'Active' || s.status === 'active' ? 'success' : 'danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="portal-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => navigate(`/acadex/schools/${s.code || s.id}`)}
                      >
                        Profile
                      </button>
                    </td>
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
