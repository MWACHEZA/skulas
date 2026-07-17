import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function ManageVehicle() {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);
  const paginatedVehicles = vehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [formData, setFormData] = useState({
    name: '',
    number: '',
    model: '',
    quantity: '1',
    yearMade: '',
    driverName: '',
    driverLicense: '',
    driverContact: '',
    status: 'Available',
    description: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchStaff();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/vehicles');
      setVehicles(res.data);
    } catch (err) {
      showToast('Failed to load vehicles list', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/users');
      const filtered = (res.data.users || []).filter((u: any) => u.role !== 'STUDENT');
      setStaff(filtered);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.number) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/vehicles/${editingId}`, formData);
        showToast('Vehicle asset updated successfully', 'success');
      } else {
        await api.post('/api/vehicles', formData);
        showToast('Vehicle registered successfully', 'success');
      }
      handleCancelEdit();
      fetchVehicles();
    } catch (err) {
      showToast('Failed to save vehicle details', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    setFormData({
      name: vehicle.name,
      number: vehicle.number,
      model: vehicle.model || '',
      quantity: vehicle.quantity ? String(vehicle.quantity) : '1',
      yearMade: vehicle.yearMade || '',
      driverName: vehicle.driverName || '',
      driverLicense: vehicle.driverLicense || '',
      driverContact: vehicle.driverContact || '',
      status: vehicle.status || 'Available',
      description: vehicle.description || ''
    });
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      number: '',
      model: '',
      quantity: '1',
      yearMade: '',
      driverName: '',
      driverLicense: '',
      driverContact: '',
      status: 'Available',
      description: ''
    });
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this vehicle registry? This will affect linked transport schedules.'))) return;
    try {
      await api.delete(`/api/vehicles/${id}`);
      showToast('Vehicle deleted successfully', 'success');
      fetchVehicles();
    } catch (err) {
      showToast('Failed to delete vehicle. Check if it is assigned to any active transport schedules.', 'error');
    
    }
  };

  return (
    <div className="portal-content animate-in">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-bus mr-2" style={{ color: 'var(--portal-primary)' }}></i> Vehicle Asset Management</h1>
          <p>Register school buses, vans, assigned drivers, and active service statuses.</p>
        </div>
      </div>

      <div className="portal-card animate-in" style={{ marginTop: '2rem' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h2><i className="fas fa-list-ul mr-2"></i> Registered Vehicles</h2>
          <button 
            className="portal-btn-primary" 
            style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            onClick={() => {
              handleCancelEdit();
              setShowModal(true);
            }}
          >
            <i className="fas fa-plus-circle"></i> REGISTER VEHICLE
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Vehicle Info</th>
                <th>Plate & Model</th>
                <th>Driver Details</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading vehicles catalog...</td></tr>
              ) : paginatedVehicles.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No vehicles registered.</td></tr>
              ) : paginatedVehicles.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Count: {v.quantity || 1}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.number}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.model || 'N/A'} {v.yearMade ? `(${v.yearMade})` : ''}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.driverName || 'No driver assigned'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.driverContact || ''} {v.driverLicense ? `[${v.driverLicense}]` : ''}</div>
                  </td>
                  <td>
                    <span className={`portal-badge ${v.status === 'Available' ? 'success' : 'danger'}`} style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: v.status === 'Available' ? '#def7ec' : '#fde8e8',
                      color: v.status === 'Available' ? '#03543f' : '#9b1c1c'
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit" onClick={() => handleEdit(v)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete" onClick={() => handleDelete(v.id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {vehicles.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, vehicles.length)} of {vehicles.length} entries
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
                  disabled={currentPage === totalPages || vehicles.length === 0}
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

      {/* Add / Edit Vehicle Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <h2>{editingId ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
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
                  <label className="portal-label">Vehicle Name *</label>
                  <input 
                    type="text" className="portal-input" placeholder="e.g. Scania Bus A, Toyota HiAce No. 2"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="portal-label">Plate Number *</label>
                    <input 
                      type="text" className="portal-input" placeholder="e.g. ABW-4829"
                      value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Model</label>
                    <input 
                      type="text" className="portal-input" placeholder="e.g. Coaster 2022"
                      value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="portal-label">Quantity</label>
                    <input 
                      type="number" className="portal-input" min="1"
                      value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Year Made</label>
                    <input 
                      type="text" className="portal-input" placeholder="e.g. 2018"
                      value={formData.yearMade} onChange={e => setFormData({...formData, yearMade: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Driver Name</label>
                  <select 
                    className="portal-input" 
                    value={formData.driverName} 
                    onChange={e => {
                      const selectedName = e.target.value;
                      const selectedDriver = staff.find(s => s.name === selectedName);
                      setFormData({
                        ...formData,
                        driverName: selectedName,
                        driverContact: selectedDriver?.phone || formData.driverContact
                      });
                    }}
                  >
                    <option value="">Select Driver / Staff Member</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="portal-label">License Class/No.</label>
                    <input 
                      type="text" className="portal-input" placeholder="Class 2, LIC-48291"
                      value={formData.driverLicense} onChange={e => setFormData({...formData, driverLicense: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Driver Contact</label>
                    <input 
                      type="text" className="portal-input" placeholder="e.g. +263 77 123 4567"
                      value={formData.driverContact} onChange={e => setFormData({...formData, driverContact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="portal-label">Service Status</label>
                  <select 
                    className="portal-input" 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Available">Available / Active</option>
                    <option value="Out of Service">Out of Service / Maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="portal-label">Notes/Description</label>
                  <textarea 
                    className="portal-input" style={{ minHeight: '80px' }}
                    placeholder="Additional vehicle or maintenance notes..."
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
                  {editingId ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
