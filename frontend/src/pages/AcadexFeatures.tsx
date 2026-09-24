import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/layout/MarketingNav';
import MarketingFooter from '../components/layout/MarketingFooter';
import '../styles/landing.css';

const PORTAL_FEATURES = [
  {
    id: 'admin',
    title: 'School Administration & Governance',
    icon: '🏛️',
    badge: 'Central Command',
    description: 'Comprehensive administrative orchestration from admission processing to automated board reports.',
    highlights: [
      'Multi-stream student admissions & automated registration workflows',
      'Role-based access control (RBAC) across 10+ distinct staff and student roles',
      'Configurable institutional parameters, academic terms, and multi-currency ledgers',
      'Staff work scheduling, biometric clock-in logs, and human resource management',
      'Automated document generation for official transcripts, ID cards, and report cards',
      'Campus broadcast and emergency announcements with cross-portal targeting'
    ]
  },
  {
    id: 'academics',
    title: 'Academics, Syllabus & Research',
    icon: '👩‍🏫',
    badge: 'Curriculum & Higher Ed',
    description: 'Unified academic engine supporting primary schools up through postgraduate research universities.',
    highlights: [
      'K-12 syllabus manager & dynamic lesson plan tracking',
      'Postgraduate thesis supervision, multi-supervisor hierarchies & RPG tracking',
      'Clinical ward rotation tracking compliant with Nursing & Medical Councils',
      'Continuous Assessment Learning Activities (CALA) and national exam alignment',
      'Computer-Based Testing (CBT) with auto-grading and anti-cheat timers',
      'Live virtual classrooms powered by Zoom and Jitsi integrations'
    ]
  },
  {
    id: 'finance',
    title: 'Treasury, Bursar & Invoicing',
    icon: '💼',
    badge: 'Financial Engine',
    description: 'Institutional double-entry accounting, automated fee collection, and procurement tracking.',
    highlights: [
      'Student ledger management with real-time balance tracking and invoice generation',
      'Dual-currency support (USD and local currency) with real-time exchange conversion',
      'Full Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses)',
      'Automated bank reconciliation and electronic statement statement matching',
      'Payroll runs with automated statutory deductions, tax tables, and payslips',
      'Procurement tender bidding, supplier management, and purchase order tracking'
    ]
  },
  {
    id: 'health',
    title: 'Campus Health Clinic & Dispensary',
    icon: '🩺',
    badge: 'Healthcare Suite',
    description: 'Full-service infirmary management system designed specifically for campus health centers.',
    highlights: [
      'Electronic Health Records (EHR) with student and staff medical profiles',
      'Triage logging for vital signs (blood pressure, temperature, pulse, SpO2)',
      'WHO ICD-10 standardized disease coding and diagnostic categorization',
      'Campus pharmacy inventory tracking with low-stock alerts and dispensing logs',
      'Ward hospitalization manager for bed assignments and admission monitoring',
      'Automated health incident escalation and emergency ambulance dispatch logs'
    ]
  },
  {
    id: 'ancillary',
    title: 'Ancillary & Campus Operations',
    icon: '🛠️',
    badge: 'Facilities & Logistics',
    description: 'Total operational coverage for boarding, transport, dining hall, tuckshop, and campus farms.',
    highlights: [
      'Hostel room allocation, bed inventories, and exeat/boarding gate pass logs',
      'School bus transport routing, vehicle telemetry, and student route assignments',
      'Dining hall weekly meal planning, nutritional logs, and store consumption',
      'Campus tuckshop Point-of-Sale (POS) with student cashless wallet integration',
      'Institutional farm management: crop growth cycles, livestock batches, and yields',
      'Visitor registration, security incident logging, and lost-and-found tracking'
    ]
  },
  {
    id: 'student_parent',
    title: 'Student & Guardian Experience',
    icon: '🎒',
    badge: 'Community Portals',
    description: 'Self-service digital touchpoints empowering students to learn and parents to stay engaged.',
    highlights: [
      'Student academic dashboard: real-time grade books, assignments, and timetables',
      'Digital library repository with e-books, past papers, and loan history',
      'Parent portal with multi-child switching, fee statements, and teacher messaging',
      'Google Gemini AI Santa: 24/7 multilingual conversational tutor and guide',
      'Extracurricular tracking: sports team rosters, fixture results, and club memberships',
      'Alumni networking directory and career tracking registry'
    ]
  }
];

