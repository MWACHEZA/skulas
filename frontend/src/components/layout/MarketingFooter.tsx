import { Link } from 'react-router-dom';

export default function MarketingFooter() {
  return (
    <footer className="landing-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
      <div className="container">
        <div className="footer-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem', padding: '4rem 0 2rem' }}>
          <div className="footer-col">
            <div className="logo" style={{ marginBottom: '1.2rem', fontSize: '1.8rem', fontWeight: 900 }}>
              ACAD<span style={{ color: '#3b82f6' }}>EX</span>
            </div>
            <p style={{ maxWidth: '320px', color: 'var(--gray-400)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              The continental-scale education operating system. Hardened multi-tenant vaulting, role-based workflows, and automated financial compliance.
            </p>
            <div className="social-links" style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
              <a href="#" className="social-icon" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
              <a href="#" className="social-icon" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              <a href="#" className="social-icon" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>Core Portals</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <Link to="/admin/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>School Admin Portal</Link>
              <Link to="/teacher/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Teacher & Academics</Link>
              <Link to="/student/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Student Learning Hub</Link>
              <Link to="/parent/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Parent & Guardian</Link>
              <Link to="/bursar/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Bursar & Treasury</Link>
              <Link to="/clinic/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Health Clinic Portal</Link>
            </div>
          </div>
          <div className="footer-col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <Link to="/features" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Platform Capabilities</Link>
              <Link to="/pricing" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>$2/Student Pricing</Link>
              <Link to="/contact" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Enterprise Inquiries</Link>
              <Link to="/register/school" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Register New Institution</Link>
              <Link to="/acadex/login" style={{ color: 'var(--gray-400)', textDecoration: 'none' }}>Platform Administration</Link>
            </div>
          </div>
          <div className="footer-col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>Security & Trust</h4>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              Strict cryptographic tenant isolation. Every school operates inside its private schema domain with end-to-end audit logging.
            </p>
            <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              <i className="fas fa-shield-alt"></i> 100% TENANT ISOLATED
            </div>
          </div>
        </div>
        <div className="footer-bottom" style={{ borderTop: '1px solid var(--glass-border)', padding: '2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: 0 }}>
            &copy; {new Date().getFullYear()} ACADEX Enterprise SaaS Platform. All rights reserved.
          </p>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: 0 }}>
            Institutional Rate: <span style={{ color: '#34d399', fontWeight: 700 }}>$2.00 / student / month</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
