import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function AdminStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/api/students');
      setStudents(data.students || []);
    } catch (err) {
      showToast('Failed to fetch students', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/students/${user.id}`);
      showToast('Student record deleted successfully', 'success');
      fetchStudents();
    } catch (err) {
      showToast('Failed to delete student', 'error');
    
    }
  };

  const handleResetPassword = async (user: any) => {
    const userId = user.userId || user.user?.id || user.id;
    if (!window.confirm(`Reset password for ${user.name} to default "Password"?`)) return;
    try {
      await api.post(`/api/users/${userId}/reset-password`);
      showToast('Password reset successfully', 'success');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    
    }
  };

  const handleLockToggle = async (user: any) => {
    const userId = user.userId || user.user?.id || user.id;
    const action = user.user?.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${userId}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchStudents();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (student: any) => {
    setSelectedStudent(student);
    setIsDetailOpen(true);
  };

  const openEdit = (student: any) => {
    const userData = {
      ...student.user,
      id: student.user?.id || student.userId,
      role: student.user?.role || 'STUDENT',     // ensure role is always present
      staffId: student.user?.staffId || student.studentId, // stable ID
      studentId: student.studentId,
      classId: student.classId,
      status: student.status
    };
    setActiveUserForEdit(userData);
    setIsEditModalOpen(true);
  };

  const filteredStudents = students.filter(s => 
    (s.user?.name || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Student Management</h1>
        <p>View, add, and manage student profiles and records</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search students..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <i className="fas fa-plus" style={{ marginRight: 8 }}></i>New Student
          </button>
        </div>
        
        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading students...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name & Profile</th>
                  <th>Class</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(filteredStudents) ? filteredStudents : []).length > 0 ? (Array.isArray(filteredStudents) ? filteredStudents : []).map(s => {
                  const name = s.user?.name || s.name;
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#718096', fontFamily: 'monospace', fontWeight: 600 }}>{s.studentId}</td>
                      <td>
                        <div className="user-info-cell">
                          <div className={`user-avatar student`}>
                            {s.user?.avatar ? (
                              <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.user.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              name.charAt(0)
                            )}
                          </div>
                          <div className="user-name-wrap">
                            <span className="user-name">{name}</span>
                            <div className="role-badges-group">
                              <span className="role-badge role-student">Student</span>
                              {(Array.isArray(s.user?.secondaryRoles) ? s.user.secondaryRoles : []).map((r: string, idx: number) => (
                                <span key={idx} className="secondary-role-badge">{r}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{s.class?.name || 'Unassigned'}</td>
                      <td>{s.user?.email || s.email || 'N/A'}</td>
                      <td>{s.user?.phone || s.phone || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${s.status === 'Enrolled' ? 'status-active' : 'status-inactive'}`}>
                          {s.status}
                          {s.user?.isLocked && <span style={{ marginLeft: 5 }}>(Locked)</span>}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon btn-view" title="View Profile" onClick={() => openDetail(s)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="btn-icon btn-edit" title="Edit Student" onClick={() => openEdit(s)}>
                            <i className="fas fa-pencil-alt"></i>
                          </button>
                          <button className="btn-icon btn-lock" title={s.user?.isLocked ? "Unlock Access" : "Lock Access"} onClick={() => handleLockToggle(s)}>
                            <i className={`fas fa-${s.user?.isLocked ? 'unlock' : 'lock'}`}></i>
                          </button>
                          <button className="btn-icon btn-view" title="Academic History" style={{ background: 'rgba(111, 66, 193, 0.1)', color: '#6f42c1' }} onClick={() => window.location.href = `/admin/student-history?id=${s.id}`}>
                            <i className="fas fa-history"></i>
                          </button>
                          <button className="btn-icon btn-edit" title="Generate Report Card" style={{ background: 'rgba(235, 68, 90, 0.1)', color: '#eb445a' }} onClick={() => navigate(`/admin/reports?studentId=${s.user?.id || s.id}`)}>
                            <i className="fas fa-file-pdf"></i>
                          </button>
                          <button className="btn-icon btn-delete" title="Delete Permanent" onClick={() => handleDelete(s)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedStudent && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedStudent.user?.name || selectedStudent.name}
          subTitle={`Student ID: ${selectedStudent.studentId}`}
          role="Student"
          secondaryRoles={selectedStudent.user?.secondaryRoles}
          avatarFilename={selectedStudent.user?.avatar}
          avatarText={(selectedStudent.user?.name || selectedStudent.name).charAt(0)}
          onViewFullProfile={() => navigate(`/admin/student-profile?id=${selectedStudent.id}`)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedStudent); }}
          onResetPassword={() => handleResetPassword(selectedStudent)}
          sections={[
            {
              title: "Academic Information",
              fields: [
                { label: "Current Class", value: selectedStudent.class?.name || 'Unassigned' },
                { label: "Enrollment Status", value: selectedStudent.status },
                { label: "Fees Balance", value: selectedStudent.feesBalance ? `$${selectedStudent.feesBalance}` : '—' }
              ]
            },
            {
              title: "Academic Background",
              fields: [
                { label: "Previous School", value: selectedStudent.prevSchool },
                { label: "Last Grade", value: selectedStudent.lastGradeAchieved },
                { label: "Transfer Reason", value: selectedStudent.reasonForTransfer },
                { label: "Admissions Notes", value: selectedStudent.admissionsNotes }
              ]
            },
            {
              title: "Personal Details",
              fields: [
                { label: "Email Address", value: selectedStudent.user?.email || selectedStudent.email },
                { label: "Phone Number", value: selectedStudent.user?.phone || selectedStudent.phone },
                { label: "Gender", value: selectedStudent.user?.metadata?.gender || selectedStudent.gender },
                { label: "Date of Birth", value: selectedStudent.user?.metadata?.dob ? new Date(selectedStudent.user.metadata.dob).toLocaleDateString() : (selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '—') },
                { label: "National ID", value: selectedStudent.user?.metadata?.nationalId }
              ]
            },
            {
              title: "Address & Family",
              fields: [
                { label: "Physical Address", value: selectedStudent.user?.metadata?.address || selectedStudent.address },
                { label: "Guardian/Parent", value: selectedStudent.user?.metadata?.nokName },
                { label: "Kin Phone", value: selectedStudent.user?.metadata?.nokPhone }
              ]
            }
          ]}
        />
      )}

      {/* Edit Modal */}
      {activeUserForEdit && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={activeUserForEdit}
          currentUserRole={currentUser?.role || ''}
          onSuccess={fetchStudents}
        />
      )}
      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchStudents}
        defaultRole="STUDENT"
      />
    </>
  );
}
