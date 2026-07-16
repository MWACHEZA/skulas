import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PasswordChangeModal from '../../../components/shared/PasswordChangeModal';
import '../../../components/portals/portal.css';

export default function StudentLogin() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ schoolCode: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', {
        email: form.email,
        password: form.password,
        schoolCode: form.schoolCode.toUpperCase(),
      });
      
      if (data.user.role !== 'STUDENT') {
        const msg = 'This portal is for students only.';
        setError(msg);
        showToast(msg, 'warning');
        return;
      }

      if (data.user.mustChangePassword) {
        // Store auth data but don't finalize session yet
        setPendingAuth(data);
        setShowPasswordModal(true);
        return;
      }

      finalizeLogin(data);
    } catch (err: any) {
      const msg = err.response?.data?.error || "We couldn't reach the server. Please check your internet connection and try again.";
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (data: any) => {
    login(data.token, { ...data.user });
    showToast('Login successful! Welcome to your student dashboard.', 'success');
    navigate('/student/dashboard');
  };

  return (
    <div className="portal-login-bg">
      <div className="portal-login-card">
        <div className="portal-login-header">
          <div className="portal-login-header-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h1>Student Portal</h1>
          <p>Sign in to access your academic dashboard</p>
          <div className="portal-login-badge">
            <i className="fas fa-graduation-cap"></i> Student Access
          </div>
        </div>

        <div className="portal-login-body">
          {error && (
            <div className="portal-alert error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="portal-form-group">
              <label htmlFor="schoolCode">School Access Code</label>
              <div className="portal-input-wrap">
                <input
                  id="schoolCode"
                  type="text"
                  placeholder="e.g. AX-EMBAKWE"
                  value={form.schoolCode}
                  onChange={e => setForm(f => ({ ...f, schoolCode: e.target.value }))}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <i className="fas fa-school"></i>
              </div>
            </div>

            <div className="portal-form-group">
              <label htmlFor="email">Email Address</label>
              <div className="portal-input-wrap">
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@student.embakwe.edu.zw"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
                <i className="fas fa-envelope"></i>
              </div>
            </div>

            <div className="portal-form-group">
              <label htmlFor="password">Password</label>
              <div className="portal-input-wrap">
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <i className="fas fa-lock"></i>
              </div>
            </div>

            <button type="submit" className="portal-login-btn" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
            </button>
          </form>
        </div>

        <div className="portal-login-footer">
          <Link to="/"><i className="fas fa-arrow-left"></i> Back to School Website</Link>
        </div>
      </div>

      <PasswordChangeModal 
        isOpen={showPasswordModal}
        userEmail={form.email}
        onCancel={() => setShowPasswordModal(false)}
        onSuccess={() => finalizeLogin(pendingAuth)}
      />
    </div>
  );
}
