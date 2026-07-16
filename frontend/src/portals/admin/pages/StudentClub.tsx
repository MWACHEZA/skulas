import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/portal.css';

export default function StudentClub() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const { user } = useAuth();
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0],
    category: '',
    patron: '',
    chairperson: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchClubs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load users for selectors:', err);
    
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await api.get('/api/schools/clubs-list');
      setClubs(res.data);
    } catch (err) {
      showToast(`Failed to load ${t('clubs').toLowerCase()
    }`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({ 
      name: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0],
      category: '',
      patron: '',
      chairperson: ''
    });
    setEditingClubId(null);
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (club: any) => {
    setFormData({ 
      name: club.name, 
      description: club.description || '', 
      date: club.date ? new Date(club.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: club.category || '',
      patron: club.patron || '',
      chairperson: club.chairperson || ''
    });
    setEditingClubId(club.id);
    setLogoFile(null);
    setLogoPreview(club.icon ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${club.icon}` : null);
    setShowModal(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);

    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('description', formData.description);
    submitData.append('date', formData.date);
    submitData.append('category', formData.category);
    submitData.append('patron', formData.patron);
    submitData.append('chairperson', formData.chairperson);
    if (logoFile) {
      submitData.append('logo', logoFile);
    }

    try {
      if (editingClubId) {
        await api.patch(`/api/schools/clubs-list/${editingClubId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('club')} updated successfully`, 'success');
      } else {
        await api.post('/api/schools/clubs-list', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('club')} registered successfully`, 'success');
      }
      setShowModal(false);
      fetchClubs();
    } catch (err) {
      showToast(`Failed to save ${t('club').toLowerCase()
    }`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm(`Are you sure you want to delete this ${t('club').toLowerCase()}?`))) return;
    try {
      await api.delete(`/api/schools/clubs-list/${id}`);
      showToast(`${t('club')} deleted`, 'success');
      fetchClubs();
    } catch (err) {
      showToast(`Failed to delete ${t('club').toLowerCase()
    }`, 'error');
    }
  };

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-users mr-2"></i> {t('club')} Management</h1>
          <p>Organize and manage extra-curricular student groups and activities.</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div className="portal-card animate-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><i className="fas fa-list mr-2"></i> Institutional {t('clubs')}</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="portal-badge" style={{ background: 'var(--portal-primary)', color: 'white' }}>{clubs.length} Total</div>
              <button 
                className="portal-btn-primary" 
                onClick={handleOpenAddModal}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-plus"></i> Register {t('club')}
              </button>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Logo</th>
                  <th>{t('club')} Name</th>
                  <th>Category</th>
                  <th>Patron</th>
                  <th>Chairperson</th>
                  <th>Established</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading {t('clubs').toLowerCase()}...</td></tr>
                ) : clubs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No {t('clubs').toLowerCase()} found.</td></tr>
                ) : clubs.map(club => {
                  const logoUrl = club.icon ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${club.icon}` : null;
                  return (
                    <tr key={club.id}>
                      <td>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0'
                        }}>
                          {logoUrl ? (
                            <img src={logoUrl} alt={club.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="fas fa-users" style={{ color: '#94a3b8' }}></i>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{club.name}</td>
                      <td><span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{club.category || '—'}</span></td>
                      <td style={{ color: '#475569', fontSize: '0.875rem' }}>{club.patron || '—'}</td>
                      <td style={{ color: '#475569', fontSize: '0.875rem' }}>{club.chairperson || '—'}</td>
                      <td>{new Date(club.date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleOpenEditModal(club)} className="portal-btn-action edit" title={`Edit ${t('club')}`}>
                            <i className="fas fa-pencil-alt"></i>
                          </button>
                          <button onClick={() => handleDelete(club.id)} className="portal-btn-action delete" title={`Delete ${t('club')}`}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingClubId ? 'Edit' : 'Register New'} {t('club')}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure student society profile, description, and founding date.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '72px', height: '72px', borderRadius: '50%', background: '#f8fafc', border: '2px dashed #cbd5e1', 
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: '1.5rem' }}></i>
                    )}
                  </div>
                  <div className="portal-form-group" style={{ flex: 1 }}>
                    <label className="portal-label">Club Logo / Symbol</label>
                    <input type="file" accept="image/*" onChange={handleLogoChange} />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">{t('club')} Name *</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder={`e.g. Chess ${t('club')}, Debate Society`}
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Description</label>
                  <textarea 
                    className="portal-input" 
                    style={{ minHeight: '80px' }}
                    placeholder={`Briefly describe this ${t('club').toLowerCase()}'s purpose...`}
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Category</label>
                  <select 
                    className="portal-input"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    <option value="Academic">Academic</option>
                    <option value="Arts & Culture">Arts &amp; Culture</option>
                    <option value="Community Service">Community Service</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Religious">Religious</option>
                    <option value="Sports">Sports</option>
                    <option value="Technology">Technology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="portal-form-group">
                    <label className="portal-label">Patron (Staff Member)</label>
                    <select
                      className="portal-input"
                      value={formData.patron}
                      onChange={e => setFormData({...formData, patron: e.target.value})}
                    >
                      <option value="">Select Patron</option>
                      {users
                        .filter((u: any) => ['SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'CLINIC'].includes(u.role))
                        .map((u: any) => (
                          <option key={u.id} value={u.name}>
                            {u.name} ({u.role.replace('_', ' ')})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Chairperson</label>
                    <select
                      className="portal-input"
                      value={formData.chairperson}
                      onChange={e => setFormData({...formData, chairperson: e.target.value})}
                    >
                      <option value="">Select Chairperson</option>
                      {users
                        .filter((u: any) => u.role === 'STUDENT')
                        .map((u: any) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    {editingClubId ? 'Update' : 'Save'} {t('club')}
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
