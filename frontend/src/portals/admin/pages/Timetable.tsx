import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Legacy Time Structure
const generatePeriods = () => {
  const periods = [];
  let time = '07:30';

  const addMinutes = (t: string, m: number) => {
    const [h, min] = t.split(':').map(Number);
    const total = h * 60 + min + m;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  // Morning (4 periods)
  for (let i = 1; i <= 4; i++) {
    const end = addMinutes(time, 35);
    periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
    time = end;
  }
  // Break
  const breakEnd = addMinutes(time, 15);
  periods.push({ label: 'Break', start: time, end: breakEnd, type: 'break' });
  time = breakEnd;

  // Mid-Morning (5 periods)
  for (let i = 5; i <= 9; i++) {
    const end = addMinutes(time, 35);
    periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
    time = end;
  }
  // Lunch
  const lunchEnd = addMinutes(time, 60);
  periods.push({ label: 'Lunch', start: time, end: lunchEnd, type: 'lunch' });
  time = lunchEnd;

  // Afternoon (4 periods)
  for (let i = 10; i <= 13; i++) {
    const end = addMinutes(time, 30);
    periods.push({ label: `Period ${i}`, start: time, end, type: 'lesson' });
    time = end;
  }

  return periods;
};

export default function AdminTimetable() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isMedical, isPoly, isUniversity, isSeminary } = useTerminology();
  const isSemester = isUniversity || isPoly || isMedical || isSeminary;
  const periods = generatePeriods();

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState(isSemester ? 'Semester 1' : 'Term 1');
  const [year, setYear] = useState(2025);
  const [slots, setSlots] = useState<any[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTerm(isSemester ? 'Semester 1' : 'Term 1');
  }, [isSemester]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
    }
  }, [selectedClass, term, year]);

  const fetchMetadata = async () => {
    try {
      const [clsRes, subRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/subjects')
      ]);
      setClasses(clsRes.data);
      setSubjects(subRes.data);
      if (clsRes.data.length > 0) setSelectedClass(clsRes.data[0].id);
    } catch (err) {
      showToast('Failed to load classes/subjects', 'error');
    
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/timetable/class/${selectedClass}?term=${term}&year=${year}`);
      setSlots(data);
      setIsPublished(data.length > 0 ? data[0].isPublished : false);
      setIsDirty(false);
    } catch (err) {
      showToast('Failed to load timetable', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSlotChange = (dayIdx: number, startTime: string, endTime: string, subjectId: string) => {
    const updated = [...slots];
    const existingIdx = updated.findIndex(s => s.dayOfWeek === dayIdx && s.startTime === startTime);

    if (subjectId === '') {
      if (existingIdx > -1) updated.splice(existingIdx, 1);
    } else {
      if (existingIdx > -1) {
        updated[existingIdx].subjectId = subjectId;
      } else {
        updated.push({ dayOfWeek: dayIdx, startTime, endTime, subjectId, isPublished });
      }
    }
    setSlots(updated);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/timetable/save', {
        classId: selectedClass,
        term,
        year,
        slots: slots.map(s => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectId: s.subjectId,
          isPublished
        }))
      });
      setIsDirty(false);
      showToast('Timetable saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save changes', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (isDirty) {
      showToast('You have unsaved changes. Please save the timetable before publishing.', 'warning');
      return;
    }
    if (slots.length === 0) {
      showToast('Cannot publish an empty timetable. Please add some slots first.', 'error');
      return;
    }
    try {
      const newState = !isPublished;
      await api.post('/api/timetable/publish', {
        classId: selectedClass,
        term,
        year,
        isPublished: newState
      });
      setIsPublished(newState);
      showToast(newState ? 'Timetable published to students!' : 'Timetable retracted', 'success');
    } catch (err) {
      showToast('Failed to toggle visibility', 'error');
    
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getSlot = (dayIdx: number, start: string) => {
    return slots.find(s => s.dayOfWeek === dayIdx && s.startTime === start);
  };

  return (
    <>
      <div className="portal-page-header no-print">
        <h1>Timetable Management</h1>
        <p>Build and publish academic schedules for each class.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header no-print" style={{ flexWrap: 'wrap', gap: 15 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="portal-input"
                style={{ width: 'auto' }}
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select 
                value={term} 
                onChange={e => setTerm(e.target.value)}
                className="portal-input"
                style={{ width: 'auto' }}
            >
              {isSemester ? (
                <>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                </>
              ) : (
                <>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </>
              )}
            </select>
            <select 
                value={year} 
                onChange={e => setYear(parseInt(e.target.value))}
                className="portal-input"
                style={{ width: 'auto' }}
            >
              <option>2025</option><option>2026</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
                onClick={handlePrint}
                className="portal-btn-secondary"
            >
              <i className="fas fa-print" style={{ marginRight: 6 }}></i>Print / PDF
            </button>
            <button 
                onClick={togglePublish}
                className={`portal-btn-${isPublished ? 'danger' : 'success'}`}
                disabled={slots.length === 0}
                style={{ opacity: slots.length === 0 ? 0.6 : 1 }}
            >
              <i className={`fas fa-${isPublished ? 'low-vision' : 'eye'}`} style={{ marginRight: 6 }}></i>
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button 
                onClick={handleSave} 
                disabled={saving || !selectedClass}
                className="portal-btn-primary"
                style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <i className="fas fa-save"></i>
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
           <div className="print-header only-print" style={{ textAlign: 'center', marginBottom: 20 }}>
              <h1>{user?.schoolName || 'School'} Timetable</h1>
              <h2>{classes.find(c => c.id === selectedClass)?.name} — {term}, {year}</h2>
           </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading Grid...</div>
          ) : (
            <table className="timetable-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', minWidth: 120 }}>Time</th>
                  {DAYS.map((d, _) => <th key={d} style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pIdx) => (
                  <tr key={pIdx} className={p.type !== 'lesson' ? 'break-row' : ''}>
                    <td style={{ 
                        padding: '10px', 
                        border: '1px solid #e2e8f0', 
                        background: '#f1f5f9',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textAlign: 'center'
                    }}>
                      <div style={{ color: 'var(--portal-primary)' }}>{p.label}</div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{p.start} - {p.end}</div>
                    </td>
                    {DAYS.map((_, dIdx) => {
                      if (p.type !== 'lesson') {
                        return (
                          <td 
                            key={dIdx} 
                            colSpan={1} 
                            style={{ 
                                background: '#f8fafc', 
                                border: '1px solid #e2e8f0', 
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#94a3b8',
                                fontStyle: 'italic'
                            }}
                          >
                            {p.label}
                          </td>
                        );
                      }
                      const slot = getSlot(dIdx + 1, p.start);
                      return (
                        <td key={dIdx} style={{ border: '1px solid #e2e8f0', padding: 5, minWidth: 140 }}>
                          <select 
                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem' }}
                            value={slot?.subjectId || ''}
                            onChange={(e) => handleSlotChange(dIdx + 1, p.start, p.end, e.target.value)}
                            className="no-print"
                          >
                            <option value="">— Empty —</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <div className="only-print" style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
                            {subjects.find(s => s.id === slot?.subjectId)?.name || ''}
                          </div>
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
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .portal-card { border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border: 2px solid black !important; }
          th, td { border: 1px solid black !important; color: black !important; }
          .timetable-table { font-size: 10pt !important; }
        }
        .only-print { display: none; }
        .break-row td { background: #f8fafc; }
        .timetable-table th { font-weight: 700; color: #475569; }
      `}</style>
    </>
  );
}
