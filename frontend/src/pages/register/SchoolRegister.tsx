import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/landing.css'; // Reuse landing styles for premium feel

const SCHOOL_TYPES = [
  { id: 'primary', label: 'Primary School', icon: '🏫' },
  { id: 'secondary', label: 'Secondary School', icon: '🎓' },
  { id: 'college', label: 'College / Tertiary', icon: '🏛️' },
  { id: 'private-day', label: 'Private Day School', icon: '⭐' },
  { id: 'private-boarding', label: 'Private Boarding', icon: '🔒' },
  { id: 'public-day', label: 'Public Day School', icon: '🌍' },
  { id: 'public-boarding', label: 'Public Boarding', icon: '🌿' },
  { id: 'combined', label: 'Combined School', icon: '📚' },
  { id: 'polytechnic', label: 'Polytechnic / TVET', icon: '🛠️' },
  { id: 'university', label: 'University / Tertiary', icon: '🎓' },
  { id: 'nursing', label: 'Nursing / Medical School', icon: '🩺' },
  { id: 'seminary', label: 'Seminary / Theological', icon: '📜' },
];

const COMBINED_LEVELS = [
  { id: 'PRE_SCHOOL', label: 'Pre-school / Creche', icon: '🧸' },
  { id: 'PRIMARY', label: 'Primary School', icon: '🖍️' },
  { id: 'SECONDARY', label: 'Secondary School', icon: '📖' },
  { id: 'HIGH_SCHOOL', label: 'High School', icon: '🎓' },
  { id: 'TERTIARY', label: 'Tertiary / Vocational', icon: '🛠️' },
];

const PLANS = [
  { id: 'Starter', name: 'Starter', price: 49, students: '≤200', desc: 'Academic Basics for schools.' },
  { id: 'Professional', name: 'Professional', price: 149, students: '≤800', popular: true, desc: 'Advanced Portals & Management.' },
  { id: 'Enterprise', name: 'Enterprise', price: 999, students: 'Unlimited', desc: 'University & Research Grade.' },
];

