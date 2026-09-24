import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function AcadexSchools() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modal States
  const [editSchool, setEditSchool] = useState<any>(null);
  const [planSchool, setPlanSchool] = useState<any>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data } = await api.get('/api/dashboard/acadex');
      setSchools(Array.isArray(data.schools) ? data.schools : []);
    } catch (err) {
      console.error('Failed to fetch registry:', err);
      showToast('Failed to load school registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (code: string, updates: any) => {
    try {
      await api.patch(`/api/schools/${code}`, updates);
      showToast('School updated successfully', 'success');
      fetchSchools();
      setEditSchool(null);
      setPlanSchool(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update school', 'error');
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!userId) {
      showToast('No administrator associated with this school', 'warning');
      return;
    }

    try {
      const { data } = await api.post(`/api/auth/impersonate/${userId}`);
      localStorage.setItem('acadex_token', data.token);
      localStorage.setItem('acadex_user', JSON.stringify(data.user));
      showToast(`Impersonating school administrator...`, 'info');
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start impersonation session', 'error');
    }
  };

  const handleDelete = async (code: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete school "${name}" (${code})? All associated records will be deactivated.`)) {
      return;
    }

    try {
      await api.delete(`/api/schools/${code}`);
      showToast('School deleted successfully', 'success');
      fetchSchools();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete school', 'error');
    }
  };

  const filteredSchools = schools.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.country || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1>School Registry</h1>
          <p>Manage all registered school instances, configure subscription parameters, and inspect tenant health.</p>
        </div>
        <button className="portal-btn-primary" onClick={() => navigate('/acadex/provision')}>
          <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Provision School
        </button>
      </div>

      <div className="portal-card" style={{ overflow: 'visible' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <h2><i className="fas fa-university" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Registered Tenants ({schools.length})</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search schools..."
              className="portal-input"
              style={{ width: 260 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p style={{ marginTop: 10, color: '#64748b' }}>Loading registry...</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>License ID</th>
                  <th>School Name</th>
                  <th>Country</th>
                  <th>Plan</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length > 0 ? (
                  filteredSchools.map(school => (
                    <tr key={school.id || school.code}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--portal-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                        {school.code || school.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{school.name}</td>
                      <td>{school.country}</td>
                      <td><span className="portal-badge info">{school.plan}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {school.studentsCount ?? 0}
                      </td>
                      <td>
                        <span className={`portal-badge ${
                          school.status === 'Active' || school.status === 'active' ? 'success' :
                          school.status === 'Suspended' || school.status === 'suspended' ? 'danger' : 'neutral'
                        }`}>
                          {school.status}
                        </span>
                      </td>
                      <td>
                        <div className="portal-dropdown-wrap" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            className="portal-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => setActiveDropdown(activeDropdown === (school.code || school.id) ? null : (school.code || school.id))}
                          >
                            Actions <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', marginLeft: 4 }}></i>
                          </button>

                          {activeDropdown === (school.code || school.id) && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setActiveDropdown(null)}></div>
                              <div className="portal-dropdown" style={{ zIndex: 1000 }}>
                                <button
                                  className="portal-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    navigate(`/acadex/schools/${school.code || school.id}`);
                                  }}
                                >
                                  <i className="fas fa-eye"></i> View Profile
                                </button>
                                <button
                                  className="portal-dropdown-item"
                                  onClick={() => {
                                    setEditSchool(school);
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <i className="fas fa-edit"></i> Edit School Info
                                </button>
                                <button
                                  className="portal-dropdown-item"
                                  onClick={() => {
                                    setPlanSchool(school);
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <i className="fas fa-sync"></i> Change Plan
                                </button>
                                {school.adminId && (
                                  <button
                                    className="portal-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      handleImpersonate(school.adminId);
                                    }}
                                  >
                                    <i className="fas fa-user-secret"></i> Impersonate Admin
                                  </button>
                                )}
                                <div className="portal-dropdown-divider"></div>
                                <button
                                  className="portal-dropdown-item"
                                  style={{ color: school.status === 'Active' || school.status === 'active' ? 'var(--portal-danger)' : 'var(--portal-success)' }}
                                  onClick={() => {
                                    const nextStatus = (school.status === 'Active' || school.status === 'active') ? 'suspended' : 'active';
                                    handleUpdate(school.code || school.id, { status: nextStatus });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <i className={(school.status === 'Active' || school.status === 'active') ? 'fas fa-pause' : 'fas fa-play'}></i>
                                  {(school.status === 'Active' || school.status === 'active') ? 'Suspend School' : 'Activate School'}
                                </button>
                                <button
                                  className="portal-dropdown-item"
                                  style={{ color: 'var(--portal-danger)' }}
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handleDelete(school.code || school.id, school.name);
                                  }}
                                >
                                  <i className="fas fa-trash-alt"></i> Terminate Tenant
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>
                      No schools found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit School Info Modal */}
      {editSchool && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 550 }}>
            <div className="portal-modal-header">
              <h2>Edit School Information</h2>
              <button className="portal-modal-close" onClick={() => setEditSchool(null)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div className="portal-form-group" style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Legal School Name</label>
                <input type="text" className="portal-input" defaultValue={editSchool.name} id="edit-name" />
              </div>
              <div className="portal-form-group" style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Primary Contact Email</label>
                <input type="email" className="portal-input" defaultValue={editSchool.adminEmail || editSchool.email || ''} id="edit-email" />
              </div>
              <div className="portal-form-group" style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input type="text" className="portal-input" defaultValue={editSchool.phone || ''} id="edit-phone" placeholder="+263..." />
              </div>
              <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Region / Country</label>
                  <select className="portal-input" defaultValue={editSchool.country || 'Zimbabwe'} id="edit-country">
                    <option>Zimbabwe</option>
                    <option>South Africa</option>
                    <option>Zambia</option>
                    <option>Botswana</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>School Type</label>
                  <select className="portal-input" defaultValue={editSchool.type || 'Secondary'} id="edit-type">
                    <option value="Primary">Primary School</option>
                    <option value="Secondary">Secondary School</option>
                    <option value="Combined">Combined School</option>
                    <option value="Nursing">Nursing / Medical</option>
                    <option value="Polytechnic">Polytechnic / TVET</option>
                    <option value="University">University</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="portal-btn-secondary" onClick={() => setEditSchool(null)}>Cancel</button>
              <button
                className="portal-btn-primary"
                onClick={() => {
                  const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                  const email = (document.getElementById('edit-email') as HTMLInputElement).value;
                  const phone = (document.getElementById('edit-phone') as HTMLInputElement).value;
                  const country = (document.getElementById('edit-country') as HTMLSelectElement).value;
                  const type = (document.getElementById('edit-type') as HTMLSelectElement).value;
                  handleUpdate(editSchool.code || editSchool.id, { name, email, phone, country, type });
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {planSchool && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header">
              <h2>Change Subscription Plan</h2>
              <button className="portal-modal-close" onClick={() => setPlanSchool(null)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <p style={{ marginBottom: 15, color: '#64748b' }}>
                Current Plan for <strong>{planSchool.name}</strong>: <span className="portal-badge info">{planSchool.plan}</span>
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                {['Starter', 'Professional', 'Enterprise'].map(p => (
                  <button
                    key={p}
                    className={`portal-btn-secondary ${planSchool.plan === p ? 'active' : ''}`}
                    style={{
                      justifyContent: 'flex-start',
                      padding: 14,
                      borderColor: planSchool.plan === p ? 'var(--portal-primary)' : '#e2e8f0',
                      background: planSchool.plan === p ? 'rgba(56, 189, 248, 0.08)' : '#fff'
                    }}
                    onClick={() => handleUpdate(planSchool.code || planSchool.id, { planName: p })}
                  >
                    <i className={`fas ${planSchool.plan === p ? 'fa-check-circle' : 'fa-circle'}`} style={{ color: planSchool.plan === p ? 'var(--portal-primary)' : '#cbd5e0', marginRight: 10 }}></i>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p} Plan</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>$2.00 / active student / month</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button className="portal-btn-secondary" onClick={() => setPlanSchool(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
