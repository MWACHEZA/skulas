import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface ReportData {
  revenueToday: number;
  itemsSoldToday: number;
  topItems: {
    name: string;
    units: number;
    revenue: number;
    stock: number;
  }[];
}

export default function TuckshopReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/tuckshop/reports');
      setReport(res.data);
    } catch (e) {
      console.error('Failed to fetch tuckshop reports', e);
    
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading analytics...</div>;
  if (!report) return <div style={{ padding: 20 }}>Failed to load analytics.</div>;

  return (
    <>
      <div className="portal-page-header">
        <h1>Tuckshop Analytics & Reports</h1>
        <p>Analyze sales trends, inventory turnover, and profitability of the school tuckshop and uniform store.</p>
      </div>

      <div className="portal-grid-3">
        <div className="portal-card" style={{ borderTop: '4px solid var(--school-primary, #3182ce)' }}>
          <div className="portal-card-header">
            <h3 style={{ margin: 0 }}>Today</h3>
          </div>
          <div className="portal-card-body">
            <div style={{ marginBottom: 15 }}>
              <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#718096' }}>Revenue</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#2d3748' }}>${report.revenueToday.toFixed(2)}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Items Sold: <strong>{report.itemsSoldToday}</strong></span>
            </div>
          </div>
        </div>
        
        {/* Placeholder for weekly/monthly metrics since they are not fully tracked yet */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ margin: 0 }}>This Week</h3>
          </div>
          <div className="portal-card-body">
            <p style={{ color: '#718096', fontStyle: 'italic' }}>Historical metrics processing...</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-chart-line" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Top Performing Items</h2>
          <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download"></i> Export Data</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Units Sold</th>
                <th>Revenue Generated</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {report.topItems.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No sales recorded yet.</td></tr>
              ) : report.topItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.units}</td>
                  <td style={{ fontWeight: 600 }}>${item.revenue.toFixed(2)}</td>
                  <td>
                    <span className={`portal-badge ${item.stock < 10 ? 'warning' : 'success'}`}>
                      {item.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
