import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useSearchParams } from 'react-router-dom';
import { SearchInput, ExportButton, SkeletonLoader } from '../../../components/shared';

interface Student {
  id: string;
  studentId: string;
  name: string;
  status: string;
  note: string;
}

interface AssignedClass {
  id: string;
  name: string;
  role?: string;
  _count?: {
    students: number;
  };
}

export default function TeacherClassAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClassId = searchParams.get('classId');
  
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId || '');
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { showToast } = useToast();

  // Load teacher's assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const { data } = await api.get('/api/teachers/my-classes');
        const list = Array.isArray(data) ? data : [];
        setClasses(list);

        if (list.length > 0) {
          const matched = list.find(c => c.id === urlClassId);
          const initialClassId = matched ? matched.id : list[0].id;
          setSelectedClassId(initialClassId);
          if (initialClassId !== urlClassId) {
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set('classId', initialClassId);
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load teacher classes:', err);
        showToast('Failed to load assigned classes', 'error');
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('classId', newClassId);
      return next;
    });
  };

  const fetchStudents = useCallback(async (classIdToFetch: string) => {
    if (!classIdToFetch) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/api/teachers/my-students?classId=${classIdToFetch}`);
      const list = Array.isArray(data) ? data : [];
      setStudents(list.map((s: any) => ({
        id: s.id,
        studentId: s.studentId || '—',
        name: s.user?.name || s.name || 'Student',
        status: 'Present',
        note: ''
      })));
      setHasUnsavedChanges(false);
    } catch (err) {
      showToast('Failed to load class roster', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId, fetchStudents]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateStatus = (id: string, status: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setHasUnsavedChanges(true);
  };

  const markAll = (status: 'Present' | 'Absent') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    setHasUnsavedChanges(true);
    showToast(`Marked all students as ${status}`, 'info');
  };

  const handleSave = async () => {
    if (!selectedClassId) return;
    try {
      setSaving(true);
      const records = students.map(s => ({
        studentId: s.id,
        status: s.status,
        note: s.note
      }));
      await api.post('/api/teachers/attendance/mark-bulk', { date, records, classId: selectedClassId });
      showToast('Attendance recorded and saved successfully', 'success');
      setHasUnsavedChanges(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to save attendance record. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount = students.filter(s => s.status === 'Absent').length;
  const lateCount = students.filter(s => s.status === 'Late').length;

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.studentId.toLowerCase().includes(term) ||
      s.status.toLowerCase().includes(term)
    );
  });

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Selector Card */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              <i className="fas fa-chalkboard mr-1" /> Assigned Class
            </label>
            {loadingClasses ? (
              <SkeletonLoader type="text" width="160px" height="38px" />
            ) : classes.length === 0 ? (
              <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>
                No assigned classes found
              </span>
            ) : (
              <select
                value={selectedClassId}
                onChange={e => handleClassChange(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  minWidth: 260,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.role ? `(${c.role})` : ''} — {c._count?.students ?? ''} students
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              <i className="fas fa-calendar-day mr-1" /> Register Date
            </label>
            <input 
              type="date" 
              className="portal-input" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        {/* Quick Bulk Actions & Unsaved Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => markAll('Present')}
            disabled={students.length === 0}
            className="portal-btn"
            style={{
              height: '36px',
              minHeight: '36px',
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#166534',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: students.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <i className="fas fa-check-double" /> Mark All Present
          </button>

          <button
            type="button"
            onClick={() => markAll('Absent')}
            disabled={students.length === 0}
            className="portal-btn"
            style={{
              height: '36px',
              minHeight: '36px',
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: students.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <i className="fas fa-user-slash" /> Mark All Absent
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
              {selectedClass ? `${selectedClass.name} Roster` : 'Class Roster'}
            </h3>
            {hasUnsavedChanges && (
              <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                Unsaved changes
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              Present: {presentCount}
            </span>
            <span style={{ fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              Absent: {absentCount}
            </span>
            {lateCount > 0 && (
              <span style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
                Late: {lateCount}
              </span>
            )}
            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              Total: {students.length}
            </span>
          </div>
        </div>

        {/* Search and Export Bar */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search students by name or ID..."
            />
          </div>
          <ExportButton
            data={filteredStudents.map(s => ({
              studentId: s.studentId,
              name: s.name,
              status: s.status,
              note: s.note || '—',
              date: date,
              class: selectedClass?.name || 'Class'
            }))}
            columns={[
              { header: 'Student ID', key: 'studentId', width: 18 },
              { header: 'Student Name', key: 'name', width: 25 },
              { header: 'Class', key: 'class', width: 16 },
              { header: 'Status', key: 'status', width: 14 },
              { header: 'Note / Remarks', key: 'note', width: 25 },
              { header: 'Date', key: 'date', width: 14 }
            ]}
            filename={`class-attendance-${selectedClass?.name || 'class'}-${date}`}
            title={`Class Attendance Register - ${selectedClass?.name || ''} (${date})`}
            subtitle={`Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount}`}
          />
        </div>

        {/* Students Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px' }}>
              <SkeletonLoader type="table" rows={6} columns={4} />
            </div>
          ) : classes.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-chalkboard-teacher fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 700 }}>No Assigned Classes</h3>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>You have not been assigned as a homeroom or subject teacher to any classes yet.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-user-graduate fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 700 }}>No Students in this Class</h3>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
                {searchTerm ? 'No students matched your search criteria.' : 'This class currently has no enrolled students.'}
              </p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Student ID</th>
                  <th>Full Name</th>
                  <th style={{ width: '260px' }}>Attendance Status</th>
                  <th>Remarks / Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      {student.studentId}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                          {student.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{student.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          type="button"
                          onClick={() => updateStatus(student.id, 'Present')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            background: student.status === 'Present' ? '#10b981' : '#f1f5f9',
                            color: student.status === 'Present' ? '#ffffff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <i className="fas fa-check mr-1" /> Present
                        </button>

                        <button 
                          type="button"
                          onClick={() => updateStatus(student.id, 'Absent')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            background: student.status === 'Absent' ? '#ef4444' : '#f1f5f9',
                            color: student.status === 'Absent' ? '#ffffff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <i className="fas fa-times mr-1" /> Absent
                        </button>

                        <button 
                          type="button"
                          onClick={() => updateStatus(student.id, 'Late')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            background: student.status === 'Late' ? '#f59e0b' : '#f1f5f9',
                            color: student.status === 'Late' ? '#ffffff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <i className="fas fa-clock mr-1" /> Late
                        </button>
                      </div>
                    </td>
                    <td>
                      <input 
                        className="portal-input"
                        placeholder="Add note or reason..."
                        value={student.note}
                        onChange={e => {
                          setStudents(prev => prev.map(s => s.id === student.id ? { ...s, note: e.target.value } : s));
                          setHasUnsavedChanges(true);
                        }}
                        style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', maxWidth: '320px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Save Button */}
        <div 
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #edf2f7',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {hasUnsavedChanges ? (
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                <i className="fas fa-exclamation-triangle mr-1" /> You have unsaved attendance changes.
              </span>
            ) : (
              <span>All records up to date.</span>
            )}
          </span>

          <button 
            type="button"
            data-tour="attendance-take-btn"
            onClick={handleSave}
            disabled={students.length === 0 || saving}
            className="portal-btn-primary"
            style={{
              opacity: students.length === 0 ? 0.6 : 1,
              cursor: students.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save" /> Save Attendance Register
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
