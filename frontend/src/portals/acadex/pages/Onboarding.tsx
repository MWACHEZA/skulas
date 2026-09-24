import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

const SCHOOL_TYPES = [
  { id: 'primary', label: 'Primary School', icon: '🏫' },
  { id: 'secondary', label: 'Secondary School', icon: '🎓' },
  { id: 'college', label: 'College / Tertiary', icon: '🏛️' },
  { id: 'combined', label: 'Combined School', icon: '📚' },
  { id: 'polytechnic', label: 'Polytechnic / TVET', icon: '🛠️' },
  { id: 'university', label: 'University', icon: '🎓' },
  { id: 'nursing', label: 'Nursing School', icon: '🩺' },
];

const COMBINED_LEVELS = [
  { id: 'PRE_SCHOOL', label: 'Pre-school / Early Dev' },
  { id: 'PRIMARY', label: 'Primary Level' },
  { id: 'SECONDARY', label: 'Secondary Level' },
  { id: 'HIGH_SCHOOL', label: 'High School / A-Level' },
  { id: 'TERTIARY', label: 'Tertiary / Vocational' },
];

const PLANS = [
  { id: 'Starter', name: 'Starter', desc: 'Core academic management for developing schools.' },
  { id: 'Professional', name: 'Professional', desc: 'Comprehensive multi-portal institutional horsepower.', popular: true },
  { id: 'Enterprise', name: 'Enterprise', desc: 'Full custom academic, hostel, and research suite.' }
];

