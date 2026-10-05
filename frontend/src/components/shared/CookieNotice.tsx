import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('cookie_consent_accepted');
      if (!accepted) {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable in some private browsing contexts
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('cookie_consent_accepted', 'true');
    } catch {}
    setVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('cookie_consent_accepted', 'dismissed');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        padding: '16px 24px',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        fontSize: '0.875rem',
        borderTop: '1px solid #374151'
      }}
      role="region"
      aria-label="Cookie consent banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 500px' }}>
        <i className="fas fa-cookie-bite" style={{ fontSize: '1.5rem', color: '#f59e0b' }}></i>
        <div>
          <span>
            This portal uses strictly necessary and functional cookies to maintain your session and ensure secure academic operations.
            By using this website, you agree to our{' '}
          </span>
          <Link
            to="/privacy-policy"
            style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 500 }}
          >
            Privacy Policy
          </Link>
          <span> and </span>
          <Link
            to="/terms"
            style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 500 }}
          >
            Terms of Service
          </Link>
          .
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid #4b5563',
            background: 'transparent',
            color: '#d1d5db',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          Preferences
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '7px 18px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            boxShadow: '0 2px 4px rgba(37,99,235,0.3)'
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
