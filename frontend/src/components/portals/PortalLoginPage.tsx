import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../context/ToastContext';
import PasswordChangeModal from '../shared/PasswordChangeModal';
import './portal.css';

interface PortalLoginProps {
  portalName: string;
  portalIcon: string;
  roleBadge: string;
  allowedRole: string | string[];
  dashboardPath: string;
  emailPlaceholder?: string;
  registrationPath?: string;
}

export default function PortalLoginPage({ portalName, portalIcon, roleBadge, allowedRole, dashboardPath, emailPlaceholder, registrationPath }: PortalLoginProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ schoolCode: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setForm(f => ({ ...f, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
    } else {
      const stored = localStorage.getItem('last_school_code');
      if (stored) {
        setForm(f => ({ ...f, schoolCode: stored.trim().toUpperCase() }));
      }
    }
  }, []);

  const handleSchoolCodeChange = (val: string) => {
    setForm(f => ({ ...f, schoolCode: val }));
    if (val.trim()) {
      localStorage.setItem('last_school_code', val.trim().toUpperCase());
    }
  };

  const backCode = (form.schoolCode || localStorage.getItem('last_school_code') || '').trim().toUpperCase();
  const backPath = backCode ? `/school/${backCode}` : '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        schoolCode: form.schoolCode.trim().toUpperCase(),
      });
      
      const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
      if (!roles.includes(data.user.role)) {
        const msg = `This portal is for ${roleBadge}s only.`;
        setError(msg);
        showToast(msg, 'warning');
        return;
      }

      if (data.user.mustChangePassword) {
        setPendingAuth(data);
        setShowPasswordModal(true);
        return;
      }

      finalizeLogin(data);
    } catch (err: any) {
      console.error('Login detailed error:', err);
      const msg = err.response?.data?.error || 'Login failed. Connection error or invalid credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (data: any) => {
    login(data.token, { ...data.user });
    showToast('Login successful! Welcome back.', 'success');
    navigate(dashboardPath);
  };

  return (
    <div className="portal-login-bg">
      <div className="portal-login-card">
        <div className="portal-login-header">
          <div className="portal-login-header-icon">
            <i className={portalIcon}></i>
          </div>
          <h1>{portalName}</h1>
          <p>Sign in to access your portal</p>
          <div className="portal-login-badge">
            <i className={portalIcon}></i> {roleBadge} Access
          </div>
        </div>

        <div className="portal-login-body">
          {error && (
            <div className="portal-alert error" role="alert" aria-live="assertive">
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i> {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {allowedRole !== 'SUPER_ADMIN' && allowedRole !== 'PARENT' && allowedRole !== 'SUPPLIER' && (
              <div className="portal-form-group">
                <label htmlFor="schoolCode">School Access Code</label>
                <div className="portal-input-wrap">
                  <input id="schoolCode" type="text" placeholder="e.g. AX-EMBAKWE"
                    value={form.schoolCode} onChange={e => handleSchoolCodeChange(e.target.value)}
                    required style={{ textTransform: 'uppercase' }} />
                  <i className="fas fa-school"></i>
                </div>
              </div>
            )}
            <div className="portal-form-group">
              <label htmlFor="email">Email Address</label>
              <div className="portal-input-wrap">
                <input id="email" type="email" placeholder={emailPlaceholder || 'your@email.com'}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                <i className="fas fa-envelope"></i>
              </div>
            </div>
            <div className="portal-form-group">
              <label htmlFor="password">Password</label>
              <div className="portal-input-wrap">
                <input id="password" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <i className="fas fa-lock"></i>
              </div>
            </div>
            <button type="submit" className="portal-login-btn" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
            </button>
          </form>
        </div>

        <div className="portal-login-footer">
          {registrationPath && (
            <p style={{ marginBottom: 15, fontSize: '0.9rem' }}>
              Don't have an account? <Link to={`${registrationPath}${backCode ? `?school=${backCode}` : ''}`} style={{ color: 'var(--portal-primary)', fontWeight: 700 }}>Register Now</Link>
            </p>
          )}
          <Link to={backPath}><i className="fas fa-arrow-left"></i> Back to School Website</Link>
        </div>
      </div>

      <PasswordChangeModal 
        isOpen={showPasswordModal}
        userEmail={form.email}
        token={pendingAuth?.token}
        onCancel={() => setShowPasswordModal(false)}
        onSuccess={() => finalizeLogin(pendingAuth)}
      />
    </div>
  );
}
