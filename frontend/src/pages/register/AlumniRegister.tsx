import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function AlumniRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/schools')
      .then(r => setSchools(r.data))
      .catch(console.error);

    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData(prev => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
    }
  }, []);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    gradYear: '',
    form: '',
    houseStream: '',
    favoriteSubject: '',
    memorableTeacher: '',
    occupation: '',
    company: '',
    industry: '',
    currentLocation: '',
    bio: '',
    schoolCode: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('Image size exceeds 20MB limit. Please choose a smaller file.', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        return showToast('Complete personal identity first.', 'warning');
      }
    }
    if (step === 4) {
      if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        return showToast('Password must be at least 8 characters long, including uppercase, lowercase, numbers, and symbols.', 'error');
      }
      if (formData.password !== formData.confirmPassword) {
        return showToast('Passwords do not match', 'error');
      }
    }
    setStep(s => s + 1);
  };
  
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        showToast('Password is too weak. Must include uppercase, lowercase, numbers, and symbols.', 'error');
        return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        role: 'ALUMNI',
        phone: formData.phone,
        schoolCode: formData.schoolCode,
        avatar: avatarPreview,
        metadata: {
          gradYear: formData.gradYear,
          form: formData.form,
          houseStream: formData.houseStream,
          favoriteSubject: formData.favoriteSubject,
          memorableTeacher: formData.memorableTeacher,
          occupation: formData.occupation,
          company: formData.company,
          industry: formData.industry,
          currentLocation: formData.currentLocation,
          bio: formData.bio
        }
      };
      await api.post('/api/auth/register-user', payload);
      showToast('Welcome to the Alumni Network! Your record has been created.', 'success');
      navigate('/alumni/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container">
        <div className="register-header" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
          <img src="/images/logo.png" alt="Logo" />
          <h2>Alumni Registration</h2>
          <p>Reconnect with your alma mater and fellow graduates</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}><div className="step-num">1</div><span>Personal</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => step > 1 && setStep(2)}><div className="step-num">2</div><span>School</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`} onClick={() => step > 2 && setStep(3)}><div className="step-num">3</div><span>Career</span></div>
          <div className={`step-item ${step === 4 ? 'active' : ''}`} onClick={() => step > 3 && setStep(4)}><div className="step-num">4</div><span>Account</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-user"></i> Personal Information</div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                  <div className="avatar-preview-wrap" onClick={() => document.getElementById('avatar-input')?.click()}>
                    {avatarPreview ? <img src={avatarPreview} alt="Preview" /> : <i className="fas fa-camera fa-2x" style={{ color: '#cbd5e0' }}></i>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Graduation Photo (Max 20MB)</label>
                    <input type="file" id="avatar-input" accept="image/*" onChange={handleFileChange} style={{ fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                       <option value="">Select...</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Phone Number *</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required /></div>
                </div>
                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-graduation-cap"></i> School Memories</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Graduation Year *</label>
                    <input type="number" name="gradYear" placeholder="e.g. 2018" value={formData.gradYear} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Form Completed</label>
                    <select name="form" value={formData.form} onChange={handleInputChange}>
                      <option value="">Select...</option>
                      <option>Form 4 (O-Level)</option>
                      <option>Form 6 (A-Level)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Memorable Teacher</label><input type="text" name="memorableTeacher" placeholder="Who inspired you most?" value={formData.memorableTeacher} onChange={handleInputChange} /></div>
                <div className="btn-row">
                   <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                   <button type="button" className="btn-next" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-briefcase"></i> Professional Life</div>
                <div className="form-group"><label>Current Occupation</label><input type="text" name="occupation" placeholder="e.g. Software Engineer" value={formData.occupation} onChange={handleInputChange} /></div>
                <div className="form-row">
                  <div className="form-group"><label>Industry</label><input type="text" name="industry" value={formData.industry} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Current City/Country</label><input type="text" name="currentLocation" value={formData.currentLocation} onChange={handleInputChange} /></div>
                </div>
                <div className="btn-row">
                   <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                   <button type="button" className="btn-next" onClick={nextStep}>Almost Done</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-lock"></i> Account Access</div>
                <div className="form-group">
                  <label>Select Your School *</label>
                  <select name="schoolCode" value={formData.schoolCode} onChange={handleInputChange} required>
                    <option value="">-- Choose School --</option>
                    {schools.map(s => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                    <small style={{ fontSize: '0.65rem', color: '#718096' }}>Min 8 chars, uppercase, lowercase, number & symbol</small>
                  </div>
                  <div className="form-group"><label>Confirm *</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Joining...' : 'Create Alumni Account'}</button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="register-footer" style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 15 }}>
          Already have an account? <Link to="/alumni/login">Sign In</Link> &nbsp;|&nbsp; <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Home</Link>
        </div>
      </div>
    </div>
  );
}
