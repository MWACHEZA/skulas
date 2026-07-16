import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function BursarManagement() {
  const [bursars, setBursars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedBursar, setSelectedBursar] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchBursars();
  }, []);

  const fetchBursars = async () => {
    try {
      const { data } = await api.get('/api/users?role=BURSAR');
      setBursars(data.users || []);
    } catch (err) {
      showToast('Failed to fetch bursar roster', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!window.confirm(`Reset password for ${user.name} to default "Password"?`)) return;
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
      fetchBursars();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedBursar(s);
    setIsDetailOpen(true);
  };

  const openEdit = (bursar: any) => {
    setActiveUserForEdit(bursar);
    setIsEditModalOpen(true);
  };

  const filteredBursars = bursars.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.staffId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Bursar Management</h1>
        <p>Manage financial staff, accounting permissions, and treasury oversight</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search financial staff..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <i className="fas fa-user-plus" style={{ marginRight: 8 }}></i>New Bursar
          </button>
        </div>

        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading financial roster...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name & Profile</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBursars.length > 0 ? filteredBursars.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#718096', fontFamily: 'monospace', fontWeight: 600 }}>{s.staffId || 'N/A'}</td>
                    <td>
                      <div className="user-info-cell">
                        <div className={`user-avatar bursar`}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="user-name-wrap">
                          <span className="user-name">{s.name}</span>
                          <div className="role-badges-group">
                            <span className="role-badge role-teacher" style={{ background: '#38b2ac' }}>Bursar</span>
                            {(s.secondaryRoles || []).map((r: string, idx: number) => (
                              <span key={idx} className="secondary-role-badge">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{s.metadata?.designation || 'Bursar'}</td>
                    <td>{s.dept?.name || 'No Dept'}</td>
                    <td>{s.phone || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${s.isLocked ? 'status-inactive' : 'status-active'}`}>
                        {s.isLocked ? 'Locked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-view" title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="btn-icon btn-edit" title="Edit Staff" onClick={() => openEdit(s)}>
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                        <button className="btn-icon btn-lock" title={s.isLocked ? "Unlock Account" : "Lock Account"} onClick={() => handleLockToggle(s)}>
                          <i className={`fas fa-${s.isLocked ? 'unlock' : 'lock'}`}></i>
                        </button>
                        <button className="btn-icon btn-delete" title="Delete Permanent" onClick={() => {
                          if (window.confirm(`Delete ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => fetchBursars());
                          }
                        }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No financial staff records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedBursar && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedBursar.name}
          subTitle={`Staff ID: ${selectedBursar.staffId || 'N/A'}`}
          role="Bursar"
          secondaryRoles={selectedBursar.secondaryRoles}
          avatarFilename={selectedBursar.avatar}
          avatarText={selectedBursar.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedBursar); }}
          onResetPassword={() => handleResetPassword(selectedBursar)}
          sections={[
            {
              title: "Professional Profile",
              fields: [
                { label: "Designation", value: selectedBursar.metadata?.designation },
                { label: "Department", value: selectedBursar.dept?.name || 'No Dept' },
                { label: "Accounting Level", value: selectedBursar.metadata?.accountingLevel },
                { label: "Specialization", value: selectedBursar.metadata?.specialization || 'Public Sector Accounting' },
                { label: "Clearance Level", value: selectedBursar.metadata?.clearanceLevel || 'High' }
              ]
            },
            {
              title: "Contact & Personal",
              fields: [
                { label: "Email Address", value: selectedBursar.email },
                { label: "Phone Number", value: selectedBursar.phone },
                { label: "Gender", value: selectedBursar.metadata?.gender },
                { label: "National ID", value: selectedBursar.metadata?.nationalId }
              ]
            },
            {
              title: "Address & Family",
              fields: [
                { label: "Physical Address", value: selectedBursar.metadata?.address },
                { label: "Next of Kin", value: selectedBursar.metadata?.nokName },
                { label: "Kin Phone", value: selectedBursar.metadata?.nokPhone }
              ]
            },
            ...(selectedBursar.employeeProfile ? [
              {
                title: "HR & Professional Details",
                fields: [
                  { label: "Designation", value: selectedBursar.employeeProfile.designation },
                  { label: "Blood Group", value: selectedBursar.employeeProfile.bloodGroup },
                  { label: "Date Assumed Post", value: selectedBursar.employeeProfile.dateAssumedPost ? new Date(selectedBursar.employeeProfile.dateAssumedPost).toLocaleDateString() : '—' },
                  { label: "Date of Leaving", value: selectedBursar.employeeProfile.dateOfLeaving ? new Date(selectedBursar.employeeProfile.dateOfLeaving).toLocaleDateString() : '—' }
                ]
              },
              {
                title: "Banking & Payroll Details",
                fields: [
                  { label: "Bank Name", value: selectedBursar.employeeProfile.bankName },
                  { label: "Bank Branch", value: selectedBursar.employeeProfile.bankBranch },
                  { label: "Account Number", value: selectedBursar.employeeProfile.accountNumber },
                  { label: "Account Holder", value: selectedBursar.employeeProfile.accountHolderName }
                ]
              },
              {
                title: "Social Media Links",
                fields: [
                  { label: "Facebook", value: selectedBursar.employeeProfile.facebookLink },
                  { label: "LinkedIn", value: selectedBursar.employeeProfile.linkedinLink },
                  { label: "Twitter", value: selectedBursar.employeeProfile.twitterLink }
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
          onSuccess={fetchBursars}
        />
      )}
      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchBursars}
        defaultRole="BURSAR"
      />
    </>
  );
}
