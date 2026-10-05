import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';

export default function TermsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({
    schoolName: 'Our Educational Institution',
    email: 'info@school.edu',
    phone: '+263 242 000000',
    address: 'School Administration Office',
    termsOverride: ''
  });

  useEffect(() => {
    api.get('/api/schools/settings')
      .then(res => {
        if (res.data) {
          setSettings((prev: any) => ({
            ...prev,
            ...res.data,
            schoolName: res.data.schoolName || res.data.name || prev.schoolName,
            termsOverride: res.data.termsOverride || res.data.communication?.termsOverride || ''
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '860px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        padding: '48px 40px'
      }}>
        {/* Navigation & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to="/privacy-policy"
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Privacy Policy
            </Link>
            <button
              onClick={() => window.print()}
              style={{
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#475569',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-print"></i> Print
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Institutional Regulations
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
            Terms of Service & Admissions
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Governing Institution: <strong>{settings.schoolName}</strong>
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin"></i> Loading terms details...
          </div>
        ) : settings.termsOverride ? (
          <div style={{ lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
            {settings.termsOverride}
          </div>
        ) : (
          <div style={{ lineHeight: 1.7, fontSize: '0.95rem', color: '#334155' }}>
            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                1. Acceptance of Terms
              </h2>
              <p>
                By enrolling as a learner, registering an account on this portal, submitting an application for admission, or making payments to <strong>{settings.schoolName}</strong>, parents, legal guardians, students, and staff agree unconditionally to comply with these Terms and the Institution&rsquo;s codified code of conduct.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                2. User Account Security and Portal Credentials
              </h2>
              <p>
                Each registered user is assigned specific role credentials (Student, Parent, Teacher, Bursar, Administrator). Users are strictly prohibited from sharing login credentials, attempting to bypass role permissions, or accessing student dossiers without authorization. Any fraudulent activity or credential compromise will result in immediate suspension and disciplinary action.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                3. Admissions, Applications & Document Authenticity
              </h2>
              <p>
                All documents submitted during application (birth certificates, prior academic reports, national examination certificates, and medical records) must be genuine. Submission of forged, altered, or misleading academic certificates results in automatic nullification of admission without reimbursement of application fees.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                4. School Fees, Invoicing & Financial Settlement
              </h2>
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Due Dates:</strong> School fees and levies are due on or before the first day of each academic term, unless a formally approved payment plan has been executed with the Bursar&rsquo;s office.</li>
                <li><strong>Multi-Currency Settlement:</strong> Fees may be settled in approved currencies (USD Nostro, ZiG, electronic funds transfer) according to current statutory bank guidelines.</li>
                <li><strong>Ledgers and Clearance:</strong> Term reports, examination certificates, and official transcripts will only be issued upon complete financial clearance.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                5. Code of Conduct & Academic Integrity
              </h2>
              <p>
                Learners must uphold the highest standards of behavioral and academic integrity. Bullying, cyberbullying, examination malpractice, vandalism of campus assets, or substance abuse will result in hearing before the School Disciplinary Committee (SDC) or Board of Governors, with penalties up to expulsion.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                6. Amendments and Governing Jurisdiction
              </h2>
              <p>
                The Institution reserves the right to amend school rules, schedules, and fee structures in accordance with statutory approvals from the Ministry of Education. These terms are governed by national law and institutional statutes.
              </p>
            </section>
          </div>
        )}

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '36px', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>&copy; {new Date().getFullYear()} {settings.schoolName}. All rights reserved.</div>
          <div>EduPortal Terms & Compliance System</div>
        </div>
      </div>
    </div>
  );
}
