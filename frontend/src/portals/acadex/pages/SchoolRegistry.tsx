import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AcadexSchools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Modal States
  const [editSchool, setEditSchool] = useState<any>(null);
  const [planSchool, setPlanSchool] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data } = await api.get('/api/dashboard/acadex');
      setSchools(Array.isArray(data.schools) ? data.schools : []);
    } catch (err) {
      console.error('Failed to fetch registry:', err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (code: string, updates: any) => {
    try {
      await api.patch(`/api/schools/${code}`, updates);
      fetchSchools();
      setEditSchool(null);
      setPlanSchool(null);
    } catch (err) {
      alert('Failed to update school');
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!userId) {
      alert('No admin found for this school to impersonate.');
      return;
    }
    
    try {
      const { data } = await api.post(`/api/auth/impersonate/${userId}`);
      // Save impersonation state
      localStorage.setItem('acadex_token', data.token);
      localStorage.setItem('acadex_user', JSON.stringify(data.user));
      // Redirect to school dashboard
      window.location.href = '/admin/dashboard';
    } catch (err) {
      alert('Failed to start impersonation session');
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete school ${code}? All data will be lost.`)) return;
    try {
      await api.delete(`/api/schools/${code}`);
      fetchSchools();
    } catch (err) {
      alert('Failed to delete school');
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>School Registry</h1>
        <p>Manage all registered school instances, update subscription levels, and monitor tenant health.</p>
      </div>

      <div className="portal-card" style={{ overflow: 'visible' }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-university" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Registered Tenants</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              type="text" 
              placeholder="Search schools..." 
              className="portal-input" 
              style={{ width: 250 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button className="portal-btn-primary" onClick={() => window.location.href='/acadex/provision'}>+ Provision School</button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ textAlign: 'center', padding: 40 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
                <p>Loading registry...</p>
             </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>License ID</th>
                  <th>School Name</th>
                  <th>Region</th>
                  <th>Current Plan</th>
                  <th>Status</th>
                  <th>Next Renewal</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(filteredSchools) ? filteredSchools : []).length > 0 ? (Array.isArray(filteredSchools) ? filteredSchools : []).map((school) => (
                  <tr key={school.id}>
                    <td style={{ fontSize: '0.85rem', color: '#718096', fontWeight: 700 }}>{school.id}</td>
                    <td style={{ fontWeight: 600 }}>{school.name}</td>
                    <td>{school.country}</td>
                    <td><span className="portal-badge info">{school.plan}</span></td>
                    <td>
                      <span className={`portal-badge ${
                        school.status === 'Active' ? 'success' : 
                        school.status === 'Suspended' ? 'danger' : 'neutral'
                      }`}>
                        {school.status}
                      </span>
                    </td>
                    <td>{school.renewal}</td>
                    <td>
                      <div className="portal-dropdown-wrap">
                        <button 
                          className="portal-btn-secondary" 
                          style={{ padding: '6px 12px' }}
                          onClick={() => setActiveDropdown(activeDropdown === school.id ? null : school.id)}
                        >
                          Actions <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', marginLeft: 4 }}></i>
                        </button>
                        
                        {activeDropdown === school.id && (
                          <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setActiveDropdown(null)}></div>
                            <div className="portal-dropdown">
                              <button className="portal-dropdown-item" onClick={() => window.location.href = `/acadex/schools/${school.id}`}>
                                <i className="fas fa-eye"></i> View Profile
                              </button>
                              <button className="portal-dropdown-item" onClick={() => { setEditSchool(school); setActiveDropdown(null); }}>
                                <i className="fas fa-edit"></i> Edit School Info
                              </button>
                              <button className="portal-dropdown-item" onClick={() => { setPlanSchool(school); setActiveDropdown(null); }}>
                                <i className="fas fa-sync"></i> Change Plan
                              </button>
                              <button className="portal-dropdown-item" onClick={() => handleImpersonate(school.adminId)}>
                                <i className="fas fa-user-secret"></i> Impersonate Admin
                              </button>
                              <div className="portal-dropdown-divider"></div>
                              <button 
                                className="portal-dropdown-item" 
                                style={{ color: school.status === 'Active' ? 'var(--portal-danger)' : 'var(--portal-success)' }}
                                onClick={() => { handleUpdate(school.id, { status: school.status === 'Active' ? 'suspended' : 'active' }); setActiveDropdown(null); }}
                              >
                                <i className={school.status === 'Active' ? 'fas fa-pause' : 'fas fa-play'}></i> 
                                {school.status === 'Active' ? 'Suspend School' : 'Activate School'}
                              </button>
                              <button className="portal-dropdown-item" style={{ color: 'var(--portal-danger)' }} onClick={() => { handleDelete(school.id); setActiveDropdown(null); }}>
                                <i className="fas fa-trash-alt"></i> Terminate Tenant
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No schools found in the registry.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editSchool && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h2>Edit School Information</h2>
              <button className="portal-modal-close" onClick={() => setEditSchool(null)}>&times;</button>
            </div>
            <div className="portal-modal-body">
               <div className="portal-form-group">
                  <label>Legal School Name</label>
                  <input type="text" className="portal-input" defaultValue={editSchool.name} id="edit-name" />
               </div>
               <div className="portal-form-group">
                  <label>Primary Contact Email</label>
                  <input type="email" className="portal-input" defaultValue={editSchool.email || ''} id="edit-email" />
               </div>
               <div className="portal-form-group">
                  <label>Region / Country</label>
                  <select className="portal-input" defaultValue={editSchool.country} id="edit-country">
                    <option>Zimbabwe</option>
                    <option>South Africa</option>
                    <option>Zambia</option>
                  </select>
               </div>
               <div className="portal-form-group">
                  <label>School Type</label>
                  <select className="portal-input" defaultValue={editSchool.type} id="edit-type">
                    <option value="Primary">Primary School</option>
                    <option value="Secondary">Secondary School</option>
                    <option value="Combined">Combined (P-S)</option>
                    <option value="Nursing">Nursing / Medical School</option>
                    <option value="Polytechnic">Polytechnic / Technical College</option>
                    <option value="University">University / Tertiary Institution</option>
                    <option value="Seminary">Seminary / Theological</option>
                  </select>
               </div>
               <div className="portal-form-group">
                  <label>HEXCO Center Number</label>
                  <input type="text" className="portal-input" defaultValue={editSchool.hexcoCenterNumber || ''} id="edit-hexco" placeholder="e.g., K-0123" />
               </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setEditSchool(null)}>Cancel</button>
              <button className="portal-btn-primary" onClick={() => {
                const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                const email = (document.getElementById('edit-email') as HTMLInputElement).value;
                const country = (document.getElementById('edit-country') as HTMLSelectElement).value;
                const type = (document.getElementById('edit-type') as HTMLSelectElement).value;
                const hexcoCenterNumber = (document.getElementById('edit-hexco') as HTMLInputElement).value;
                handleUpdate(editSchool.id, { name, email, country, type, hexcoCenterNumber });
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {planSchool && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h2>Change Subscription Plan</h2>
              <button className="portal-modal-close" onClick={() => setPlanSchool(null)}>&times;</button>
            </div>
            <div className="portal-modal-body">
               <p style={{ marginBottom: 20 }}>Current Plan: <strong>{planSchool.plan}</strong></p>
               <div style={{ display: 'grid', gap: 12 }}>
                  {['Starter', 'Professional', 'Enterprise'].map(p => (
                    <button 
                      key={p} 
                      className={`portal-btn-secondary ${planSchool.plan === p ? 'active' : ''}`}
                      style={{ 
                        justifyContent: 'flex-start', 
                        padding: 16,
                        borderColor: planSchool.plan === p ? 'var(--portal-primary)' : '' ,
                        background: planSchool.plan === p ? 'rgba(var(--portal-primary-rgb), 0.05)' : ''
                      }}
                      onClick={() => handleUpdate(planSchool.id, { planName: p })}
                    >
                      <i className={`fas ${planSchool.plan === p ? 'fa-check-circle' : 'fa-circle'}`} style={{ color: planSchool.plan === p ? 'var(--portal-primary)' : '#cbd5e0' }}></i>
                      <div style={{ marginLeft: 10 }}>
                         <div style={{ fontWeight: 700 }}>{p}</div>
                         <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{p === 'Starter' ? '$49/mo' : p === 'Professional' ? '$149/mo' : 'Custom Pricing'}</div>
                      </div>
                    </button>
                  ))}
               </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setPlanSchool(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
