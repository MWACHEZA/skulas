import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/sessions');
      setSessions(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to log out this device?')) return;
    
    try {
      setRevoking(id);
      await api.delete(`/api/auth/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  // Helper to parse a friendly name from User-Agent
  const getDeviceName = (ua: string | null) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other Device';
  };

  const getBrowserName = (ua: string | null) => {
    if (!ua) return '';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return '';
  };

  if (loading) return <div>Loading active sessions...</div>;
  if (error) return <div className="portal-alert error">{error}</div>;

  return (
    <div style={{ marginTop: 30 }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 15 }}>Active Sessions</h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
        Review the devices currently logged into your account. Revoke any unfamiliar sessions.
      </p>

      {sessions.length === 0 ? (
        <p>No active sessions found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {sessions.map(session => (
            <div 
              key={session.id} 
              style={{ 
                background: '#f8f9fc', 
                borderRadius: 12, 
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 8, 
                  background: '#ebf4ff', 
                  color: '#3182ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  <i className={session.userAgent?.includes('Mobile') ? 'fas fa-mobile-alt' : 'fas fa-laptop'}></i>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem', color: '#1e293b' }}>
                    {getDeviceName(session.userAgent)} {getBrowserName(session.userAgent) && `· ${getBrowserName(session.userAgent)}`}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                    IP: {session.ipAddress || 'Unknown'} &nbsp;&bull;&nbsp; Last active: {new Date(session.lastActiveAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleRevoke(session.id)}
                disabled={revoking === session.id}
                style={{
                  background: 'transparent',
                  color: '#e53e3e',
                  border: '1px solid #fc8181',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: revoking === session.id ? 'not-allowed' : 'pointer',
                  opacity: revoking === session.id ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {revoking === session.id ? 'Revoking...' : 'Log Out'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
