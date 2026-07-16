import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import '../../../styles/portal.css';

export default function AlumniManagement() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedAlumnus, setSelectedAlumnus] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data } = await api.get('/api/users?role=ALUMNI');
      setAlumni(data.users || []);
    } catch (err) {
      showToast('Failed to fetch alumni records', 'error');
    
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
      fetchAlumni();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedAlumnus(s);
    setIsDetailOpen(true);
  };

  const openEdit = (alumnus: any) => {
    setActiveUserForEdit(alumnus);
    setIsEditModalOpen(true);
  };

  const filteredAlumni = alumni.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.staffId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Alumni Management</h1>
        <p>Maintain relationships with former students, track progress, and manage legacy records</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search alumni network..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <i className="fas fa-user-graduate" style={{ marginRight: 8 }}></i>Register Alumnus
          </button>
        </div>

        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading alumni network...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Old ID</th>
                  <th>Name & Profile</th>
                  <th>Graduation Year</th>
                  <th>Profession</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.length > 0 ? filteredAlumni.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#718096', fontFamily: 'monospace', fontWeight: 600 }}>{s.staffId || 'N/A'}</td>
                    <td>
                      <div className="user-info-cell">
                        <div className={`user-avatar graduate`}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="user-name-wrap">
                          <span className="user-name">{s.name}</span>
                          <div className="role-badges-group">
                            <span className="role-badge role-teacher" style={{ background: '#4a5568' }}>Alumnus</span>
                            {(s.secondaryRoles || []).map((r: string, idx: number) => (
                              <span key={idx} className="secondary-role-badge">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{s.metadata?.graduationYear || 'N/A'}</td>
                    <td>{s.metadata?.profession || 'Enterprise Member'}</td>
                    <td>{s.phone || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-active`}>
                        {s.isLocked ? 'Locked' : 'Confirmed'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-view" title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="btn-icon btn-edit" title="Edit Alumnus" onClick={() => openEdit(s)}>
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                        <button className="btn-icon btn-lock" title={s.isLocked ? "Unlock Access" : "Lock Access"} onClick={() => handleLockToggle(s)}>
                          <i className={`fas fa-${s.isLocked ? 'unlock' : 'lock'}`}></i>
                        </button>
                        <button className="btn-icon btn-view" title="Donation History" style={{ background: 'rgba(237, 137, 189, 0.1)', color: '#ed89be' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-hand-holding-heart"></i>
                        </button>
                        <button className="btn-icon btn-delete" title="Delete Permanent" onClick={() => {
                          if (window.confirm(`Delete ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => fetchAlumni());
                          }
                        }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No alumni records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedAlumnus && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedAlumnus.name}
          subTitle={`Legacy ID: ${selectedAlumnus.staffId || 'N/A'}`}
          role="Alumni"
          secondaryRoles={selectedAlumnus.secondaryRoles}
          avatarFilename={selectedAlumnus.avatar}
          avatarText={selectedAlumnus.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedAlumnus); }}
          onResetPassword={() => handleResetPassword(selectedAlumnus)}
          sections={[
            {
              title: "Academic Legacy",
              fields: [
                { label: "Graduation Year", value: selectedAlumnus.metadata?.graduationYear },
                { label: "O-Level House", value: selectedAlumnus.metadata?.oldHouse || 'N/A' },
                { label: "Head Prefect", value: selectedAlumnus.metadata?.wasPrefect ? 'Yes' : 'No' },
                { label: "Sports Honors", value: selectedAlumnus.metadata?.sportsHonors || 'N/A' }
              ]
            },
            {
              title: "Current Professional Status",
              fields: [
                { label: "Profession", value: selectedAlumnus.metadata?.profession },
                { label: "Organization", value: selectedAlumnus.metadata?.organization },
                { label: "University", value: selectedAlumnus.metadata?.university || 'N/A' }
              ]
            },
            {
              title: "Contact & network",
              fields: [
                { label: "Current Email", value: selectedAlumnus.email },
                { label: "Current Phone", value: selectedAlumnus.phone },
                { label: "Location", value: selectedAlumnus.metadata?.address || 'N/A' }
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
          onSuccess={fetchAlumni}
        />
      )}

      {/* Register/Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchAlumni}
        defaultRole="ALUMNI"
      />
    </>
  );
}
