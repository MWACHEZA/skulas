import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderGuardProps {
  children: React.ReactNode;
}

export default function LeaderGuard({ children }: LeaderGuardProps) {
  const { isAuthenticated, user, isLeader } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/student/login" replace />;
  }

  if (user?.role !== 'STUDENT') {
    return (
      <div className="portal-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#fef2f2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px'
        }}>
          <i className="fas fa-lock" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 24px' }}>
          This page is only accessible to verified students.
        </p>
        <Link to="/" className="portal-btn portal-btn-primary">
          Return to Portal
        </Link>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="portal-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#fef3c7',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px'
        }}>
          <i className="fas fa-user-shield" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Student Leader Access Only (403)
        </h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          This feature is reserved for active Prefects, Hostel Heads, and SRC Council members. 
          If you were recently appointed, please contact your School Administrator to activate your leadership assignment.
        </p>
        <Link to="/student/dashboard" className="portal-btn portal-btn-primary">
          Back to Student Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
