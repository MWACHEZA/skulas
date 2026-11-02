import { Link, useLocation } from 'react-router-dom';

export default function MarketingNav() {
  const location = useLocation();

  const navLinks = [
    { label: 'Overview', to: '/' },
    { label: 'Features', to: '/features' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Contact', to: '/contact' }
  ];

  return (
    <header className="landing-nav-wrapper">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">
            <span className="brand-icon">
              <i className="fas fa-graduation-cap"></i>
            </span>
            <span className="brand-text">
              ACAD<span className="brand-accent">EX</span>
            </span>
          </Link>

          <div className="landing-nav-links">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`landing-nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                  {isActive && <span className="active-indicator" />}
                </Link>
              );
            })}
          </div>

          <div className="landing-nav-actions">
            <Link to="/admin/login" className="btn-nav-ghost">
              Portal Login
            </Link>
            <Link to="/register/school" className="btn-nav-primary">
              <span>Start Free Trial</span>
              <i className="fas fa-arrow-right nav-btn-icon"></i>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
