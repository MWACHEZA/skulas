import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function TeacherClassDetails() {
   const { classId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      // Fetch core class info
      const { data: schoolsData } = await api.get('/api/teachers/my-classes');
      const currentClass = schoolsData.find((c: any) => c.id === classId);
      
      if (!currentClass) {
        showToast('Class not found or access denied', 'error');
        navigate('/teacher/classes');
        return;
      }
      setClassData(currentClass);

      // Fetch students for this class
      const { data: studentData } = await api.get(`/api/teachers/my-students?classId=${classId}`);
      setStudents(studentData);
    } catch (err) {
      showToast('Failed to load class details', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="portal-loading"><i className="fas fa-spinner fa-spin"></i> Loading Class...</div>;
  if (!classData) return <div className="portal-error">Class not found.</div>;

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(-1)} className="portal-btn-secondary" style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {classData.name}
              <span className="portal-badge info" style={{ fontSize: '0.9rem' }}>{classData.level}</span>
            </h1>
            <p>Managing {students.length} students &bull; {classData.role}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-primary" onClick={() => navigate(`/teacher/attendance?classId=${classId}`)}>
             <i className="fas fa-user-check"></i> Mark Attendance
          </button>
          <button className="portal-btn-secondary" onClick={() => navigate(`/teacher/assignments?classId=${classId}`)}>
             <i className="fas fa-plus"></i> New Assignment
          </button>
        </div>
      </div>

      <div className="portal-grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Student Roster</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {students.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No students enrolled in this class yet.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', color: '#718096', fontSize: '0.85rem' }}>{s.studentId || s.id.substring(0, 8)}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                           <div style={{ 
                             width: 32, height: 32, borderRadius: '50%', background: '#edf2f7', 
                             display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' 
                           }}>
                             {s.user?.avatar ? (
                               <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.user.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : (
                               <i className="fas fa-user" style={{ color: '#a0aec0', fontSize: '0.8rem' }}></i>
                             )}
                           </div>
                           {s.user?.name || s.name}
                        </div>
                      </td>
                      <td>{s.user?.email || s.email}</td>
                      <td>
                        <button 
                          onClick={() => navigate(`/teacher/student-profile?id=${s.id}`)}
                          style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-card">
             <div className="portal-card-header">Class Information</div>
             <div className="portal-card-body">
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Assigned Role</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{classData.role}</p>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Academic Level</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{classData.level}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Enrollment</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{students.length} Students</p>
                </div>
             </div>
          </div>

          <div className="portal-card">
             <div className="portal-card-header">Quick Actions</div>
             <div className="portal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/timetable')}>
                   <i className="fas fa-calendar-alt" style={{ marginRight: 10, width: 20 }}></i> View Timetable
                </button>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/grades')}>
                   <i className="fas fa-graduation-cap" style={{ marginRight: 10, width: 20 }}></i> Enter Grades
                </button>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/reports')}>
                   <i className="fas fa-file-alt" style={{ marginRight: 10, width: 20 }}></i> Generate Reports
                </button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
