import React, { useState, useEffect } from 'react';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

interface EnrolStudentProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function EnrolStudent({ isModal, onClose, onSuccess }: EnrolStudentProps) {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrollments(selectedCourse);
    } else {
      setEnrollments([]);
    }
  }, [selectedCourse]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const res = await api.get(`/api/students?classId=${classId}`);
      setStudents(res.data);
    } catch (error) {
      console.error('Error fetching students', error);
    
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      setCourses(res.data);
    } catch (error) {
      console.error('Error fetching courses', error);
    
    }
  };

  const fetchEnrollments = async (courseId: string) => {
    try {
      const res = await api.get(`/api/courses/${courseId}/enrollments`);
      setEnrollments(res.data);
    } catch (error) {
      console.error('Error fetching enrollments', error);
    
    }
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedStudent) {
      showToast('Please select a student and a course', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/courses/enroll', {
        courseId: selectedCourse,
        studentId: selectedStudent
      });
      showToast('Student enrolled successfully', 'success');
      fetchEnrollments(selectedCourse);
      setSelectedStudent('');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to enroll student', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div className="portal-form-group">
        <label>Class <span style={{ color: 'red' }}>*</span></label>
        <select className="portal-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="portal-form-group">
        <label>Student <span style={{ color: 'red' }}>*</span></label>
        <select className="portal-input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
          <option value="">{selectedClass ? 'Select Student' : 'Select Class First'}</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="portal-form-group">
        <label>Course <span style={{ color: 'red' }}>*</span></label>
        <select className="portal-input" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          <option value="">Select</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div style={{ background: '#e6fffa', color: '#319795', padding: '10px', borderRadius: '4px', fontSize: '0.85rem' }}>
        Please check before enrollment. Enrolled students can't be removed.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        {isModal && (
          <button className="portal-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        )}
        <button className="portal-btn-primary" style={{ background: '#319795', borderColor: '#319795' }} onClick={handleSave} disabled={loading}>
          {loading ? 'Enrolling...' : '+ Enrol Student'}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="portal-modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: 20 }}>
        <div className="portal-modal-content" style={{ background: 'white', borderRadius: 16, maxWidth: 500, width: '100%', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
          >
            <i className="fas fa-times"></i>
          </button>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-user-plus mr-2" style={{ color: '#319795' }}></i> Enrol Student
          </h2>
          {formBody}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Student enrolment</h1>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Left Form */}
        <div className="portal-card" style={{ flex: 1 }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-plus"></i> ENROL STUDENT</h2>
          </div>
          <div className="portal-card-body">
            {formBody}
          </div>
        </div>

        {/* Right Table */}
        <div className="portal-card" style={{ flex: 1.5 }}>
          <div className="portal-card-header">
            <h2><i className="fas fa-users"></i> STUDENTS</h2>
          </div>
          <div className="portal-card-body">
            {enrollments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#a0aec0' }}>No students enrolled.</div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Enrolled At</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td>{e.student?.name}</td>
                      <td>{e.student?.class?.name || 'N/A'}</td>
                      <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
