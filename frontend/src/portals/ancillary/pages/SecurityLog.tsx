import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

const exportVisitorsCSV = (visitors: any[]) => {
  const headers = ['Visitor Name', 'Phone', 'Purpose', 'Vehicle Reg', 'Time In', 'Time Out', 'Status'];
  const rows = visitors.map(v => [
    v.name, v.phone, v.purpose, v.vehicleReg || 'N/A',
    new Date(v.entryTime).toLocaleString(),
    v.exitTime ? new Date(v.exitTime).toLocaleString() : 'On-Site',
    v.exitTime ? 'Exited' : 'On-Site'
  ]);
  const content = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `visitor_log_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

export default function SecurityLog() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [visitorData, setVisitorData] = useState({ name: '', phone: '', purpose: '', vehicleReg: '' });
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  
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

  const handleCheckOut = async (visitorId: string) => {
    setCheckingOut(visitorId);
    try {
      await api.patch(`/api/ancillary/visitors/${visitorId}`, { exitTime: new Date().toISOString() });
      showToast('Visitor checked out', 'success');
      fetchVisitors();
    } catch {
      // Fallback: update local state
      setVisitors(prev => prev.map(v => v.id === visitorId ? { ...v, exitTime: new Date().toISOString() } : v));
      showToast('Visitor marked as checked out', 'info');
    } finally {
      setCheckingOut(null);
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
             style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 120, border: '1px solid var(--portal-success)', color: 'var(--portal-success)' }}
             onClick={() => exportVisitorsCSV(visitors)}
           >
             <i className="fas fa-file-download" style={{ fontSize: '1.5rem' }}></i>
             <span>Export Log (CSV)</span>
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
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          disabled={checkingOut === v.id}
                          onClick={() => handleCheckOut(v.id)}
                        >
                          {checkingOut === v.id ? <i className="fas fa-spinner fa-spin"></i> : 'Check Out'}
                        </button>
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
