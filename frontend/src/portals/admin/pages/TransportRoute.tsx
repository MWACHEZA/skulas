import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function TransportRoute() {
  const { showToast } = useToast();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    description: ''
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await api.get('/api/transport-routes');
      setRoutes(res.data);
    } catch (err) {
      showToast('Failed to load transport routes', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/transport-routes/${editingId}`, formData);
        showToast('Route updated successfully', 'success');
      } else {
        await api.post('/api/transport-routes', formData);
        showToast('Route created successfully', 'success');
      }
      setFormData({ name: '', description: '' });
      setEditingId(null);
      setShowModal(false);
      fetchRoutes();
    } catch (err) {
      showToast('Failed to save route', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (route: any) => {
    setEditingId(route.id);
    setFormData({
      name: route.name,
      description: route.description || ''
    });
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transport route? This may affect linked assignments.')) return;
    try {
      await api.delete(`/api/transport-routes/${id}`);
      showToast('Route deleted successfully', 'success');
      fetchRoutes();
    } catch (err) {
      showToast('Failed to delete route. Make sure it has no active assignments.', 'error');
    
    }
  };

  return (
    <div className="portal-content animate-in">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-route mr-2" style={{ color: 'var(--portal-primary)' }}></i> Route Management</h1>
          <p>Configure transport zones, stops, and service routes for the school community.</p>
        </div>
      </div>

      <div className="portal-card animate-in" style={{ marginTop: '2rem' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h2><i className="fas fa-list mr-2"></i> Available Routes</h2>
          <button 
            className="portal-btn-primary" 
            onClick={() => {
              handleCancelEdit();
              setShowModal(true);
            }}
          >
            <i className="fas fa-plus mr-2"></i>Add Route
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Route Name</th>
                <th>Description</th>
                <th>Date Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading routes...</td></tr>
              ) : routes.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>No routes configured.</td></tr>
              ) : routes.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{r.name}</td>
                  <td style={{ color: '#64748b' }}>{r.description || 'No description provided'}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(r)} className="portal-btn-action edit">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="portal-btn-action delete">
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

      {/* Add / Edit Route Popup Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <h2>{editingId ? 'Edit Route' : 'Add Route'}</h2>
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
                  <label className="portal-label">Route Name *</label>
                  <input 
                    type="text" className="portal-input" placeholder="e.g. Harare North Loop, Borrowdale Expressway"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Description</label>
                  <textarea 
                    className="portal-input" style={{ minHeight: '120px' }}
                    placeholder="List major stops or area coverage..."
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
                  {editingId ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
