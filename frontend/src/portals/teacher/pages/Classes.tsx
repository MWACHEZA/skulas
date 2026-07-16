import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface ClassData {
  id: string;
  name: string;
  level: string;
  room: string;
  schedule: string;
  studentCount: number;
}

export default function TeacherClasses() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/teachers/my-classes')
      .then(r => {
        const classesData = r.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          level: c.level || 'Standard',
          room: c.room || 'TBD',
          schedule: c.schedule || 'See Timetable',
          studentCount: c._count?.students || 0,
          role: c.role
        }));
        setClasses(classesData);
      })
      .catch(() => {
        // Fallback for demo if API fails
        setClasses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="portal-page-header">
        <h1>My Classes</h1>
        <p>Manage the classes and subjects you are assigned to teach</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin fa-2x color-primary"></i></div>
      ) : (
        <div className="portal-grid-3">
          {classes.map(c => (
            <div key={c.id} className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,86,179,0.1)', color: 'var(--portal-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    <i className="fas fa-chalkboard-teacher"></i>
                  </div>
                  <span className="portal-badge info">{c.level}</span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#1a202c' }}>{c.name}</h3>
                
                <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><i className="fas fa-map-marker-alt" style={{ width: 20 }}></i> {c.room}</div>
                  <div><i className="fas fa-clock" style={{ width: 20 }}></i> {c.schedule}</div>
                  <div><i className="fas fa-user-graduate" style={{ width: 20 }}></i> {c.studentCount} Students</div>
                </div>

                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <button onClick={() => window.location.href = `/teacher/classes/${c.id}`} style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'var(--portal-primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    View Class
                  </button>
                  <button onClick={() => window.location.href = `/teacher/attendance?class=${c.id}`} style={{ padding: '8px 12px', background: '#f0f4f8', color: '#4a5568', border: 'none', cursor: 'pointer', borderRadius: 8 }} title="Mark Attendance">
                    <i className="fas fa-user-check"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
