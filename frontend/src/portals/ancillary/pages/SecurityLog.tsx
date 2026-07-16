import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function SecurityLog() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [visitorData, setVisitorData] = useState({ name: '', phone: '', purpose: '', vehicleReg: '' });
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const { data } = await api.get('/api/ancillary/visitors');
      setVisitors(data);
    } catch (err) {
      showToast('Failed to load visitors', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleRecordVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/ancillary/visitors', visitorData);
      showToast('Visitor entry recorded', 'success');
      setIsVisitorModalOpen(false);
      setVisitorData({ name: '', phone: '', purpose: '', vehicleReg: '' });
      fetchVisitors();
    } catch (err) {
      showToast('Failed to record visitor', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Security & Guard Log</h1>
        <p>Monitor campus premises and record all external visitors entering the school.</p>
      </div>

      <div className="portal-grid-3" style={{ marginBottom: 30 }}>
        <div className="portal-card" style={{ background: '#2d3748', color: 'white' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{visitors.filter(v => !v.exitTime).length}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Active Visitors On-Site</p>
          </div>
        </div>
        <div className="portal-card">
           <button 
             onClick={() => setIsVisitorModalOpen(true)}
             className="portal-btn-primary" 
             style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}
           >
             <i className="fas fa-user-plus" style={{ fontSize: '1.5rem' }}></i>
             <span>New Visitor Entry</span>
           </button>
        </div>
        <div className="portal-card">
           <button 
             className="portal-btn-secondary" 
             style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 120, border: '1px solid #e53e3e', color: 'var(--portal-danger)' }}
            onClick={() => alert('This feature is currently under development or disabled.')}>
             <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.5rem' }}></i>
             <span>Report Security Incident</span>
           </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-clipboard-list" style={{ marginRight: 10, color: '#2d3748' }}></i>Recent Visitors</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>ID/Phone</th>
                  <th>Purpose</th>
                  <th>Vehicle Reg</th>
                  <th>Time In</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.length > 0 ? visitors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td>{v.phone}</td>
                    <td>{v.purpose}</td>
                    <td style={{ fontFamily: 'monospace' }}>{v.vehicleReg || 'N/A'}</td>
                    <td>{new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span className={`portal-badge ${v.exitTime ? 'secondary' : 'success'}`}>
                        {v.exitTime ? 'Exited' : 'On-Site'}
                      </span>
                    </td>
                    <td>
                      {!v.exitTime && (
                        <button className="portal-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Check Out</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#718096' }}>No visitor records for today.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isVisitorModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Record New Visitor</h2>
              <button onClick={() => setIsVisitorModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleRecordVisitor} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Visitor Full Name</label>
                <input 
                  className="form-control"
                  value={visitorData.name}
                  onChange={e => setVisitorData({...visitorData, name: e.target.value})}
                  required
                  placeholder="e.g. Tendai M."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Phone / National ID</label>
                <input 
                  className="form-control"
                  value={visitorData.phone}
                  onChange={e => setVisitorData({...visitorData, phone: e.target.value})}
                  required
                  placeholder="077x xxx xxx"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Purpose of Visit</label>
                <input 
                  className="form-control"
                  value={visitorData.purpose}
                  onChange={e => setVisitorData({...visitorData, purpose: e.target.value})}
                  required
                  placeholder="e.g. Account query, delivery"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Vehicle Registration (Optional)</label>
                <input 
                  className="form-control"
                  value={visitorData.vehicleReg}
                  onChange={e => setVisitorData({...visitorData, vehicleReg: e.target.value})}
                  placeholder="ABC-1234"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsVisitorModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Record Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
