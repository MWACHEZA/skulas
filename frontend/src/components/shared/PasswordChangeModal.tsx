import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  userEmail: string;
  token?: string; // Optional token for pre-login password changes
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onSuccess, onCancel, userEmail, token }) => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
      
      // Basic focus trap
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], input[type="password"], select'
        ) as NodeListOf<HTMLElement>;
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus first element
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 50);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return showToast('New passwords do not match', 'error');
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      showToast('Password updated successfully! You can now access your dashboard.', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 3000 }} role="dialog" aria-modal="true" aria-labelledby="pwd-modal-title">
      <div className="portal-modal" style={{ maxWidth: '450px' }} ref={modalRef}>
        <div className="portal-modal-header" style={{ background: 'var(--portal-primary)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <i className="fas fa-shield-alt" style={{ fontSize: '1.5rem' }} aria-hidden="true"></i>
            <div>
              <h2 id="pwd-modal-title" style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Secure Your Account</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Mandatory password update required</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="portal-modal-body" style={{ padding: '25px' }}>
            <p style={{ marginTop: 0, marginBottom: 15, fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.5 }}>
              Account: <span style={{ color: 'var(--portal-primary)', fontWeight: 600 }}>{userEmail}</span>
            </p>
            <p style={{ marginTop: 0, marginBottom: 20, fontSize: '0.9rem', color: '#718096', lineHeight: 1.5 }}>
              For your protection, you must change your password. This happens if you are using a default password or your current password has expired (90 days).
            </p>
            
            <div className="portal-form-group">
              <label htmlFor="oldPassword">Current Password</label>
              <div className="portal-input-wrap">
                <input 
                  id="oldPassword"
                  type="password" 
                  className="portal-input" 
                  placeholder="Enter current password"
                  value={form.oldPassword}
                  onChange={e => setForm({...form, oldPassword: e.target.value})}
                  required 
                />
                <i className="fas fa-lock" aria-hidden="true"></i>
              </div>
            </div>

            <div className="portal-form-group">
              <label htmlFor="newPassword">New Secure Password</label>
              <div className="portal-input-wrap">
                <input 
                  id="newPassword"
                  type="password" 
                  className="portal-input" 
                  placeholder="Min 8 chars, numbers & symbols"
                  value={form.newPassword}
                  onChange={e => setForm({...form, newPassword: e.target.value})}
                  aria-describedby="pwd-info"
                  required 
                />
                <i className="fas fa-key" aria-hidden="true"></i>
              </div>
            </div>

            <div className="portal-form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="portal-input-wrap">
                <input 
                  id="confirmPassword"
                  type="password" 
                  className="portal-input" 
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  required 
                />
                <i className="fas fa-check-double" aria-hidden="true"></i>
              </div>
            </div>

            <div id="pwd-info" style={{ background: '#f8faff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px', color: 'var(--portal-primary)' }} aria-hidden="true"></i>
              Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols.
            </div>
          </div>
          <div className="portal-modal-footer">
            <button type="button" className="portal-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="portal-btn-primary" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Updating...</> : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
