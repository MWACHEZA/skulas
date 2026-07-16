import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ParentRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    schoolCode: '',
    studentId: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData(prev => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
    }
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      showToast('Password is too weak. Must include uppercase, lowercase, numbers, and symbols.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register-user', { ...formData, role: 'PARENT' });
      showToast('Parent account created successfully! Enrollment request submitted to school.', 'success');
      navigate('/parent/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth: 550 }}>
        <div className="register-header" style={{ background: '#0f172a' }}>
          <img src="/images/logo.png" alt="School Logo" />
          <h2>Parent Enrollment</h2>
          <p>Create a global account and link to your children's school</p>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <div className="input-group">
                  <input type="text" name="name" placeholder="e.g. John Doe" value={formData.name} onChange={handleInputChange} required />
                  <i className="fas fa-user"></i>
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <div className="input-group">
                  <input type="tel" name="phone" placeholder="+263..." value={formData.phone} onChange={handleInputChange} required />
                  <i className="fas fa-phone"></i>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <div className="input-group">
                <input type="email" name="email" placeholder="your@email.com" value={formData.email} onChange={handleInputChange} required />
                <i className="fas fa-envelope"></i>
              </div>
            </div>

            <div className="form-row" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div className="form-group">
                <label style={{ color: '#1e293b', fontWeight: 700 }}>School Access Code *</label>
                <div className="input-group">
                  <input type="text" name="schoolCode" placeholder="AX-XXXXXX" value={formData.schoolCode} onChange={handleInputChange} required />
                  <i className="fas fa-school" style={{ color: '#3b82f6' }}></i>
                </div>
                <small style={{ color: '#64748b' }}>Obtain this from the school office</small>
              </div>
              <div className="form-group">
                <label style={{ color: '#1e293b', fontWeight: 700 }}>Primary Student ID (Optional)</label>
                <div className="input-group">
                  <input type="text" name="studentId" placeholder="STU-XXXXXX" value={formData.studentId} onChange={handleInputChange} />
                  <i className="fas fa-graduation-cap" style={{ color: '#3b82f6' }}></i>
                </div>
                <small style={{ color: '#64748b' }}>Link your child immediately</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <div className="input-group">
                  <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required />
                  <i className="fas fa-lock"></i>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm *</label>
                <div className="input-group">
                  <input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleInputChange} required />
                  <i className="fas fa-lock"></i>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-next" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Register Parent Account'}
            </button>
          </form>
        </div>

        <div className="register-footer">
          Already have an account? <Link to="/parent/login">Sign In</Link> &nbsp;|&nbsp; <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Home</Link>
        </div>
      </div>
    </div>
  );
}
