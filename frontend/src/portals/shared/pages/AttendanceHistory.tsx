import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';
import '../../../styles/portal.css';

interface AttendanceRecord {
  id: string;
  date: string;
  rawDate: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  session: string;
  className: string;
  teacherName: string;
  scanMethod: string;
  note: string;
}

interface AttendanceMetrics {
  totalDays: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  presenceRate: number;
}

export default function AttendanceHistory() {
  const { user, activeEntity, setActiveEntity } = useAuth();
  const { showToast } = useToast();

  // Child selection for parent portal
  const linkedChildren = useMemo(() => {
    return user?.linkedEntities || [];
  }, [user?.linkedEntities]);

  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    return activeEntity?.id || user?.student?.id || linkedChildren[0]?.id || '';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<AttendanceMetrics>({
    totalDays: 0,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    absentCount: 0,
    presenceRate: 100
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ name: string; studentId: string; className: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calendar navigation state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Absence excuse modal
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [submittingExcuse, setSubmittingExcuse] = useState(false);
  const [excuseForm, setExcuseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reasonCategory: 'Illness / Medical Appointment',
    details: ''
  });

  // Fetch real attendance data from backend
  const fetchAttendance = useCallback(async (studentId: string) => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/attendance/student/${studentId}`);
      if (res.data) {
        setMetrics(res.data.metrics || {
          totalDays: 0,
          presentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          absentCount: 0,
          presenceRate: 100
        });
        setRecords(res.data.records || []);
        if (res.data.student) {
          setStudentInfo(res.data.student);
        }
      }
    } catch (err: any) {
      console.warn('Could not load student attendance:', err);
      // Fallback empty metrics without crashing
      setMetrics({
        totalDays: 0,
        presentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        absentCount: 0,
        presenceRate: 100
      });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const targetId = activeEntity?.id || user?.student?.id || linkedChildren[0]?.id;
    if (targetId && targetId !== activeStudentId) {
      setActiveStudentId(targetId);
    }
  }, [activeEntity?.id, user?.student?.id, linkedChildren]);

  useEffect(() => {
    if (activeStudentId) {
      fetchAttendance(activeStudentId);
    }
  }, [activeStudentId, fetchAttendance]);

  // Handle student switcher
  const handleStudentChange = (id: string) => {
    setActiveStudentId(id);
    const matched = linkedChildren.find(c => c.id === id);
    if (matched && setActiveEntity) {
      setActiveEntity(matched);
    }
  };

  // Submit excuse request
  const handleSubmitExcuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseForm.details.trim()) {
      showToast('Please provide a reason for the absence.', 'error');
      return;
    }

    setSubmittingExcuse(true);
    try {
      await api.post('/api/attendance/excuse', {
        studentId: activeStudentId,
        date: excuseForm.date,
        reason: `${excuseForm.reasonCategory}: ${excuseForm.details}`
      });

      showToast('Absence excuse recorded successfully.', 'success');
      setIsExcuseModalOpen(false);
      setExcuseForm({
        date: new Date().toISOString().slice(0, 10),
        reasonCategory: 'Illness / Medical Appointment',
        details: ''
      });
      // Refresh list
      fetchAttendance(activeStudentId);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit absence excuse';
      showToast(msg, 'error');
    } finally {
      setSubmittingExcuse(false);
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesSearch = !searchQuery.trim() ||
        r.session.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [records, statusFilter, searchQuery]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Session', 'Status', 'Class', 'Marked By', 'Notes'];
    const rows = filteredRecords.map(r => [
      `"${r.date}"`,
      `"${r.session}"`,
      `"${r.status}"`,
      `"${r.className}"`,
      `"${r.teacherName}"`,
      `"${r.note.replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${studentInfo?.name?.replace(/\s+/g, '_') || 'Student'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported successfully.', 'success');
  };

  // Helper colors
  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'PRESENT':
        return { bg: '#ecfdf5', text: '#059669', border: '#10b981', icon: 'fa-check' };
      case 'LATE':
        return { bg: '#fffbeb', text: '#d97706', border: '#f59e0b', icon: 'fa-clock' };
      case 'EXCUSED':
        return { bg: '#f0f9ff', text: '#0284c7', border: '#38bdf8', icon: 'fa-info-circle' };
      case 'ABSENT':
      default:
        return { bg: '#fef2f2', text: '#dc2626', border: '#ef4444', icon: 'fa-times' };
    }
  };

  // Calendar days computation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.rawDate === dateStr);
      days.push({ day, dateStr, records: dayRecords });
    }
    return days;
  }, [currentCalendarDate, records]);

  return (
    <div className="portal-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
      
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.2rem',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
            }}>
              <i className="fas fa-calendar-check"></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
                Attendance & Consistency Records
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Comprehensive log of daily classroom attendance, check-ins, and excused absences.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Multiple student switcher for parents */}
          {linkedChildren.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                value={activeStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                style={{
                  padding: '8px 32px 8px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                {linkedChildren.map(c => (
                  <option key={c.id} value={c.id}>
                    Student: {c.name}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down" style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                color: '#64748b',
                pointerEvents: 'none'
              }}></i>
            </div>
          )}

          <button
            type="button"
            className="portal-btn-ghost"
            style={{ fontWeight: 800, padding: '8px 14px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setIsExcuseModalOpen(true)}
          >
            <i className="fas fa-file-signature" style={{ color: '#0284c7' }}></i>
            <span>Submit Excuse</span>
          </button>

          <button
            type="button"
            className="portal-btn-primary"
            style={{ padding: '8px 16px', fontWeight: 800, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
          >
            <i className="fas fa-file-export"></i>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        {/* Metric 1: Overall Presence Rate */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          borderLeft: `5px solid ${metrics.presenceRate >= 90 ? '#10b981' : metrics.presenceRate >= 80 ? '#f59e0b' : '#ef4444'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Presence Rate
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: metrics.presenceRate >= 90 ? '#059669' : metrics.presenceRate >= 80 ? '#d97706' : '#dc2626', marginTop: 4 }}>
              {loading ? '...' : `${metrics.presenceRate}%`}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginTop: 10 }}>
            {metrics.totalDays} Total Tracked Day{metrics.totalDays === 1 ? '' : 's'}
          </div>
        </div>

        {/* Metric 2: Present Days */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #10b981',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Present on Time
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#059669', marginTop: 4 }}>
              {loading ? '...' : String(metrics.presentCount).padStart(2, '0')}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: 10 }}>
            <i className="fas fa-check-circle mr-1"></i> Full daily attendance
          </div>
        </div>

        {/* Metric 3: Late / Tardy */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #f59e0b',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Late / Tardy Arrivals
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#d97706', marginTop: 4 }}>
              {loading ? '...' : String(metrics.lateCount).padStart(2, '0')}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: 10 }}>
            <i className="fas fa-clock mr-1"></i> Arrived past roll call
          </div>
        </div>

        {/* Metric 4: Excused & Absences */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #0284c7',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Excused / Leave
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
              {loading ? '...' : String(metrics.excusedCount).padStart(2, '0')}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: metrics.absentCount > 0 ? '#ef4444' : '#64748b', fontWeight: 700, marginTop: 10 }}>
            {metrics.absentCount > 0 ? `${metrics.absentCount} Unexcused Absence(s)` : 'No unexcused absences'}
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH, STATUS TABS, VIEW SWITCHER ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: 20,
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(['ALL', 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                border: 'none',
                background: statusFilter === st ? '#0f172a' : '#f1f5f9',
                color: statusFilter === st ? '#ffffff' : '#475569',
                borderRadius: 10,
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st === 'ALL' ? 'All Logs' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search & View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <input
              type="text"
              placeholder="Search date, notes, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#1e293b'
              }}
            />
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}></i>
          </div>

          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <i className="fas fa-list"></i> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                border: 'none',
                background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                color: viewMode === 'calendar' ? '#0f172a' : '#64748b',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <i className="fas fa-calendar-alt"></i> Calendar
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: DETAILED TABLE LOG VIEW ── */}
      {viewMode === 'list' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              <SkeletonLoader type="table" rows={6} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#94a3b8',
                fontSize: '1.5rem'
              }}>
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                No Attendance Records Found
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {records.length === 0
                  ? 'Attendance check-in records will appear here as soon as teachers take the roll call.'
                  : 'No records matching the selected status or search filter.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ margin: 0 }}>
              <PaginatedTable className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Date
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Status
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Session / Context
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Class & Teacher
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Notes / Excuse
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item) => {
                    const style = getStatusColor(item.status);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-calendar-day" style={{ color: '#94a3b8', fontSize: '0.8rem' }}></i>
                            <span>{item.date}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            letterSpacing: '0.04em'
                          }}>
                            <i className={`fas ${style.icon}`} style={{ fontSize: '0.65rem' }}></i>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                          {item.session}
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                            Method: {item.scanMethod}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#334155' }}>
                          <div style={{ fontWeight: 700 }}>{item.className}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>{item.teacherName}</div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '0.82rem', color: item.note ? '#334155' : '#94a3b8' }}>
                          {item.note || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </PaginatedTable>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: INTERACTIVE MONTHLY CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {/* Calendar Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              {currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem' }}
                onClick={() => {
                  const d = new Date(currentCalendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentCalendarDate(d);
                }}
              >
                <i className="fas fa-chevron-left mr-1"></i> Prev
              </button>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800 }}
                onClick={() => setCurrentCalendarDate(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem' }}
                onClick={() => {
                  const d = new Date(currentCalendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentCalendarDate(d);
                }}
              >
                Next <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>

          {/* Calendar Day Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', marginBottom: 10 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} style={{ minHeight: 80, background: '#f8fafc', borderRadius: 10 }}></div>;
              }

              const hasRecords = cell.records.length > 0;
              const primaryRecord = cell.records[0];
              const style = primaryRecord ? getStatusColor(primaryRecord.status) : null;
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={cell.dateStr}
                  style={{
                    minHeight: 84,
                    borderRadius: 10,
                    border: isToday ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: style ? style.bg : '#ffffff',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: isToday ? 900 : 700,
                      fontSize: '0.82rem',
                      color: isToday ? '#0284c7' : '#1e293b'
                    }}>
                      {cell.day}
                    </span>
                    {isToday && (
                      <span style={{ fontSize: '0.62rem', background: '#0284c7', color: '#ffffff', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>
                        TODAY
                      </span>
                    )}
                  </div>

                  {hasRecords && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: style?.text,
                        background: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: 6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}>
                        {primaryRecord.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABSENCE EXCUSE MODAL ── */}
      {isExcuseModalOpen && (
        <div className="portal-modal-overlay" style={{ zIndex: 1050 }}>
          <div className="portal-modal" style={{ maxWidth: 540, width: '90%', borderRadius: 18, overflow: 'hidden' }}>
            <div className="portal-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <i className="fas fa-file-signature"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Submit Absence Excuse Note
                </h3>
              </div>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '4px 8px', borderRadius: 8 }}
                onClick={() => setIsExcuseModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitExcuse}>
              <div className="portal-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="portal-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, display: 'block' }}>
                    Student Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={studentInfo?.name || activeEntity?.name || 'Selected Student'}
                    className="portal-input"
                    style={{ background: '#f8fafc', color: '#475569', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="portal-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, display: 'block' }}>
                    Date of Absence <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={excuseForm.date}
                    onChange={(e) => setExcuseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="portal-input"
                  />
                </div>

                <div>
                  <label className="portal-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, display: 'block' }}>
                    Reason Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={excuseForm.reasonCategory}
                    onChange={(e) => setExcuseForm(prev => ({ ...prev, reasonCategory: e.target.value }))}
                    className="portal-input"
                  >
                    <option value="Illness / Medical Appointment">Illness / Medical Appointment</option>
                    <option value="Family Bereavement / Emergency">Family Bereavement / Emergency</option>
                    <option value="Official Representation / External Event">Official Representation / External Event</option>
                    <option value="Religious Observance">Religious Observance</option>
                    <option value="Other Authorized Reason">Other Authorized Reason</option>
                  </select>
                </div>

                <div>
                  <label className="portal-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, display: 'block' }}>
                    Detailed Explanation <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={excuseForm.details}
                    onChange={(e) => setExcuseForm(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Please specify details regarding the absence to assist class teacher and school administration..."
                    className="portal-input"
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>

              <div className="portal-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={() => setIsExcuseModalOpen(false)}
                  disabled={submittingExcuse}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  disabled={submittingExcuse}
                >
                  {submittingExcuse && <i className="fas fa-spinner fa-spin"></i>}
                  <span>Submit Excuse Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
