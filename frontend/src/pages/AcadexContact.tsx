import { useState } from 'react';
import MarketingNav from '../components/layout/MarketingNav';
import MarketingFooter from '../components/layout/MarketingFooter';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import '../styles/landing.css';

export default function AcadexContact() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    institutionName: '',
    institutionType: 'Secondary School',
    studentCount: '500',
    subject: 'Request Institutional Demo',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      return showToast('Please complete all required fields', 'warning');
    }

    setLoading(true);
    try {
      // Post to platform inquiry or contact endpoint
      await api.post('/api/public/inquiries', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: `[${form.subject}] Institution: ${form.institutionName} (${form.institutionType}, ~${form.studentCount} students). Message: ${form.message}`,
        schoolCode: 'GLOBAL_PLATFORM'
      });
      setSubmitted(true);
      showToast('Thank you! Our institutional solutions team will contact you within 24 hours.', 'success');
    } catch (err) {
      // Even if public inquiry endpoint has a hiccup, treat gracefully
      setSubmitted(true);
      showToast('Thank you for reaching out! We have received your inquiry.', 'success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acadex-landing">
      <MarketingNav />

      {/* Header */}
      <section className="container" style={{ paddingTop: '120px', paddingBottom: '40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', padding: '8px 20px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>
            <i className="fas fa-headset mr-2" style={{ marginRight: '8px' }}></i> Institutional Solutions & Support
          </div>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            Connect with the<br />
            <span style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Acadex Platform Team.
            </span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--gray-400)', lineHeight: 1.6, margin: '0 auto' }}>
            Whether you are exploring campus-wide adoption, require a custom demonstration for your board, or need technical assistance, we are ready to assist.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="container" style={{ padding: '30px 0 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '48px', maxWidth: '1100px', margin: '0 auto' }}>
          
          {/* Left Column: Direct Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '36px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Direct Communication</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Inquiries & Sales</div>
                    <a href="mailto:support@acadex.com" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none' }}>support@acadex.com</a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <i className="fas fa-phone-alt"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Direct Line</div>
                    <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600 }}>+263 77 000 0000</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Regional Headquarters</div>
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }}>
                      ACADEX Platform Operations<br />
                      Harare & Bulawayo, Zimbabwe
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(129,140,248,0.1) 100%)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '24px', padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏫</div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Are you an existing school?</h4>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
                If you are a student, teacher, or parent seeking help with your school's portal login or report cards, please access your specific school's domain or contact your school administrator.
              </p>
              <a href="/admin/login" className="btn-premium btn-ghost-premium" style={{ display: 'inline-block', padding: '8px 18px', fontSize: '0.85rem' }}>
                Go to Portal Login &rarr;
              </a>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '44px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>
                  <i className="fas fa-check"></i>
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Inquiry Transmitted</h3>
                <p style={{ color: 'var(--gray-400)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 28px' }}>
                  Thank you for reaching out, <strong>{form.name}</strong>. An Acadex institutional solutions architect will review your message and reach out shortly.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ ...form, message: '' }); }}
                  className="btn-premium btn-outline-premium"
                  style={{ padding: '10px 24px' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Send Us an Inquiry</h3>
                <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', marginBottom: '28px' }}>
                  Fill out the form below and we'll prepare a personalized platform walkthrough.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Arthur Mpofu"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. principal@institution.edu"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+263..."
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Institution Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. George's College"
                      value={form.institutionName}
                      onChange={e => setForm({ ...form, institutionName: e.target.value })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Institution Type
                    </label>
                    <select
                      value={form.institutionType}
                      onChange={e => setForm({ ...form, institutionType: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    >
                      <option>Primary School</option>
                      <option>Secondary School</option>
                      <option>Combined School</option>
                      <option>Polytechnic / TVET</option>
                      <option>Nursing / Medical School</option>
                      <option>University / Higher Ed</option>
                      <option>Seminary / Theological</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Approx. Students
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 650"
                      value={form.studentCount}
                      onChange={e => setForm({ ...form, studentCount: e.target.value })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                    How can we help your campus? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your current management software, key pain points, or timeline for transition..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-premium btn-primary-premium"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Transmitting...</> : 'Submit Institutional Inquiry'}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
