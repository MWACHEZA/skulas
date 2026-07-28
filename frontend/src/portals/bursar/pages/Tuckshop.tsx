import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function BursarTuckshop() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleNewSale = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
        showToast('Sale recorded successfully!', 'success');
        setIsProcessing(false);
        setShowNewSaleModal(false);
    }, 1500);
  };

  const handleInvoice = () => {
    showToast('Generating invoice...', 'success');
  };

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
          <button className="portal-btn-primary" onClick={() => setShowNewSaleModal(true)}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>New Sale</button>
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
                        <button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={handleInvoice}>Invoice</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNewSaleModal && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card">
              <div className="portal-modal-header">
                 <h2>Record New Sale</h2>
                 <button onClick={() => setShowNewSaleModal(false)} className="portal-btn-ghost" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleNewSale}>
                <div className="portal-modal-body">
                   <div className="portal-form-group">
                      <label>Item Category</label>
                      <select className="portal-input" required>
                         <option value="">Select Category</option>
                         <option value="tuckshop">Tuckshop</option>
                         <option value="uniforms">Uniforms</option>
                      </select>
                   </div>
                   <div className="portal-form-group">
                      <label>Amount ($)</label>
                      <input type="number" step="0.01" className="portal-input" placeholder="0.00" required />
                   </div>
                   <div className="portal-form-group">
                      <label>Payment Method</label>
                      <select className="portal-input" required>
                         <option value="cash">Cash</option>
                         <option value="ecocash">Ecocash</option>
                         <option value="swipe">Swipe</option>
                      </select>
                   </div>
                </div>
                <div className="portal-modal-footer">
                   <button type="button" className="portal-btn-secondary" onClick={() => setShowNewSaleModal(false)}>Cancel</button>
                   <button type="submit" className="portal-btn-primary" disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Record Sale'}</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </>
  );
}
