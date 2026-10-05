import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';

export default function PrivacyPolicyPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({
    schoolName: 'Our Educational Institution',
    email: 'info@school.edu',
    phone: '+263 242 000000',
    address: 'School Administration Office',
    dpoName: 'Data Protection Officer',
    dpoEmail: 'dpo@school.edu',
    dpoPhone: '+263 242 000000',
    privacyPolicyOverride: ''
  });

  useEffect(() => {
    api.get('/api/schools/settings')
      .then(res => {
        if (res.data) {
          setSettings((prev: any) => ({
            ...prev,
            ...res.data,
            schoolName: res.data.schoolName || res.data.name || prev.schoolName,
            dpoName: res.data.dpoName || res.data.communication?.dpoName || prev.dpoName,
            dpoEmail: res.data.dpoEmail || res.data.communication?.dpoEmail || prev.dpoEmail,
            dpoPhone: res.data.dpoPhone || res.data.communication?.dpoPhone || prev.dpoPhone,
            privacyPolicyOverride: res.data.privacyPolicyOverride || res.data.communication?.privacyPolicyOverride || ''
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
              to="/terms"
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Terms of Service
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
            Compliance & Data Protection
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Last updated: October 2026 | Governing Entity: <strong>{settings.schoolName}</strong>
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin"></i> Loading policy details...
          </div>
        ) : settings.privacyPolicyOverride ? (
          <div style={{ lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
            {settings.privacyPolicyOverride}
          </div>
        ) : (
          <div style={{ lineHeight: 1.7, fontSize: '0.95rem', color: '#334155' }}>
            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                1. Introduction & Statutory Scope
              </h2>
              <p>
                <strong>{settings.schoolName}</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Institution&rdquo;) is committed to protecting the privacy, confidentiality, and security of personal data collected from students, parents/guardians, faculty, administrative staff, and applicants. This policy complies with applicable Data Protection Acts, statutory educational mandates, and child privacy protection regulations.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                2. Information We Collect
              </h2>
              <p>To administer our educational programmes, maintain institutional records, and ensure campus safety, we collect and process:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Identity & Demographic Information:</strong> Full legal name, date of birth, national ID / birth certificate numbers, gender, nationality, and photographic identification.</li>
                <li><strong>Academic & Performance Data:</strong> Examination results, termly marks, continuous assessments, transcripts, attendance registers, and disciplinary records.</li>
                <li><strong>Financial & Billing Information:</strong> Fee schedules, invoices, bank transfers, payment receipts, scholarship grants, and pocket-money wallet ledger balances.</li>
                <li><strong>Health & Medical Records:</strong> Clinic visit logs, emergency medical contacts, known allergies, immunization history, and infirmary prescriptions.</li>
                <li><strong>Digital Usage Logs:</strong> Portal authentication timestamps, IP addresses, audit trail entries, and system interaction logs.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                3. Lawful Basis and Purpose of Processing
              </h2>
              <p>We process personal information under the following legal bases:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Educational Contract & Enrollment:</strong> Providing pedagogical instruction, conducting evaluations, and issuing accredited certificates.</li>
                <li><strong>Legal & Regulatory Mandates:</strong> Submitting statutory returns to the Ministry of Primary and Secondary Education / Higher Education, tax authorities (ZIMRA), and national examination boards (ZIMSEC, Cambridge).</li>
                <li><strong>Vital Interests & Campus Safety:</strong> Protecting the physical well-being of learners in classrooms, boarding dormitories, sick bays, and sporting events.</li>
                <li><strong>Legitimate Institutional Interests:</strong> Operational management, library loans, uniform stores, and automated parent communication.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                4. Data Retention and Security Architecture
              </h2>
              <p>
                All student academic records are maintained in tenant-scoped, encrypted database systems protected by role-based access control (RBAC). Cumulative academic files are retained permanently in compliance with national archive standards, while temporary transactional records (such as daily tuckshop receipts) are archived according to national accounting standards (minimum 7 years).
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                5. Rights of Data Subjects
              </h2>
              <p>
                Parents, legal guardians, and adult learners hold statutory rights under data protection laws, including the right to request access to their academic dossier, rectify incorrect demographic records, request data portability, and lodge inquiries regarding automated processing.
              </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                6. Data Protection Officer (DPO) Contact
              </h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal records, contact our designated Data Protection Officer:
              </p>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', marginTop: '12px' }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{settings.dpoName}</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                  <i className="fas fa-envelope" style={{ marginRight: '8px', width: '16px' }}></i>
                  <a href={`mailto:${settings.dpoEmail}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{settings.dpoEmail}</a>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                  <i className="fas fa-phone" style={{ marginRight: '8px', width: '16px' }}></i>
                  <span>{settings.dpoPhone}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                  <i className="fas fa-building" style={{ marginRight: '8px', width: '16px' }}></i>
                  <span>{settings.schoolName} &bull; {settings.address}</span>
                </div>
              </div>
            </section>
          </div>
        )}

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '36px', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>&copy; {new Date().getFullYear()} {settings.schoolName}. All rights reserved.</div>
          <div>Protected by EduPortal Institutional Compliance Engine</div>
        </div>
      </div>
    </div>
  );
}
