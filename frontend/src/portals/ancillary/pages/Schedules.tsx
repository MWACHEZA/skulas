import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface Shift {
  id: string;
  userId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  department?: string;
  notes?: string;
  user?: { name: string; role: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AncillarySchedules() {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await api.get('/api/schedules/my');
      setShifts(res.data);
    } catch {
      showToast('Failed to load schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Group shifts by user for table view
  const shiftsByUser: Record<string, Record<string, Shift>> = {};
  shifts.forEach(s => {
    const key = s.userId;
    if (!shiftsByUser[key]) shiftsByUser[key] = {};
    shiftsByUser[key][s.dayOfWeek] = s;
  });

  const users = Object.keys(shiftsByUser);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Work Schedules</h1>
          <p>View your duty rosters and shift assignments for the week.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={viewMode === 'table' ? 'portal-btn-primary' : 'portal-btn-secondary'} onClick={() => setViewMode('table')} style={{ padding: '8px 14px' }}>
            <i className="fas fa-table"></i>
          </button>
          <button className={viewMode === 'cards' ? 'portal-btn-primary' : 'portal-btn-secondary'} onClick={() => setViewMode('cards')} style={{ padding: '8px 14px' }}>
            <i className="fas fa-th-large"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="portal-card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
          <p style={{ color: '#718096', marginTop: 12 }}>Loading schedule...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center' }}>
          <i className="fas fa-calendar-times fa-3x" style={{ color: '#e2e8f0', marginBottom: 16 }}></i>
          <h3>No Shifts Assigned</h3>
          <p style={{ color: '#718096' }}>No shift assignments found for your account. Contact your administrator.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-clock" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Weekly Roster</h2>
            <span className="portal-badge info">{shifts.length} shifts assigned</span>
          </div>
          <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  {DAYS.map(d => <th key={d}>{d.slice(0, 3)}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(uid => {
                  const userShifts = shiftsByUser[uid];
                  const firstName = Object.values(userShifts)[0]?.user?.name || `User ${uid.slice(0,6)}`;
                  return (
                    <tr key={uid}>
                      <td style={{ fontWeight: 600 }}>{firstName}</td>
                      {DAYS.map(day => {
                        const s = userShifts[day];
                        return (
                          <td key={day} style={{ color: s ? '#2d3748' : '#cbd5e0', fontWeight: s ? 600 : 400, fontSize: '0.82rem' }}>
                            {s ? `${s.startTime}–${s.endTime}` : 'OFF'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="portal-grid-2">
          {shifts.map(s => (
            <div key={s.id} className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>{s.dayOfWeek}</h3>
                  <span className="portal-badge info">{s.startTime} – {s.endTime}</span>
                </div>
                {s.department && <div style={{ color: '#718096', fontSize: '0.85rem' }}><i className="fas fa-building" style={{ marginRight: 6 }}></i>{s.department}</div>}
                {s.notes && <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginTop: 6 }}>{s.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
