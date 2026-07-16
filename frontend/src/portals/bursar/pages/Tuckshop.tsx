import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function BursarTuckshop() {
  const [sales, setSales] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, reportsRes] = await Promise.all([
          api.get('/api/tuckshop/sales/recent'),
          api.get('/api/tuckshop/reports')
        ]);
        
        setSales(salesRes.data);
        setRevenue(reportsRes.data.revenueToday || 0);
        setItemsSold(reportsRes.data.itemsSoldToday || 0);
      } catch (error) {
        console.error('Failed to fetch tuckshop data', error);
      
    } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <div className="portal-page-header">
        <h1>Tuckshop & Uniform Shop</h1>
        <p>Manage daily sales, inventory levels, and financial records for the school shop.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-cash-register"></i></div>
          <div className="portal-stat-info">
            <h3>${revenue.toFixed(2)}</h3>
            <p>Today's Revenue</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-boxes"></i></div>
          <div className="portal-stat-info">
            <h3>{itemsSold}</h3>
            <p>Items Sold Today</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-shopping-basket"></i></div>
          <div className="portal-stat-info">
            <h3>{sales.length}</h3>
            <p>Recent Transactions</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Recent Sales Ledger</h2>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>New Sale</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No recent sales found</td>
                  </tr>
                ) : (
                  sales.map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.item?.name || 'Unknown Item'}</td>
                      <td><span className="portal-badge info">{s.item?.category || 'N/A'}</span></td>
                      <td>${s.item?.price?.toFixed(2) || '0.00'}</td>
                      <td>{s.quantity}</td>
                      <td style={{ fontWeight: 700, color: '#2f855a' }}>${s.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td style={{ color: '#718096' }}>{new Date(s.soldAt).toLocaleDateString()}</td>
                      <td>
                        <button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => alert('This feature is currently under development or disabled.')}>Invoice</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
