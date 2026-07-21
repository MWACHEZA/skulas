import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function LibrarianManagement() {
  const [librarians, setLibrarians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedLibrarian, setSelectedLibrarian] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchLibrarians();
  }, []);

  const fetchLibrarians = async () => {
    try {
      const { data } = await api.get('/api/users?role=LIBRARIAN');
      setLibrarians(data.users || []);
    } catch (err) {
      showToast('Failed to fetch library roster', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!(await toastConfirm(`Reset password for ${user.name} to default "Password"?`))) return;
    try {
      await api.post(`/api/users/${user.id}/reset-password`);
      showToast('Password reset successfully', 'success');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    
    }
  };

  const handleLockToggle = async (user: any) => {
    const action = user.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${user.id}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchLibrarians();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedLibrarian(s);
    setIsDetailOpen(true);
  };

  const openEdit = (librarian: any) => {
    setActiveUserForEdit(librarian);
    setIsEditModalOpen(true);
  };

  const filteredLibrarians = librarians.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.staffId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Librarian Management</h1>
        <p>Manage library staff, access permissions, and cataloging oversight</p>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Search library staff..." 
            className="portal-input"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '48px', fontWeight: 700, height: '52px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          />
          <i className="fas fa-search" style={{ position: 'absolute', left: 18, top: 18, color: '#94a3b8', fontSize: '1rem' }}></i>
        </div>
        <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-user-plus"></i>New Librarian
        </button>
      </div>

      <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading library roster...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name & Profile</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredLibrarians.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filteredLibrarians.length > 0) setCurrentPage(1);
                  return filteredLibrarians.length > 0 ? currentItems.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#718096', fontFamily: 'monospace', fontWeight: 600 }}>{s.staffId || 'N/A'}</td>
                    <td>
                      <div className="user-info-cell">
                        <div className={`user-avatar librarian`}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="user-name-wrap">
                          <span className="user-name">{s.name}</span>
                          <div className="role-badges-group">
                            <span className="role-badge role-teacher" style={{ background: '#667eea' }}>Librarian</span>
                            {(s.secondaryRoles || []).map((r: string, idx: number) => (
                              <span key={idx} className="secondary-role-badge">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{s.metadata?.designation || 'Librarian'}</td>
                    <td>{s.dept?.name || 'No Dept'}</td>
                    <td>{s.email || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${s.isLocked ? 'status-inactive' : 'status-active'}`}>
                        {s.isLocked ? 'Locked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Staff" onClick={() => openEdit(s)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: s.isLocked ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={s.isLocked ? "Unlock Account" : "Lock Account"} onClick={() => handleLockToggle(s)}>
                          <i className={`fas fa-${s.isLocked ? 'unlock' : 'user-lock'}`}></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Permanent" onClick={async () => {
                          if (await toastConfirm(`Delete ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => fetchLibrarians());
                          }
                        }}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No library staff records found.</td>
                  </tr>
                );
                })()}
              </tbody>
            </table>
          )}
          
          {filteredLibrarians.length > 0 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLibrarians.length)} of {filteredLibrarians.length} entries
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredLibrarians.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filteredLibrarians.length / itemsPerPage) || filteredLibrarians.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Detail Panel */}
      {selectedLibrarian && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedLibrarian.name}
          subTitle={`Staff ID: ${selectedLibrarian.staffId || 'N/A'}`}
          role="Librarian"
          secondaryRoles={selectedLibrarian.secondaryRoles}
          avatarFilename={selectedLibrarian.avatar}
          avatarText={selectedLibrarian.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedLibrarian); }}
          onResetPassword={() => handleResetPassword(selectedLibrarian)}
          sections={[
            {
              title: "Professional Profile",
              fields: [
                { label: "Designation", value: selectedLibrarian.metadata?.designation },
                { label: "Department", value: selectedLibrarian.dept?.name || 'No Dept' },
                { label: "Qualification", value: selectedLibrarian.metadata?.qualification },
                { label: "Specialization", value: selectedLibrarian.metadata?.specialization || 'Archival Management' },
                { label: "Date Joined", value: selectedLibrarian.createdAt ? new Date(selectedLibrarian.createdAt).toLocaleDateString() : 'N/A' }
              ]
            },
            {
              title: "Contact & Personal",
              fields: [
                { label: "Email Address", value: selectedLibrarian.email },
                { label: "Phone Number", value: selectedLibrarian.phone },
                { label: "Gender", value: selectedLibrarian.metadata?.gender },
                { label: "National ID", value: selectedLibrarian.metadata?.nationalId }
              ]
            },
            {
              title: "Address & Family",
              fields: [
                { label: "Physical Address", value: selectedLibrarian.metadata?.address },
                { label: "Next of Kin", value: selectedLibrarian.metadata?.nokName },
                { label: "Kin Relationship", value: selectedLibrarian.metadata?.nokRelationship },
                { label: "Kin Phone", value: selectedLibrarian.metadata?.nokPhone }
              ]
            },
            ...(selectedLibrarian.employeeProfile ? [
              {
                title: "HR & Professional Details",
                fields: [
                  { label: "Designation", value: selectedLibrarian.employeeProfile.designation },
                  { label: "Blood Group", value: selectedLibrarian.employeeProfile.bloodGroup },
                  { label: "Date Assumed Post", value: selectedLibrarian.employeeProfile.dateAssumedPost ? new Date(selectedLibrarian.employeeProfile.dateAssumedPost).toLocaleDateString() : '—' },
                  { label: "Date of Leaving", value: selectedLibrarian.employeeProfile.dateOfLeaving ? new Date(selectedLibrarian.employeeProfile.dateOfLeaving).toLocaleDateString() : '—' }
                ]
              },
              {
                title: "Banking & Payroll Details",
                fields: [
                  { label: "💵 Bank Name (USD)", value: selectedLibrarian.employeeProfile.bankName },
                  { label: "Bank Branch (USD)", value: selectedLibrarian.employeeProfile.bankBranch },
                  { label: "Account Number (USD)", value: selectedLibrarian.employeeProfile.accountNumber },
                  { label: "Account Holder (USD)", value: selectedLibrarian.employeeProfile.accountHolderName },
                  ...(selectedLibrarian.employeeProfile.bankNameZig ? [
                    { label: "🪙 Bank Name (ZiG)", value: selectedLibrarian.employeeProfile.bankNameZig },
                    { label: "Bank Branch (ZiG)", value: selectedLibrarian.employeeProfile.bankBranchZig },
                    { label: "Account Number (ZiG)", value: selectedLibrarian.employeeProfile.accountNumberZig },
                    { label: "Account Holder (ZiG)", value: selectedLibrarian.employeeProfile.accountHolderNameZig }
                  ] : [])
                ]
              },
              {
                title: "Social Media Links",
                fields: [
                  { label: "Facebook", value: selectedLibrarian.employeeProfile.facebookLink },
                  { label: "LinkedIn", value: selectedLibrarian.employeeProfile.linkedinLink },
                  { label: "Twitter", value: selectedLibrarian.employeeProfile.twitterLink }
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
          onSuccess={fetchLibrarians}
        />
      )}
      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchLibrarians}
        defaultRole="LIBRARIAN"
      />
    </>
  );
}
