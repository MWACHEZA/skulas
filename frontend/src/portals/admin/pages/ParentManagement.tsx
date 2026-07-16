import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function ParentManagement() {
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [pendingParents, setPendingParents] = useState<any[]>([]);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      const [{ data }, { data: pendingData }] = await Promise.all([
        api.get('/api/users?role=PARENT'),
        api.get('/api/schools/connections/pending?role=PARENT')
      ]);
      setParents(data.users || []);
      setPendingParents(pendingData || []);
    } catch (err) {
      showToast('Failed to fetch parent registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: any) => {
    try {
      await api.patch(`/api/schools/connections/${user.id}/approve`);
      showToast('Parent link verified and approved!', 'success');
      fetchParents();
    } catch (err) {
      showToast('Failed to approve parent link', 'error');
    
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
      fetchParents();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedParent(s);
    setIsDetailOpen(true);
  };

  const openEdit = (parent: any) => {
    setActiveUserForEdit(parent);
    setIsEditModalOpen(true);
  };

  const filteredParents = parents.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Parent & Guardian Management</h1>
        <p>Oversee family accounts, student links, and SDC representative roles</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div className="modal-tabs" style={{ background: 'none', border: 'none', padding: 0 }}>
            <button 
              className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveTab('ACTIVE')}
            >
              Active Directory
            </button>
            <button 
              className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
              onClick={() => setActiveTab('PENDING')}
              style={{ position: 'relative' }}
            >
              Verification Queue
              {pendingParents.length > 0 && (
                <span style={{ position: 'absolute', top: 5, right: -15, background: 'var(--portal-danger)', color: 'white', fontSize: '0.65rem', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pendingParents.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search parents..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <button className="portal-btn-primary" onClick={() => window.location.href = '/register/parent'}>
            <i className="fas fa-user-plus" style={{ marginRight: 8 }}></i>Add Parent
          </button>
        </div>

        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading parent records...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Family ID (Global)</th>
                  <th>Name & Profile</th>
                  <th>{activeTab === 'ACTIVE' ? 'Linked Students' : 'Requested Link'}</th>
                  <th>Primary Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'ACTIVE' ? filteredParents : pendingParents).length > 0 ? (activeTab === 'ACTIVE' ? filteredParents : pendingParents).map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--portal-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {activeTab === 'ACTIVE' ? (s.staffId || s.id.substring(0, 8)) : <span style={{ color: '#a0aec0' }}>New Request</span>}
                    </td>
                    <td>
                      <div className="user-info-cell">
                        <div className={`user-avatar parent`}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="user-name-wrap">
                          <span className="user-name">{s.name}</span>
                          <div className="role-badges-group">
                            <span className="role-badge role-teacher" style={{ background: 'var(--school-primary, #3182ce)' }}>Parent</span>
                            {(s.secondaryRoles || []).map((r: string, idx: number) => (
                              <span key={idx} className="secondary-role-badge">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {activeTab === 'ACTIVE' ? (
                        s.metadata?.linkedStudents || '1 Student'
                      ) : (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{s.studentName}</span>
                          <br />
                          <small style={{ color: '#718096' }}>({s.studentId}) - {s.relation || 'Guardian'}</small>
                        </div>
                      )}
                    </td>
                    <td>{s.phone || 'N/A'}</td>
                    <td>{s.email || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-view" title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        {activeTab === 'PENDING' ? (
                           <button className="btn-icon" title="Approve Request" style={{ background: '#c6f6d5', color: '#22c55e' }} onClick={() => handleApprove(s)}>
                            <i className="fas fa-check"></i>
                           </button>
                        ) : (
                          <>
                            <button className="btn-icon btn-edit" title="Edit Parent" onClick={() => openEdit(s)}>
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button className="btn-icon btn-lock" title={s.isLocked ? "Unlock Account" : "Lock Account"} onClick={() => handleLockToggle(s)}>
                              <i className={`fas fa-${s.isLocked ? 'unlock' : 'lock'}`}></i>
                            </button>
                          </>
                        )}
                        <button className="btn-icon btn-delete" title={activeTab === 'PENDING' ? "Reject Request" : "Delete Permanent"} onClick={() => {
                          if (window.confirm(activeTab === 'PENDING' ? `Reject connection request from ${s.name}?` : `Delete ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => fetchParents());
                          }
                        }}>
                          <i className={`fas ${activeTab === 'PENDING' ? 'fa-times' : 'fa-trash'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No parent records found in {activeTab === 'PENDING' ? 'queue' : 'directory'}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedParent && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedParent.name}
          subTitle={`Family ID: ${selectedParent.staffId || selectedParent.id.substring(0, 8)}`}
          role="Parent"
          secondaryRoles={selectedParent.secondaryRoles}
          avatarFilename={selectedParent.avatar}
          avatarText={selectedParent.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedParent); }}
          onResetPassword={() => handleResetPassword(selectedParent)}
          sections={[
            {
              title: "Family Membership",
              fields: [
                { label: "Linked Students", value: selectedParent.metadata?.linkedStudents || 'N/A' },
                { label: "Relation", value: selectedParent.metadata?.relation || 'Guardian' },
                { label: "Fees Payer", value: selectedParent.metadata?.isPayer ? 'Yes' : 'No' },
                { label: "SDC Role", value: selectedParent.secondaryRoles?.includes('SDC Member') ? 'SDC Member' : 'None' }
              ]
            },
            {
              title: "Contact Information",
              fields: [
                { label: "Email Address", value: selectedParent.email },
                { label: "Phone Number", value: selectedParent.phone },
                { label: "Home Address", value: selectedParent.metadata?.address }
              ]
            },
            {
              title: "Employment Details",
              fields: [
                { label: "Employer", value: selectedParent.metadata?.employer || 'N/A' },
                { label: "Occupation", value: selectedParent.metadata?.occupation || 'N/A' },
                { label: "Work Phone", value: selectedParent.metadata?.workPhone || 'N/A' }
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
          onSuccess={fetchParents}
        />
      )}
    </>
  );
}
