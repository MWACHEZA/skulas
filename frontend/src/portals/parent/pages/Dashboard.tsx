import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';

export default function ParentDashboard() {
  const { user, activeEntity } = useAuth();
  const [stats, setStats] = useState({
    outstandingBalance: 0,
    avgAttendance: 0,
    walletBalance: 0,
    recentMerits: 0
  });

  useEffect(() => {
    if (activeEntity?.id && activeEntity.status === 'APPROVED') {
      fetchDashboardStats();
    }
  }, [activeEntity?.id, activeEntity?.status]);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`/api/dashboard/parent?studentId=${activeEntity?.id}`);
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch parent dashboard stats:', error);
    }
  };

  if (activeEntity?.status === 'PENDING') {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '4rem', color: '#ecc94b', margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
          <i className="fas fa-clock"></i>
        </div>
        <h2>Verification in Progress</h2>
        <p style={{ color: '#718096', maxWidth: 400, margin: '10px auto' }}>
          Your connection to <strong>{activeEntity.schoolName}</strong> is currently being reviewed by the administration. 
          You will have full access once approved.
        </p>
        <button className="portal-btn-secondary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
          <i className="fas fa-sync"></i> Refresh Status
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Guardian Dashboard</h1>
        <p>Welcome back, {user?.name}. Viewing records for <strong>{activeEntity?.name}</strong>.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="portal-stat-info">
            <h3>${stats.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p>Outstanding Balance</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-calendar-check"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.avgAttendance}%</h3>
            <p>Avg. Attendance</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-wallet"></i></div>
          <div className="portal-stat-info">
            <h3>${stats.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p>Tuckshop Wallet</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-certificate"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.recentMerits}</h3>
            <p>Recent Merits</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-2-1">
        {/* Recent Announcements */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: '#ed8936' }}></i>Recent Announcements</h2>
            <Link to="/parent/notices" className="portal-view-all">View All</Link>
          </div>
          <div className="portal-card-body">
            <div className="portal-announcement-list">
              <div className="portal-announcement-item">
                <span className="portal-badge success" style={{ marginBottom: 8 }}>Notice</span>
                <h4>Upcoming Parent-Teacher Consultations</h4>
                <p>Form 1 and Form 4 consultations will be held this Saturday from 08:30 AM in the Great Hall.</p>
                <small style={{ display: 'block', marginTop: 8, color: '#718096' }}>20 March 2026</small>
              </div>
              <div className="portal-announcement-item" style={{ borderLeftColor: '#f6ad55', background: 'rgba(246, 173, 85, 0.05)' }}>
                <span className="portal-badge warning" style={{ marginBottom: 8 }}>Fees</span>
                <h4>School Fees Term 2 Reminder</h4>
                <p>Term 2 fee invoices have been published. Early bird discounts apply for payments made before April 5th.</p>
                <small style={{ display: 'block', marginTop: 8, color: '#718096' }}>18 March 2026</small>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-bolt" style={{ marginRight: 8, color: '#ecc94b' }}></i>Quick Actions</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/parent/fees" className="portal-btn-primary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <i className="fas fa-upload"></i> Upload Proof of Payment
              </Link>
              <Link to="/parent/academics" className="portal-btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <i className="fas fa-chart-line"></i> View Academic Report
              </Link>
              <Link to="/parent/profile" className="portal-btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <i className="fas fa-user-graduate"></i> My Children's Profiles
              </Link>
              <Link to="/parent/transport" className="portal-btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <i className="fas fa-bus"></i> Track School Bus
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-grid-1-15" style={{ marginTop: 24 }}>
        {/* Weekly Menu */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-utensils" style={{ marginRight: 8, color: '#f6ad55' }}></i>Weekly School Menu</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ background: '#fefcbf', padding: '12px 16px', borderRadius: 8, borderLeft: '4px solid #f6ad55' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#744210', textTransform: 'uppercase' }}>Today's Lunch</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>Sadza with Beef Stew & Seasonal Greens</p>
            </div>
            <div style={{ marginTop: 15 }}>
              <button className="portal-btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                <i className="fas fa-calendar-alt"></i> View Full Weekly Menu
              </button>
            </div>
          </div>
        </div>

        {/* Boarding & Security Logs */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-clock" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Recent Student Movements</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
             <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr>
                   <th style={{ textAlign: 'left', padding: '12px 15px', color: '#718096', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>Action</th>
                   <th style={{ textAlign: 'left', padding: '12px 15px', color: '#718096', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>Reason</th>
                   <th style={{ textAlign: 'left', padding: '12px 15px', color: '#718096', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>Date</th>
                   <th style={{ textAlign: 'left', padding: '12px 15px', color: '#718096', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>Status</th>
                 </tr>
               </thead>
               <tbody>
                  <tr>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}><span className="portal-badge secondary">SIGN OUT</span></td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}>Weekend Pass</td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}>15 Mar, 16:30</td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}><span className="portal-badge warning">Off-Site</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}><span className="portal-badge success">SIGN IN</span></td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}>Returned from Mid-term</td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}>12 Mar, 08:20</td>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #edf2f7' }}><span className="portal-badge success">In-Hostel</span></td>
                  </tr>
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </>
  );
}

