import React, { useState, useEffect } from 'react';
import { useAuth, type LinkedEntity } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

export default function ForceLinkOverlay() {
  const { user, activeEntity, updateLinkedEntities, setActiveEntity } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('acadex_dismiss_force_link') === 'true';
  });

  // Link form states
  const [schoolCode, setSchoolCode] = useState('');
  const [entityId, setEntityId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Auto-activate first connected entity if none active
  useEffect(() => {
    if (user?.linkedEntities && user.linkedEntities.length > 0 && !activeEntity) {
      setActiveEntity(user.linkedEntities[0]);
      setIsDismissed(true);
    }
  }, [user?.linkedEntities, activeEntity, setActiveEntity]);

  useEffect(() => {
    if (user?.role === 'SUPPLIER') {
      fetchSchools();
    }
  }, [user]);

  const fetchSchools = async () => {
    try {
      const { data } = await api.get('/api/schools');
      setSchools(data || []);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  };

  // Close handler: real React state + sessionStorage persistence + auto-select first entity
  const handleClose = () => {
    setIsDismissed(true);
    sessionStorage.setItem('acadex_dismiss_force_link', 'true');
    if (user?.linkedEntities && user.linkedEntities.length > 0 && !activeEntity) {
      setActiveEntity(user.linkedEntities[0]);
    }
  };

  if (isDismissed || activeEntity || (user?.role !== 'PARENT' && user?.role !== 'SUPPLIER')) {
    return null;
  }

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/link-entity', {
        schoolCode,
        entityId: user?.role === 'PARENT' ? entityId : schoolCode,
        password
      });

      const updatedLinks = response.data.linkedEntities || [];
      updateLinkedEntities(updatedLinks);

      if (updatedLinks.length > 0) {
        const newEntity = updatedLinks[updatedLinks.length - 1];
        setActiveEntity(newEntity);
        setIsDismissed(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="portal-modal-overlay"
      onClick={handleClose}
      style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="portal-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#ffffff',
          borderRadius: 18,
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          padding: 24
        }}
      >
        {/* Close Button with high z-index and reliable click handler */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1.1rem',
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#e2e8f0';
            (e.currentTarget as HTMLElement).style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
            (e.currentTarget as HTMLElement).style.color = '#64748b';
          }}
          title="Close dialog"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="portal-modal-header" style={{ textAlign: 'center', display: 'block', paddingTop: 6, paddingBottom: 16, borderBottom: 'none' }}>
          <div style={{
            width: 58,
            height: 58,
            background: '#eff6ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            color: '#2563eb'
          }}>
            <i className={`fas ${user?.role === 'PARENT' ? 'fa-user-graduate' : 'fa-truck'}`} style={{ fontSize: '1.4rem' }}></i>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
            {user?.role === 'PARENT' ? 'Link Your Child' : 'Connect to a School'}
          </h2>
          <p style={{ marginTop: 6, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4 }}>
            {user?.role === 'PARENT'
              ? 'Enter your child\'s details to access their academic and attendance profile.'
              : 'Select a school to offer your services. Your request will be reviewed by the school admin.'}
          </p>
        </div>

        <form onSubmit={handleLink} className="portal-modal-body" style={{ padding: 0 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i> {error}
            </div>
          )}

          {user?.role === 'SUPPLIER' && (
            <div className="portal-form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: 6, display: 'block' }}>
                Select School to Link
              </label>
              <select
                className="portal-input"
                required
                value={schoolCode}
                onChange={e => setSchoolCode(e.target.value)}
              >
                <option value="">-- Choose a School --</option>
                {schools
                  .filter(s => !user.linkedEntities?.some(l => l.schoolCode === s.code))
                  .map(s => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
              </select>
            </div>
          )}

          {user?.role === 'PARENT' && (
            <>
              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: 6, display: 'block' }}>
                  School Access Code
                </label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. AX-P12345 or Lobengula Primary code"
                  required
                  value={schoolCode}
                  onChange={e => setSchoolCode(e.target.value)}
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: 6, display: 'block' }}>
                  Student ID Number
                </label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. STU-001 or email address"
                  required
                  value={entityId}
                  onChange={e => setEntityId(e.target.value)}
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: 6, display: 'block' }}>
                  Verification Password
                </label>
                <input
                  type="password"
                  className="portal-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                  Use the temporary password or student portal password provided by the school.
                </small>
              </div>
            </>
          )}

          <button
            type="submit"
            className="portal-btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: 800, borderRadius: 10, fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-spinner fa-spin"></i> Verifying...
              </span>
            ) : (
              user?.role === 'PARENT' ? 'Link Student Account' : 'Request School Connection'
            )}
          </button>
        </form>

        {/* CURRENTLY CONNECTED SECTION */}
        {user?.linkedEntities && user.linkedEntities.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, marginTop: 18 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Currently Connected ({user.linkedEntities.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.linkedEntities.map(entity => (
                <div
                  key={entity.id}
                  onClick={() => {
                    setActiveEntity(entity);
                    setIsDismissed(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#93c5fd';
                    (e.currentTarget as HTMLElement).style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{entity.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{entity.schoolName}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {entity.status === 'PENDING' ? (
                      <span className="portal-badge warning" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                        Pending
                      </span>
                    ) : (
                      <span className="portal-badge success" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                        Approved
                      </span>
                    )}
                    <span style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Use <i className="fas fa-chevron-right" style={{ fontSize: '0.65rem' }}></i>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = user.linkedEntities!.filter(e2 => e2.id !== entity.id);
                        updateLinkedEntities(updated);
                        if ((activeEntity as any)?.id === entity.id) {
                          setActiveEntity(updated[0] || null);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 6px' }}
                      title="Remove connection"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="portal-btn-secondary"
              style={{ width: '100%', marginTop: 14, padding: '10px', fontWeight: 800, borderRadius: 10, fontSize: '0.85rem' }}
              onClick={() => {
                setActiveEntity(user.linkedEntities![0]);
                setIsDismissed(true);
              }}
            >
              Continue to Portal as {user.linkedEntities[0].name} →
            </button>
          </div>
        )}

        <div className="portal-modal-footer" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', borderTop: 'none', paddingTop: 16 }}>
          <i className="fas fa-lock" style={{ marginRight: 4 }}></i> Secure verification powered by Acadex Core.
        </div>
      </div>
    </div>
  );
}
