import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

export default function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [schoolInfo, setSchoolInfo] = useState<{ name?: string; logo?: string; primaryColor?: string } | null>(null);

  useEffect(() => {
    // Log the 404 for analytics / broken link detection
    try {
      console.warn(`[404 Not Found] Visited: ${location.pathname}${location.search}`);
      api.post('/api/schools/log-404', { path: location.pathname }).catch(() => {
        // Non-blocking fallback if telemetry endpoint is disabled
      });
    } catch {}

    // Attempt to load school branding if tenant context exists
    api.get('/api/schools/settings')
      .then(res => {
        if (res.data) {
          setSchoolInfo({
            name: res.data.schoolName || res.data.name,
            logo: res.data.logo,
            primaryColor: res.data.primaryColor || '#2563eb'
          });
        }
      })
      .catch(() => {});
  }, [location.pathname, location.search]);

  // Determine appropriate dashboard path based on user role
  const getDashboardPath = () => {
    if (!user) return '/';
    const role = (user.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ACADEX_ADMIN') return '/acadex/dashboard';
    if (role === 'SCHOOL_ADMIN' || role === 'ADMIN') return '/admin/dashboard';
    if (role === 'BURSAR') return '/bursar/dashboard';
    if (role === 'TEACHER') return '/teacher/dashboard';
    if (role === 'STUDENT') return '/student/dashboard';
    if (role === 'PARENT') return '/parent/dashboard';
    if (role === 'LIBRARIAN') return '/librarian/dashboard';
    if (role === 'CLINIC') return '/clinic/triage';
    if (role === 'ALUMNI') return '/alumni/dashboard';
    if (role === 'APPLICANT') return '/applicant/dashboard';
    if (role === 'SUPPLIER') return '/supplier/dashboard';
    return '/';
  };

  const primary = schoolInfo?.primaryColor || '#2563eb';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        padding: '40px 32px',
        textAlign: 'center'
      }}>
        {schoolInfo?.logo ? (
          <img
            src={schoolInfo.logo}
            alt={schoolInfo.name || 'School Logo'}
            style={{ height: '56px', objectFit: 'contain', marginBottom: '20px' }}
          />
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            margin: '0 auto 20px auto'
          }}>
            <i className="fas fa-compass"></i>
          </div>
        )}

        <div style={{ fontSize: '4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1e293b', marginTop: '12px', marginBottom: '8px' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: '0.925rem', color: '#64748b', lineHeight: 1.5, marginBottom: '28px' }}>
          The page at <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{location.pathname}</code> does not exist, has been moved, or is temporarily unavailable.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {user ? (
            <Link
              to={getDashboardPath()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: primary,
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.925rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <i className="fas fa-tachometer-alt"></i> Return to Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: primary,
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.925rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <i className="fas fa-home"></i> Go to Homepage
            </Link>
          )}

          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 24px',
              backgroundColor: '#f8fafc',
              color: '#475569',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}
          >
            <i className="fas fa-arrow-left"></i> Go Back Previous Page
          </button>
        </div>
      </div>

      <div style={{ marginTop: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>
        &copy; {new Date().getFullYear()} {schoolInfo?.name || 'EduPortal System'}. All rights reserved.
      </div>
    </div>
  );
}
