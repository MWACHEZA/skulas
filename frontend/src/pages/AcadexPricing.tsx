import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/layout/MarketingNav';
import MarketingFooter from '../components/layout/MarketingFooter';
import '../styles/landing.css';

export const PLATFORM_STUDENT_MONTHLY_RATE = 2.0;
export const PLATFORM_STUDENT_ANNUAL_RATE = 20.0; // 17% discount when billed annually

export default function AcadexPricing() {
  const [studentCount, setStudentCount] = useState<number>(450);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const monthlyTotal = studentCount * PLATFORM_STUDENT_MONTHLY_RATE;
  const annualTotal = studentCount * PLATFORM_STUDENT_ANNUAL_RATE;
  const displayTotal = billingCycle === 'monthly' ? monthlyTotal : annualTotal;
  const effectiveMonthly = billingCycle === 'annual' ? Math.round(annualTotal / 12) : monthlyTotal;

  const faqs = [
    {
      q: 'How is student count calculated for billing?',
      a: 'Billing is strictly based on currently active, enrolled students. Graduated alumni, withdrawn students, and prospective applicants are never counted toward your billable total.'
    },
    {
      q: 'Do teachers, parents, or ancillary staff cost extra?',
      a: 'No! All teacher accounts, parent logins, clinic nurses, bursars, librarians, suppliers, and administrative staff accounts are 100% free and unlimited.'
    },
    {
      q: 'Are all 10+ portals included in the $2/student rate?',
      a: 'Yes. There are zero modular paywalls. Your school gets full access to the School Admin, Teacher, Student, Parent, Clinic, Bursar, Library, Hostel/Ancillary, and AI Santa assistant.'
    },
    {
      q: 'Is there a free trial period?',
      a: 'Every newly registered school receives a full 30-day trial with all features enabled so your leadership team can configure timetables, import students, and review the platform risk-free.'
    },
    {
      q: 'What payment methods does Acadex accept?',
      a: 'We accept direct bank transfers, RTGS/Ecocash, USD electronic wire, Visa/Mastercard credit and debit cards, and institutional purchase orders.'
    }
  ];

  return (
    <div className="acadex-landing">
      <MarketingNav />

      {/* Header */}
      <section className="container" style={{ paddingTop: '120px', paddingBottom: '40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', padding: '8px 20px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>
            <i className="fas fa-tag mr-2" style={{ marginRight: '8px' }}></i> Flat Per-Student SaaS Model
          </div>
          <h1 style={{ fontSize: '3.8rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            Simple, Transparent Pricing.<br />
            <span style={{ background: 'linear-gradient(90deg, #34d399, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              $2 per student per month.
            </span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', lineHeight: 1.6, maxWidth: '720px', margin: '0 auto 30px' }}>
            No hidden setup fees. No modular upsells. Complete access to all 10+ specialized portals, cloud backups, and AI Santa for your entire school.
          </p>

          {/* Billing Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: billingCycle === 'monthly' ? '#2563eb' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Monthly Billing ($2/mo)
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: billingCycle === 'annual' ? '#2563eb' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Annual Billing</span>
              <span style={{ background: '#34d399', color: '#064e3b', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>SAVE 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section className="container" style={{ padding: '30px 0 70px' }}>
        <div style={{
          maxWidth: '960px',
          margin: '0 auto',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '28px',
          padding: '48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center' }}>
            
            {/* Left: Interactive Controls */}
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
                Estimate Your Campus Subscription
              </h3>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.95rem', marginBottom: '28px' }}>
                Adjust the slider or enter your school's current active student enrollment count.
              </p>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Enrolled Students
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      step={10}
                      value={studentCount}
                      onChange={(e) => setStudentCount(Math.max(1, parseInt(e.target.value) || 0))}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid #3b82f6',
                        borderRadius: '10px',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        width: '110px',
                        padding: '6px 12px',
                        textAlign: 'right'
                      }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>students</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={20}
                  max={2500}
                  step={10}
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #3b82f6, #34d399)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  {[150, 350, 600, 1200, 2000].map(val => (
                    <button
                      key={val}
                      onClick={() => setStudentCount(val)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: studentCount === val ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                        background: studentCount === val ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                        color: studentCount === val ? '#60a5fa' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {val} students
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate Guarantee */}
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ fontSize: '1.6rem', color: '#60a5fa' }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#e2e8f0' }}>Zero Price Creep Guarantee</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Your $2.00/student rate remains locked throughout your institutional agreement.</div>
                </div>
              </div>
            </div>

            {/* Right: Calculated Price Summary Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '24px',
              padding: '36px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>
                Estimated Investment
              </span>

              <div style={{ margin: '20px 0 10px' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  ${displayTotal.toLocaleString()}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px' }}>
                  {billingCycle === 'monthly' ? 'billed per month' : `billed annually ($${effectiveMonthly}/mo eq.)`}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', margin: '24px 0', fontSize: '0.88rem', color: '#cbd5e1', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Rate per enrolled student:</span>
                  <strong style={{ color: '#34d399' }}>${billingCycle === 'monthly' ? '2.00' : '1.67'} / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Staff & Teacher accounts:</span>
                  <strong style={{ color: '#38bdf8' }}>Free (Unlimited)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>30-Day Evaluation:</span>
                  <strong style={{ color: '#f59e0b' }}>100% Free</strong>
                </div>
              </div>

              <Link
                to={`/register/school?students=${studentCount}`}
                className="btn-premium btn-primary-premium"
                style={{ display: 'block', width: '100%', padding: '14px', fontSize: '1rem', textAlign: 'center', boxSizing: 'border-box' }}
              >
                Start Free Institutional Trial
              </Link>
              <div style={{ marginTop: '12px', color: '#64748b', fontSize: '0.78rem' }}>
                No credit card required to begin setup.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* What is Included Checklist */}
      <section className="container" style={{ padding: '40px 0 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>
            Everything Included at $2/Student
          </h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>
            No tiered limitations. No missing features. Your campus gets our entire software portfolio.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {[
            'School Admin Governance Portal',
            'Teacher & Academic Lesson Planner',
            'Student Dashboard & Grade Book',
            'Parent & Guardian Mobile Access',
            'Bursar Double-Entry General Ledger',
            'Automated Fee Billing & Invoicing',
            'Full Campus Health Clinic & EHR',
            'Pharmacy & Dispensary Inventory',
            'Digital Library & Loan Tracker',
            'Hostel & Boarding Room Allocator',
            'School Bus Transport Fleet Routing',
            'Dining Hall & Tuckshop POS',
            'Campus Farm & Livestock Management',
            'Google Gemini Multilingual AI Santa',
            'Zoom & Jitsi Live Virtual Classes',
            'CBT Online Exams & Auto-Marking',
            'Daily Automated Cloud Backups',
            'Priority 24/7 Support SLA'
          ].map((feat, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.92rem',
                color: '#e2e8f0',
                fontWeight: 600
              }}
            >
              <i className="fas fa-check-circle" style={{ color: '#34d399', fontSize: '1rem', flexShrink: 0 }}></i>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="container" style={{ padding: '40px 0 100px', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>
            Billing & Scaling FAQs
          </h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>
            Common questions regarding our per-student licensing model.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '24px'
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '10px', color: '#60a5fa' }}>
                {faq.q}
              </h3>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
