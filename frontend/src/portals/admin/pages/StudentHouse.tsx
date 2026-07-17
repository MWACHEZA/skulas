import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/portal.css';

export default function StudentHouse() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const { user } = useAuth();
  
  const [houses, setHouses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '',
    houseMasterId: '',
    houseCaptainId: '',
    color: 'var(--portal-primary)',
    motto: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchHouses();
    fetchRosters();
  }, []);

  const fetchHouses = async () => {
    try {
      const res = await api.get('/api/schools/houses');
      setHouses(res.data);
    } catch (err) {
      showToast(`Failed to load ${t('houses').toLowerCase()
    }`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRosters = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/api/teachers'),
        api.get('/api/students?limit=1000')
      ]);
      setTeachers(tRes.data.teachers || []);
      setStudents(sRes.data.students || []);
    } catch (err) {
      console.error('Failed to load roster listings:', err);
    
    }
  };

  const handleOpenAddModal = () => {
    setFormData({ name: '', description: '', houseMasterId: '', houseCaptainId: '', color: 'var(--portal-primary)', motto: '' });
    setEditingHouseId(null);
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (house: any) => {
    setFormData({ 
      name: house.name, 
      description: house.description || '', 
      houseMasterId: house.houseMasterId || '',
      houseCaptainId: house.houseCaptainId || '',
      color: house.color || 'var(--portal-primary)',
      motto: house.motto || ''
    });
    setEditingHouseId(house.id);
    setLogoFile(null);
    setLogoPreview(house.logo ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${house.logo}` : null);
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
    submitData.append('houseMasterId', formData.houseMasterId);
    submitData.append('houseCaptainId', formData.houseCaptainId);
    submitData.append('color', formData.color);
    submitData.append('motto', formData.motto);
    if (logoFile) {
      submitData.append('logo', logoFile);
    }

    try {
      if (editingHouseId) {
        await api.patch(`/api/schools/houses/${editingHouseId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('house')} updated successfully`, 'success');
      } else {
        await api.post('/api/schools/houses', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('house')} created successfully`, 'success');
      }
      setShowModal(false);
      fetchHouses();
    } catch (err) {
      showToast(`Failed to save ${t('house').toLowerCase()
    }`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm(`Are you sure you want to delete this ${t('house').toLowerCase()}?`))) return;
    try {
      await api.delete(`/api/schools/houses/${id}`);
      showToast(`${t('house')} deleted`, 'success');
      fetchHouses();
    } catch (err) {
      showToast(`Failed to delete ${t('house').toLowerCase()
    }`, 'error');
    }
  };

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-home mr-2"></i> {t('house')} Management</h1>
          <p>Manage residential {t('houses').toLowerCase()}, caretakers, and competitive student leaders.</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div className="portal-card animate-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><i className="fas fa-list mr-2"></i> Registered {t('houses')}</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="portal-badge" style={{ background: 'var(--portal-primary)', color: 'white' }}>{houses.length} Total</div>
              <button 
                className="portal-btn-primary" 
                onClick={handleOpenAddModal}
                style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <i className="fas fa-plus-circle"></i> ADD {t('house').toUpperCase()}
              </button>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Logo</th>
                  <th>{t('house')} Name</th>
                  <th>Description</th>
                  <th>House Master</th>
                  <th>House Captain</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading {t('houses').toLowerCase()}...</td></tr>
                ) : houses.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No {t('houses').toLowerCase()} found.</td></tr>
                ) : (() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = houses.slice(indexOfFirstItem, indexOfLastItem);
                  
                  return currentItems.map(house => {
                    const logoUrl = house.logo ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${house.logo}` : null;
                    return (
                      <tr key={house.id}>
                        <td>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0'
                          }}>
                            {logoUrl ? (
                              <img src={logoUrl} alt={house.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="fas fa-home" style={{ color: '#94a3b8' }}></i>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{house.name}</td>
                        <td style={{ color: '#64748b' }}>{house.description || 'No description'}</td>
                        <td style={{ fontWeight: 700, color: '#334155' }}>
                          {house.houseMaster ? `${house.houseMaster.title || 'Mr/Mrs.'} ${house.houseMaster.user?.name}` : 'Not Assigned'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#334155' }}>
                          {house.houseCaptain ? `${house.houseCaptain.name} (${house.houseCaptain.studentId})` : 'Not Assigned'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleOpenEditModal(house)} className="portal-btn-ghost" title={`Edit ${t('house')}`} style={{ padding: '8px', width: '36px', height: '36px', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button onClick={() => handleDelete(house.id)} className="portal-btn-ghost" title={`Delete ${t('house')}`} style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            
            {!loading && houses.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, houses.length)} of {houses.length} entries
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(houses.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(houses.length / itemsPerPage) || houses.length === 0}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingHouseId ? 'Edit' : 'Add New'} {t('house')}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure residential profile, caretakers, and student leaders.</p>
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
                    <label className="portal-label">House Logo / Banner</label>
                    <input type="file" accept="image/*" onChange={handleLogoChange} />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">{t('house')} Name *</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder={`e.g. Green ${t('house')}, Red ${t('house')}`}
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="portal-grid-2">
                  <div className="portal-form-group">
                    <label className="portal-label">House Theme Color</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={formData.color} 
                        onChange={e => setFormData({...formData, color: e.target.value})}
                        style={{ width: '42px', height: '42px', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer', padding: 0 }}
                      />
                      <input 
                        type="text" 
                        className="portal-input" 
                        value={formData.color} 
                        onChange={e => setFormData({...formData, color: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">House Motto</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. Soar Above the Rest"
                      value={formData.motto} 
                      onChange={e => setFormData({...formData, motto: e.target.value})}
                    />
                  </div>
                </div>

                <div className="portal-grid-2">
                  <div className="portal-form-group">
                    <label className="portal-label">House Master / Patron</label>
                    <select 
                      className="portal-input"
                      value={formData.houseMasterId}
                      onChange={e => setFormData({...formData, houseMasterId: e.target.value})}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="">-- Select Instructor --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title || 'Mr/Mrs.'} {t.user?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">House Captain</label>
                    <select 
                      className="portal-input"
                      value={formData.houseCaptainId}
                      onChange={e => setFormData({...formData, houseCaptainId: e.target.value})}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="">-- Select Student --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Description</label>
                  <textarea 
                    className="portal-input" 
                    style={{ minHeight: '80px' }}
                    placeholder={`Briefly describe this ${t('house').toLowerCase()}...`}
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    {editingHouseId ? 'Update' : 'Save'} {t('house')}
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