export default function SchoolRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');

  // Pre-select plan from URL
  const queryParams = new URLSearchParams(location.search);
  const initialPlan = queryParams.get('plan');
  const matchedPlan = PLANS.find(p => p.id.toLowerCase() === initialPlan?.toLowerCase());

  const [formData, setFormData] = useState({
    schoolName: '',
    type: '',
    isCombined: false,
    levels: [] as string[],
    country: '',
    studentCount: '',
    address: '',
    phone: '',
    website: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    planName: matchedPlan ? matchedPlan.id : 'Professional',
    branding: {
      primaryColor: '#1a1a2e',
      accentColor: '#2563eb',
      logo: '',
    }
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent as keyof typeof prev] as any, [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleLevel = (levelId: string) => {
    setFormData(prev => {
      const levels = prev.levels.includes(levelId)
        ? prev.levels.filter(l => l !== levelId)
        : [...prev.levels, levelId];
      return { ...prev, levels };
    });
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return showToast('Logo must be under 2MB', 'error');
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          branding: { ...prev.branding, logo: event.target?.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.schoolName || !formData.type || !formData.country || !formData.studentCount) {
        showToast('Please fill all required fields', 'warning');
        return false;
      }
      if (formData.type === 'combined' && formData.levels.length === 0) {
        showToast('Please select at least one level for your combined school', 'warning');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
        showToast('Please provide admin details', 'warning');
        return false;
      }
      if (formData.adminPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'warning');
        return false;
      }
      if (formData.adminPassword !== formData.adminPasswordConfirm) {
        showToast('Passwords do not match', 'error');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.schoolName,
        adminName: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        planName: formData.planName,
        type: formData.type,
        isCombined: formData.type === 'combined',
        levels: formData.levels,
        address: formData.address,
        country: formData.country,
        phone: formData.phone,
        website: formData.website,
        branding: formData.branding,
        studentCount: formData.studentCount
      };
      const { data } = await api.post('/api/auth/register', payload);
      setSchoolCode(data.schoolCode);
      setStep(5);
      showToast('School registered successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acadex-landing" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mini Nav */}
      <nav className="landing-nav container" style={{ position: 'relative', background: 'transparent', border: 'none' }}>
        <div className="logo cursor-pointer" onClick={() => navigate('/')}>
          ACAD<span>EX</span>
        </div>
        <div className="cta" style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>
          Step {step} of 4
        </div>
      </nav>

      <div className="container" style={{ flex: 1, display: 'grid', gridTemplateColumns: step < 5 ? '1.2fr 0.8fr' : '1fr', gap: '3rem', paddingBottom: '4rem' }}>
        {/* Left Side: Form Content */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
          
          {step < 5 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ height: '100%', background: 'var(--blue)', width: `${(step / 4) * 100}%`, transition: 'width 0.4s' }} />
            </div>
          )}

          {step === 1 && (
            <div className="animate-in">
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>School Information</h2>
              <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Tell us about the institution you're building.</p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>School Name *</label>
                <input 
                  type="text" name="schoolName" value={formData.schoolName} onChange={handleInputChange}
                  placeholder="e.g. Sunrise Academy"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>School Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {SCHOOL_TYPES.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setFormData(p => ({ ...p, type: t.id }))}
                      style={{ 
                        padding: '12px', borderRadius: '12px', border: '1px solid', 
                        borderColor: formData.type === t.id ? 'var(--blue)' : 'var(--glass-border)',
                        background: formData.type === t.id ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
                      }}
                    >
                      <span>{t.icon}</span> {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {formData.type === 'combined' && (
                <div className="animate-in" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <label style={{ color: 'white', marginBottom: '12px', display: 'block', fontWeight: 600 }}>Select Levels Included *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {COMBINED_LEVELS.map(l => (
                      <div 
                        key={l.id}
                        onClick={() => toggleLevel(l.id)}
                        style={{ 
                          padding: '10px', borderRadius: '10px', border: '1px solid',
                          borderColor: formData.levels.includes(l.id) ? 'var(--blue)' : 'transparent',
                          background: formData.levels.includes(l.id) ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.05)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'
                        }}
                      >
                        <span>{formData.levels.includes(l.id) ? '✅' : l.icon}</span> {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Country *</label>
                  <select 
                    name="country" value={formData.country} onChange={handleInputChange}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                  >
                    <option value="">Select country</option>
                    <option>Zimbabwe</option><option>South Africa</option><option>Zambia</option><option>Botswana</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Estimated Students *</label>
                  <input 
                    type="number" name="studentCount" value={formData.studentCount} onChange={handleInputChange}
                    placeholder="e.g. 500"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                  />
                </div>
              </div>

              {(formData.type === 'university' || formData.type === 'polytechnic') && (
                <div className="animate-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '16px', border: '1px solid var(--blue)' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎓</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>Higher Education Context Detected</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                        Acadex will automatically enable the **Postgraduate Regulation Engine**, **RPG Research Supervision**, and **NUST-Compliant Academic Settings** for your institution.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'nursing' && (
                <div className="animate-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '16px', border: '1px solid #34d399' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🩺</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '4px', color: 'white' }}>Nursing & Medical School Context</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                        ENABLING: **Clinical Rotation Tracking**, **Ward Performance Assessments**, and **Nursing Council Regulatory Reporting** modules for your medical training center.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'seminary' && (
                <div className="animate-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '16px', border: '1px solid #d97706' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📜</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '4px', color: 'white' }}>Seminary & Theological Context</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                        ENABLING: **Theological Curriculum Support**, **Spiritual Growth Tracking**, and **Ecclesiastical Regulatory Compliance** modules for your seminary.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="hero-btns" style={{ marginTop: '2rem' }}>
                <button onClick={nextStep} className="btn-premium btn-primary-premium" style={{ width: '100%' }}>Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in">
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Administrator Account</h2>
              <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Create the primary login for your school's management.</p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Admin Full Name *</label>
                <input 
                  type="text" name="adminName" value={formData.adminName} onChange={handleInputChange}
                  placeholder="e.g. Dr. John Doe"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Admin Email Address *</label>
                <input 
                  type="email" name="adminEmail" value={formData.adminEmail} onChange={handleInputChange}
                  placeholder="admin@yourschool.com"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Password *</label>
                  <input 
                    type="password" name="adminPassword" value={formData.adminPassword} onChange={handleInputChange}
                    placeholder="••••••••"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Confirm Password *</label>
                  <input 
                    type="password" name="adminPasswordConfirm" value={formData.adminPasswordConfirm} onChange={handleInputChange}
                    placeholder="••••••••"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '12px', borderRadius: '12px', width: '100%' }}
                  />
                </div>
              </div>

              <div className="hero-btns" style={{ marginTop: '2.5rem' }}>
                <button onClick={prevStep} className="btn-premium btn-outline-premium">← Back</button>
                <button onClick={nextStep} className="btn-premium btn-primary-premium" style={{ flex: 1 }}>Next Step →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in">
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Choose Your Plan</h2>
              <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>All plans include a 30-day free trial. No credit card required.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {PLANS.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setFormData(prev => ({ ...prev, planName: p.id }))}
                    style={{ 
                      padding: '1.5rem', borderRadius: '16px', border: '2px solid', 
                      borderColor: formData.planName === p.id ? 'var(--blue)' : 'var(--glass-border)',
                      background: formData.planName === p.id ? 'rgba(37, 99, 235, 0.05)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                        {p.name} {p.popular && <span style={{ fontSize: '0.7rem', background: 'var(--blue)', padding: '2px 8px', borderRadius: '99px',marginLeft: '10px' }}>POPULAR</span>}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>{p.students} students included</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.5rem' }}>${p.price}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>per month</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hero-btns" style={{ marginTop: '2.5rem' }}>
                <button onClick={prevStep} className="btn-premium btn-outline-premium">← Back</button>
                <button onClick={nextStep} className="btn-premium btn-primary-premium" style={{ flex: 1 }}>Next Step →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in">
              <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>School Branding</h2>
              <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Personalize your portals. These colors will apply to every page of your system.</p>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ color: 'white', marginBottom: '12px', display: 'block' }}>School Logo</label>
                <div 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  style={{ 
                    border: '2px dashed var(--glass-border)', borderRadius: '16px', 
                    padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--blue)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <input type="file" id="logo-upload" hidden onChange={handleLogoUpload} accept="image/*" />
                  {formData.branding.logo ? (
                    <img src={formData.branding.logo} alt="Logo Preview" style={{ maxHeight: '80px', margin: '0 auto' }} />
                  ) : (
                    <div>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📸</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--gray-400)' }}>Click to upload PNG or JPG (Max 2MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Primary Brand Colour</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: formData.branding.primaryColor, border: '1px solid var(--glass-border)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                      <input 
                        type="color" name="branding.primaryColor" value={formData.branding.primaryColor} onChange={handleInputChange}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', cursor: 'pointer', border: 'none' }}
                      />
                    </div>
                    <input 
                      type="text" name="branding.primaryColor" value={formData.branding.primaryColor} onChange={handleInputChange}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px 12px', borderRadius: '10px', width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ color: 'white', marginBottom: '8px', display: 'block' }}>Accent / Action Colour</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: formData.branding.accentColor, border: '1px solid var(--glass-border)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                      <input 
                        type="color" name="branding.accentColor" value={formData.branding.accentColor} onChange={handleInputChange}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', cursor: 'pointer', border: 'none' }}
                      />
                    </div>
                    <input 
                      type="text" name="branding.accentColor" value={formData.branding.accentColor} onChange={handleInputChange}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px 12px', borderRadius: '10px', width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              <div className="hero-btns" style={{ marginTop: '3rem' }}>
                <button onClick={prevStep} className="btn-premium btn-outline-premium">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-premium btn-primary-premium" style={{ flex: 1, position: 'relative' }}>
                  {loading ? '🚀 Creating School...' : '🚀 Launch My School →'}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '100px', height: '100px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '3rem' }}>
                🎉
              </div>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Registration Complete!</h2>
              <p style={{ color: 'var(--gray-400)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
                Welcome to the ACADEX platform. Your school is live and ready for setup.
              </p>

              <div style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid var(--blue)', borderRadius: '20px', padding: '2.5rem', marginBottom: '2.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>Your Unique School Access Code</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', letterSpacing: '4px', fontFamily: 'monospace' }}>{schoolCode}</div>
                <p style={{ marginTop: '1.5rem', color: 'var(--gray-400)', fontSize: '0.9rem' }}>Give this code to your staff and students. It is required for their portal registrations.</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={() => navigate('/admin/login')} className="btn-premium btn-primary-premium">Go to Admin Login →</button>
                <button onClick={() => { navigator.clipboard.writeText(schoolCode); showToast('Code copied!', 'success'); }} className="btn-premium btn-outline-premium">Copy Access Code</button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Sticky Preview (Visible during step 4) */}
        {step < 5 && (
          <div style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
            <div style={{ position: 'relative', background: '#0a0a0a', borderRadius: '24px', border: '1px solid var(--glass-border)', aspectRatio: '16/11', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              {/* Fake Portal Header */}
              <div style={{ 
                height: '50px', 
                background: step === 4 ? formData.branding.primaryColor : '#1a1a2e', 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                display: 'flex', alignItems: 'center', padding: '0 15px', gap: '10px', transition: 'all 0.4s' 
              }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'white', overflow: 'hidden' }}>
                  {formData.branding.logo ? <img src={formData.branding.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '12px', display: 'flex', justifyContent: 'center' }}>🏫</span>}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>{formData.schoolName || 'Your School'}</div>
                <div style={{ flex: 1 }} />
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              </div>

              {/* Fake Portal Body */}
              <div style={{ display: 'flex', height: 'calc(100% - 50px)' }}>
                {/* Fake Sidebar */}
                <div style={{ 
                  width: '60px', 
                  background: step === 4 ? formData.branding.primaryColor : '#1a1a2e', 
                  borderRight: '1px solid rgba(255,255,255,0.05)', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', gap: '20px', transition: 'all 0.4s' 
                }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: step === 4 ? `rgba(${hexToRgb(formData.branding.accentColor)}, 0.2)` : 'rgba(255,255,255,0.1)' }} />
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }} />
                </div>
                {/* Fake Content Area */}
                <div style={{ flex: 1, background: '#f8fafc', padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ background: 'white', height: '60px', borderRadius: '12px', border: '1px solid #edf2f7' }} />
                    <div style={{ background: 'white', height: '60px', borderRadius: '12px', border: '1px solid #edf2f7' }} />
                  </div>
                  <div style={{ background: 'white', height: '100px', borderRadius: '12px', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '8px 16px', borderRadius: '8px', background: step === 4 ? formData.branding.accentColor : 'var(--blue)', color: 'white', fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.4s' }}>
                      Register Student
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlay with Step Context */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'flex-end', padding: '2rem' }}>
                <div>
                  <div style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Portal Live Preview</div>
                  <div style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                    {step === 4 ? "Applying your brand colors..." : "Visualize your school's unique portal."}
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit Bullets (Below Preview) */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                <span style={{ color: '#34d399' }}>✓</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Enterprise-grade security by default.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                <span style={{ color: '#34d399' }}>✓</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Isolated data storage for your school.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: '#34d399' }}>✓</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Instant access to all 10 role-based portals.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to convert hex to rgb for rgba usage in preview
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
