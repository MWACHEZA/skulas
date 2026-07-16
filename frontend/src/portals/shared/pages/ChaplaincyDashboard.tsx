import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface ChurchEvent {
  id: string;
  title: string;
  type: 'ASSEMBLY' | 'SUNDAY_SERVICE' | 'MIDWEEK' | 'SPECIAL';
  date: string;
  theme: string;
  status: 'PLANNED' | 'CONFIRMED' | 'ARCHIVED';
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  secondaryRoles: string[];
  avatar: string | null;
}

interface ReligionStats {
  students: Record<string, number>;
  staff: Record<string, number>;
}

export default function ChaplaincyDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [religionStats, setReligionStats] = useState<ReligionStats>({ students: {}, staff: {} });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  // Form states
  const [serviceForm, setServiceForm] = useState({
    title: '',
    type: 'SUNDAY_SERVICE',
    date: '',
    theme: '',
    status: 'PLANNED'
  });
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  const isAuthorized = user?.role === 'SCHOOL_ADMIN' || 
                       user?.secondaryRoles?.includes('School Chaplain') || 
                       user?.secondaryRoles?.includes('Church Prefect');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, teamRes, statsRes] = await Promise.all([
        api.get('/api/chaplaincy/events'),
        api.get('/api/chaplaincy/team'),
        api.get('/api/chaplaincy/religion-stats')
      ]);
      setEvents(eventsRes.data);
      setTeam(teamRes.data);
      setReligionStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load chaplaincy data:', err);
      showToast('Error loading chaplaincy dashboard details', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title || !serviceForm.date || !serviceForm.theme) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/chaplaincy/events', serviceForm);
      showToast('Service scheduled successfully!', 'success');
      setShowServiceModal(false);
      setServiceForm({
        title: '',
        type: 'SUNDAY_SERVICE',
        date: '',
        theme: '',
        status: 'PLANNED'
      });
      fetchData();
    } catch (err) {
      showToast('Failed to schedule service', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim()) {
      showToast('Please write a reflection message', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/chaplaincy/broadcast', { content: reflectionText });
      showToast('Spiritual reflection broadcasted successfully to all portals!', 'success');
      setShowReflectionModal(false);
      setReflectionText('');
    } catch (err) {
      showToast('Failed to broadcast reflection', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const calculateStatsDetails = (statsGroup: Record<string, number>) => {
    const total = Object.values(statsGroup).reduce((sum, count) => sum + count, 0);
    return Object.entries(statsGroup).map(([religion, count]) => ({
      religion,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  };

  const studentReligions = calculateStatsDetails(religionStats.students);
  const staffReligions = calculateStatsDetails(religionStats.staff);

  // Dynamic school styles derived from school theme colors
  const primaryColor = 'var(--school-primary, #0056b3)';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '12px', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
        <span>Loading Chaplaincy Hub...</span>
      </div>
    );
  }

  return (
    <div className="chaplaincy-portal-wrapper" style={{ padding: '30px', minHeight: '100vh', background: '#f8fafc' }}>
      <div className="portal-page-header" style={{ marginBottom: 40, borderLeft: `5px solid ${primaryColor}`, paddingLeft: 25 }}>
        <h1 style={{ color: '#1e293b', fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Chaplaincy & Assembly Hub</h1>
        <p style={{ color: '#64748b', fontSize: '1.2rem', marginTop: 4 }}>Guiding the spiritual journey and collective wisdom of the community.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', contentVisibility: 'auto' }} className="lg:grid-cols-4">
        {/* Main Content Area */}
        <div className="lg:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="portal-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: 0 }}>
            <div style={{ background: primaryColor, padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 15, fontSize: '1.4rem', fontWeight: 700 }}>
                 <i className="fas fa-dove"></i> Liturgical Calendar
               </h2>
               {isAuthorized && (
                 <button 
                   className="portal-btn-primary" 
                   onClick={() => setShowServiceModal(true)}
                   style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '12px', padding: '8px 16px', fontWeight: 600 }}
                 >
                   <i className="fas fa-plus mr-2"></i> Schedule Service
                 </button>
               )}
            </div>
            
            <div style={{ padding: '20px' }}>
              <table className="portal-table">
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                    <th style={{ borderRadius: '8px 0 0 8px' }}>Service / Theme</th>
                    <th>Classification</th>
                    <th>Scheduled Date</th>
                    <th style={{ borderRadius: '0 8px 8px 0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        No services or assemblies scheduled currently.
                      </td>
                    </tr>
                  ) : (
                    events.map(event => (
                      <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 15px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>{event.title}</div>
                          <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: 4 }}>
                            <i className="fas fa-quote-left mr-2 opacity-50"></i> {event.theme}
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 800, 
                            background: event.type === 'ASSEMBLY' ? '#e0f2fe' : event.type === 'SUNDAY_SERVICE' ? '#fef3c7' : '#f3e8ff', 
                            color: event.type === 'ASSEMBLY' ? '#0369a1' : event.type === 'SUNDAY_SERVICE' ? '#b45309' : '#6b21a8', 
                            padding: '4px 10px', 
                            borderRadius: '8px' 
                          }}>{event.type.replace('_', ' ')}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#334155' }}>
                          {new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span className={`portal-badge ${event.status === 'CONFIRMED' ? 'success' : event.status === 'PLANNED' ? 'warning' : 'neutral'}`} style={{ borderRadius: '8px' }}>
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="md:grid-cols-2">
            {/* Religion stats card */}
            <div className="portal-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-dharmachakra" style={{ color: primaryColor }}></i> Religion Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Students</h4>
                  {studentReligions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>No student records found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {studentReligions.map(({ religion, count, percentage }) => (
                        <div key={religion}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                            <span>{religion}</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: primaryColor, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Staff</h4>
                  {staffReligions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>No staff records found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {staffReligions.map(({ religion, count, percentage }) => (
                        <div key={religion}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                            <span>{religion}</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: '#475569', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="portal-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-heart" style={{ color: primaryColor }}></i> Reflections & Broadcasts
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '10px', lineHeight: 1.5 }}>
                  Share daily thoughts, scriptures, or announcements to guide and comfort students and staff. Broadcasts appear instantly on all user dashboards.
                </p>
              </div>

              {isAuthorized ? (
                <button 
                  onClick={() => setShowReflectionModal(true)}
                  className="portal-btn-primary" 
                  style={{ background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '12px', fontWeight: 700, width: '100%' }}
                >
                  <i className="fas fa-broadcast-tower"></i> Create Reflection & Broadcast
                </button>
              ) : (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <i className="fas fa-info-circle" style={{ color: '#94a3b8' }}></i>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Only the Chaplaincy Team can broadcast reflections.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="portal-card" style={{ background: '#1e293b', color: 'white', borderRadius: '24px', padding: '25px', border: 'none' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
              <i className="fas fa-users-cog mr-2"></i> Chaplaincy Team
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {team.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>No team members assigned.</p>
              ) : (
                team.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', background: primaryColor, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700,
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      {member.avatar ? (
                        <img src={`${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${member.avatar}`} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                        {member.secondaryRoles.find(r => ['School Chaplain', 'Church Prefect'].includes(r)) || member.role}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Service Modal */}
      {showServiceModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
            <div className="portal-modal-header">
              <h3><i className="fas fa-calendar-plus mr-2" style={{ color: primaryColor }}></i> Schedule Liturgical Service</h3>
              <button onClick={() => setShowServiceModal(false)} className="portal-btn-ghost" style={{ padding: 6, minWidth: 'auto' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleScheduleService} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Service Title / Occasion *</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Easter Assembly, Sunday Mass"
                    value={serviceForm.title}
                    onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-grid-2">
                  <div className="portal-form-group">
                    <label className="portal-label">Classification *</label>
                    <select 
                      className="portal-input"
                      value={serviceForm.type}
                      onChange={e => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                    >
                      <option value="ASSEMBLY">Morning Assembly</option>
                      <option value="SUNDAY_SERVICE">Sunday Service</option>
                      <option value="MIDWEEK">Midweek Fellowship</option>
                      <option value="SPECIAL">Special Gathering</option>
                    </select>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Status *</label>
                    <select 
                      className="portal-input"
                      value={serviceForm.status}
                      onChange={e => setServiceForm({ ...serviceForm, status: e.target.value as any })}
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Service Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    className="portal-input" 
                    value={serviceForm.date}
                    onChange={e => setServiceForm({ ...serviceForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Theme / Verse Focus *</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Faith in Times of Trials, 1 Corinthians 13:4"
                    value={serviceForm.theme}
                    onChange={e => setServiceForm({ ...serviceForm, theme: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowServiceModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }} disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    Schedule Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reflection Modal */}
      {showReflectionModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
            <div className="portal-modal-header">
              <h3><i className="fas fa-broadcast-tower mr-2" style={{ color: primaryColor }}></i> Add Reflection & Broadcast</h3>
              <button onClick={() => setShowReflectionModal(false)} className="portal-btn-ghost" style={{ padding: 6, minWidth: 'auto' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleBroadcastReflection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Reflection Message / Verse *</label>
                  <textarea 
                    className="portal-input" 
                    rows={6}
                    placeholder="Share a verse or a word of encouragement with all students and staff..."
                    value={reflectionText}
                    onChange={e => setReflectionText(e.target.value)}
                    required
                    style={{ fontSize: '1rem', padding: '12px' }}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <i className="fas fa-info-circle" style={{ color: primaryColor }}></i>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    This will publish as a "Daily Reflection" announcement on all portal dashboards.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowReflectionModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }} disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-broadcast-tower mr-2"></i>}
                    Broadcast Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
