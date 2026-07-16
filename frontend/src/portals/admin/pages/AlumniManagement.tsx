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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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

      <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Search alumni network..." 
            className="portal-input"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '48px', fontWeight: 700, height: '52px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          />
          <i className="fas fa-search" style={{ position: 'absolute', left: 18, top: 18, color: '#94a3b8', fontSize: '1rem' }}></i>
        </div>
        <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-user-graduate"></i>Register Alumnus
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
                {(() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredAlumni.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filteredAlumni.length > 0) setCurrentPage(1);
                  return filteredAlumni.length > 0 ? currentItems.map(s => (
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Alumnus" onClick={() => openEdit(s)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: s.isLocked ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={s.isLocked ? "Unlock Access" : "Lock Access"} onClick={() => handleLockToggle(s)}>
                          <i className={`fas fa-${s.isLocked ? 'unlock' : 'user-lock'}`}></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#ed89be', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(237, 137, 189, 0.1)' }} title="Donation History" onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-hand-holding-heart"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Permanent" onClick={async () => {
                          if (await toastConfirm(`Delete ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => fetchAlumni());
                          }
                        }}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No alumni records found.</td>
                  </tr>
                );
                })()}
              </tbody>
            </table>
          )}
          
          {filteredAlumni.length > 0 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAlumni.length)} of {filteredAlumni.length} entries
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAlumni.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filteredAlumni.length / itemsPerPage) || filteredAlumni.length === 0}
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
