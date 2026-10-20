import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';
import '../../../styles/portal.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface BellPeriod {
  label: string;
  start: string;
  end: string;
  type: 'lesson' | 'break' | 'lunch';
}

const DEFAULT_BELL_SCHEDULE: BellPeriod[] = [
  { label: 'Period 1', start: '08:00', end: '08:45', type: 'lesson' },
  { label: 'Period 2', start: '08:45', end: '09:30', type: 'lesson' },
  { label: 'Period 3', start: '09:30', end: '10:15', type: 'lesson' },
  { label: 'Tea Break', start: '10:15', end: '10:45', type: 'break' },
  { label: 'Period 4', start: '10:45', end: '11:30', type: 'lesson' },
  { label: 'Period 5', start: '11:30', end: '12:15', type: 'lesson' },
  { label: 'Period 6', start: '12:15', end: '13:00', type: 'lesson' },
  { label: 'Lunch Break', start: '13:00', end: '14:00', type: 'lunch' },
  { label: 'Period 7', start: '14:00', end: '14:45', type: 'lesson' },
  { label: 'Period 8', start: '14:45', end: '15:30', type: 'lesson' },
];

export default function TeacherTimetable() {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  const { showToast } = useToast();

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/timetable/my');
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load timetable:', err);
      showToast('Failed to load your teaching schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically compute periods, ensuring all slots are accommodated
  const periods = useMemo(() => {
    const periodList = [...DEFAULT_BELL_SCHEDULE];
    const existingStartTimes = new Set(periodList.map(p => p.start));

    // If slots have start times not in default bell schedule, dynamically append them
    slots.forEach(s => {
      if (s.startTime && !existingStartTimes.has(s.startTime)) {
        existingStartTimes.add(s.startTime);
        periodList.push({
          label: `Slot ${s.startTime}`,
          start: s.startTime,
          end: s.endTime || s.startTime,
          type: 'lesson'
        });
      }
    });

    return periodList.sort((a, b) => a.start.localeCompare(b.start));
  }, [slots]);

  const getSlot = (dayIdx: number, start: string) => {
    return slots.find(s => s.dayOfWeek === dayIdx && s.startTime === start);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalPeriods = slots.length;
    const subjects = new Set(slots.map(s => s.subject?.name || s.subjectId).filter(Boolean)).size;
    const classes = new Set(slots.map(s => s.class?.name || s.classId).filter(Boolean)).size;
    return { totalPeriods, subjects, classes };
  }, [slots]);

  const displayedDays = selectedDay === 'ALL' 
    ? DAYS.map((d, i) => ({ name: d, dayIdx: i + 1 }))
    : [{ name: DAYS[selectedDay - 1], dayIdx: selectedDay }];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-calendar-alt" style={{ color: '#0284c7' }} />
            My Teaching Schedule
          </h1>
          <p>Personalized weekly academic timetable across your assigned subjects and classroom streams.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            onClick={() => window.print()} 
            className="portal-btn-primary"
            style={{
              height: 42,
              padding: '0 20px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <i className="fas fa-print" /> Print Timetable
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 16, 
          marginBottom: 20 
        }}
      >
        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Weekly Lessons</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>{stats.totalPeriods}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '1.2rem' }}>
              <i className="fas fa-chalkboard" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Subjects Taught</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{stats.subjects}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '1.2rem' }}>
              <i className="fas fa-book" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Classes &amp; Streams</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1', marginTop: 4 }}>{stats.classes}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '1.2rem' }}>
              <i className="fas fa-users" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Day Selector Bar */}
      <div 
        className="portal-card" 
        style={{ 
          padding: '12px 20px', 
          borderRadius: 12, 
          border: '1px solid #e2e8f0', 
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedDay('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: selectedDay === 'ALL' ? '#0284c7' : '#ffffff',
              color: selectedDay === 'ALL' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            All Days
          </button>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setSelectedDay((i + 1) as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: selectedDay === i + 1 ? '#0284c7' : '#ffffff',
                color: selectedDay === i + 1 ? '#ffffff' : '#334155',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timetable Card */}
      <div className="portal-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-table" style={{ color: '#0284c7' }} />
            Academic Lesson Matrix
          </h2>
        </div>

        <div style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <SkeletonLoader type="table" rows={8} columns={6} />
            </div>
          ) : slots.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <i className="fas fa-calendar-times fa-3x" style={{ color: '#cbd5e1', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 6px', fontWeight: 700, color: '#1e293b' }}>No Lessons Allocated</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                Your assigned subjects or classroom streams have not yet been placed into the active academic schedule.
              </p>
            </div>
          ) : (
            <table className="portal-table timetable-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', width: 140, borderRight: '1px solid #e2e8f0' }}>Period / Time</th>
                  {displayedDays.map(d => (
                    <th key={d.dayIdx} style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pIdx) => {
                  const isBreak = p.type !== 'lesson';

                  return (
                    <tr 
                      key={pIdx} 
                      style={{ 
                        background: isBreak ? '#f8fafc' : '#ffffff',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <td style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0', background: isBreak ? '#f1f5f9' : '#fafbfc' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isBreak ? '#64748b' : '#0284c7' }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.start} – {p.end}
                        </div>
                      </td>

                      {displayedDays.map(d => {
                        if (isBreak) {
                          return (
                            <td 
                              key={d.dayIdx} 
                              style={{ 
                                padding: '10px 16px', 
                                textAlign: 'center', 
                                background: '#f8fafc',
                                color: '#94a3b8',
                                fontSize: '0.78rem',
                                fontStyle: 'italic',
                                fontWeight: 600
                              }}
                            >
                              — {p.label} —
                            </td>
                          );
                        }

                        const slot = getSlot(d.dayIdx, p.start);

                        return (
                          <td 
                            key={d.dayIdx} 
                            style={{ 
                              padding: '12px 14px', 
                              minWidth: 150, 
                              textAlign: 'center',
                              verticalAlign: 'middle'
                            }}
                          >
                            {slot ? (
                              <div 
                                style={{ 
                                  background: '#f0f9ff', 
                                  border: '1px solid #bae6fd', 
                                  borderRadius: 8, 
                                  padding: '8px 10px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                              >
                                <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.9rem' }}>
                                  {slot.subject?.name || 'Assigned Subject'}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700, marginTop: 3 }}>
                                  <i className="fas fa-chalkboard mr-1" />
                                  {slot.class?.name}
                                </div>
                                {slot.room && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                                    <i className="fas fa-door-open mr-1" /> Room {slot.room}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '1rem' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .portal-page-header, .portal-card:first-of-type, .portal-card:nth-of-type(2) { display: none !important; }
          .portal-card { border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border: 2px solid black !important; }
          th, td { border: 1px solid black !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
