import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import TabbedPage from '../../../components/portals/shared/TabbedPage';
import ViewingAsToggle from '../../../components/shared/ViewingAsToggle';
import { useModuleAccess } from '../../../hooks/useModuleAccess';

export default function SportsModule() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const access = useModuleAccess('sports');
  
  // Data
  const [teams, setTeams] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    if (access && access.level !== 'none') {
      fetchTeams();
      if (access.actingAs !== 'sports_tech') fetchHouses();
      fetchEquipment();
    }
  }, [access]);

  const fetchTeams = () => api.get('/api/sports-extended/teams').then(res => setTeams(res.data)).catch(console.error);
  const fetchHouses = () => api.get('/api/sports-extended/houses').then(res => setHouses(res.data)).catch(console.error);
  const fetchEquipment = () => api.get('/api/sports-extended/equipment').then(res => setEquipment(res.data)).catch(console.error);

  if (!access) return <div>Loading...</div>;

  if (access.level === 'none') {
    return (
      <div className="portal-page">
        <div className="portal-page-header">
          <h1>Sports</h1>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
          Not assigned to any team
        </div>
      </div>
    );
  }

  const TeamsTab = () => (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Name</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Category</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Coach</th>
          </tr>
        </thead>
        <tbody>
          {teams.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No sports teams registered.</td></tr>
          ) : (
            teams.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{t.name}</td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>{t.category || 'General'}</td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>{t.coach || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const HousesTab = () => (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>House</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Color</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {houses.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No school houses registered.</td></tr>
          ) : (
            houses.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{h.name}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {h.color ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: h.color, display: 'inline-block' }} />
                      {h.color}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>{h.points ?? 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const EquipmentTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action Header: PE Teacher Equipment Assets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>PE Equipment & Supplies</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>View sporting assets and equipment allocations.</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Item</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Associated Sport</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Quantity</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Condition</th>
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No equipment registered yet.</td></tr>
            ) : (
              equipment.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{e.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>{e.sport?.name || 'General PE'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{e.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: e.condition === 'POOR' ? '#fee2e2' : '#dcfce7',
                      color: e.condition === 'POOR' ? '#b91c1c' : '#15803d'
                    }}>
                      {e.condition || 'Operational'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const EventsTab = () => {
    const [events, setEvents] = useState<any[]>([]);
    
    useEffect(() => {
      api.get('/api/sports-extended/events').then(res => setEvents(res.data)).catch(console.error);
    }, []);

    const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      api.post('/api/sports-extended/events', data)
         .then(res => {
           setEvents([...events, res.data]);
           form.reset();
           showToast('Sports event created successfully', 'success');
         })
         .catch(err => {
           showToast(err.response?.data?.error || 'Failed to create event', 'error');
         });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px', gap: 10, background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <input name="title" placeholder="Event Title" required className="portal-input" />
          <input name="type" placeholder="Type (e.g. Fixture)" required className="portal-input" />
          <input name="sport" placeholder="Sport" required className="portal-input" />
          <input name="date" type="date" required className="portal-input" />
          <button type="submit" className="portal-btn portal-btn-primary" style={{ fontWeight: 600 }}>Request Event</button>
        </form>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Title</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Sport</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No fixtures or events scheduled.</td></tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{ev.title}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{ev.type}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{ev.sport}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(ev.date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'teams', label: 'Teams', content: <TeamsTab /> },
    ...(access.actingAs !== 'sports_tech' ? [{ id: 'houses', label: 'Houses', content: <HousesTab /> }] : []),
    { id: 'equipment', label: 'Equipment', content: <EquipmentTab /> },
    { id: 'events', label: 'Fixtures & Events', content: <EventsTab /> }
  ];

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <TabbedPage
        title="Sports & Physical Education"
        subtitle="Manage sports teams, house standings, equipment assets, and match fixtures."
        headerAction={access.actingAs ? <ViewingAsToggle actingAs={access.actingAs} /> : undefined}
        tabs={tabs}
        defaultTab="teams"
      />
    </div>
  );
}
