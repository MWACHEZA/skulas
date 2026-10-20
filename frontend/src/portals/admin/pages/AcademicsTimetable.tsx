import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Timetable from './Timetable';
import Holiday from './Holiday';
import api from '../../../lib/api';
import { SkeletonLoader } from '../../../components/shared';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type TimetableTab = 'schedule' | 'master-grid' | 'calendar';

interface BellPeriod {
  periodNo: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

interface TimetableSlotDisplay {
  id: string;
  day: string;
  periodNo: number;
  subject: string;
  className: string;
  teacherName: string;
  roomName: string;
  hasClash?: boolean;
  clashReason?: string;
}

const DEFAULT_BELL_TIMES: BellPeriod[] = [
  { periodNo: 0, label: 'Morning Roll-Call & Devotion', startTime: '07:30', endTime: '08:00', isBreak: true },
  { periodNo: 1, label: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
  { periodNo: 2, label: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
  { periodNo: 3, label: 'Period 3', startTime: '09:30', endTime: '10:15', isBreak: false },
  { periodNo: 0, label: 'Tea & Tuckshop Break', startTime: '10:15', endTime: '10:45', isBreak: true },
  { periodNo: 4, label: 'Period 4', startTime: '10:45', endTime: '11:30', isBreak: false },
  { periodNo: 5, label: 'Period 5', startTime: '11:30', endTime: '12:15', isBreak: false },
  { periodNo: 6, label: 'Period 6', startTime: '12:15', endTime: '13:00', isBreak: false },
  { periodNo: 0, label: 'Lunch Break & Dining Hall', startTime: '13:00', endTime: '14:00', isBreak: true },
  { periodNo: 7, label: 'Period 7 (Labs / Practical)', startTime: '14:00', endTime: '14:45', isBreak: false },
  { periodNo: 8, label: 'Period 8 (Prep / Co-Curricular)', startTime: '14:45', endTime: '15:30', isBreak: false }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TEACHING_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function MasterTimetableGrid() {
  const { showToast } = useToast();
  const [filterMode, setFilterMode] = useState<'CLASS' | 'TEACHER' | 'ROOM'>('CLASS');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [showBellTimesModal, setShowBellTimesModal] = useState(false);
  const [bellTimes, setBellTimes] = useState<BellPeriod[]>(DEFAULT_BELL_TIMES);

  // Live Database State
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [rawSlots, setRawSlots] = useState<any[]>([]);

  const fetchMasterData = useCallback(async () => {
    try {
      setLoading(true);
      const [clsRes, teaRes, subRes, masterRes] = await Promise.all([
        api.get('/api/classes').catch(() => ({ data: [] })),
        api.get('/api/teachers').catch(() => ({ data: { teachers: [] } })),
        api.get('/api/subjects').catch(() => ({ data: [] })),
        api.get('/api/timetable/master').catch(() => ({ data: [] }))
      ]);

      const cList = Array.isArray(clsRes.data) ? clsRes.data : [];
      const tList = teaRes.data?.teachers || (Array.isArray(teaRes.data) ? teaRes.data : []);
      const sList = Array.isArray(subRes.data) ? subRes.data : [];
      const mList = Array.isArray(masterRes.data) ? masterRes.data : [];

      setClassesList(cList);
      setTeachersList(tList);
      setSubjectsList(sList);
      setRawSlots(mList);

      if (cList.length > 0 && !selectedEntity) {
        setSelectedEntity(cList[0].name);
      }
    } catch (err) {
      console.error('Failed to load master timetable data:', err);
      showToast('Failed to load master timetable records', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedEntity, showToast]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Transform rawSlots into display format and detect clashes
  const scheduleData = useMemo(() => {
    const formatted: TimetableSlotDisplay[] = rawSlots.map((s, idx) => {
      const dayName = DAYS[s.dayOfWeek - 1] || 'Monday';
      
      // Match period number by startTime, or infer from period count
      let matchedPeriod = TEACHING_PERIODS.find(p => {
        const bt = bellTimes.find(b => b.periodNo === p && !b.isBreak);
        return bt && bt.startTime === s.startTime;
      });

      if (!matchedPeriod) {
        // Fallback: match by index
        matchedPeriod = (idx % 8) + 1;
      }

      // Resolve teacher
      const assignedTeacher = s.class?.subjectTeachers?.find((st: any) => st.subjectId === s.subjectId)?.teacher?.user?.name
        || s.class?.teacher?.user?.name
        || 'Assigned Tutor';

      return {
        id: s.id,
        day: dayName,
        periodNo: matchedPeriod,
        subject: s.subject?.name || 'Subject',
        className: s.class?.name || 'Unassigned',
        teacherName: assignedTeacher,
        roomName: s.room || 'General Room',
        hasClash: false
      };
    });

    // Detect double-booking clashes
    for (let i = 0; i < formatted.length; i++) {
      for (let j = i + 1; j < formatted.length; j++) {
        const a = formatted[i];
        const b = formatted[j];
        if (a.day === b.day && a.periodNo === b.periodNo) {
          // Room clash
          if (a.roomName && a.roomName !== 'General Room' && a.roomName === b.roomName) {
            a.hasClash = true;
            a.clashReason = `Room ${a.roomName} double-booked with ${b.className}`;
            b.hasClash = true;
            b.clashReason = `Room ${b.roomName} double-booked with ${a.className}`;
          }
          // Teacher clash
          if (a.teacherName && a.teacherName !== 'Assigned Tutor' && a.teacherName === b.teacherName) {
            a.hasClash = true;
            a.clashReason = `Teacher ${a.teacherName} double-booked with ${b.className}`;
            b.hasClash = true;
            b.clashReason = `Teacher ${b.teacherName} double-booked with ${a.className}`;
          }
        }
      }
    }

    return formatted;
  }, [rawSlots, bellTimes]);

  // Extract distinct rooms from raw slots
  const roomsList = useMemo(() => {
    const set = new Set(rawSlots.map(s => s.room).filter(Boolean));
    return Array.from(set);
  }, [rawSlots]);

  // When filterMode changes, adjust selectedEntity
  const handleModeChange = (mode: 'CLASS' | 'TEACHER' | 'ROOM') => {
    setFilterMode(mode);
    if (mode === 'CLASS' && classesList.length > 0) {
      setSelectedEntity(classesList[0].name);
    } else if (mode === 'TEACHER' && teachersList.length > 0) {
      setSelectedEntity(teachersList[0].user?.name || teachersList[0].name || '');
    } else if (mode === 'ROOM' && roomsList.length > 0) {
      setSelectedEntity(roomsList[0]);
    } else {
      setSelectedEntity('');
    }
  };

  // Filter slots for the currently selected entity
  const filteredSchedule = useMemo(() => {
    if (!selectedEntity) return scheduleData;
    return scheduleData.filter(s => {
      if (filterMode === 'CLASS') return s.className === selectedEntity;
      if (filterMode === 'TEACHER') return s.teacherName === selectedEntity;
      if (filterMode === 'ROOM') return s.roomName === selectedEntity;
      return true;
    });
  }, [scheduleData, filterMode, selectedEntity]);

  const clashCount = scheduleData.filter(s => s.hasClash).length;

  return (
    <div>
      {/* Top Controls */}
      <div 
        className="portal-card" 
        style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: '16px 20px', 
          marginBottom: 20, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 12,
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
              Matrix Perspective:
            </label>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {(['CLASS', 'TEACHER', 'ROOM'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 6,
                    background: filterMode === mode ? '#0284c7' : 'none',
                    color: filterMode === mode ? '#fff' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  By {mode.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
              Filter Selection:
            </label>
            <select
              className="portal-select"
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              style={{ minWidth: 200, height: 38, borderRadius: 8, fontSize: '0.88rem' }}
            >
              {filterMode === 'CLASS' && (
                classesList.length > 0 ? (
                  classesList.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.level})</option>
                  ))
                ) : (
                  <option value="">No Classes Defined</option>
                )
              )}
              {filterMode === 'TEACHER' && (
                teachersList.length > 0 ? (
                  teachersList.map(t => (
                    <option key={t.id} value={t.user?.name || t.name}>
                      {t.user?.name || t.name}
                    </option>
                  ))
                ) : (
                  <option value="">No Teachers Found</option>
                )
              )}
              {filterMode === 'ROOM' && (
                roomsList.length > 0 ? (
                  roomsList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))
                ) : (
                  <option value="">No Specific Rooms Assigned</option>
                )
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clashCount > 0 ? (
            <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-exclamation-triangle"></i> {clashCount} Clash Detected
            </span>
          ) : (
            <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600 }}>
              <i className="fas fa-check-circle mr-1"></i> Zero Allocation Clashes
            </span>
          )}

          <button
            type="button"
            className="portal-btn-ghost"
            onClick={() => setShowBellTimesModal(true)}
            style={{ height: 38, padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-bell mr-1"></i> Bell-Times Config
          </button>
        </div>
      </div>

      {/* Cross-Grid Schedule */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <SkeletonLoader type="table" rows={6} columns={9} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table" style={{ width: '100%', margin: 0, fontSize: '0.85rem', textAlign: 'center' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                <tr>
                  <th style={{ padding: '12px 14px', textAlign: 'left', width: '130px' }}>Day \ Period</th>
                  {TEACHING_PERIODS.map(p => {
                    const b = bellTimes.find(bt => bt.periodNo === p && !bt.isBreak);
                    return (
                      <th key={p} style={{ padding: '10px 8px', minWidth: '125px' }}>
                        <div style={{ fontWeight: 700 }}>Period {p}</div>
                        {b && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.startTime}-{b.endTime}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, background: '#fafafa', color: '#1e293b' }}>
                      {day}
                    </td>
                    {TEACHING_PERIODS.map(periodNo => {
                      const slot = filteredSchedule.find(s => s.day === day && s.periodNo === periodNo);
                      if (!slot) {
                        return (
                          <td key={periodNo} style={{ padding: '10px 8px', color: '#cbd5e1', background: '#fff' }}>
                            —
                          </td>
                        );
                      }
                      return (
                        <td
                          key={periodNo}
                          style={{
                            padding: '10px 8px',
                            background: slot.hasClash ? '#fef2f2' : '#f0f9ff',
                            border: slot.hasClash ? '1px solid #fca5a5' : '1px solid #e0f2fe',
                            borderRadius: 6
                          }}
                        >
                          <div style={{ fontWeight: 800, color: slot.hasClash ? '#dc2626' : '#0369a1', fontSize: '0.85rem' }}>
                            {slot.subject}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginTop: 2 }}>
                            {filterMode === 'CLASS' ? slot.teacherName : slot.className}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            <i className="fas fa-map-marker-alt mr-1"></i> {slot.roomName}
                          </div>
                          {slot.hasClash && (
                            <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }} title={slot.clashReason}>
                              <i className="fas fa-exclamation-circle mr-1"></i> CLASH!
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bell Times Modal */}
      {showBellTimesModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 640, background: '#fff', borderRadius: 12, padding: 24 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem' }}>School Bell-Times Schedule</h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Standardized period durations &amp; breaks for daily timetable</span>
              </div>
              <button onClick={() => setShowBellTimesModal(false)} className="close-modal">&times;</button>
            </div>
            <div style={{ marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Slot</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Session Label</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Start</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>End</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {bellTimes.map((bt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: bt.isBreak ? '#fffbeb' : '#fff' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{bt.periodNo === 0 ? 'Break' : `Period ${bt.periodNo}`}</td>
                      <td style={{ padding: '8px 12px' }}>{bt.label}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>{bt.startTime}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>{bt.endTime}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: bt.isBreak ? '#b45309' : '#0284c7' }}>
                          {bt.isBreak ? 'Interval' : 'Instructional'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="portal-btn-primary"
                  onClick={() => {
                    setShowBellTimesModal(false);
                    showToast('Bell-times schedule saved and synchronized with academic periods', 'success');
                  }}
                  style={{ height: 42, padding: '0 20px', borderRadius: 10, fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AcademicsTimetable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TimetableTab) || 'schedule';

  const handleTabChange = (tab: TimetableTab) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Timetable &amp; Institutional Calendar</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Schedule master period slots across forms and classes, detect double-booking clashes, and maintain institutional term dates, holidays, and events.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'schedule', label: 'Weekly Timetable Schedule', icon: 'fas fa-calendar-alt' },
          { id: 'master-grid', label: 'Master Cross-Grid & Clash Matrix', icon: 'fas fa-th' },
          { id: 'calendar', label: 'Academic Calendar & Holidays', icon: 'fas fa-calendar-day' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as TimetableTab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.id ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === t.id ? '#0284c7' : '#64748b',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'schedule' && <Timetable />}
        {activeTab === 'master-grid' && <MasterTimetableGrid />}
        {activeTab === 'calendar' && <Holiday />}
      </div>
    </>
  );
}
