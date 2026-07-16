import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function BoardingManagement() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [signOutData, setSignOutData] = useState({ studentId: '', type: 'SIGN_OUT', reason: '' });
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hostelRes, studentRes] = await Promise.all([
        api.get('/api/ancillary/hostels'),
        api.get('/api/students')
      ]);
      setHostels(hostelRes.data);
      setStudents(studentRes.data.students || []);
    } catch (err) {
      showToast('Failed to load boarding data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/ancillary/boarding/log', signOutData);
      showToast('Boarding log recorded', 'success');
      setIsSignOutModalOpen(false);
      setSignOutData({ studentId: '', type: 'SIGN_OUT', reason: '' });
    } catch (err) {
      showToast('Failed to record sign-out', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Boarding Management</h1>
        <p>Manage hostel occupancy and track student sign-outs/welfare.</p>
      </div>

      <div className="portal-grid-3" style={{ marginBottom: 30 }}>
        <div className="portal-card" style={{ background: 'linear-gradient(135deg, var(--school-primary, #3182ce), #2c5282)', color: 'white' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{hostels.length}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Active Hostels</p>
          </div>
        </div>
        <div className="portal-card" style={{ background: 'linear-gradient(135deg, #38a169, #276749)', color: 'white' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{students.filter(s => s.boardingStatus === 'Boarder').length}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Total Boarders</p>
          </div>
        </div>
        <div className="portal-card" style={{ background: '#fff', border: '2px dashed #cbd5e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <button 
             onClick={() => setIsSignOutModalOpen(true)}
             className="portal-btn-primary" 
             style={{ padding: '12px 24px' }}
           >
             <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }}></i>Record Student Movement
           </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-hotel" style={{ marginRight: 10, color: 'var(--school-primary, #3182ce)' }}></i>Hostel Overview</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Occupancy</th>
                  <th>Rooms</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map(h => {
                  const currentOccupancy = h.rooms.reduce((acc: number, r: any) => acc + r._count.students, 0);
                  const isFull = currentOccupancy >= h.capacity;
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td><span className={`portal-badge ${h.type === 'BOYS' ? 'info' : 'secondary'}`} style={{ background: h.type === 'BOYS' ? '#ebf8ff' : '#fff5f5', color: h.type === 'BOYS' ? '#2b6cb0' : '#c53030' }}>{h.type}</span></td>
                      <td>{h.capacity}</td>
                      <td>{currentOccupancy} students</td>
                      <td>{h.rooms.length} rooms</td>
                      <td>
                        <span className={`portal-badge ${isFull ? 'error' : 'success'}`}>
                          {isFull ? 'FULL' : 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isSignOutModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Record Student Movement</h2>
              <button onClick={() => setIsSignOutModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSignOut} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Select Student</label>
                <select 
                  className="form-control"
                  value={signOutData.studentId}
                  onChange={e => setSignOutData({...signOutData, studentId: e.target.value})}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Movement Type</label>
                <select 
                  className="form-control"
                  value={signOutData.type}
                  onChange={e => setSignOutData({...signOutData, type: e.target.value})}
                >
                  <option value="SIGN_OUT">Sign Out (Exiting School)</option>
                  <option value="SIGN_IN">Sign In (Returning)</option>
                  <option value="SICK_BAY">Moved to Sick Bay</option>
                  <option value="DISCIPLINE">Disciplinary Action</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Reason / Notes</label>
                <textarea 
                  className="form-control"
                  value={signOutData.reason}
                  onChange={e => setSignOutData({...signOutData, reason: e.target.value})}
                  rows={3}
                  placeholder="e.g. Weekend Pass, Hospital Visit, Returned from holiday"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsSignOutModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Record Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
