import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Shared Period Generator (Match Admin/Student)
const generatePeriods = () => {
    const periods = [];
    let time = '07:30';
    const addMinutes = (t: string, m: number) => {
        const [h, min] = t.split(':').map(Number);
        const total = h * 60 + min + m;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    for (let i = 1; i <= 4; i++) {
        const end = addMinutes(time, 35);
        periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
        time = end;
    }
    const breakEnd = addMinutes(time, 15);
    periods.push({ label: 'Break', start: time, end: breakEnd, type: 'break' });
    time = breakEnd;
    for (let i = 5; i <= 9; i++) {
        const end = addMinutes(time, 35);
        periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
        time = end;
    }
    const lunchEnd = addMinutes(time, 60);
    periods.push({ label: 'Lunch', start: time, end: lunchEnd, type: 'lunch' });
    time = lunchEnd;
    for (let i = 10; i <= 13; i++) {
        const end = addMinutes(time, 30);
        periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
        time = end;
    }
    return periods;
};

export default function TeacherTimetable() {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const periods = generatePeriods();

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const { data } = await api.get('/api/timetable/my');
      setSlots(data);
    } catch (err) {
      showToast('Failed to load your teaching schedule', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const getSlot = (dayIdx: number, start: string) => {
    return slots.find(s => s.dayOfWeek === dayIdx && s.startTime === start);
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <h1>Teaching Schedule</h1>
        <p>Your personalized weekly timetable across all assigned classes.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
           <h2><i className="fas fa-chalkboard-teacher" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Academic Grid</h2>
           <button onClick={() => window.print()} className="portal-btn-secondary">
             <i className="fas fa-print" style={{ marginRight: 6 }}></i>Print Schedule
           </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : slots.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '3rem', color: '#cbd5e0', marginBottom: 20 }}></i>
              <h3>No Lessons Assigned</h3>
              <p>You haven't been assigned to teach any subjects in the active timetable slots yet.</p>
            </div>
          ) : (
            <table className="timetable-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0' }}>Time Slot</th>
                  {DAYS.map(d => <th key={d} style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pIdx) => (
                  <tr key={pIdx} className={p.type !== 'lesson' ? 'break-row' : ''}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', background: '#f1f5f9', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--portal-primary)' }}>{p.label}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.start}</div>
                    </td>
                    {DAYS.map((_, dIdx) => {
                       if (p.type !== 'lesson') {
                         return <td key={dIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}></td>;
                       }
                       const slot = getSlot(dIdx + 1, p.start);
                       return (
                         <td key={dIdx} style={{ border: '1px solid #e2e8f0', padding: 10, minWidth: 140, textAlign: 'center' }}>
                           {slot ? (
                             <>
                               <div style={{ fontWeight: 700, color: '#2d3748', fontSize: '0.9rem' }}>{slot.subject?.name}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--portal-primary)', fontWeight: 600, marginTop: 4 }}>
                                 {slot.class?.name}
                               </div>
                               <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: 2 }}>
                                 <i className="fas fa-door-closed" style={{ marginRight: 4 }}></i>{slot.room || 'TBA'}
                               </div>
                             </>
                           ) : (
                             <span style={{ color: '#cbd5e0' }}>—</span>
                           )}
                         </td>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <style>{`
        .timetable-table th { font-weight: 700; color: #475569; }
        .break-row td { background: #f8fafc; }
        @media print {
          .portal-page-header, .portal-btn-secondary { display: none !important; }
          .portal-card { border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border: 2px solid black !important; }
          th, td { border: 1px solid black !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
