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

export default function BursarSDCFunding() {
  const { t } = useTerminology();
  const [funding, setFunding] = useState<ProjectFunding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [disburseMode, setDisburseMode] = useState<'existing' | 'new'>('existing');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFunding();
  }, []);

  const fetchFunding = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/funding');
      setFunding(res.data);
      if (res.data.length > 0) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch project funding', err);
    
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setDisburseMode(funding.length > 0 ? 'existing' : 'new');
    setProjectName('');
    setBudgetAmount('');
    setDisburseAmount('');
    if (funding.length > 0) {
      setSelectedProjectId(funding[0].id);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const amount = parseFloat(disburseAmount || '0');
    if (amount <= 0) {
      alert('Please enter a valid disbursement amount');
      return;
    }

    setSubmitting(true);

    try {
      if (disburseMode === 'existing') {
        const proj = funding.find(p => p.id === selectedProjectId);
        if (!proj) {
          alert('Select a valid project');
          setSubmitting(false);
          return;
        }
        const updatedSpent = (proj.spent || 0) + amount;
        
        await api.patch(`/api/funding/${selectedProjectId}`, {
          spent: updatedSpent
        });
        alert('Disbursement logged successfully!');
      } else {
        if (!projectName || !budgetAmount) {
          alert('Missing required fields');
          setSubmitting(false);
          return;
        }

        await api.post('/api/funding', {
          name: projectName,
          budget: parseFloat(budgetAmount),
          spent: amount,
          status: 'Ongoing'
        });
        alert('New project and disbursement logged successfully!');
      }

      setShowModal(false);
      fetchFunding();
    } catch (err) {
      console.error('Failed to process disbursement', err);
      alert('Failed to process disbursement');
    } finally {
      setSubmitting(false);
    }
  };

  const totalBudget = funding.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalDisbursed = funding.reduce((sum, p) => sum + (p.spent || 0), 0);
  const totalPending = totalBudget - totalDisbursed;

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
        <h1>{t('governanceShort')} Project Funding Control</h1>
        <p>Monitor budget disbursements and pending allocations for {t('governanceShort')}-approved school projects.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-hand-holding-usd"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(totalBudget)}</h3>
            <p>Total Budget</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-double"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(totalDisbursed)}</h3>
            <p>Disbursed</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-hourglass-half"></i></div>
          <div className="portal-stat-info">
            <h3>{formatCurrency(totalPending)}</h3>
            <p>Pending</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-project-diagram" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Project Disbursement Tracker</h2>
          <button 
            className="portal-btn-primary"
            onClick={openModal}
            style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }}
          >
            New Disbursement
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Total Budget</th>
                <th>Disbursed</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Loading project funding data...</td></tr>
              ) : funding.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>No project records found.</td></tr>
              ) : funding.map((p) => {
                const balance = p.budget - p.spent;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{formatCurrency(p.budget)}</td>
                    <td style={{ color: 'var(--portal-success)', fontWeight: 600 }}>{formatCurrency(p.spent)}</td>
                    <td style={{ color: balance < 0 ? 'var(--portal-danger)' : '#4a5568' }}>{formatCurrency(balance)}</td>
                    <td>
                      <span className={`portal-badge ${p.status === 'Completed' ? 'success' : 'info'}`}>
                        {p.status}
                      </span>
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
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Log Project Disbursement</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Disburse funds to development projects.</p>
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
                  <label className="portal-label">Disbursement Mode</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="disburseMode" 
                        checked={disburseMode === 'existing'} 
                        disabled={funding.length === 0}
                        onChange={() => setDisburseMode('existing')} 
                      />
                      Existing Project
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="disburseMode" 
                        checked={disburseMode === 'new'} 
                        onChange={() => setDisburseMode('new')} 
                      />
                      Create & Disburse New Project
                    </label>
                  </div>
                </div>

                {disburseMode === 'existing' ? (
                  <div className="portal-form-group">
                    <label className="portal-label">Select Project <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="portal-input"
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                    >
                      {funding.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Budget: {formatCurrency(p.budget)})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="portal-form-group">
                      <label className="portal-label">Project Name <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        type="text" 
                        required 
                        className="portal-input" 
                        placeholder="e.g. Primary School Fencing"
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)} 
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
                        placeholder="e.g. 10000"
                        value={budgetAmount} 
                        onChange={e => setBudgetAmount(e.target.value)} 
                      />
                    </div>
                  </>
                )}

                <div className="portal-form-group">
                  <label className="portal-label">Disbursement Amount ($) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    required 
                    min="0.01"
                    step="0.01"
                    className="portal-input" 
                    placeholder="e.g. 2500"
                    value={disburseAmount} 
                    onChange={e => setDisburseAmount(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="portal-btn-primary" 
                    style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} 
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Submit Disbursement'}
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
