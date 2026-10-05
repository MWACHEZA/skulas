import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Timetable from './Timetable';
import Holiday from './Holiday';
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

interface TimetableSlot {
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

function MasterTimetableGrid() {
  const { showToast } = useToast();
  const [filterMode, setFilterMode] = useState<'CLASS' | 'TEACHER' | 'ROOM'>('CLASS');
  const [selectedEntity, setSelectedEntity] = useState('Form 4A');
  const [showBellTimesModal, setShowBellTimesModal] = useState(false);

  const [bellTimes, setBellTimes] = useState<BellPeriod[]>([
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
  ]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const teachingPeriods = [1, 2, 3, 4, 5, 6, 7, 8];

  const [scheduleData, setScheduleData] = useState<TimetableSlot[]>([
    { id: 's1', day: 'Monday', periodNo: 1, subject: 'Mathematics', className: 'Form 4A', teacherName: 'Mr. Chikore', roomName: 'Lab 1', hasClash: false },
    { id: 's2', day: 'Monday', periodNo: 2, subject: 'Mathematics', className: 'Form 4A', teacherName: 'Mr. Chikore', roomName: 'Lab 1', hasClash: false },
    { id: 's3', day: 'Monday', periodNo: 3, subject: 'Physics', className: 'Form 4A', teacherName: 'Mrs. Dube', roomName: 'Science Lab A', hasClash: false },
    { id: 's4', day: 'Monday', periodNo: 4, subject: 'English Language', className: 'Form 4A', teacherName: 'Ms. Hove', roomName: 'Room 12', hasClash: false },
    { id: 's5', day: 'Monday', periodNo: 5, subject: 'Chemistry', className: 'Form 4A', teacherName: 'Mr. Mutasa', roomName: 'Science Lab B', hasClash: false },
    { id: 's6', day: 'Monday', periodNo: 6, subject: 'Biology', className: 'Form 4A', teacherName: 'Mr. Mutasa', roomName: 'Science Lab B', hasClash: false },
    { id: 's7', day: 'Tuesday', periodNo: 1, subject: 'Chemistry', className: 'Form 4A', teacherName: 'Mr. Mutasa', roomName: 'Science Lab B', hasClash: true, clashReason: 'Room Science Lab B double-booked with Form 3B' },
    { id: 's8', day: 'Tuesday', periodNo: 2, subject: 'History', className: 'Form 4A', teacherName: 'Mr. Moyo', roomName: 'Room 12', hasClash: false },
    { id: 's9', day: 'Wednesday', periodNo: 3, subject: 'Mathematics', className: 'Form 4A', teacherName: 'Mr. Chikore', roomName: 'Room 14', hasClash: false },
    { id: 's10', day: 'Thursday', periodNo: 4, subject: 'Geography', className: 'Form 4A', teacherName: 'Mrs. Sibanda', roomName: 'Room 10', hasClash: false },
    { id: 's11', day: 'Friday', periodNo: 5, subject: 'Computer Science', className: 'Form 4A', teacherName: 'Mr. Ncube', roomName: 'Computer Lab', hasClash: false }
  ]);

  const clashCount = scheduleData.filter(s => s.hasClash).length;

  return (
    <div>
      {/* Top Controls */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Matrix Perspective:</label>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 6, padding: 3 }}>
              {(['CLASS', 'TEACHER', 'ROOM'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFilterMode(mode);
                    setSelectedEntity(mode === 'CLASS' ? 'Form 4A' : mode === 'TEACHER' ? 'Mr. Chikore' : 'Science Lab B');
                  }}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 4,
                    background: filterMode === mode ? '#2563eb' : 'none',
                    color: filterMode === mode ? '#fff' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  By {mode.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Filter Selection:</label>
            <select
              className="portal-input"
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              style={{ minWidth: 180 }}
            >
              {filterMode === 'CLASS' && (
                <>
                  <option value="Form 1A">Form 1A</option>
                  <option value="Form 2B">Form 2B</option>
                  <option value="Form 3A">Form 3A</option>
                  <option value="Form 4A">Form 4A</option>
                  <option value="Lower 6 Science">Lower 6 Science</option>
                  <option value="Upper 6 Arts">Upper 6 Arts</option>
                </>
              )}
              {filterMode === 'TEACHER' && (
                <>
                  <option value="Mr. Chikore">Mr. Chikore (Maths)</option>
                  <option value="Mrs. Dube">Mrs. Dube (Physics)</option>
                  <option value="Mr. Mutasa">Mr. Mutasa (Chemistry)</option>
                  <option value="Ms. Hove">Ms. Hove (English)</option>
                  <option value="Mrs. Sibanda">Mrs. Sibanda (Geography)</option>
                </>
              )}
              {filterMode === 'ROOM' && (
                <>
                  <option value="Lab 1">Lab 1</option>
                  <option value="Science Lab A">Science Lab A</option>
                  <option value="Science Lab B">Science Lab B</option>
                  <option value="Computer Lab">Computer Lab</option>
                  <option value="Room 12">Room 12</option>
                  <option value="Room 14">Room 14</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clashCount > 0 ? (
            <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-exclamation-triangle"></i> {clashCount} Timetable Clash Detected
            </span>
          ) : (
            <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '6px 12px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600 }}>
              <i className="fas fa-check-circle mr-1"></i> Zero Allocation Clashes
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBellTimesModal(true)}
            style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="fas fa-bell mr-1"></i> Bell-Times Config
          </button>
        </div>
      </div>

      {/* Cross-Grid Schedule */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
              <tr>
                <th style={{ padding: '12px 14px', textAlign: 'left', width: '120px' }}>Day \ Period</th>
                {teachingPeriods.map(p => {
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
              {days.map(day => (
                <tr key={day} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, background: '#fafafa', color: '#1e293b' }}>
                    {day}
                  </td>
                  {teachingPeriods.map(periodNo => {
                    const slot = scheduleData.find(s => s.day === day && s.periodNo === periodNo);
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
                          borderRadius: 4
                        }}
                      >
                        <div style={{ fontWeight: 700, color: slot.hasClash ? '#dc2626' : '#0369a1', fontSize: '0.85rem' }}>
                          {slot.subject}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                          {filterMode === 'CLASS' ? slot.teacherName : slot.className}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
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
      </div>

      {/* Bell Times Modal */}
      {showBellTimesModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 640, background: '#fff', borderRadius: 8, padding: 24 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>School Bell-Times Schedule</h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Standardized period durations & breaks for daily timetable</span>
              </div>
              <button onClick={() => setShowBellTimesModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
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
                  className="btn btn-primary"
                  onClick={() => {
                    setShowBellTimesModal(false);
                    showToast('Bell-times schedule updated and pushed to biometric chime clocks!', 'success');
                  }}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Timetable & Institutional Calendar</h1>
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
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#2563eb' : '#64748b',
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
