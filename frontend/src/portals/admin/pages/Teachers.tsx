import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data } = await api.get('/api/teachers');
      setTeachers(data.teachers || []);
    } catch (err) {
      showToast('Failed to fetch faculty roster', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (teacher: any) => {
    const userId = teacher.userId || teacher.user?.id;
    if (!userId) return showToast('User account not found', 'error');
    if (!(await toastConfirm(`Reset password for ${teacher.user?.name || teacher.name} to default "Password"?`))) return;
    try {
      await api.post(`/api/users/${userId}/reset-password`);
      showToast('Password reset successfully', 'success');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    
    }
  };

  const handleLockToggle = async (teacher: any) => {
    const userId = teacher.userId || teacher.user?.id;
    if (!userId) return showToast('User account not found', 'error');
    const action = teacher.user?.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${userId}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchTeachers();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDetailOpen(true);
  };

  const openEdit = (teacher: any) => {
    // We pass the User object to the edit modal as it contains metadata and core fields
    const userData = {
      ...teacher.user,
      staffId: teacher.staffId,
      department: teacher.department,
      qualification: teacher.qualification
    };
    setActiveUserForEdit(userData);
    setIsEditModalOpen(true);
  };

  const filteredTeachers = teachers.filter(t => 
    (t.user?.name || t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.staffId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Teacher Management</h1>
        <p>Manage faculty members, departments, and teaching assignments</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search faculty..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-plus-circle"></i> ADD TEACHER
          </button>
        </div>

        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading faculty roster...</p>
            </div>
          ) : (
            <>
              <table className="management-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name & Profile</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const safeFiltered = Array.isArray(filteredTeachers) ? filteredTeachers : [];
                  if (safeFiltered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No faculty records found.</td>
                      </tr>
                    );
                  }
                  
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = safeFiltered.slice(indexOfFirstItem, indexOfLastItem);
                  
                  return currentItems.map(t => {
                    const name = t.user?.name || t.name;
                    const email = t.user?.email || t.email;
                    const phone = t.user?.phone || t.phone;
                    return (
                      <tr key={t.id}>
                        <td style={{ color: '#718096', fontFamily: 'monospace', fontWeight: 600 }}>{t.staffId}</td>
                        <td>
                          <div className="user-info-cell">
                            <div className={`user-avatar teacher`}>
                              {t.user?.avatar ? (
                                <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${t.user.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                name.charAt(0)
                              )}
                            </div>
                            <div className="user-name-wrap">
                              <span className="user-name">{name}</span>
                              <div className="role-badges-group">
                                <span className="role-badge role-teacher">Teacher</span>
                                {(Array.isArray(t.user?.secondaryRoles) ? t.user.secondaryRoles : []).slice(0, 2).map((r: string, idx: number) => (
                                  <span key={idx} className="secondary-role-badge">{r}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{t.dept?.name || t.department || 'General'}</td>
                        <td>{email || 'N/A'}</td>
                        <td>{phone || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${t.user?.isLocked ? 'status-inactive' : 'status-active'}`}>
                            {t.user?.isLocked ? 'Locked' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button className="portal-btn-ghost" title="View Profile" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openDetail(t)}>
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="portal-btn-ghost" title="Edit Teacher" style={{ padding: '8px', width: '36px', height: '36px', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEdit(t)}>
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button className="portal-btn-ghost" title={t.user?.isLocked ? "Unlock Account" : "Lock Account"} style={{ padding: '8px', width: '36px', height: '36px', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleLockToggle(t)}>
                              <i className={`fas fa-${t.user?.isLocked ? 'unlock' : 'lock'}`}></i>
                            </button>
                            <button className="portal-btn-ghost" title="Teaching Load" style={{ padding: '8px', width: '36px', height: '36px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.location.href = `/admin/teacher-load?id=${t.id}`}>
                              <i className="fas fa-book"></i>
                            </button>
                            <button className="portal-btn-ghost" title="Delete Permanent" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={async () => {
                              if (await toastConfirm('Delete this teacher and their user account?')) {
                                api.delete(`/api/teachers/${t.id}`).then(() => fetchTeachers());
                              }
                            }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            
            {filteredTeachers.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTeachers.length)} of {filteredTeachers.length} entries
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTeachers.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredTeachers.length / itemsPerPage) || filteredTeachers.length === 0}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedTeacher && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedTeacher.user?.name || selectedTeacher.name}
          subTitle={`Staff ID: ${selectedTeacher.staffId}`}
          role="Teacher"
          secondaryRoles={selectedTeacher.user?.secondaryRoles}
          avatarFilename={selectedTeacher.user?.avatar}
          avatarText={(selectedTeacher.user?.name || selectedTeacher.name).charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedTeacher); }}
          onResetPassword={() => handleResetPassword(selectedTeacher)}
          sections={[
            {
              title: "Employment Details",
              fields: [
                { label: "Department", value: selectedTeacher.department },
                { label: "Qualification", value: selectedTeacher.qualification },
                { label: "Employer", value: selectedTeacher.user?.metadata?.employer || 'SDC' },
                { label: "Base Salary", value: selectedTeacher.user?.metadata?.baseSalary ? `$${selectedTeacher.user.metadata.baseSalary}` : '—' }
              ]
            },
            {
              title: "Contact & Personal",
              fields: [
                { label: "Email Address", value: selectedTeacher.user?.email || selectedTeacher.email },
                { label: "Phone Number", value: selectedTeacher.user?.phone || selectedTeacher.phone },
                { label: "Gender", value: selectedTeacher.user?.metadata?.gender },
                { label: "Date of Birth", value: selectedTeacher.user?.metadata?.dob ? new Date(selectedTeacher.user.metadata.dob).toLocaleDateString() : '—' },
                { label: "National ID", value: selectedTeacher.user?.metadata?.nationalId }
              ]
            },
            {
              title: "Address & Family",
              fields: [
                { label: "Physical Address", value: selectedTeacher.user?.metadata?.address },
                { label: "Spouse Name", value: selectedTeacher.user?.metadata?.spouseName },
                { label: "Next of Kin", value: selectedTeacher.user?.metadata?.nokName },
                { label: "Kin Relationship", value: selectedTeacher.user?.metadata?.nokRelationship },
                { label: "Kin Phone", value: selectedTeacher.user?.metadata?.nokPhone }
              ]
            },
            ...(selectedTeacher.user?.employeeProfile ? [
              {
                title: "HR & Professional Details",
                fields: [
                  { label: "Designation", value: selectedTeacher.user.employeeProfile.designation },
                  { label: "Blood Group", value: selectedTeacher.user.employeeProfile.bloodGroup },
                  { label: "Date Assumed Post", value: selectedTeacher.user.employeeProfile.dateAssumedPost ? new Date(selectedTeacher.user.employeeProfile.dateAssumedPost).toLocaleDateString() : '—' },
                  { label: "Date of Leaving", value: selectedTeacher.user.employeeProfile.dateOfLeaving ? new Date(selectedTeacher.user.employeeProfile.dateOfLeaving).toLocaleDateString() : '—' }
                ]
              },
              {
                title: "Banking & Payroll Details",
                fields: [
                  { label: "💵 Bank Name (USD)", value: selectedTeacher.user.employeeProfile.bankName },
                  { label: "Bank Branch (USD)", value: selectedTeacher.user.employeeProfile.bankBranch },
                  { label: "Account Number (USD)", value: selectedTeacher.user.employeeProfile.accountNumber },
                  { label: "Account Holder (USD)", value: selectedTeacher.user.employeeProfile.accountHolderName },
                  ...(selectedTeacher.user.employeeProfile.bankNameZig ? [
                    { label: "🪙 Bank Name (ZiG)", value: selectedTeacher.user.employeeProfile.bankNameZig },
                    { label: "Bank Branch (ZiG)", value: selectedTeacher.user.employeeProfile.bankBranchZig },
                    { label: "Account Number (ZiG)", value: selectedTeacher.user.employeeProfile.accountNumberZig },
                    { label: "Account Holder (ZiG)", value: selectedTeacher.user.employeeProfile.accountHolderNameZig }
                  ] : [])
                ]
              },
              {
                title: "Social Media Links",
                fields: [
                  { label: "Facebook", value: selectedTeacher.user.employeeProfile.facebookLink },
                  { label: "LinkedIn", value: selectedTeacher.user.employeeProfile.linkedinLink },
                  { label: "Twitter", value: selectedTeacher.user.employeeProfile.twitterLink }
                ]
              }
            ] : [])
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
          onSuccess={fetchTeachers}
        />
      )}
      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTeachers}
        defaultRole="TEACHER"
      />
    </>
  );
}
