import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function TeacherStudents() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const fetchMetadata = async () => {
    try {
      const { data } = await api.get('/api/teachers/my-classes');
      setClasses(data);
      if (data.length > 0) setSelectedClassId(''); // Show all by default or set first
    } catch (err) {
      console.error('Failed to fetch classes');
    
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/teachers/my-students${selectedClassId ? `?classId=${selectedClassId}` : ''}`);
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students');
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>My Students</h1>
        <p>View profiles and performance summaries for your class.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label htmlFor="filter-class" style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 600, margin: 0 }}>Filter by Class:</label>
            <select 
              id="filter-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e0', minWidth: 200 }}
            >
              <option value="">All My Students</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="portal-card-body" aria-live="polite" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin fa-2x color-primary"></i></div>
          ) : (
            <table className="portal-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Class</th><th>Actions</th></tr></thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#a0aec0' }}>No students found for this selection.</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', color: '#718096' }}>{s.studentId || s.id.substring(0, 8)}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {s.user.avatar ? <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.user.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ color: '#a0aec0', fontSize: '0.8rem' }}></i>}
                          </div>
                          {s.user.name}
                        </div>
                      </td>
                      <td>{s.user.email}</td>
                      <td><span className="portal-badge info">{s.class?.name || 'Unassigned'}</span></td>
                      <td>
                        <button 
                          onClick={() => navigate(`/teacher/student-profile?id=${s.id}`)}
                          aria-label={`View profile for ${s.user.name}`}
                          style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
