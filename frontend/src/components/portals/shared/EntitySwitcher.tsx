import { useState } from 'react';
import { useAuth, type LinkedEntity } from '../../../contexts/AuthContext';

export default function EntitySwitcher() {
  const { user, activeEntity, setActiveEntity } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const entities = user?.linkedEntities || [];
  
  if (entities.length === 0) return null;

  const handleSwitch = (entity: LinkedEntity) => {
    setActiveEntity(entity);
    setIsOpen(false);
    // Refresh page data or trigger specific reload if needed
    window.location.reload(); 
  };

  return (
    <div className="entity-switcher-container" style={{ position: 'relative', marginBottom: 20 }}>
      <div 
        className="active-entity-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '12px 15px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 800, marginBottom: 2 }}>
            {user?.role === 'PARENT' ? 'Active Student' : 'Active School'}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeEntity?.name}
          </div>
        </div>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 10 }}></i>
      </div>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsOpen(false)}></div>
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#1e293b',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            {entities.map(entity => (
              <div 
                key={entity.id}
                onClick={() => handleSwitch(entity)}
                style={{
                  padding: '12px 15px',
                  cursor: 'pointer',
                  background: activeEntity?.id === entity.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: activeEntity?.id === entity.id ? '#38bdf8' : '#fff', fontSize: '0.85rem' }}>
                    {entity.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{entity.schoolName}</div>
                </div>
                {activeEntity?.id === entity.id && <i className="fas fa-check" style={{ color: '#38bdf8', fontSize: '0.75rem' }}></i>}
              </div>
            ))}
            
            <div 
              onClick={() => {
                // Clear activeEntity to trigger ForceLinkOverlay again for linking new student
                // In a real app we might have a specific "Link New" state, but this works
                localStorage.removeItem('acadex_active_entity');
                window.location.reload();
              }}
              style={{
                padding: '12px 15px',
                textAlign: 'center',
                color: '#38bdf8',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <i className="fas fa-plus-circle" style={{ marginRight: 6 }}></i>
              {user?.role === 'PARENT' ? 'Link Another Student' : 'Connect New School'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
