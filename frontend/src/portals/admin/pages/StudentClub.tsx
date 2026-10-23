import { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import { SearchInput, ExportButton, SearchableCombobox, type ComboboxOption, SkeletonLoader, PaginatedTable } from '../../../components/shared';
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
  const [searchQuery, setSearchQuery] = useState('');

  const patronOptions = useMemo<ComboboxOption[]>(() => {
    return users
      .filter((u: any) => ['SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'CLINIC'].includes(u.role))
      .map((u: any) => ({
        value: u.name,
        label: u.name,
        badge: u.role ? u.role.replace('_', ' ') : 'Staff'
      }));
  }, [users]);

  const chairpersonOptions = useMemo<ComboboxOption[]>(() => {
    return users
      .filter((u: any) => u.role === 'STUDENT')
      .map((u: any) => ({
        value: u.name,
        label: u.name,
        badge: 'Student'
      }));
  }, [users]);

  const filteredClubs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clubs;
    return clubs.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.patron || '').toLowerCase().includes(q) ||
      (c.chairperson || '').toLowerCase().includes(q)
    );
  }, [clubs, searchQuery]);

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
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '20px',
        padding: '28px',
        color: '#ffffff',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Extra-Curricular Activities
          </span>
          <h1 style={{ margin: '8px 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#ffffff' }}>
            <i className="fas fa-users mr-3" style={{ color: '#38bdf8' }}></i>
            {t('club')} & Societies Hub
          </h1>
          <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
            Register student societies, assign academic patrons, and track student leadership.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ExportButton
            data={filteredClubs.map(c => ({
              'Club Name': c.name,
              'Category': c.category || 'General',
              'Patron': c.patron || 'Unassigned',
              'Chairperson': c.chairperson || 'Unassigned',
              'Founded Date': c.date ? new Date(c.date).toLocaleDateString() : '—'
            }))}
            filename="clubs_and_societies_roster"
            title={`${t('club')} & Societies Directory`}
            headers={['Club Name', 'Category', 'Patron', 'Chairperson', 'Founded Date']}
          />
          <button 
            className="portal-btn-primary" 
            onClick={handleOpenAddModal}
            style={{ padding: '0 24px', fontWeight: 900, height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <i className="fas fa-plus"></i> Register {t('club')}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Registered</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{clubs.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, marginTop: 2 }}>Active societies</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-sitemap"></i>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Academic & Tech</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
              {clubs.filter(c => ['Academic', 'Technology'].includes(c.category)).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: 2 }}>Curricular extensions</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-laptop-code"></i>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Arts & Culture</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
              {clubs.filter(c => ['Arts & Culture', 'Religious', 'Community Service'].includes(c.category)).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700, marginTop: 2 }}>Creative & social</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-palette"></i>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Staff Patrons</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
              {clubs.filter(c => !!c.patron).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: 2 }}>Faculty mentors</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-user-tie"></i>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="portal-card animate-in" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search clubs by name, category, patron, or chairperson..."
            />
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <SkeletonLoader type="table" rows={6} columns={7} />
            ) : (
              <PaginatedTable className="portal-table">
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
                  {filteredClubs.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No matching {t('clubs').toLowerCase()} found.</td></tr>
                  ) : filteredClubs.map(club => {
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
                          <button onClick={() => handleOpenEditModal(club)} className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }} title={`Edit ${t('club')}`}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => handleDelete(club.id)} className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }} title={`Delete ${t('club')}`}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>
            )}
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
                    <SearchableCombobox
                      label="Patron (Staff Member)"
                      placeholder="Select staff patron..."
                      searchPlaceholder="Search staff member..."
                      options={patronOptions}
                      value={formData.patron}
                      onChange={(val: string) => setFormData({ ...formData, patron: val })}
                      allowCustom={true}
                    />
                  </div>
                  <div className="portal-form-group">
                    <SearchableCombobox
                      label="Chairperson"
                      placeholder="Select student chairperson..."
                      searchPlaceholder="Search student..."
                      options={chairpersonOptions}
                      value={formData.chairperson}
                      onChange={(val: string) => setFormData({ ...formData, chairperson: val })}
                      allowCustom={true}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" className="portal-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={saving} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    {editingClubId ? 'UPDATE' : 'SAVE'} {t('club').toUpperCase()}
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
