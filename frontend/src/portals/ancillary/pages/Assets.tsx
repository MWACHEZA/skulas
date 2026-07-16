import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  const [incidentForm, setIncidentForm] = useState({ issueType: 'general', details: '' });
  const [maintDetails, setMaintDetails] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/api/assets');
      setAssets(data);
    } catch (err) {
      showToast('Failed to fetch assets', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/assets/incident', { ...incidentForm, assetId: selectedAsset.id });
      showToast('Incident reported successfully', 'success');
      setIsIncidentModalOpen(false);
      setIncidentForm({ issueType: 'general', details: '' });
      fetchAssets();
    } catch (err) {
      showToast('Failed to report incident', 'error');
    
    }
  };

  const handleRequestMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/assets/request-maintenance', {
        assetId: selectedAsset.id,
        details: maintDetails
      });
      showToast('Maintenance request submitted successfully', 'success');
      setIsMaintModalOpen(false);
      setMaintDetails('');
    } catch (err) {
      showToast('Failed to submit maintenance request', 'error');
    
    }
  };

  const condColor = (c: string) => {
    const map: any = { excellent: 'success', good: 'success', fair: 'warning', damaged: 'danger', poor: 'danger' };
    return map[c] || 'neutral';
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Assets & Inventory</h1>
        <p>Track school equipment, report damages, and manage your assigned inventory.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-boxes" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Fixed Asset Register</h2>
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
                  <th>ID</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Condition</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', color: '#718096', fontSize: '0.8rem' }}>{a.id.slice(-6).toUpperCase()}</td>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td><span className="portal-badge neutral">{a.category}</span></td>
                    <td style={{ color: '#718096' }}>{a.location}</td>
                    <td><span className={`portal-badge ${condColor(a.condition)}`}>{a.condition.toUpperCase()}</span></td>
                      <td>
                          <button className="portal-link-btn" style={{ color: 'var(--portal-danger)', marginRight: 10 }} onClick={() => {
                              setSelectedAsset(a);
                              setIsIncidentModalOpen(true);
                          }}>Report Incident</button>
                          <button className="portal-link-btn" style={{ color: 'var(--school-primary, #3182ce)' }} onClick={() => {
                              setSelectedAsset(a);
                              setIsMaintModalOpen(true);
                          }}>Request Maintenance</button>
                      </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#a0aec0' }}>No assets registered in your school.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register Asset Modal */}
      {isRegisterModalOpen && (
          <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 600 }}>
                  <div className="portal-modal-header">
                      <h2>Register Asset</h2>
                      <button className="modal-close" onClick={() => setIsRegisterModalOpen(false)}>&times;</button>
                  </div>
                  <form onSubmit={async (e: any) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      try {
                          await api.post('/api/assets', Object.fromEntries(formData.entries()));
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
                              <div style={{ gridColumn: 'span 2' }}>
                                  <label className="portal-label">Location</label>
                                  <input name="location" className="portal-input" placeholder="e.g. Science Lab 2" required />
                              </div>
                          </div>
                      </div>
                      <div className="portal-modal-footer">
                          <button type="button" className="portal-btn-neutral" onClick={() => setIsRegisterModalOpen(false)}>Cancel</button>
                          <button type="submit" className="portal-btn-primary">Safe Asset</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Report Incident Modal */}
      {isIncidentModalOpen && (
          <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 450 }}>
                  <div className="portal-modal-header">
                      <h2>Report Incident</h2>
                      <button className="modal-close" onClick={() => setIsIncidentModalOpen(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleReportIncident}>
                      <div className="portal-modal-body">
                          <p style={{ fontSize: '0.9rem', marginBottom: 15 }}><strong>Reporting issue for:</strong> {selectedAsset?.name}</p>
                          <div style={{ display: 'grid', gap: 16 }}>
                              <div>
                                  <label className="portal-label">Issue Type</label>
                                  <select 
                                    className="portal-input"
                                    value={incidentForm.issueType}
                                    onChange={e => setIncidentForm({...incidentForm, issueType: e.target.value})}
                                  >
                                      <option value="fault">Technical Fault</option>
                                      <option value="damage">Physical Damage</option>
                                      <option value="maintenance">Maintenance Required</option>
                                      <option value="usage">Usage Query</option>
                                      <option value="theft">Theft/Missing</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="portal-label">Details</label>
                                  <textarea 
                                    className="portal-input" 
                                    rows={4}
                                    placeholder="Describe what happened..."
                                    value={incidentForm.details}
                                    onChange={e => setIncidentForm({...incidentForm, details: e.target.value})}
                                    required
                                  ></textarea>
                              </div>
                          </div>
                      </div>
                      <div className="portal-modal-footer">
                          <button type="button" className="portal-btn-neutral" onClick={() => setIsIncidentModalOpen(false)}>Cancel</button>
                          <button type="submit" className="portal-btn-danger">Submit Report</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Request Maintenance Modal */}
      {isMaintModalOpen && (
          <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 450 }}>
                  <div className="portal-modal-header">
                      <h2>Request Maintenance</h2>
                      <button className="modal-close" onClick={() => setIsMaintModalOpen(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleRequestMaintenance}>
                      <div className="portal-modal-body">
                          <p style={{ fontSize: '0.9rem', marginBottom: 15 }}><strong>Request maintenance for:</strong> {selectedAsset?.name}</p>
                          <div>
                              <label className="portal-label">Details of Maintenance Required</label>
                              <textarea 
                                className="portal-input" 
                                rows={4}
                                placeholder="Describe what needs to be fixed..."
                                value={maintDetails}
                                onChange={e => setMaintDetails(e.target.value)}
                                required
                              ></textarea>
                          </div>
                      </div>
                      <div className="portal-modal-footer">
                          <button type="button" className="portal-btn-neutral" onClick={() => setIsMaintModalOpen(false)}>Cancel</button>
                          <button type="submit" className="portal-btn-primary">Submit Request</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </>
  );
}
