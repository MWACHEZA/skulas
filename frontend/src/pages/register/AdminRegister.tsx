import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function AdminRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    adminRole: '',
    department: '',
    dob: '',
    gender: '',
    nationalId: '',
    address: '',
    authCode: '',
    schoolCode: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
        return showToast('Complete identity details first.', 'warning');
      }
    }
    if (step === 4) {
      if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        return showToast('Password must meet complexity requirements: Min 8 chars, uppercase, lowercase, number & symbol.', 'error');
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
      showToast('Passwords do not match', 'error'); return;
    }
    if (formData.authCode !== 'ADMIN2024') {
      showToast('Invalid System Authorization Code', 'error'); return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, name: `${formData.firstName} ${formData.lastName}`, role: 'SCHOOL_ADMIN' };
      await api.post('/api/auth/register-user', payload);
      showToast('Administrator privileges granted successfully!', 'success');
      navigate('/admin/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container">
        <div className="register-header" style={{ background: '#1a1a2e' }}>
          <img src="/images/logo.png" alt="Logo" />
          <h2>Admin Registration</h2>
          <p>Create a restricted access account</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}><div className="step-num">1</div><span>Identity</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => step > 1 && setStep(2)}><div className="step-num">2</div><span>Role</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`} onClick={() => step > 2 && setStep(3)}><div className="step-num">3</div><span>Personal</span></div>
          <div className={`step-item ${step === 4 ? 'active' : ''}`} onClick={() => step > 3 && setStep(4)}><div className="step-num">4</div><span>Security</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-user-shield"></i> Basic Identity</div>
                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Username *</label><input type="text" name="username" value={formData.username} onChange={handleInputChange} required /></div>
                </div>
                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-shield-alt"></i> Administrative Role</div>
                <div className="form-group">
                  <label>Primary Role *</label>
                  <select name="adminRole" value={formData.adminRole} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option>Super Administrator</option>
                    <option>Academic Administrator</option>
                    <option>Financial Administrator</option>
                    <option>System Administrator</option>
                  </select>
                </div>
                <div className="form-group"><label>Department</label><input type="text" name="department" value={formData.department} onChange={handleInputChange} /></div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-id-card"></i> Personal Details</div>
                <div className="form-row">
                  <div className="form-group"><label>Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange}><option value="">Select...</option><option>Male</option><option>Female</option></select></div>
                  <div className="form-group"><label>National ID</label><input type="text" name="nationalId" value={formData.nationalId} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group"><label>Home Address</label><textarea name="address" rows={2} value={formData.address} onChange={handleInputChange}></textarea></div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-lock"></i> Verification & Security</div>
                <div className="form-group" style={{ background: '#fff3cd', padding: 15, borderRadius: 10, border: '1px solid #ffeeba' }}>
                  <label style={{ color: '#856404', fontWeight: 700 }}>Privileged Authorization Code *</label>
                  <input type="password" name="authCode" placeholder="Enter system security code" value={formData.authCode} onChange={handleInputChange} required />
                </div>
                <div className="form-row" style={{ marginTop: 15 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>School Access Code *</label>
                    <input type="text" name="schoolCode" value={formData.schoolCode} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" placeholder="Create complex password" value={formData.password} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Establishing...' : 'Complete Registration'}</button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="register-footer">
          Already have an account? <Link to="/admin/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
