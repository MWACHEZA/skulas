import { Link, useLocation } from 'react-router-dom';

export default function MarketingNav() {
  const location = useLocation();

  return (
    <nav className="landing-nav" style={{ padding: '0 2rem' }}>
      <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
        ACAD<span>EX</span>
      </Link>
      <div className="nav-links">
        <Link 
          to="/" 
          style={{ color: location.pathname === '/' ? '#60a5fa' : undefined, fontWeight: location.pathname === '/' ? 700 : undefined }}
        >
          Overview
        </Link>
        <Link 
          to="/features" 
          style={{ color: location.pathname === '/features' ? '#60a5fa' : undefined, fontWeight: location.pathname === '/features' ? 700 : undefined }}
        >
          Features
        </Link>
        <Link 
          to="/pricing" 
          style={{ color: location.pathname === '/pricing' ? '#60a5fa' : undefined, fontWeight: location.pathname === '/pricing' ? 700 : undefined }}
        >
          Pricing
        </Link>
        <Link 
          to="/contact" 
          style={{ color: location.pathname === '/contact' ? '#60a5fa' : undefined, fontWeight: location.pathname === '/contact' ? 700 : undefined }}
        >
          Contact
        </Link>
      </div>
      <div className="cta" style={{ display: 'flex', gap: '12px' }}>
        <Link to="/admin/login" className="btn-premium btn-ghost-premium">Portal Login</Link>
        <Link to="/register/school" className="btn-premium btn-primary-premium">Start Free Trial</Link>
      </div>
    </nav>
  );
}
