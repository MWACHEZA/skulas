import { useAuth } from '../../../contexts/AuthContext';

export default function AlumniDashboard() {
  const { user } = useAuth();

  return (
    <>
      <div className="portal-page-header">
        <h1>Alumni Dashboard</h1>
        <p>Welcome back, {user?.name}. Stay connected with Embakwe High School.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-users"></i></div>
          <div className="portal-stat-info"><h3>1,200+</h3><p>Active Members</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-calendar-check"></i></div>
          <div className="portal-stat-info"><h3>2</h3><p>Upcoming Events</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-hand-holding-heart"></i></div>
          <div className="portal-stat-info"><h3>Actively</h3><p>Fundraising</p></div>
        </div>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-newspaper" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>School Updates & News</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ borderLeft: '3px solid #0056b3', paddingLeft: 12 }}>
                <h4 style={{ margin: '0 0 4px' }}>Class of 2010 Reunion Planned</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Join us this December for the 15-year anniversary gala. Early bird tickets available now.</p>
              </div>
              <div style={{ borderLeft: '3px solid #38a169', paddingLeft: 12 }}>
                <h4 style={{ margin: '0 0 4px' }}>Science Lab Renovation Success</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Thanks to alumni contributions, the new chemistry block is ready for the coming term.</p>
              </div>
            </div>
            <a href="/alumni/updates" style={{ display: 'inline-block', marginTop: 16, fontSize: '0.85rem', color: 'var(--portal-primary)', textDecoration: 'none', fontWeight: 600 }}>See all news...</a>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-hands-helping" style={{ marginRight: 8, color: 'var(--portal-warning)' }}></i>Get Involved</h2>
          </div>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <p style={{ color: '#4a5568', marginBottom: 20 }}>Support the next generation of Embakwe students by donating to the Legacy Scholarship Fund or registering for an upcoming charity run.</p>
            <button style={{ padding: '12px 24px', background: 'var(--portal-primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '1rem', width: '100%' }} onClick={() => alert('This feature is currently under development or disabled.')}>
              Contribute Today
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
