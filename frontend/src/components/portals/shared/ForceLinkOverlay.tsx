import React, { useState, useEffect } from 'react';
import { useAuth, type LinkedEntity } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

export default function ForceLinkOverlay() {
  const { user, activeEntity, updateLinkedEntities, setActiveEntity } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'SELECT' | 'LINK'>('SELECT');
  
  // Link form states
  const [schoolCode, setSchoolCode] = useState('');
  const [entityId, setEntityId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  if (activeEntity || (user?.role !== 'PARENT' && user?.role !== 'SUPPLIER')) {
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
        
        // Auto-set the active entity if they had none open or we want to force
        if (!activeEntity) {
          setActiveEntity(newEntity);
        }
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="portal-modal" style={{ maxWidth: 450, border: '1px solid rgba(255,255,255,0.1)', background: '#fff', position: 'relative' }}>
        <button 
          onClick={() => {
            // If they have no active entity, we just hide the overlay for this session/moment
            // In a real app, we might just redirect them to a 'Getting Started' page
            // For now, we'll use a hacky way to hide it (setting a local state)
            const overlay = document.querySelector('.portal-modal-overlay') as HTMLElement;
            if (overlay) overlay.style.display = 'none';
          }}
          style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '1.2rem' }}
          title="Close overlay"
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="portal-modal-header" style={{ textAlign: 'center', display: 'block', paddingTop: 10 }}>
          <div style={{ width: 60, height: 60, background: '#ebf8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#3182ce' }}>
            <i className={`fas ${user?.role === 'PARENT' ? 'fa-user-graduate' : 'fa-truck'}`} style={{ fontSize: '1.5rem' }}></i>
          </div>
          <h2 style={{ margin: 0 }}>{user?.role === 'PARENT' ? 'Link Your Child' : 'Connect to a School'}</h2>
          <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#718096' }}>
            {user?.role === 'PARENT' 
              ? 'Enter your child\'s details to access their academic profile.' 
              : 'Select a school to offer your services. Your request will be reviewed by the school admin.'}
          </p>
        </div>

        <form onSubmit={handleLink} className="portal-modal-body">
          {error && (
            <div style={{ padding: 10, background: '#fff5f5', color: '#c53030', borderRadius: 8, marginBottom: 15, fontSize: '0.85rem', textAlign: 'center' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i> {error}
            </div>
          )}

          {user?.role === 'SUPPLIER' && (
            <div className="portal-form-group">
               <label>Select New School to Link</label>
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
               <small style={{ display: 'block', marginTop: 5, color: '#a0aec0' }}>
                 {schools.filter(s => !user.linkedEntities?.some(l => l.schoolCode === s.code)).length === 0 
                   ? 'You are already linked to all available schools.' 
                   : 'Only schools registered on the Acadex platform are listed.'}
               </small>
            </div>
          )}

          {user?.role === 'PARENT' && (
            <>
              <div className="portal-form-group">
                <label>School Access Code</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. AX-P12345" 
                  required 
                  value={schoolCode}
                  onChange={e => setSchoolCode(e.target.value)}
                />
              </div>
              <div className="portal-form-group">
                <label>Student ID Number</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. STU-001" 
                  required 
                  value={entityId}
                  onChange={e => setEntityId(e.target.value)}
                />
              </div>
              <div className="portal-form-group">
                <label>Verification Password</label>
                <input 
                  type="password" 
                  className="portal-input" 
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <small style={{ color: '#a0aec0' }}>Use the temporary password provided by the school.</small>
              </div>
            </>
          )}

          {(!user?.linkedEntities || user.linkedEntities.length === 0 || schoolCode) && (
             <button 
              type="submit" 
              className="portal-btn-primary" 
              style={{ width: '100%', marginTop: 10, padding: 14 }}
              disabled={loading || (user?.role === 'SUPPLIER' && schools.filter(s => !user.linkedEntities?.some(l => l.schoolCode === s.code)).length === 0 && !schoolCode)}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : (user?.role === 'PARENT' ? 'Link Student' : 'Request Connection')}
            </button>
          )}
        </form>

        {user?.linkedEntities && user.linkedEntities.length > 0 && (
          <div className="portal-modal-body" style={{ borderTop: '1px solid #edf2f7', paddingTop: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>Currently Connected</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {user.linkedEntities.map(entity => (
                <div key={entity.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f7fafc', borderRadius: 8, border: '1px solid #edf2f7' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#718096' }}>{entity.schoolName}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {entity.status === 'PENDING' && <span className="portal-badge warning" style={{ fontSize: '0.65rem' }}>Pending</span>}
                    <button 
                      onClick={() => {
                        const updated = user.linkedEntities!.filter(e => e.id !== entity.id);
                        updateLinkedEntities(updated);
                        const currentActive = activeEntity as any;
                        if (currentActive?.id === entity.id) {
                           setActiveEntity(updated[0] || null);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: 5 }}
                      title="Remove connection"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {activeEntity && (
              <button 
                className="portal-btn-secondary" 
                style={{ width: '100%', marginTop: 20 }}
                onClick={() => window.location.reload()}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        )}

        <div className="portal-modal-footer" style={{ textAlign: 'center', fontSize: '0.8rem', color: '#a0aec0' }}>
           <i className="fas fa-lock"></i> Secure verification powered by Acadex Core.
        </div>
      </div>
    </div>
  );
}
