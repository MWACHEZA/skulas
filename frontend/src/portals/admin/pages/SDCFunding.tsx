import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

interface ProjectFunding {
  id: string;
  name: string;
  budget: number;
  spent: number;
  status: string;
  createdAt: string;
}

export default function AdminSDCFunding() {
  const { t } = useTerminology();
  const [funding, setFunding] = useState<ProjectFunding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectFunding | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [spent, setSpent] = useState('');
  const [status, setStatus] = useState('Ongoing');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFunding();
  }, []);

  const fetchFunding = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/funding');
      setFunding(res.data);
    } catch (err) {
      console.error('Failed to fetch project funding', err);
    
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProject(null);
    setName('');
    setBudget('');
    setSpent('');
    setStatus('Ongoing');
    setShowModal(true);
  };

  const openEditModal = (proj: ProjectFunding) => {
    setEditingProject(proj);
    setName(proj.name);
    setBudget(String(proj.budget));
    setSpent(String(proj.spent));
    setStatus(proj.status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !budget) return;
    setSubmitting(true);

    const data = {
      name,
      budget: parseFloat(budget),
      spent: spent ? parseFloat(spent) : 0,
      status
    };

    try {
      if (editingProject) {
        await api.patch(`/api/funding/${editingProject.id}`, data);
        alert('Project updated successfully!');
      } else {
        await api.post('/api/funding', data);
        alert('Project created successfully!');
      }
      setShowModal(false);
      fetchFunding();
    } catch (err) {
      console.error('Failed to save project funding', err);
      alert('Failed to save project funding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/api/funding/${id}`);
      fetchFunding();
    } catch (err) {
      console.error('Failed to delete project funding', err);
      alert('Failed to delete project funding');
    }
  };

  const totalAllocated = funding.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = funding.reduce((sum, p) => sum + (p.spent || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>{t('governanceShort')} Capital Projects & Funding</h1>
        <p>Monitor {t('governanceShort').toLowerCase()} development funds, project budgets, and capital expenditure.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-hand-holding-usd"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(totalAllocated)}</h3>
            <p>Total Allocated</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-receipt"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(totalSpent)}</h3>
            <p>Total Spent</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-building" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Active Development Projects</h2>
          <button 
            className="portal-btn-primary" 
            style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }}
            onClick={openAddModal}
          >
            + Add Project
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Approved Budget</th>
                <th>Current Spend</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading projects...</td></tr>
              ) : funding.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>No projects found. Add one above.</td></tr>
              ) : funding.map((p) => {
                const progressPct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.budget)}</td>
                    <td>{formatCurrency(p.spent)}</td>
                    <td>
                      <div style={{ width: 100, height: 8, background: '#edf2f7', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${Math.min(progressPct, 100)}%`, 
                          height: '100%', 
                          background: 'var(--school-primary, #3182ce)', 
                          borderRadius: 4 
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginTop: '2px' }}>{Math.round(progressPct)}%</span>
                    </td>
                    <td>
                      <span className={`portal-badge ${p.status === 'Completed' ? 'success' : p.status === 'Proposed' ? 'neutral' : 'info'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="portal-btn-secondary" 
                          style={{ padding: '6px 12px' }}
                          onClick={() => openEditModal(p)}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button 
                          className="portal-btn-secondary" 
                          style={{ padding: '6px 12px', color: 'var(--portal-danger)' }}
                          onClick={() => handleDelete(p.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {editingProject ? 'Edit Project' : 'Add New Project'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Register or update a development project financed by the {t('governanceShort')}.
                </p>
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
                <div className="portal-form-group">
                  <label className="portal-label">Project Name <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    placeholder="e.g. Science Lab Renovation"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Approved Budget ($) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    className="portal-input" 
                    placeholder="e.g. 15000"
                    value={budget} 
                    onChange={e => setBudget(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Current Spend ($)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    className="portal-input" 
                    placeholder="e.g. 5000"
                    value={spent} 
                    onChange={e => setSpent(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Status</label>
                  <select 
                    className="portal-input" 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="portal-btn-primary" 
                    style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} 
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
