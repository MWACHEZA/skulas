import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useSearchParams } from 'react-router-dom';

interface Student {
  id: string;
  studentId: string;
  name: string;
  status: string;
  note: string;
}

export default function TeacherClassAttendance() {
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (classId) {
      fetchStudents();
    }
  }, [classId]);

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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/teachers/my-students?classId=${classId}`);
      // The response is a direct array of students from /api/teachers/my-students
      setStudents(data.map((s: any) => ({
        id: s.id,
        studentId: s.studentId,
        name: s.user?.name || s.name,
        status: 'Present',
        note: ''
      })));
    } catch (err) {
      showToast('Failed to load class roster', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id: string, status: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: s.status,
        note: s.note
      }));
      await api.post('/api/teachers/attendance/mark-bulk', { date, records, classId });
      showToast('Attendance saved successfully', 'success');
      setHasUnsavedChanges(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || "We couldn't save today's attendance because the connection to the server was lost. Please check your internet and try clicking save again.", 'error');
    }
  };

  if (!classId) return <div className="p-8 text-center">Please select a class from your dashboard first.</div>;

  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount = students.filter(s => s.status === 'Absent').length;

  return (
    <>
      <div className="portal-page-header">
        <h1>Class Attendance</h1>
        <p>Record and monitor daily student attendance for your assigned classes.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}><i className="fas fa-user-check" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Record Attendance</h2>
            <input 
              type="date" 
              className="portal-input" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{ padding: '4px 8px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span className="portal-badge success">Present: {presentCount}</span>
            <span className="portal-badge danger">Absent: {absentCount}</span>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading roster...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr><th>Student ID</th><th>Full Name</th><th>Status</th><th>Note</th></tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td style={{ fontSize: '0.85rem', color: '#718096' }}>{student.studentId}</td>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          onClick={() => updateStatus(student.id, 'Present')}
                          className={`portal-badge ${student.status === 'Present' ? 'success' : 'neutral'}`} 
                          style={{ border: 'none', cursor: 'pointer' }}
                        >Present</button>
                        <button 
                          onClick={() => updateStatus(student.id, 'Absent')}
                          className={`portal-badge ${student.status === 'Absent' ? 'danger' : 'neutral'}`} 
                          style={{ border: 'none', cursor: 'pointer' }}
                        >Absent</button>
                        <button 
                          onClick={() => updateStatus(student.id, 'Late')}
                          className={`portal-badge ${student.status === 'Late' ? 'warning' : 'neutral'}`} 
                          style={{ border: 'none', cursor: 'pointer' }}
                        >Late</button>
                      </div>
                    </td>
                    <td>
                      <input 
                        className="portal-input"
                        placeholder="Add note..."
                        value={student.note}
                        onChange={e => {
                          setStudents(prev => prev.map(s => s.id === student.id ? { ...s, note: e.target.value } : s));
                          setHasUnsavedChanges(true);
                        }}
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ padding: 20, textAlign: 'right', borderTop: '1px solid #edf2f7' }}>
             <button 
               onClick={handleSave}
               disabled={students.length === 0}
               className="portal-btn-primary" 
               style={{ padding: '12px 24px' }}
             >
               Save Attendance Record
             </button>
          </div>
        </div>
      </div>
    </>
  );
}
