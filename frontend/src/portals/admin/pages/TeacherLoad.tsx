import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function TeacherLoad() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryParams = new URLSearchParams(location.search);
  const teacherId = queryParams.get('id');

  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    classId: '',
    subjectId: '',
    isClassTeacher: false
  });

  useEffect(() => {
    if (teacherId) {
      fetchData();
    } else {
      navigate('/admin/teachers');
    }
  }, [teacherId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLoad, resClasses, resSubjects] = await Promise.all([
        api.get(`/api/teachers/${teacherId}/load`),
        api.get('/api/reports/classes'),
        api.get('/api/subjects')
      ]);
      setTeacher(resLoad.data);
      setClasses(resClasses.data);
      setSubjects(resSubjects.data);
    } catch (err) {
      showToast('Failed to load teacher data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      await api.post(`/api/teachers/${teacherId}/load/assign`, assignmentForm);
      showToast('Assignment successful', 'success');
      setAssignmentForm({ classId: '', subjectId: '', isClassTeacher: false });
      fetchData();
    } catch (err) {
      showToast('Failed to assign', 'error');
    
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (classId: string, subjectId?: string, isClassTeacher?: boolean) => {
    if (!(await toastConfirm('Are you sure you want to remove this assignment?'))) return;
    try {
      await api.post(`/api/teachers/${teacherId}/load/unassign`, { classId, subjectId, isClassTeacher });
      showToast('Removed successfully', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to remove assignment', 'error');
    
    }
  };

  if (loading) return <div className="portal-loading"><i className="fas fa-spinner fa-spin"></i> Loading Load Data...</div>;

  const homeroomClass = teacher?.classes?.[0];

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/admin/teachers')} className="btn-icon">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1>Teaching Load: {teacher?.user?.name}</h1>
            <p>Manage class assignments and subject allocations for this instructor.</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-2">
        {/* Current Load Summary */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3><i className="fas fa-list-check" style={{ marginRight: 8 }}></i> Current Assignments</h3>
          </div>
          <div className="portal-card-body">
            {homeroomClass && (
              <div style={{ marginBottom: 20, padding: 16, background: 'rgba(56, 161, 105, 0.1)', borderRadius: 12, border: '1px solid rgba(56, 161, 105, 0.2)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: '#2f855a', marginBottom: 4 }}>Primary Role</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>Class Teacher: {homeroomClass.name}</div>
                  <button onClick={() => handleUnassign(homeroomClass.id, undefined, true)} className="btn-icon" style={{ color: '#c53030' }} title="Remove as Class Teacher">
                    <i className="fas fa-user-minus"></i>
                  </button>
                </div>
              </div>
            )}

            <table className="portal-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teacher?.subjectClasses?.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#a0aec0', padding: 20 }}>No subjects assigned.</td></tr>
                ) : (
                  teacher.subjectClasses.map((sa: any) => (
                    <tr key={sa.id}>
                      <td>{sa.subject.name}</td>
                      <td>{sa.class.name}</td>
                      <td>
                        <button onClick={() => handleUnassign(sa.classId, sa.subjectId)} className="btn-icon" style={{ color: '#c53030' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assignment Tool */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3><i className="fas fa-plus-circle" style={{ marginRight: 8 }}></i> Assign New Workload</h3>
          </div>
          <form className="portal-card-body" onSubmit={handleAssign}>
            <div className="form-group mb-4">
              <label className="block text-sm font-semibold mb-2">Select Class</label>
              <select 
                required
                className="portal-input w-full"
                value={assignmentForm.classId}
                onChange={e => setAssignmentForm({...assignmentForm, classId: e.target.value})}
              >
                <option value="">Choose Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="block text-sm font-semibold mb-2">Subject (Optional if only setting Class Teacher)</label>
              <select 
                className="portal-input w-full"
                value={assignmentForm.subjectId}
                onChange={e => setAssignmentForm({...assignmentForm, subjectId: e.target.value})}
              >
                <option value="">None / Administrative Only</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group mb-6" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input 
                type="checkbox" id="isCT"
                checked={assignmentForm.isClassTeacher}
                onChange={e => setAssignmentForm({...assignmentForm, isClassTeacher: e.target.checked})}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="isCT" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Assign as <b>Class Teacher</b> (Homeroom)</label>
            </div>

            <button 
              disabled={isAssigning || !assignmentForm.classId}
              type="submit" 
              className="btn-premium" style={{ width: '100%', background: 'linear-gradient(135deg, #2b6cb0 0%, #4299e1 100%)', color: 'white', padding: '12px', border: 'none', borderRadius: 12, fontWeight: 700 }}
            >
              {isAssigning ? 'Processing...' : 'Add to Teaching Load →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
