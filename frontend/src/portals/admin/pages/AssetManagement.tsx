import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function AssetManagement() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [resolveForm, setResolveForm] = useState({ fixDetails: '', newStatus: 'good' });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/api/assets');
      setAssets(data);
    } catch (err) {
      showToast('Failed to fetch school assets', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/api/assets/incident/${selectedIncident.id}/resolve`, resolveForm);
      showToast('Incident resolved and asset status updated', 'success');
      setIsResolveModalOpen(false);
      fetchAssets();
    } catch (err) {
      showToast('Failed to resolve incident', 'error');
    
    }
  };

  const calculateStats = () => {
    const total = assets.length;
    const incidents = assets.reduce((acc, a) => acc + a.incidents.filter((i: any) => i.status === 'PENDING').length, 0);
    const today = new Date();
    const maintDue = assets.filter(a => a.nextMaintenance && new Date(a.nextMaintenance) <= today).length;
    const value = assets.reduce((acc, a) => acc + (a.purchasePrice || 0), 0);

    return { total, incidents, maintDue, value };
  };

  const stats = calculateStats();

  return (
    <>
      <div className="portal-page-header">
        <h1>Asset Oversight & Maintenance</h1>
        <p>Track school property, manage incidents, and maintain valuation records.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-boxes"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.total}</h3>
            <p>Global Assets</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.incidents}</h3>
            <p>Open Incidents</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-wrench"></i></div>
          <div className="portal-stat-info">
            <h3>{stats.maintDue}</h3>
            <p>Maint. Overdue</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-dollar-sign"></i></div>
          <div className="portal-stat-info">
            <h3>${stats.value.toLocaleString()}</h3>
            <p>Global Value</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main Register */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-list-ul" style={{ marginRight: 8 }}></i>Asset Register</h2>
            <button className="portal-btn-primary" onClick={() => setIsRegisterModalOpen(true)}>
                <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Register Asset
            </button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
            ) : (
                <table className="portal-table">
                    <thead>
                        <tr>
                            <th>Asset Name</th>
                            <th>Custodian</th>
                            <th>Location</th>
                            <th>Condition</th>
                            <th>Next Maint.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(a => (
                            <tr key={a.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                                    <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{a.category} • {a.serialNumber || 'No SN'}</span>
                                </td>
                                <td>{a.custodian?.name || 'Unassigned'}</td>
                                <td>{a.location}</td>
                                <td>
                                    <span className={`portal-badge ${a.condition === 'good' || a.condition === 'excellent' ? 'success' : a.condition === 'fair' ? 'info' : 'danger'}`}>
                                        {a.condition.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    {a.nextMaintenance ? (
                                        <span style={{ 
                                            color: new Date(a.nextMaintenance) <= new Date() ? 'var(--portal-danger)' : '#718096',
                                            fontWeight: new Date(a.nextMaintenance) <= new Date() ? 700 : 400
                                        }}>
                                            {new Date(a.nextMaintenance).toLocaleDateString()}
                                            {new Date(a.nextMaintenance) <= new Date() && <i className="fas fa-clock" style={{ marginLeft: 5 }}></i>}
                                        </span>
                                    ) : 'Not Set'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
        </div>

        {/* Side Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Reported Incidents */}
            <div className="portal-card">
                <div className="portal-card-header">
                    <h3>Reported Incidents</h3>
                </div>
                <div className="portal-card-body" style={{ padding: '15px' }}>
                    {assets.every(a => a.incidents.length === 0) ? (
                        <p style={{ textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem' }}>No reported incidents.</p>
                    ) : (
                        assets.flatMap(a => a.incidents.map((i: any) => ({...i, assetName: a.name}))).map((incident: any) => (
                            <div key={incident.id} style={{ 
                                padding: '12px', borderRadius: 8, marginBottom: 12, borderLeft: `4px solid ${incident.status === 'RESOLVED' ? 'var(--portal-success)' : 'var(--portal-danger)'}`,
                                backgroundColor: incident.status === 'RESOLVED' ? '#f0fff4' : '#fff5f5'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{incident.assetName}</span>
                                    <span style={{ fontSize: '0.7rem', color: incident.status === 'RESOLVED' ? 'var(--portal-success)' : 'var(--portal-danger)', fontWeight: 700 }}>{incident.status}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4a5568' }}>{incident.details}</p>
                                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#718096', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>By: {incident.reporter.name}</span>
                                    {incident.status === 'PENDING' && (
                                        <button className="portal-link-btn" onClick={() => {
                                            setSelectedIncident(incident);
                                            setIsResolveModalOpen(true);
                                        }}>Resolve</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Maintenance Panel */}
            <div className="portal-card">
                <div className="portal-card-header">
                    <h3>Maintenance</h3>
                </div>
                <div className="portal-card-body" style={{ padding: '15px' }}>
                    {assets.filter(a => a.nextMaintenance).map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ fontWeight: 600 }}>{a.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#718096' }}>{a.location}</div>
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--portal-primary)', fontWeight: 600 }}>{new Date(a.nextMaintenance).toLocaleDateString()}</span>
                        </div>
                    ))}
                    {assets.filter(a => a.nextMaintenance).length === 0 && (
                        <p style={{ textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem' }}>No maintenance scheduled.</p>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {isResolveModalOpen && (
          <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 500 }}>
                  <div className="portal-modal-header">
                      <h2>Resolve Incident</h2>
                      <button className="modal-close" onClick={() => setIsResolveModalOpen(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleResolveIncident}>
                      <div className="portal-modal-body">
                          <p style={{ fontSize: '0.9rem', marginBottom: 20 }}><strong>Asset:</strong> {selectedIncident?.assetName}<br/><strong>Issue:</strong> {selectedIncident?.details}</p>
                          <div style={{ display: 'grid', gap: 16 }}>
                              <div>
                                  <label className="portal-label">Fix Details / Actions Taken</label>
                                  <textarea 
                                    className="portal-input" 
                                    rows={4} 
                                    value={resolveForm.fixDetails}
                                    onChange={e => setResolveForm({...resolveForm, fixDetails: e.target.value})}
                                    required
                                  ></textarea>
                              </div>
                              <div>
                                  <label className="portal-label">New Asset Condition</label>
                                  <select 
                                    className="portal-input"
                                    value={resolveForm.newStatus}
                                    onChange={e => setResolveForm({...resolveForm, newStatus: e.target.value})}
                                  >
                                      <option value="excellent">Excellent</option>
                                      <option value="good">Good</option>
                                      <option value="fair">Fair</option>
                                      <option value="damaged">Damaged (Still requires work)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                      <div className="portal-modal-footer">
                          <button type="button" className="portal-btn-neutral" onClick={() => setIsResolveModalOpen(false)}>Cancel</button>
                          <button type="submit" className="portal-btn-primary">Resolve Incident</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Register Asset Modal */}
      {isRegisterModalOpen && (
          <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 600 }}>
                  <div className="portal-modal-header">
                      <h2>Register New Asset</h2>
                      <button className="modal-close" onClick={() => setIsRegisterModalOpen(false)}>&times;</button>
                  </div>
                  <form onSubmit={async (e: any) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const data = Object.fromEntries(formData.entries());
                      try {
                          await api.post('/api/assets', data);
                          showToast('Asset registered successfully', 'success');
                          setIsRegisterModalOpen(false);
                          fetchAssets();
                      } catch (err) {
                          showToast('Failed to register asset', 'error');
                      
    }
                  }}>
                      <div className="portal-modal-body">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div>
                                  <label className="portal-label">Asset Name</label>
                                  <input name="name" className="portal-input" required />
                              </div>
                              <div>
                                  <label className="portal-label">Category</label>
                                  <select name="category" className="portal-input">
                                      <option value="Furniture">Furniture</option>
                                      <option value="Electronics">Electronics</option>
                                      <option value="Infrastructure">Infrastructure</option>
                                      <option value="Vehicle">Vehicle</option>
                                      <option value="Stationery">Stationery</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="portal-label">Serial Number</label>
                                  <input name="serialNumber" className="portal-input" />
                              </div>
                              <div>
                                  <label className="portal-label">Location</label>
                                  <input name="location" className="portal-input" placeholder="e.g. Lab 1, Admin Block" />
                              </div>
                              <div>
                                  <label className="portal-label">Initial Condition</label>
                                  <select name="condition" className="portal-input">
                                      <option value="excellent">Excellent</option>
                                      <option value="good">Good</option>
                                      <option value="fair">Fair</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="portal-label">Purchase Value ($)</label>
                                  <input name="purchasePrice" type="number" step="0.01" className="portal-input" />
                              </div>
                              <div>
                                  <label className="portal-label">Maint. Interval (Days)</label>
                                  <input name="maintenanceInterval" type="number" className="portal-input" placeholder="e.g. 30" />
                              </div>
                          </div>
                      </div>
                      <div className="portal-modal-footer">
                          <button type="button" className="portal-btn-neutral" onClick={() => setIsRegisterModalOpen(false)}>Cancel</button>
                          <button type="submit" className="portal-btn-primary">Register Asset</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </>
  );
}
