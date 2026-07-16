import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function Helpdesk() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/api/support/admin');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to synchronize helpdesk audit registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/support/${id}`, { status: newStatus });
      showToast('Incident status authorized', 'success');
      fetchTickets();
    } catch (err) {
      showToast('Failed to authorize status update', 'error');
    
    } finally {
      setUpdatingId(null);
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
          <h1>Global IT Helpdesk</h1>
          <p>Audit and mitigate technical support requests from students, parents, and institutional staff members.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 900 }}>
           <i className="fas fa-shield-virus mr-2"></i>SYSTEMS AUDIT
        </div>
      </div>

      <div className="portal-stats-grid animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '40px' }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}><i className="fas fa-plus-square"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).filter(t => t.status === 'open').length}</h3>
            <p>New Incidents</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><i className="fas fa-spinner fa-spin"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).filter(t => t.status === 'in_progress').length}</h3>
            <p>Active Mitigations</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><i className="fas fa-fire"></i></div>
          <div className="portal-stat-info">
            <h3>{(Array.isArray(tickets) ? tickets : []).filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'resolved').length}</h3>
            <p>Critical Priority</p>
          </div>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Global Incident Registry</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Real-time monitoring of all institutional technical support requests.</p>
          </div>
          <button className="portal-btn-ghost" onClick={fetchTickets} style={{ fontWeight: 800, color: '#2563eb' }}>
            <i className="fas fa-sync-alt mr-2"></i>Refresh Registry
          </button>
        </div>
        
        <div className="table-responsive">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>
              <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing helpdesk audit...</p>
            </div>
          ) : (Array.isArray(tickets) ? tickets : []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '120px 24px' }}>
              <i className="fas fa-headset" style={{ fontSize: '4rem', color: '#f1f5f9', marginBottom: '24px', display: 'block', opacity: 0.2 }}></i>
              <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Pending Incidents</h3>
              <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>System healthy - all technical support requests resolved.</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Incident Trace</th>
                  <th style={{ width: '25%' }}>Requester Entity</th>
                  <th style={{ width: '12%' }}>Classification</th>
                  <th style={{ textAlign: 'center', width: '12%' }}>Priority</th>
                  <th style={{ textAlign: 'center', width: '12%' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '19%' }}>Mitigation Action</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(tickets) ? tickets : []).map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 900, color: '#1e293b' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, marginTop: '2px', textTransform: 'uppercase' }}>#{t.id.slice(-8).toUpperCase()} • {new Date(t.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                           width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           fontSize: '0.9rem', fontWeight: 900, color: '#2563eb', border: '1px solid #f1f5f9'
                        }}>
                          {t.requester?.name?.[0] || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>{t.requester?.name || 'Authorized User'}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span className="status-badge" style={{ fontSize: '0.65rem', padding: '2px 8px', background: '#f1f5f9', color: '#64748b', fontWeight: 800, border: '1px solid #e2e8f0' }}>{t.requester?.role?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontWeight: 900, border: '1px solid #f1f5f9', fontSize: '0.7rem' }}>{t.category?.toUpperCase()}</span></td>
                    <td style={{ textAlign: 'center' }}>{getPriorityBadge(t.priority)}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(t.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        className="portal-input" 
                        style={{ width: '160px', padding: '10px', fontSize: '0.8rem', fontWeight: 800, borderRadius: '12px' }}
                        value={t.status}
                        disabled={updatingId === t.id}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                      >
                        <option value="open">Open - New</option>
                        <option value="in_progress">In Mitigation</option>
                        <option value="resolved">Resolved - Closed</option>
                        <option value="closed">Finalized Audit</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
