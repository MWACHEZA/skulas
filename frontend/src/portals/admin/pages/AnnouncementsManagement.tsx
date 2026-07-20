import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

export default function AdminAnnouncementsManagement() {
  const { t } = useTerminology();
  const { showToast, toastConfirm } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visiblePortals: [] as string[],
    isPublic: false,
    expiresAt: ''
  });

  const portals = [
    { id: 'ADMIN', label: 'Admin Portal' },
    { id: 'TEACHER', label: `${t('teacher')} Portal` },
    { id: 'STUDENT', label: `${t('student')} Portal` },
    { id: 'PARENT', label: `${t('parent')} Portal` },
    { id: 'BURSAR', label: 'Bursar Portal' },
    { id: 'LIBRARIAN', label: 'Librarian Portal' },
    { id: 'ANCILLARY', label: 'Ancillary Portal' }
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/content/announcements?all=true');
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePortal = (id: string) => {
    setFormData(prev => ({
      ...prev,
      visiblePortals: prev.visiblePortals.includes(id) 
        ? prev.visiblePortals.filter(p => p !== id) 
        : [...prev.visiblePortals, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/content/announcements/${editingId}`, formData);
        showToast('Announcement updated successfully', 'success');
      } else {
        await api.post('/api/content/announcements', formData);
        showToast('Announcement created successfully', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: '', content: '', visiblePortals: [], isPublic: false, expiresAt: '' });
      fetchAnnouncements();
    } catch (err) {
      showToast(`Failed to ${editingId ? 'update' : 'create'} announcement`, 'error');
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      visiblePortals: announcement.visiblePortals || [],
      isPublic: announcement.isPublic,
      expiresAt: announcement.expiresAt ? announcement.expiresAt.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this announcement?'))) return;
    try {
      await api.delete(`/api/content/announcements/${id}`);
      showToast('Announcement deleted successfully', 'success');
      fetchAnnouncements();
    } catch (err) {
      showToast('Failed to delete announcement', 'error');
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Announcements Management</h1>
            <p>Broadcast important information to specific user groups or the entire school community.</p>
          </div>
          <button className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} onClick={() => {
            setEditingId(null);
            setFormData({ title: '', content: '', visiblePortals: [], isPublic: false, expiresAt: '' });
            setShowModal(true);
          }}>
            <i className="fas fa-plus" style={{ marginRight: 8 }}></i>Create Announcement
          </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Global Broadcasts</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Announcement Title</th>
                <th>Target Portals</th>
                <th>Public?</th>
                <th>Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && announcements.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Loading announcements...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>No announcements found.</td></tr>
              ) : announcements.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {a.visiblePortals.map((p: string) => (
                        <span key={p} className="portal-badge info" style={{ fontSize: '0.7rem' }}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td>{a.isPublic ? <span className="portal-badge success">YES</span> : <span className="portal-badge neutral">NO</span>}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(a.publishedAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="portal-btn-secondary" 
                        style={{ padding: '6px 12px', color: 'var(--school-primary, #3182ce)' }}
                        onClick={() => {
                          setEditingId(a.id);
                          setFormData({
                            title: a.title,
                            content: a.content,
                            visiblePortals: a.visiblePortals || [],
                            isPublic: a.isPublic,
                            expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().split('T')[0] : ''
                          });
                          setShowModal(true);
                        }}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="portal-btn-secondary" 
                        style={{ padding: '6px 12px', color: 'var(--portal-danger)' }}
                        onClick={() => handleDelete(a.id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{editingId ? 'Update announcement details.' : 'Broadcast important information to specific user groups or the entire school community.'}</p>
              </div>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Announcement Title</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Content Message</label>
                  <textarea 
                    className="portal-input" 
                    rows={4} 
                    required 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  ></textarea>
                </div>

                <div>
                  <label className="portal-label" style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>Select Target Portals</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                     {portals.map(p => (
                       <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.visiblePortals.includes(p.id)} 
                            onChange={() => handleTogglePortal(p.id)} 
                          />
                          <span style={{ fontSize: '0.9rem' }}>{p.label}</span>
                       </label>
                     ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 15, background: '#ebf8ff', borderRadius: 8 }}>
                  <input 
                    type="checkbox" 
                    id="is-public" 
                    checked={formData.isPublic} 
                    onChange={e => setFormData({...formData, isPublic: e.target.checked})} 
                  />
                  <label htmlFor="is-public" style={{ fontWeight: 600, color: '#2c5282', cursor: 'pointer', margin: 0 }}>Show on Public "News & Updates" page</label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                  <button type="button" className="portal-btn-ghost" onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={loading} style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane" style={{ marginRight: 8 }}></i>}
                    {editingId ? 'Update Broadcast' : 'Publish Broadcast'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

