import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { SkeletonLoader } from '../../../components/shared';
import '../../../styles/portal.css';

interface AssetMaintenanceLog {
  id: string;
  scheduledDate: string;
  performedDate: string | null;
  description: string;
  cost: number | null;
  status?: string;
  technician?: string;
  priority?: string;
}

interface Asset {
  id: string;
  name: string;
  assetTag?: string;
  category?: string;
  location?: string;
  status?: string;
  condition?: string;
  maintenance?: AssetMaintenanceLog[];
}

interface FlattenedTask {
  id: string;
  assetId: string;
  assetName: string;
  assetTag?: string;
  category?: string;
  location?: string;
  task: string;
  dueDate: string;
  performedDate: string | null;
  cost: number | null;
  status: 'Completed' | 'Urgent' | 'Scheduled' | 'Overdue';
  priority?: string;
  technician?: string;
}

export default function AdminAssetMaintenance() {
  const { showToast, toastConfirm } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Scheduled' | 'Overdue' | 'Completed'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Schedule / Edit Form
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState('');
  const [form, setForm] = useState({
    assetId: '',
    description: '',
    cost: '',
    scheduledDate: '',
    priority: 'Normal',
    maintenanceType: 'Routine Servicing',
    technician: '',
    vendor: '',
    notes: ''
  });

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    taskId: '',
    assetName: '',
    actualCost: '',
    completionDate: new Date().toISOString().split('T')[0],
    notes: '',
    condition: 'good',
    jobCardNumber: ''
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

  // Flatten tasks from all assets
  const allTasks: FlattenedTask[] = useMemo(() => {
    return assets.flatMap(asset => 
      (asset.maintenance || []).map(m => {
        const isOverdue = !m.performedDate && new Date(m.scheduledDate) < new Date();
        let status: 'Completed' | 'Urgent' | 'Scheduled' | 'Overdue' = 'Scheduled';
        if (m.performedDate) status = 'Completed';
        else if (isOverdue) status = 'Overdue';

        return {
          id: m.id,
          assetId: asset.id,
          assetName: asset.name,
          assetTag: asset.assetTag,
          category: asset.category || 'General Equipment',
          location: asset.location || 'Campus Facility',
          task: m.description,
          dueDate: m.scheduledDate,
          performedDate: m.performedDate,
          cost: m.cost,
          status,
          priority: m.priority || (status === 'Overdue' ? 'High' : 'Normal'),
          technician: m.technician || 'Facility Team'
        };
      })
    ).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [assets]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const matchesSearch = t.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.assetTag && t.assetTag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            t.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [allTasks, searchTerm, statusFilter, categoryFilter]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(assets.map(a => a.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [assets]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = allTasks.length;
    const scheduled = allTasks.filter(t => t.status === 'Scheduled').length;
    const overdue = allTasks.filter(t => t.status === 'Overdue' || t.status === 'Urgent').length;
    const completed = allTasks.filter(t => t.status === 'Completed').length;
    const totalCost = allTasks.reduce((acc, t) => acc + (t.cost || 0), 0);

    return { total, scheduled, overdue, completed, totalCost };
  }, [allTasks]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId || !form.description.trim() || !form.scheduledDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        assetId: form.assetId,
        description: `[${form.maintenanceType}] ${form.description.trim()}`,
        cost: parseFloat(form.cost) || 0,
        scheduledDate: form.scheduledDate,
        priority: form.priority,
        technician: form.technician || undefined
      };

      if (isEditing) {
        await api.put(`/api/assets/maintenance/${editTaskId}`, payload);
        showToast('Maintenance task updated successfully', 'success');
      } else {
        await api.post('/api/assets/maintenance/schedule', payload);
        showToast('Maintenance work order scheduled successfully', 'success');
      }

      setShowScheduleModal(false);
      setIsEditing(false);
      setEditTaskId('');
      setForm({
        assetId: '',
        description: '',
        cost: '',
        scheduledDate: '',
        priority: 'Normal',
        maintenanceType: 'Routine Servicing',
        technician: '',
        vendor: '',
        notes: ''
      });
      fetchAssets();
    } catch {
      showToast(isEditing ? 'Failed to update task' : 'Failed to schedule maintenance task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (await toastConfirm('Are you sure you want to cancel and delete this maintenance work order?')) {
      try {
        await api.delete(`/api/assets/maintenance/${id}`);
        showToast('Maintenance task deleted successfully', 'success');
        fetchAssets();
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to delete task', 'error');
      }
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/assets/maintenance/${completeForm.taskId}/complete`, {
        notes: completeForm.notes,
        assetStatus: completeForm.condition,
        actualCost: parseFloat(completeForm.actualCost) || undefined,
        jobCardNumber: completeForm.jobCardNumber || undefined
      });
      showToast('Maintenance task marked as completed and asset status updated', 'success');
      setShowCompleteModal(false);
      setCompleteForm({ taskId: '', assetName: '', actualCost: '', completionDate: '', notes: '', condition: 'good', jobCardNumber: '' });
      fetchAssets();
    } catch {
      showToast('Failed to complete maintenance task', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Module Title Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
            <i className="fas fa-tools" style={{ color: '#38bdf8' }}></i>
            Facility & Equipment Services
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.85rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
            Maintenance & Repairs Pipeline
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '600px' }}>
            Schedule servicing, track repair work orders, and maintain asset longevity across school facilities.
          </p>
        </div>

        <button
          onClick={() => {
            setIsEditing(false);
            setEditTaskId('');
            setForm({
              assetId: assets[0]?.id || '',
              description: '',
              cost: '',
              scheduledDate: new Date().toISOString().split('T')[0],
              priority: 'Normal',
              maintenanceType: 'Routine Servicing',
              technician: '',
              vendor: '',
              notes: ''
            });
            setShowScheduleModal(true);
          }}
          className="portal-btn-primary"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
          }}
        >
          <i className="fas fa-plus"></i>
          SCHEDULE WORK ORDER
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div className="portal-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Tasks</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{stats.total}</div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Scheduled / Pending</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706' }}>{stats.scheduled}</div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Overdue / Urgent</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>{stats.overdue}</div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            <i className="fas fa-check-double"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Completed Tasks</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>{stats.completed}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="portal-card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              placeholder="Search by asset name, task scope, location, or tag..."
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px', height: '42px', borderRadius: '10px' }}
            />
          </div>

          <select
            className="portal-input"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ width: '180px', height: '42px', borderRadius: '10px' }}
          >
            <option value="ALL">All Categories</option>
            {categories.filter(c => c !== 'ALL').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'Scheduled', 'Overdue', 'Completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: statusFilter === st ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: statusFilter === st ? '#f0f9ff' : '#ffffff',
                color: statusFilter === st ? '#0284c7' : '#64748b',
                fontWeight: statusFilter === st ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {st === 'ALL' ? 'All Tasks' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="table" rows={6} columns={6} />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', marginBottom: '16px' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              No Work Orders Found
            </h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              All registered assets are in good operating condition. Schedule a new task whenever equipment requires servicing.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table" style={{ width: '100%', minWidth: '850px' }}>
              <thead>
                <tr>
                  <th>Target Asset</th>
                  <th>Task Description & Scope</th>
                  <th>Due Date</th>
                  <th>Est. Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                        {task.assetName}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.75rem', color: '#64748b' }}>
                        {task.assetTag && (
                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {task.assetTag}
                          </span>
                        )}
                        <span>{task.location}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                        {task.task}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: task.priority === 'Critical' ? '#fee2e2' : task.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                            color: task.priority === 'Critical' ? '#dc2626' : task.priority === 'High' ? '#c2410c' : '#475569'
                          }}
                        >
                          {task.priority || 'Normal'} Priority
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          <i className="fas fa-user-cog mr-1"></i>{task.technician}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: task.status === 'Overdue' ? '#dc2626' : '#334155', fontSize: '0.88rem' }}>
                        {new Date(task.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {task.status === 'Overdue' && (
                        <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 800 }}>
                          OVERDUE
                        </span>
                      )}
                      {task.performedDate && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          Done on {new Date(task.performedDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      {task.cost ? `$${task.cost.toFixed(2)}` : '—'}
                    </td>

                    <td>
                      <span 
                        className={`portal-badge ${
                          task.status === 'Completed' ? 'success' : task.status === 'Overdue' ? 'danger' : 'warning'
                        }`}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800 }}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {!task.performedDate && (
                          <button
                            className="portal-btn-ghost"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              color: '#059669',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Complete Task"
                            onClick={() => {
                              setCompleteForm({
                                taskId: task.id,
                                assetName: task.assetName,
                                actualCost: task.cost ? String(task.cost) : '',
                                completionDate: new Date().toISOString().split('T')[0],
                                notes: '',
                                condition: 'good',
                                jobCardNumber: ''
                              });
                              setShowCompleteModal(true);
                            }}
                          >
                            <i className="fas fa-check"></i>
                            Complete
                          </button>
                        )}

                        <button
                          className="portal-btn-ghost"
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            color: '#64748b',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer'
                          }}
                          title="Edit Task"
                          onClick={() => {
                            setIsEditing(true);
                            setEditTaskId(task.id);
                            setForm({
                              assetId: task.assetId,
                              description: task.task,
                              cost: task.cost ? task.cost.toString() : '',
                              scheduledDate: task.dueDate.split('T')[0],
                              priority: task.priority || 'Normal',
                              maintenanceType: 'Routine Servicing',
                              technician: task.technician || '',
                              vendor: '',
                              notes: ''
                            });
                            setShowScheduleModal(true);
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>

                        <button
                          className="portal-btn-ghost"
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            color: '#ef4444',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            cursor: 'pointer'
                          }}
                          title="Delete Work Order"
                          onClick={() => handleDelete(task.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCHEDULE MAINTENANCE WORK ORDER MODAL */}
      {showScheduleModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '620px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-calendar-plus mr-2" style={{ color: '#0284c7' }}></i>
                {isEditing ? 'Edit Maintenance Task' : 'Schedule Maintenance Work Order'}
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setShowScheduleModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label className="portal-label">Target Asset / Equipment *</label>
                  <select
                    className="portal-input"
                    value={form.assetId}
                    onChange={e => setForm({ ...form, assetId: e.target.value })}
                    required
                    disabled={isEditing}
                  >
                    <option value="">-- Choose Target Equipment --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.assetTag || 'No Tag'}) - {a.location || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="portal-label">Maintenance Classification</label>
                    <select
                      className="portal-input"
                      value={form.maintenanceType}
                      onChange={e => setForm({ ...form, maintenanceType: e.target.value })}
                    >
                      <option value="Routine Servicing">Routine Servicing & Checkup</option>
                      <option value="Hardware Repair">Hardware Repair & Replacement</option>
                      <option value="Book Binding / Reconditioning">Book Binding / Reconditioning</option>
                      <option value="Facility Infrastructure">Facility & Shelving Repair</option>
                      <option value="Electrical & Network">Electrical & Network IT</option>
                    </select>
                  </div>

                  <div>
                    <label className="portal-label">Priority Level</label>
                    <select
                      className="portal-input"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low (Discretionary)</option>
                      <option value="Normal">Normal (Standard Schedule)</option>
                      <option value="High">High (Impacting Operations)</option>
                      <option value="Critical">Critical Emergency (Immediate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="portal-label">Task Details & Scope of Work *</label>
                  <textarea
                    className="portal-input"
                    placeholder="Specify defect symptoms, required part replacements, or service instructions..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

                <div>
                  <label className="portal-label">Assigned Technician / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. In-house Maintenance Team, Apex IT Solutions"
                    className="portal-input"
                    value={form.technician}
                    onChange={e => setForm({ ...form, technician: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="portal-btn-neutral"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 800
                  }}
                  disabled={saving}
                >
                  {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-calendar-check mr-2"></i>}
                  {isEditing ? 'Save Changes' : 'Schedule Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE MAINTENANCE WORK ORDER MODAL */}
      {showCompleteModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '580px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-clipboard-check mr-2" style={{ color: '#059669' }}></i>
                Complete Maintenance Work Order
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setShowCompleteModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleComplete}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '18px' }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>COMPLETING WORK ORDER FOR</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{completeForm.assetName}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="portal-label">Actual Completion Date</label>
                    <input
                      type="date"
                      className="portal-input"
                      value={completeForm.completionDate}
                      onChange={e => setCompleteForm({ ...completeForm, completionDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="portal-label">Final Actual Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="portal-input"
                      value={completeForm.actualCost}
                      onChange={e => setCompleteForm({ ...completeForm, actualCost: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="portal-label">Maintenance Notes & Actions Taken *</label>
                  <textarea
                    className="portal-input"
                    placeholder="Describe what was repaired, parts replaced, diagnostic outcome, or vendor notes..."
                    value={completeForm.notes}
                    onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="portal-label">Post-Service Asset Condition</label>
                    <select
                      className="portal-input"
                      value={completeForm.condition}
                      onChange={e => setCompleteForm({ ...completeForm, condition: e.target.value })}
                    >
                      <option value="good">Good (Fully Operational)</option>
                      <option value="fair">Fair (Minor cosmetic wear)</option>
                      <option value="poor">Needs Further Observation</option>
                      <option value="condemned">Condemned (Beyond Economic Repair)</option>
                    </select>
                  </div>

                  <div>
                    <label className="portal-label">Job Card / Receipt Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. JC-2026-089"
                      className="portal-input"
                      value={completeForm.jobCardNumber}
                      onChange={e => setCompleteForm({ ...completeForm, jobCardNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="portal-btn-neutral"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 800
                  }}
                  disabled={saving}
                >
                  {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check-circle mr-2"></i>}
                  Mark as Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
