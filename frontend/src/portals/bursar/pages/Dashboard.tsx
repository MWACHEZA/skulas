import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

interface DashboardData {
  totalFeesBilled: number;
  totalFeesCollected: number;
  outstandingFees: number;
  feesByStatus: { status: string; _count: number; _sum: { amount: number } }[];
  recentPayments: { id: string; amount: number; paid: number; term: string; status: string; student?: { name: string } }[];
}

export default function BursarDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/bursar')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--portal-primary)', opacity: 0.6 }}></i>
      <p style={{ color: '#718096' }}>Loading financial dashboard...</p>
    </div>
  );

  const collectionRate = data?.totalFeesBilled ? Math.round(((data.totalFeesCollected ?? 0) / data.totalFeesBilled) * 100) : 0;

  return (
    <>
      <div className="portal-page-header">
        <h1>Bursar Dashboard</h1>
        <p>Welcome, {user?.name}. Here's the school's financial overview.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="portal-stat-info"><h3>${(data?.totalFeesBilled ?? 0).toLocaleString()}</h3><p>Total Billed</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-double"></i></div>
          <div className="portal-stat-info"><h3>${(data?.totalFeesCollected ?? 0).toLocaleString()}</h3><p>Total Collected</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-circle"></i></div>
          <div className="portal-stat-info"><h3>${(data?.outstandingFees ?? 0).toLocaleString()}</h3><p>Outstanding</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon teal"><i className="fas fa-percentage"></i></div>
          <div className="portal-stat-info"><h3>{collectionRate}%</h3><p>Collection Rate</p></div>
        </div>
      </div>

      {/* Collection Rate Bar */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-chart-pie" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Fee Collection Progress</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Collection Rate</span>
            <span style={{ fontWeight: 800, color: collectionRate >= 80 ? 'var(--portal-success)' : collectionRate >= 60 ? 'var(--portal-warning)' : 'var(--portal-danger)' }}>
              {collectionRate}%
            </span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 8, height: 16, overflow: 'hidden' }}>
            <div style={{
              width: `${collectionRate}%`, height: '100%', borderRadius: 8,
              background: collectionRate >= 80 ? 'var(--portal-success)' : collectionRate >= 60 ? 'var(--portal-warning)' : 'var(--portal-danger)',
              transition: 'width 1s ease',
            }} />
          </div>
          {/* By Status */}
          {data?.feesByStatus && (
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
              {data.feesByStatus.map((s, i) => (
                <div key={i} style={{ flex: 1, minWidth: 120, background: '#f8faff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span className={`portal-badge ${s.status === 'paid' ? 'success' : s.status === 'partial' ? 'warning' : 'danger'}`} style={{ marginBottom: 8, display: 'inline-block' }}>
                    {s.status}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{s._count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#718096' }}>students</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: '#48bb78' }}></i>Recent Fee Records</h2>
          <a href="/bursar/fees" style={{ fontSize: '0.82rem', color: 'var(--portal-primary)', textDecoration: 'none' }}>View All</a>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {!data?.recentPayments?.length ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No fee records found.</div>
          ) : (
            <table className="portal-table">
              <thead><tr><th>Student</th><th>Term</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {data.recentPayments.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{f.student?.name ?? 'Unknown'}</td>
                    <td>{f.term}</td>
                    <td>${f.amount}</td>
                    <td style={{ color: 'var(--portal-success)', fontWeight: 600 }}>${f.paid}</td>
                    <td style={{ color: f.amount - f.paid > 0 ? 'var(--portal-danger)' : 'var(--portal-success)', fontWeight: 700 }}>${f.amount - f.paid}</td>
                    <td><span className={`portal-badge ${f.status === 'paid' ? 'success' : f.status === 'partial' ? 'warning' : 'danger'}`}>{f.status}</span></td>
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
