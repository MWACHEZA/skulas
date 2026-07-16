import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function ITSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'Software',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/support/my');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to synchronize technical support registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/support', newTicket);
      showToast('Technical support request authorized', 'success');
      setIsModalOpen(false);
      setNewTicket({ title: '', description: '', category: 'Software', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      showToast('Failed to authorize support request', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    const priority = p?.toLowerCase();
    let style = { background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' };
    
    if (priority === 'urgent') style = { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };
    else if (priority === 'high') style = { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
    else if (priority === 'medium') style = { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' };

    return <span className="status-badge" style={{ ...style, fontWeight: 900, fontSize: '0.7rem' }}>{p?.toUpperCase()}</span>;
  };

  const getStatusBadge = (s: string) => {
    const status = s?.toLowerCase();
    let style = { background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' };

    if (status === 'resolved') style = { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' };
    else if (status === 'in_progress') style = { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' };
    else if (status === 'open') style = { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };

    return <span className="status-badge" style={{ ...style, fontWeight: 900, fontSize: '0.7rem' }}>{s?.replace('_', ' ')?.toUpperCase()}</span>;
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>IT Support & Helpdesk</h1>
          <p>Submit technical issues, track resolution statuses, and communicate with the institutional systems audit team.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontWeight: 900 }}>
           <i className="fas fa-headset mr-2"></i>SUPPORT PORTAL
        </div>
      </div>

      <div className="portal-stats-grid animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '40px' }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).filter(t => t.status === 'open' || t.status === 'in_progress').length}</h3>
            <p>Active Incidents</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}><i className="fas fa-check-circle"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).filter(t => t.status === 'resolved' || t.status === 'closed').length}</h3>
            <p>Resolved Cases</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><i className="fas fa-history"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).length > 0 ? new Date(tickets[0].createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : 'N/A'}</h3>
            <p>Last Activity</p>
          </div>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Incident Audit Registry</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive history of institutional technical support requests.</p>
          </div>
          <button className="portal-btn-primary" onClick={() => setIsModalOpen(true)} style={{ padding: '12px 28px', fontWeight: 900 }}>
            <i className="fas fa-plus-circle mr-2"></i>Authorize New Request
          </button>
        </div>
        
        <div className="table-responsive">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>
              <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing incident registry...</p>
            </div>
          ) : (Array.isArray(tickets) ? tickets : []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '120px 24px' }}>
              <i className="fas fa-headset" style={{ fontSize: '4rem', color: '#f1f5f9', marginBottom: '24px', display: 'block', opacity: 0.2 }}></i>
              <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Active Incidents Identified</h3>
              <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>Your technical support history will be cataloged here.</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Ticket ID</th>
                  <th style={{ width: '30%' }}>Incident Details</th>
                  <th style={{ width: '15%' }}>Classification</th>
                  <th style={{ textAlign: 'center', width: '12%' }}>Priority</th>
                  <th style={{ textAlign: 'center', width: '12%' }}>Resolution</th>
                  <th style={{ textAlign: 'right', width: '16%' }}>Authorization</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(tickets) ? tickets : []).map(t => (
                  <tr key={t.id}>
                    <td><span style={{ fontWeight: 900, color: '#94a3b8', fontSize: '0.75rem', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>#{t.id.slice(-8).toUpperCase()}</span></td>
                    <td>
                      <div style={{ fontWeight: 900, color: '#1e293b' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{t.description}</div>
                    </td>
                    <td><span className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontWeight: 900, border: '1px solid #f1f5f9', fontSize: '0.7rem' }}>{t.category?.toUpperCase()}</span></td>
                    <td style={{ textAlign: 'center' }}>{getPriorityBadge(t.priority)}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(t.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.9rem' }}>{new Date(t.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '640px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Submit Support Request</h2>
              <button className="portal-btn-ghost" onClick={() => setIsModalOpen(false)} style={{ width: '40px', height: '40px', padding: 0 }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="portal-modal-body" style={{ padding: '40px' }}>
                <div style={{ display: 'grid', gap: '32px' }}>
                  <div className="form-group">
                    <label className="portal-label">Incident Headline</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. Mandatory System Credential Reset Required"
                      value={newTicket.title}
                      onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                      style={{ fontWeight: 800 }}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="form-group">
                      <label className="portal-label">Issue Classification</label>
                      <select 
                        className="portal-input"
                        value={newTicket.category}
                        onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                        style={{ fontWeight: 700 }}
                      >
                        <option>Software</option>
                        <option>Hardware</option>
                        <option>Network</option>
                        <option>Account Access</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Incident Priority</label>
                      <select 
                        className="portal-input"
                        value={newTicket.priority}
                        onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                        style={{ fontWeight: 700 }}
                      >
                        <option value="low">Low - Routine</option>
                        <option value="medium">Medium - Standard</option>
                        <option value="high">High - Accelerated</option>
                        <option value="urgent">Urgent - Institutional Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Detailed Incident Trace</label>
                    <textarea 
                      className="portal-input" 
                      rows={5} 
                      placeholder="Please provide specific technical details, error codes, and steps to reproduce the issue..."
                      value={newTicket.description}
                      onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                      required
                      style={{ resize: 'none', fontWeight: 600 }}
                    ></textarea>
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <i className="fas fa-info-circle" style={{ color: '#2563eb' }}></i>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Providing granular details assists the systems audit team in rapid incident mitigation.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setIsModalOpen(false)} style={{ fontWeight: 800 }}>Abort Request</button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ minWidth: '200px', height: '56px', fontWeight: 900 }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>AUTHORIZING...</> : <><i className="fas fa-paper-plane mr-2"></i>SUBMIT INCIDENT</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
