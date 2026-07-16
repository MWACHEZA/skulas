import React, { useState, useEffect } from 'react';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import AddNewCourse from './AddNewCourse';
import EnrolStudent from './EnrolStudent';

export default function CoursesDashboard() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrolModal, setShowEnrolModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      setCourses(res.data);
    } catch (error) {
      showToast('Failed to load courses', 'error');
    
    }
  };

  const activeCount = courses.filter(c => c.status === 'Active').length;
  const pendingCount = courses.filter(c => c.status === 'Pending').length;
  const draftCount = courses.filter(c => c.status === 'Draft').length;
  const freeCount = courses.filter(c => c.isFree).length;
  const paidCount = courses.filter(c => !c.isFree).length;
  const totalStudents = courses.reduce((acc, curr) => acc + (curr._count?.enrollments || 0), 0);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Courses</h1>
          <p>Manage online study subjects, courses, and student enrollments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus"></i> Create Course
          </button>
          <button className="portal-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowEnrolModal(true)}>
            <i className="fas fa-user-plus"></i> Enrol Student
          </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-desktop"></i> MY COURSES</h2>
        </div>
        <div className="portal-card-body">
          {/* Dashboard Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 15, marginBottom: 20 }}>
            <div style={{ background: 'var(--portal-success)', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{activeCount}</div>
              <div>Active courses</div>
            </div>
            <div style={{ background: '#f6ad55', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{pendingCount}</div>
              <div>Pending courses</div>
            </div>
            <div style={{ background: 'var(--portal-danger)', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{draftCount}</div>
              <div>Draft courses</div>
            </div>
            <div style={{ background: '#319795', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{freeCount}</div>
              <div>Free courses</div>
            </div>
            <div style={{ background: '#4299e1', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{paidCount}</div>
              <div>Paid courses</div>
            </div>
            <div style={{ background: 'var(--portal-success)', color: 'white', padding: 20, textAlign: 'center', borderRadius: 4 }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalStudents}</div>
              <div>Total student</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15, marginBottom: 40 }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4a5568' }}>Filter by categories</label>
              <select className="portal-input"><option>All</option></select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4a5568' }}>Filter by status</label>
              <select className="portal-input"><option>All</option></select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4a5568' }}>Filter by class</label>
              <select className="portal-input"><option>All</option></select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4a5568' }}>Filter by price</label>
              <select className="portal-input"><option>All</option></select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', width: '100%', height: '40px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Filter</button>
            </div>
          </div>

          {/* Empty State */}
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#718096' }}>
              <i className="fas fa-file-alt fa-4x" style={{ color: '#ebf8fa', marginBottom: 15 }}></i>
              <h3 style={{ color: '#2d3748', marginBottom: 10 }}>No course added!</h3>
              <p style={{ color: '#319795', marginBottom: 20 }}>You have not added any course. Please create course and start earning.</p>
              <button className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }} onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus"></i> Create course
              </button>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>CLASS</th>
                  <th>CATEGORY</th>
                  <th>STATUS</th>
                  <th>STUDENTS</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.class?.name}</td>
                    <td>{c.category}</td>
                    <td>{c.status}</td>
                    <td>{c._count?.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && (
        <AddNewCourse 
          isModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            fetchCourses();
            setShowCreateModal(false);
          }} 
        />
      )}

      {showEnrolModal && (
        <EnrolStudent 
          isModal 
          onClose={() => setShowEnrolModal(false)} 
          onSuccess={() => {
            fetchCourses();
            setShowEnrolModal(false);
          }} 
        />
      )}
    </>
  );
}
