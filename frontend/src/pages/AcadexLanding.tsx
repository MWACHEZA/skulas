import { Link } from 'react-router-dom';
import '../styles/landing.css';
import { DEFAULT_PLANS, type Tier } from '../portals/acadex/pages/Subscriptions';

export default function AcadexLanding() {
  return (
    <div className="acadex-landing">
      {/* Navigation */}
      <nav className="landing-nav" style={{ padding: '0 2rem' }}>
        <div className="logo">
          ACAD<span>EX</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#portals">Portals</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="cta">
          <Link to="/admin/login" className="btn-premium btn-ghost-premium">Login</Link>
          <Link to="/register/school" className="btn-premium btn-primary-premium">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <div className="hero-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="hero-eyebrow" style={{ color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Continental-Scale Education SaaS</div>
          <h1 style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '30px' }}>
            The Global Engine for<br />
            <span style={{ background: 'linear-gradient(90deg, #3182ce, #805ad5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Modern Institutions.</span>
          </h1>
          <p style={{ fontSize: '1.3rem', color: 'var(--gray-400)', maxWidth: '700px', margin: '0 auto 40px' }}>
            From Primary schools to Research Universities, Acadex provides the infrastructure to manage every portal, role, and academic regulation in one unified, secure ecosystem.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <Link to="/register/school" className="btn-premium btn-primary-premium">
              Start Your Free Institutional Trial
            </Link>
            <a href="#pricing" className="btn-premium btn-outline-premium" style={{ background: 'rgba(255,255,255,0.03)' }}>
              Explore Adaptive Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Trust & Isolation Section */}
      <section className="security-section container" style={{ padding: '80px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(128, 90, 213, 0.05) 100%)', borderRadius: '40px', padding: '60px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '12px 24px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 800, marginBottom: '25px' }}>
            <i className="fas fa-shield-alt mr-2"></i> MILITARY-GRADE ISOLATION
          </div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Your Data. Strictly Isolated.</h2>
          <p style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--gray-400)', fontSize: '1.1rem' }}>
            We implement strict multi-tenant vaulting. No matter what, your institution's data—grades, financial records, research, and personal information—remains exclusively in your school's private domain. Cross-school data leakage is technically impossible.
          </p>
        </div>
      </section>

      {/* Portals Section */}
      <section className="portals-section" id="portals">
        <div className="container">
          <div className="section-header" style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '3rem' }}>One Platform, 10+ Integrated Roles</h2>
            <p style={{ fontSize: '1.1rem' }}>Adaptive role-based access control (RBAC) designed for complex institutional hierarchies.</p>
          </div>
          <div className="portals-grid">
            <PortalCard icon="🏛️" title="School Admin" desc="Full institutional oversight, configuration & reporting." />
            <PortalCard icon="🧪" title="Research Supervisor" desc="Thesis tracking, progress reports & RPG regulation." />
            <PortalCard icon="👩‍🏫" title="Teacher Portal" desc="Grades, lesson planning & industrial assessment." />
            <PortalCard icon="🎒" title="Student Portal" desc="Assignments, results, portfolios & postgraduate hub." />
            <PortalCard icon="🩺" title="Clinic Portal" desc="Manage health complaints, appointments, and medical records." />
            <PortalCard icon="💼" title="Financial Office" desc="Bursar portal for fees, payroll & procurement." />
            <PortalCard icon="📚" title="Library Hub" desc="Book cataloging, digital resources & global loans." />
            <PortalCard icon="👨‍👩‍👧" title="Parent Portal" desc="Growth tracking, fee statements & direct notices." />
            <PortalCard icon="🛠️" title="Ancillary Staff" desc="Kitchen, transport, security, tuckshop & farm staff." />
            <PortalCard icon="🤝" title="Supply Chain" desc="Supplier portal for tender bidding & invoicing." />
            <PortalCard icon="🎓" title="Alumni & Applicants" desc="Networking, career tracking & online admissions." />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing" style={{ background: '#0a0a0a' }}>
        <div className="container">
          <div className="section-header">
            <h2 style={{ fontSize: '3rem' }}>Institutional Tiers</h2>
            <p style={{ fontSize: '1.1rem' }}>Plans built to scale with your institution's complexity and mission.</p>
          </div>
          <div className="pricing-grid">
            {DEFAULT_PLANS.map(plan => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col">
              <div className="logo" style={{ marginBottom: '1.5rem' }}>
                ACAD<span>EX</span>
              </div>
              <p style={{ maxWidth: '300px' }}>Empowering the future of education across the continent with modern, hardened infrastructure. Built for institutions that lead.</p>
              <div className="social-links">
                <a href="#" className="social-icon"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-icon"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" className="social-icon"><i className="fab fa-facebook-f"></i></a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Portals</h4>
              <Link to="/admin/login">Admin Portal</Link>
              <Link to="/teacher/login">Teacher Portal</Link>
              <Link to="/student/login">Student Portal</Link>
              <Link to="/parent/login">Parent Portal</Link>
              <Link to="/bursar/login">Bursar Portal</Link>
              <Link to="/librarian/login">Library Portal</Link>
            </div>
            <div className="footer-col">
              <h4>More Portals</h4>
              <Link to="/supplier/login">Supplier Portal</Link>
              <Link to="/alumni/login">Alumni Portal</Link>
              <Link to="/ancillary/login">Ancillary Portal</Link>
              <Link to="/clinic/login">Clinic Portal</Link>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/register/school">Register Your School</Link>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing Plans</a>
              <Link to="/register/school?plan=enterprise">Enterprise</Link>
              <a href="mailto:contact@acadex.com">Contact Us</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} ACADEX Platform. Engineering Educational Excellence 🌍</p>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
              Designed by <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Santana IT Solutions</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PortalCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="portal-card">
      <span className="portal-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function PricingCard({ plan }: { plan: Tier }) {
  const isPro = plan.id === 2;
  // Show a sensible cap: first 6 features + "X more included"
  const DISPLAY_MAX = 6;
  const shown = plan.features.slice(0, DISPLAY_MAX);
  const extra = plan.features.length - DISPLAY_MAX;

  return (
    <div className={`pricing-card ${isPro ? 'premium' : ''}`} style={{ borderTop: `4px solid ${plan.color}` }}>
      <h4 style={{ color: plan.color }}>{plan.name}</h4>
      <div className="price">
        {plan.price}<span>{plan.billingLabel}</span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: '1.2rem' }}>{plan.tagline}</p>
      <ul className="features-list">
        {shown.map((f, i) => (
          <li key={i}><i className="fas fa-check-circle"></i> {f}</li>
        ))}
        {extra > 0 && (
          <li style={{ opacity: 0.7, fontStyle: 'italic' }}>
            <i className="fas fa-plus-circle" style={{ color: plan.color }}></i> {extra} more features included
          </li>
        )}
      </ul>
      <Link
        to={`/register/school?plan=${plan.name.toLowerCase()}`}
        className={`btn-premium ${isPro ? 'btn-primary-premium' : 'btn-outline-premium'}`}
        style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: '1.5rem' }}
      >
        Start Free Trial
      </Link>
    </div>
  );
}
