import { Link } from 'react-router-dom';
import MarketingNav from '../components/layout/MarketingNav';
import MarketingFooter from '../components/layout/MarketingFooter';
import '../styles/landing.css';
import { DEFAULT_PLANS, type Tier } from '../portals/acadex/pages/Subscriptions';

export default function AcadexLanding() {
  return (
    <div className="acadex-landing">
      {/* Navigation */}
      <MarketingNav />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-ambient-glow" />
        <div className="hero-mesh-overlay" />
        <div className="container hero-content">
          <div className="hero-eyebrow-pill">
            <span className="pulse-indicator">
              <span className="pulse-dot" />
              <span className="pulse-ring" />
            </span>
            <span>Continental-Scale Education SaaS</span>
          </div>
          <h1 className="hero-headline">
            The Global Engine for<br />
            <span className="gradient-text">Modern Institutions.</span>
          </h1>
          <p className="hero-subtitle">
            From Primary schools to Research Universities, Acadex provides the infrastructure to manage every portal, role, and academic regulation in one unified, secure ecosystem.
          </p>
          <div className="hero-btns">
            <Link to="/register/school" className="btn-hero-primary">
              <span>Start Your Free Institutional Trial</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
            <a href="#pricing" className="btn-hero-secondary">
              <span>Explore Adaptive Pricing</span>
            </a>
          </div>
          <div className="hero-proof-strip">
            <div className="proof-item">
              <i className="fas fa-shield-alt proof-icon"></i>
              <span>Multi-Tenant Vaulting</span>
            </div>
            <div className="proof-item">
              <i className="fas fa-layer-group proof-icon"></i>
              <span>10+ Integrated Portals</span>
            </div>
            <div className="proof-item">
              <i className="fas fa-tag proof-icon"></i>
              <span>$2 / Student Flat Rate</span>
            </div>
            <div className="proof-item">
              <i className="fas fa-university proof-icon"></i>
              <span>K-12 to University</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Isolation Section */}
      <section className="security-section">
        <div className="container">
          <div className="security-showcase-card">
            <div className="security-badge">
              <i className="fas fa-shield-alt"></i> MILITARY-GRADE ISOLATION
            </div>
            <h2>Your Data. Strictly Isolated.</h2>
            <p className="security-desc">
              We implement strict multi-tenant vaulting. No matter what, your institution's data—grades, financial records, research, and personal information—remains exclusively in your school's private domain. Cross-school data leakage is technically impossible.
            </p>
            <div className="security-pillars-grid">
              <div className="security-pillar-item">
                <div className="pillar-icon-wrap">
                  <i className="fas fa-database"></i>
                </div>
                <h3>Cryptographic Separation</h3>
                <p>Every institution resides in an isolated schema partition with zero shared data memory across tenants.</p>
              </div>
              <div className="security-pillar-item">
                <div className="pillar-icon-wrap">
                  <i className="fas fa-lock"></i>
                </div>
                <h3>Strict RBAC Guardrails</h3>
                <p>Fine-grained permissions prevent unauthorized role elevation across academic and administrative hierarchies.</p>
              </div>
              <div className="security-pillar-item">
                <div className="pillar-icon-wrap">
                  <i className="fas fa-history"></i>
                </div>
                <h3>Immutable Audit Vault</h3>
                <p>Cryptographically hashed audit logs chronicle every mark entry, fee disbursement, and administrative action.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section className="portals-section" id="portals">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <i className="fas fa-cubes"></i> Unified Ecosystem
            </div>
            <h2>One Platform, 10+ Integrated Roles</h2>
            <p>Adaptive role-based access control (RBAC) designed for complex institutional hierarchies.</p>
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
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-header">
            <div className="section-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <i className="fas fa-tag"></i> Flat Transparent Rate
            </div>
            <h2>$2 Per Student / Month</h2>
            <p>
              Every portal, every feature, and automated compliance included. Billed solely on enrolled active students.
            </p>
            <div style={{ marginTop: '24px' }}>
              <Link to="/pricing" className="btn-hero-primary" style={{ display: 'inline-flex' }}>
                <span>Interactive Pricing Calculator</span> <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
              </Link>
            </div>
          </div>
          <div className="pricing-grid">
            {DEFAULT_PLANS.map(plan => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}

function PortalCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="portal-card">
      <div className="portal-icon-box">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function PricingCard({ plan }: { plan: Tier }) {
  const isPro = plan.id === 2;
  const DISPLAY_MAX = 6;
  const shown = plan.features.slice(0, DISPLAY_MAX);
  const extra = plan.features.length - DISPLAY_MAX;

  return (
    <div className={`pricing-card ${isPro ? 'premium' : ''}`} style={{ borderTop: `4px solid ${plan.color}` }}>
      {isPro && <div className="pricing-badge">Most Popular</div>}
      <h4 style={{ color: plan.color }}>{plan.name}</h4>
      <div className="price">
        {plan.price}<span>{plan.billingLabel}</span>
      </div>
      <p className="pricing-tagline">{plan.tagline}</p>
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
        style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: 'auto' }}
      >
        Start Free Trial
      </Link>
    </div>
  );
}