export default function AcadexProvisioning() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provisionedData, setProvisionedData] = useState<any>(null);

  const [form, setForm] = useState({
    // Step 1: School Profile
    schoolName: '',
    type: 'secondary',
    isCombined: false,
    levels: [] as string[],
    country: 'Zimbabwe',
    studentCount: '250',
    address: '',
    phone: '',
    website: '',

    // Step 2: Administrator Credentials
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',

    // Step 3: Plan & Branding
    planName: 'Professional',
    branding: {
      primaryColor: '#1e293b',
      accentColor: '#38bdf8'
    }
  });

  const toggleLevel = (lvl: string) => {
    setForm(prev => {
      const exists = prev.levels.includes(lvl);
      const nextLevels = exists ? prev.levels.filter(l => l !== lvl) : [...prev.levels, lvl];
      return { ...prev, levels: nextLevels };
    });
  };

  const validateStep = (currentStep: number) => {
    setError('');
    if (currentStep === 1) {
      if (!form.schoolName.trim()) {
        setError('School legal name is required.');
        return false;
      }
      if (!form.type) {
        setError('Please select an institution type.');
        return false;
      }
      if (form.type === 'combined' && form.levels.length === 0) {
        setError('Please select at least one active grade level for combined school.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.adminName.trim() || !form.adminEmail.trim()) {
        setError('Administrator name and official email are required.');
        return false;
      }
      if (!form.adminPassword) {
        setError('Please define an initial administrator password (minimum 8 characters).');
        return false;
      }
      if (form.adminPassword.length < 8) {
        setError('Password must be at least 8 characters long.');
        return false;
      }
      if (form.adminPassword !== form.adminPasswordConfirm) {
        setError('Administrator passwords do not match.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleProvision = async () => {
    setLoading(true);
    setError('');

    const payload = {
      name: form.schoolName.trim(),
      adminName: form.adminName.trim(),
      email: form.adminEmail.trim().toLowerCase(),
      password: form.adminPassword,
      planName: form.planName,
      type: form.type,
      isCombined: form.type === 'combined',
      levels: form.levels,
      address: form.address.trim(),
      country: form.country,
      phone: form.phone.trim(),
      website: form.website.trim(),
      branding: form.branding,
      studentCount: form.studentCount
    };

    try {
      const { data } = await api.post('/api/auth/register', payload);
      setProvisionedData(data);
      setStep(4);
      showToast('School tenant provisioned successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Provisioning failed. Please check parameters.');
      showToast(err.response?.data?.error || 'Failed to provision school', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acadex-provisioning-page">
      <div className="portal-page-header">
        <h1>Manual Tenant Provisioning</h1>
        <p>Deploy a dedicated, isolated school instance configured with administrative credentials and SaaS parameters.</p>
      </div>

      <div className="portal-card" style={{ maxWidth: 840, margin: '0 auto' }}>
        {/* Step Indicator */}
        <div className="portal-card-header" style={{ justifyContent: 'center', borderBottom: '1px solid #e2e8f0', padding: '24px 20px' }}>
          <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            {[
              { num: 1, label: 'Profile' },
              { num: 2, label: 'Admin' },
              { num: 3, label: 'Plan & Branding' },
              { num: 4, label: 'Deployment' },
            ].map(s => (
              <div key={s.num} style={{ textAlign: 'center', opacity: step >= s.num ? 1 : 0.45 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: step >= s.num ? 'var(--portal-primary)' : '#cbd5e0',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    margin: '0 auto 6px',
                    transition: 'all 0.3s'
                  }}
                >
                  {step > s.num ? <i className="fas fa-check"></i> : s.num}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: step >= s.num ? '#1e293b' : '#94a3b8' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 35 }}>
          {error && (
            <div className="portal-alert danger" style={{ marginBottom: 20 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>
              {error}
            </div>
          )}

          {/* STEP 1: SCHOOL PROFILE */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>1. Institution Information</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Enter the primary legal entity details and operational classification.</p>

              <div className="portal-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>School Name *</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. St. George's High School"
                  value={form.schoolName}
                  onChange={e => setForm({ ...form, schoolName: e.target.value })}
                  required
                />
              </div>

              <div className="portal-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Institution Category *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {SCHOOL_TYPES.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      className={`portal-btn-secondary ${form.type === st.id ? 'active' : ''}`}
                      style={{
                        padding: 12,
                        justifyContent: 'flex-start',
                        borderColor: form.type === st.id ? 'var(--portal-primary)' : '#e2e8f0',
                        background: form.type === st.id ? 'rgba(56, 189, 248, 0.08)' : '#fff'
                      }}
                      onClick={() => setForm({ ...form, type: st.id, isCombined: st.id === 'combined' })}
                    >
                      <span style={{ fontSize: '1.1rem', marginRight: 8 }}>{st.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'combined' && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Active Levels in Combined School *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {COMBINED_LEVELS.map(cl => (
                      <label key={cl.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e0' }}>
                        <input
                          type="checkbox"
                          checked={form.levels.includes(cl.id)}
                          onChange={() => toggleLevel(cl.id)}
                        />
                        {cl.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Country *</label>
                  <select
                    className="portal-input"
                    value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value })}
                  >
                    <option>Zimbabwe</option>
                    <option>South Africa</option>
                    <option>Zambia</option>
                    <option>Botswana</option>
                    <option>Kenya</option>
                    <option>Nigeria</option>
                    <option>United Kingdom</option>
                  </select>
                </div>

                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Initial Student Body Size</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. 500"
                    value={form.studentCount}
                    onChange={e => setForm({ ...form, studentCount: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Official Phone</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="+263..."
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Website (Optional)</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="https://..."
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Physical Address</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="Street address, city, province"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div style={{ marginTop: 25, textAlign: 'right' }}>
                <button type="button" className="portal-btn-primary" onClick={handleNext}>
                  Next: Administrator Credentials <i className="fas fa-arrow-right" style={{ marginLeft: 6 }}></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADMINISTRATOR CREDENTIALS */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>2. Primary School Administrator</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Configure the root headmaster or school administrator credentials for this instance.</p>

              <div className="portal-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Full Name *</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. Dr. John Ndlovu"
                  value={form.adminName}
                  onChange={e => setForm({ ...form, adminName: e.target.value })}
                  required
                />
              </div>

              <div className="portal-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Official Email *</label>
                <input
                  type="email"
                  className="portal-input"
                  placeholder="admin@school.com"
                  value={form.adminEmail}
                  onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                  required
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>This email will serve as the primary login identifier.</small>
              </div>

              <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Initial Password *</label>
                  <input
                    type="password"
                    className="portal-input"
                    placeholder="Min 8 characters"
                    value={form.adminPassword}
                    onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm Password *</label>
                  <input
                    type="password"
                    className="portal-input"
                    placeholder="Repeat password"
                    value={form.adminPasswordConfirm}
                    onChange={e => setForm({ ...form, adminPasswordConfirm: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 25, display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="portal-btn-secondary" onClick={handleBack}>
                  <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i> Back
                </button>
                <button type="button" className="portal-btn-primary" onClick={handleNext}>
                  Next: Plan & Custom Branding <i className="fas fa-arrow-right" style={{ marginLeft: 6 }}></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PLAN & BRANDING */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>3. Subscription Plan & Branding</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Select the subscription tier and configure initial institutional branding palette.</p>

              <div className="portal-form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Select SaaS Tier</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
                  {PLANS.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setForm({ ...form, planName: p.id })}
                      style={{
                        border: form.planName === p.id ? '2px solid var(--portal-primary)' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 18,
                        cursor: 'pointer',
                        background: form.planName === p.id ? 'rgba(56, 189, 248, 0.06)' : '#fff',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{p.name}</strong>
                        {p.popular && <span className="portal-badge success">POPULAR</span>}
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--portal-primary)', margin: '8px 0 4px' }}>
                        $2.00 <small style={{ fontSize: '0.8rem', color: '#64748b' }}>/ student / mo</small>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Primary Brand Color</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form.branding.primaryColor}
                      onChange={e => setForm({ ...form, branding: { ...form.branding, primaryColor: e.target.value } })}
                      style={{ width: 45, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="portal-input"
                      value={form.branding.primaryColor}
                      onChange={e => setForm({ ...form, branding: { ...form.branding, primaryColor: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Accent Color</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form.branding.accentColor}
                      onChange={e => setForm({ ...form, branding: { ...form.branding, accentColor: e.target.value } })}
                      style={{ width: 45, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="portal-input"
                      value={form.branding.accentColor}
                      onChange={e => setForm({ ...form, branding: { ...form.branding, accentColor: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 25, display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="portal-btn-secondary" onClick={handleBack} disabled={loading}>
                  <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i> Back
                </button>
                <button type="button" className="portal-btn-primary" onClick={handleProvision} disabled={loading}>
                  {loading ? <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i> : <i className="fas fa-rocket" style={{ marginRight: 6 }}></i>}
                  Deploy Tenant Instance
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS DEPLOYMENT */}
          {step === 4 && provisionedData && (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 20px'
                }}
              >
                <i className="fas fa-check-circle"></i>
              </div>

              <h2 style={{ fontSize: '1.6rem', color: '#1e293b', marginBottom: 8 }}>Tenant Successfully Provisioned!</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 540, margin: '0 auto 25px' }}>
                The school database partitions, administrator accounts, and licensing keys have been deployed to PostgreSQL.
              </p>

              <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0', maxWidth: 480, margin: '0 auto 30px', textAlign: 'left' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>School License Code</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--portal-primary)', fontFamily: 'monospace' }}>
                    {provisionedData.schoolCode}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Administrator Email</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{form.adminEmail}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Active Tier</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{form.planName} Plan ($2.00/student/mo)</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button className="portal-btn-secondary" onClick={() => navigate('/acadex/schools')}>
                  <i className="fas fa-list" style={{ marginRight: 6 }}></i> View in Registry
                </button>
                <button className="portal-btn-primary" onClick={() => navigate(`/acadex/schools/${provisionedData.schoolCode}`)}>
                  <i className="fas fa-external-link-alt" style={{ marginRight: 6 }}></i> Open School Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
