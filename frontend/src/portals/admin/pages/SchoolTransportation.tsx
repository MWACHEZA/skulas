import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function SchoolTransportation() {
  const { showToast } = useToast();
  
  const [transports, setTransports] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(transports.length / itemsPerPage);
  const paginatedTransports = transports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [formData, setFormData] = useState({
    name: '',
    routeId: '',
    vehicleId: '',
    routeFare: '0',
    description: ''
  });

  useEffect(() => {
    fetchTransports();
    fetchDependencies();
  }, []);

  const fetchTransports = async () => {
    try {
      const res = await api.get('/api/transports');
      setTransports(res.data);
    } catch (err) {
      showToast('Failed to load transport assignments', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [rRes, vRes] = await Promise.all([
        api.get('/api/transport-routes'),
        api.get('/api/vehicles')
      ]);
      setRoutes(rRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      showToast('Failed to load routes or vehicles details', 'error');
    
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.routeId || !formData.vehicleId) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/transports/${editingId}`, formData);
        showToast('Transport assignment updated successfully', 'success');
      } else {
        await api.post('/api/transports', formData);
        showToast('Transport assignment created successfully', 'success');
      }
      handleCancelEdit();
      fetchTransports();
    } catch (err) {
      showToast('Failed to save transport assignment', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({
      name: t.name,
      routeId: t.routeId,
      vehicleId: t.vehicleId,
      routeFare: String(t.routeFare),
      description: t.description || ''
    });
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      routeId: '',
      vehicleId: '',
      routeFare: '0',
      description: ''
    });
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this transport assignment?')) return;
    try {
      await api.delete(`/api/transports/${id}`);
      showToast('Transport assignment deleted successfully', 'success');
      fetchTransports();
    } catch (err) {
      showToast('Failed to delete assignment', 'error');
    
    }
  };

  return (
    <div className="portal-content animate-in">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-shuttle-van mr-2" style={{ color: 'var(--portal-primary)' }}></i> Transport Assignments</h1>
          <p>Link routes with specific vehicles, assign drivers, and set transport fare rates.</p>
        </div>
      </div>

      <div className="portal-card animate-in" style={{ marginTop: '2rem' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h2><i className="fas fa-list mr-2"></i> Current Route Assignments</h2>
          <button 
            className="portal-btn-primary" 
            style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            onClick={() => {
              handleCancelEdit();
              setShowModal(true);
            }}
          >
            <i className="fas fa-plus"></i>Create Assignment
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Assignment Info</th>
                <th>Route Name</th>
                <th>Vehicle Info</th>
                <th>Driver Details</th>
                <th>Fare (USD)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading transport assignments...</td></tr>
              ) : paginatedTransports.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No route assignments found.</td></tr>
              ) : paginatedTransports.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.description || ''}</div>
                  </td>
                  <td>{t.route?.name || 'Unknown Route'}</td>
                  <td>{t.vehicle?.name || 'Unknown Vehicle'} ({t.vehicle?.number || ''})</td>
                  <td>{t.vehicle?.driverName || 'No Driver Assigned'}</td>
                  <td style={{ fontWeight: 700 }}>${(t.routeFare || 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit" onClick={() => handleEdit(t)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete" onClick={() => handleDelete(t.id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transports.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, transports.length)} of {transports.length} entries
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || transports.length === 0}
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

      {/* Add / Edit Assignment Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <h2>{editingId ? 'Edit Assignment' : 'Create Assignment'}</h2>
              <button 
                className="modal-close" 
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                onClick={handleCancelEdit}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Assignment Name *</label>
                  <input 
                    type="text" className="portal-input" placeholder="e.g. Morning Commute Bus A"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Select Route *</label>
                  <select 
                    className="portal-input"
                    value={formData.routeId} onChange={e => setFormData({...formData, routeId: e.target.value})}
                    required
                  >
                    <option value="">-- Choose Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Assign Vehicle *</label>
                  <select 
                    className="portal-input"
                    value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                    required
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.number})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Fare Price (USD) *</label>
                  <input 
                    type="number" step="0.01" min="0" className="portal-input"
                    value={formData.routeFare} onChange={e => setFormData({...formData, routeFare: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="portal-label">Notes/Description</label>
                  <textarea 
                    className="portal-input" style={{ minHeight: '80px' }}
                    placeholder="Additional instructions or timings..."
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                  {editingId ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