export default function AcadexFeatures() {
  const [activeTab, setActiveTab] = useState(PORTAL_FEATURES[0].id);
  const selectedFeature = PORTAL_FEATURES.find(f => f.id === activeTab) || PORTAL_FEATURES[0];

  return (
    <div className="acadex-landing">
      <MarketingNav />

      {/* Hero Section */}
      <section className="hero-section container" style={{ paddingTop: '120px', paddingBottom: '60px', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', padding: '8px 20px', background: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>
            <i className="fas fa-cubes mr-2" style={{ marginRight: '8px' }}></i> Comprehensive Feature Blueprint
          </div>
          <h1 style={{ fontSize: '3.8rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '25px' }}>
            Built for the Most Demanding<br />
            <span style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Educational Institutions.
            </span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', maxWidth: '750px', margin: '0 auto 35px', lineHeight: 1.6 }}>
            Acadex replaces 8+ disjointed software products with a unified, role-based multi-tenant operating system — completely vault-isolated for every school at a predictable <strong>$2 per student per month</strong>.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register/school" className="btn-premium btn-primary-premium" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Start Institutional Onboarding
            </Link>
            <Link to="/pricing" className="btn-premium btn-outline-premium" style={{ padding: '14px 32px', fontSize: '1rem', background: 'rgba(255,255,255,0.03)' }}>
              Explore $2/Student Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Portal Switcher */}
      <section className="container" style={{ padding: '40px 0 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>Role-Engineered Workflows</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>Click a portal below to explore its deep operational capabilities.</p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          {PORTAL_FEATURES.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveTab(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 22px',
                borderRadius: '12px',
                border: activeTab === f.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                background: activeTab === f.id ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeTab === f.id ? '#60a5fa' : '#cbd5e1',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{f.icon}</span>
              <span>{f.title.split('&')[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Showcase Card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <span style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
                {selectedFeature.badge}
              </span>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                {selectedFeature.icon} {selectedFeature.title}
              </h3>
            </div>
            <Link to="/register/school" className="btn-premium btn-primary-premium" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              Deploy this portal
            </Link>
          </div>

          <p style={{ fontSize: '1.15rem', color: 'var(--gray-400)', marginBottom: '32px', lineHeight: 1.6, maxWidth: '800px' }}>
            {selectedFeature.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {selectedFeature.highlights.map((h, i) => (
              <div 
                key={i} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '14px',
                  padding: '18px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', fontSize: '0.8rem' }}>
                  <i className="fas fa-check"></i>
                </div>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 500 }}>
                  {h}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Pillars */}
      <section className="container" style={{ padding: '60px 0 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>Enterprise Foundation</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>Architected for zero failure, strict regulatory compliance, and total institutional control.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '18px' }}>🛡️</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>Zero-Leakage Multi-Tenancy</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Every tenant operates within cryptographically isolated database domains. Cross-school data crossover is architecturally eliminated at the database layer.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '18px' }}>⚡</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>High-Velocity Performance</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Built on Node.js, TypeScript, and optimized PostgreSQL indexes to handle thousands of concurrent attendance marks, exam answers, and fee transactions.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '18px' }}>🤖</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>Google Gemini AI Powered</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Embedded AI Santa assistant supports native multilingual chat in English, Shona, Ndebele, and Swahili to guide students, draft lesson ideas, and summarize notes.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '18px' }}>📊</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>Real Double-Entry Accounting</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Not just a receipt printer. Acadex features a full Chart of Accounts, journal entry balance tracking, trial balances, and exportable financial audits.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(37,99,235,0.08) 100%)', padding: '80px 0 100px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '18px' }}>Transform Your Campus Today</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--gray-400)', marginBottom: '32px' }}>
            Join premier schools and tertiary institutions already running on Acadex for just <strong>$2 per student per month</strong>.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/register/school" className="btn-premium btn-primary-premium" style={{ padding: '14px 36px', fontSize: '1rem' }}>
              Start 30-Day Free Trial
            </Link>
            <Link to="/contact" className="btn-premium btn-outline-premium" style={{ padding: '14px 36px', fontSize: '1rem', background: 'rgba(255,255,255,0.03)' }}>
              Speak with Solutions Team
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
