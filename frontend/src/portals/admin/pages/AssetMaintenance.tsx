import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface Asset {
  id: string;
  name: string;
  maintenance: Array<{
    id: string;
    scheduledDate: string;
    performedDate: string | null;
    description: string;
    cost: number | null;
  }>;
}

export default function AdminAssetMaintenance() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    assetId: '',
    description: '',
    cost: '',
    scheduledDate: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState('');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    taskId: '',
    notes: '',
    condition: 'good'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/assets');
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load asset registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId || !form.description || !form.scheduledDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/api/assets/maintenance/${editTaskId}`, {
          description: form.description,
          cost: parseFloat(form.cost) || 0,
          scheduledDate: form.scheduledDate,
        });
        showToast('Maintenance task updated successfully', 'success');
      } else {
        await api.post('/api/assets/maintenance/schedule', {
          assetId: form.assetId,
          description: form.description,
          cost: parseFloat(form.cost) || 0,
          scheduledDate: form.scheduledDate,
        });
        showToast('Maintenance task scheduled successfully', 'success');
      }
      setShowModal(false);
      setIsEditing(false);
      setEditTaskId('');
      setForm({ assetId: '', description: '', cost: '', scheduledDate: '' });
      fetchAssets();
    } catch {
      showToast(isEditing ? 'Failed to update task' : 'Failed to schedule maintenance task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this maintenance task?')) {
      try {
        await api.delete(`/api/assets/maintenance/${id}`);
        showToast('Maintenance task deleted successfully', 'success');
        fetchAssets();
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to delete maintenance task', 'error');
      }
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/assets/maintenance/${completeForm.taskId}/complete`, {
        notes: completeForm.notes,
        assetStatus: completeForm.condition
      });
      showToast('Maintenance task marked as completed', 'success');
      setShowCompleteModal(false);
      setCompleteForm({ taskId: '', notes: '', condition: 'good' });
      fetchAssets();
    } catch {
      showToast('Failed to complete maintenance task', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Flatten maintenance logs from all assets
  const tasks = assets.flatMap(asset => 
    (asset.maintenance || []).map(m => {
      const isOverdue = !m.performedDate && new Date(m.scheduledDate) < new Date();
      let status: 'Completed' | 'Urgent' | 'Scheduled' | 'Overdue' = 'Scheduled';
      if (m.performedDate) status = 'Completed';
      else if (isOverdue) status = 'Overdue';
      return {
        id: m.id,
        assetId: asset.id,
        assetName: asset.name,
        task: m.description,
        dueDate: m.scheduledDate,
        performedDate: m.performedDate,
        cost: m.cost,
        status: status as 'Completed' | 'Urgent' | 'Scheduled' | 'Overdue'
      };
    })
  ).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  return (
    <>
      <div className="portal-page-header">
        <h1>Asset Maintenance Schedule</h1>
        <p>Monitor and schedule servicing for critical school infrastructure and equipment.</p>
      </div>

      <div className="portal-card animate-in">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-tools" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>Maintenance Pipeline</h2>
          <button className="portal-btn-primary" onClick={() => {
            setIsEditing(false);
            setEditTaskId('');
            setForm({ assetId: '', description: '', cost: '', scheduledDate: '' });
            setShowModal(true);
          }} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-plus"></i> SCHEDULE TASK
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
              <p style={{ marginTop: 8, color: '#64748b' }}>Fetching pipeline logs...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 12, display: 'block' }}></i>
              <p style={{ color: '#64748b', margin: 0 }}>No maintenance logs cataloged yet.</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Maintenance Task</th>
                  <th>Due Date</th>
                  <th>Cost ($)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 600 }}>{task.assetName}</td>
                    <td>{task.task}</td>
                    <td>{new Date(task.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700 }}>{task.cost ? `$${task.cost.toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`portal-badge ${
                        task.status === 'Completed' ? 'success' : (task.status === 'Overdue' || task.status === 'Urgent') ? 'danger' : 'info'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!task.performedDate ? (
                          <>
                            <button 
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Complete Task"
                              onClick={() => {
                                setCompleteForm({ ...completeForm, taskId: task.id, condition: 'good' });
                                setShowCompleteModal(true);
                              }}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit Task"
                              onClick={() => {
                                setIsEditing(true);
                                setEditTaskId(task.id);
                                setForm({
                                  assetId: task.assetId,
                                  description: task.task,
                                  cost: task.cost ? task.cost.toString() : '',
                                  scheduledDate: task.dueDate.split('T')[0]
                                });
                                setShowModal(true);
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Delete Task"
                              onClick={() => handleDelete(task.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '36px', padding: '0 8px' }}>Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Schedule Task Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header">
              <h2>{isEditing ? 'Edit Maintenance Task' : 'Schedule Maintenance Task'}</h2>
              <button className="modal-close" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="portal-modal-body">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label className="portal-label">Select Target Asset *</label>
                    <select
                      className="portal-input"
                      value={form.assetId}
                      onChange={e => setForm({ ...form, assetId: e.target.value })}
                      required
                      disabled={isEditing}
                    >
                      <option value="">-- Choose Asset --</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Task Details / Description *</label>
                    <textarea
                      className="portal-input"
                      placeholder="e.g. Engine Oil Flush, Filter Replacement"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      required
                      rows={3}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="portal-label">Scheduled Date *</label>
                      <input
                        type="date"
                        className="portal-input"
                        value={form.scheduledDate}
                        onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="portal-label">Estimated Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="portal-input"
                        value={form.cost}
                        onChange={e => setForm({ ...form, cost: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }} disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-calendar-plus"></i>}
                  SCHEDULE TASK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header">
              <h2>Complete Maintenance Task</h2>
              <button className="modal-close" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowCompleteModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="portal-modal-body">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label className="portal-label">Maintenance Notes / Recommendations</label>
                    <textarea
                      className="portal-input"
                      placeholder="Describe what was done..."
                      value={completeForm.notes}
                      onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="portal-label">Update Asset Condition</label>
                    <select
                      className="portal-input"
                      value={completeForm.condition}
                      onChange={e => setCompleteForm({ ...completeForm, condition: e.target.value })}
                    >
                      <option value="good">Good (No issues)</option>
                      <option value="fair">Fair (Minor wear)</option>
                      <option value="poor">Damaged / Poor (Needs attention)</option>
                      <option value="condemned">Condemned (Beyond repair)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }} disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                  MARK AS COMPLETED
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
