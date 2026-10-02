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

  // Requisition Modal State (for PE Teachers / Sports Masters)
  const [showReqModal, setShowReqModal] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqForm, setReqForm] = useState({
    title: '',
    description: '',
    estimatedAmount: '',
    priority: 'Medium'
  });

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

  const handleRaiseRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.title.trim() || !reqForm.description.trim()) {
      showToast('Please fill all required requisition details', 'warning');
      return;
    }

    setSubmittingReq(true);
    try {
      await api.post('/api/procurement/requisitions', {
        title: reqForm.title.trim(),
        description: reqForm.description.trim(),
        estimatedAmount: parseFloat(reqForm.estimatedAmount || '0'),
        priority: reqForm.priority,
        requisitionType: 'Sports Equipment',
        department: 'Sports & Physical Education'
      });

      showToast('Equipment requisition submitted to Sports Administration for review', 'success');
      setShowReqModal(false);
      setReqForm({ title: '', description: '', estimatedAmount: '', priority: 'Medium' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit requisition', 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

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
      {/* Action Header: PE Teacher Raise Requisition */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>PE Equipment & Supplies</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>View sporting assets and submit new equipment requisitions to administration.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowReqModal(true)}
          className="portal-btn portal-btn-primary"
          style={{ padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-plus" /> Raise Equipment Requisition
        </button>
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

      {/* ── MODAL: Raise Requisition for Equipment ── */}
      {showReqModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                <i className="fas fa-boxes mr-2" style={{ color: '#2563eb' }} />
                Raise Equipment Requisition
              </h3>
              <button
                type="button"
                onClick={() => setShowReqModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRaiseRequisition} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Requisition Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Footballs, Cones & Whistles for Term 2 PE"
                  value={reqForm.title}
                  onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Items Required & Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. 10x Size 5 match balls, 20x training cones, 4x stainless steel referee whistles for inter-house tournament."
                  value={reqForm.description}
                  onChange={e => setReqForm({ ...reqForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Estimated Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 150.00"
                    value={reqForm.estimatedAmount}
                    onChange={e => setReqForm({ ...reqForm, estimatedAmount: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Priority
                  </label>
                  <select
                    value={reqForm.priority}
                    onChange={e => setReqForm({ ...reqForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="portal-btn portal-btn-secondary"
                  style={{ padding: '10px 18px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="portal-btn portal-btn-primary"
                  style={{ padding: '10px 22px', fontWeight: 700 }}
                >
                  {submittingReq ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        subtitle="Manage sports teams, house standings, equipment requests, and match fixtures."
        headerAction={access.actingAs ? <ViewingAsToggle actingAs={access.actingAs} /> : undefined}
        tabs={tabs}
        defaultTab="teams"
      />
    </div>
  );
}
