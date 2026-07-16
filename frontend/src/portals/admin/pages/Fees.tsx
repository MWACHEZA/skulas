import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';

export default function AdminFees() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>({
    totalBilled: 0,
    totalCollected: 0,
    outstanding: 0,
    collectionRate: 0,
    collectionByClass: [],
    topDefaulters: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/api/fees/stats');
      setStats(data);
    } catch (err) {
      showToast('Failed to load real-time fee summary', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2b6cb0' }}></i>
        <p style={{ marginTop: 12, color: '#4a5568', fontWeight: 600 }}>Loading real-time financial registry...</p>
      </div>
    );
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Fees Overview</h1>
        <p>School-wide fee collection summary and outstanding balances.</p>
      </div>
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(stats.totalBilled)}</h3>
            <p>Total Billed ({new Date().getFullYear()})</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-double"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(stats.totalCollected)}</h3>
            <p>Total Collected</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(stats.outstanding)}</h3>
            <p>Outstanding</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon teal"><i className="fas fa-percentage"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.collectionRate}%</h3>
            <p>Collection Rate</p>
          </div>
        </div>
      </div>
      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>
              <i className="fas fa-chart-bar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>
              Collection by {t('class')}
            </h2>
          </div>
          <div className="portal-card-body">
            {stats.collectionByClass.length === 0 ? (
              <p style={{ color: '#718096', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No class collections mapped.</p>
            ) : (
              stats.collectionByClass.map((f: any, i: number) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{f.className}</span>
                    <span style={{ fontWeight: 700, color: f.pct >= 80 ? 'var(--portal-success)' : f.pct >= 60 ? 'var(--portal-warning)' : 'var(--portal-danger)' }}>{f.pct}%</span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: 6, height: 8 }}>
                    <div style={{ width: `${f.pct}%`, height: '100%', borderRadius: 6, background: f.pct >= 80 ? 'var(--portal-success)' : f.pct >= 60 ? 'var(--portal-warning)' : 'var(--portal-danger)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>
              <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>
              Top Defaulters
            </h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {stats.topDefaulters.length === 0 ? (
              <p style={{ color: '#718096', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No outstanding balances detected.</p>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>{t('class')}</th>
                    <th>Arrears</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topDefaulters.map((s: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                      <td>{s.className}</td>
                      <td style={{ color: 'var(--portal-danger)', fontWeight: 700 }}>{formatCurrency(s.arrears)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
