import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      showToast('Failed to synchronize global user directory', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!(await toastConfirm(`Authorize cryptographic reset for ${user.name} to default credentials?`))) return;
    try {
      await api.post(`/api/users/${user.id}/reset-password`);
      showToast('Security credentials reset authorized', 'success');
    } catch (err) {
      showToast('Failed to authorize credential reset', 'error');
    
    }
  };

  const handleLockToggle = async (user: any) => {
    const action = user.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${user.id}/${action}`);
      showToast(`Account ${action === 'lock' ? 'restriction' : 'authorization'} authorized successfully`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(`Failed to authorize account ${action
    }`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedUser(s);
    setIsDetailOpen(true);
  };

  const openEdit = (user: any) => {
    setActiveUserForEdit(user);
    setIsEditModalOpen(true);
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.staffId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.studentId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleStyles: Record<string, { background: string; color: string; border: string }> = { 
    TEACHER: { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' }, 
    STUDENT: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }, 
    BURSAR: { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }, 
    LIBRARIAN: { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe' }, 
    ANCILLARY: { background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' }, 
    SCHOOL_ADMIN: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' },
    ALUMNI: { background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9' },
    SUPPLIER: { background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' },
    PARENT: { background: '#ecfeff', color: '#0891b2', border: '1px solid #cffafe' }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Global User Directory</h1>
          <p>Comprehensive registry of all institutional accounts, security authorizations, and departmental roles.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontWeight: 900 }}>
           <i className="fas fa-users-cog mr-2"></i>IDENTITY AUDIT
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <input 
            type="text" 
            placeholder="Filter by name, email, or institutional ID..." 
            className="portal-input"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '48px', fontWeight: 700, height: '52px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          />
          <i className="fas fa-search" style={{ position: 'absolute', left: 18, top: 18, color: '#94a3b8', fontSize: '1rem' }}></i>
        </div>
        <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-user-plus"></i>Authorize New Account
        </button>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '120px 24px' }}>
            <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
            <p style={{ fontWeight: 900, color: '#64748b', fontSize: '1.2rem' }}>Synchronizing user repositories...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Identity Token</th>
                  <th style={{ width: '30%' }}>Profile & Status</th>
                  <th style={{ width: '15%' }}>Primary Entity</th>
                  <th style={{ width: '15%' }}>Institutional Email</th>
                  <th style={{ textAlign: 'center', width: '10%' }}>Account</th>
                  <th style={{ textAlign: 'right', width: '15%' }}>Control Center</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filteredUsers.length > 0) setCurrentPage(1);
                  return filteredUsers.length > 0 ? currentItems.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ color: '#4338ca', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                        {u.staffId || u.studentId || `ID-${u.id.substring(0, 8).toUpperCase()}`}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '16px', 
                            background: '#f8fafc', border: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: 900, color: '#2563eb',
                            overflow: 'hidden'
                        }}>
                          {u.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${u.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            u.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{u.name}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span className="status-badge" style={{ 
                                ...roleStyles[u.role] || roleStyles.ANCILLARY,
                                fontSize: '0.65rem', fontWeight: 900, padding: '2px 10px'
                            }}>
                                {u.role?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                        <div style={{ fontWeight: 800, color: '#475569' }}>{u.dept?.name || 'Central Admin'}</div>
                    </td>
                    <td>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{u.email || 'No email registered'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${u.isLocked ? 'status-inactive' : 'status-active'}`} style={{ fontWeight: 900, fontSize: '0.7rem' }}>
                        {u.isLocked ? 'LOCKED' : 'AUTHORIZED'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Audit Details" onClick={() => openDetail(u)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modify Account" onClick={() => openEdit(u)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reset Credentials" onClick={() => handleResetPassword(u)}>
                          <i className="fas fa-key"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: u.isLocked ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={u.isLocked ? "Restore Access" : "Restrict Access"} onClick={() => handleLockToggle(u)}>
                          <i className={`fas fa-${u.isLocked ? 'unlock' : 'user-lock'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px' }}>
                        <i className="fas fa-user-slash" style={{ fontSize: '3rem', color: '#f1f5f9', marginBottom: '24px', display: 'block' }}></i>
                        <h3 style={{ color: '#94a3b8', fontWeight: 900 }}>No matching identities identified</h3>
                    </td>
                  </tr>
                );
                })()}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredUsers.length > 0 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage) || filteredUsers.length === 0}
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
      {selectedUser && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedUser.name}
          subTitle={`${selectedUser.role} Account: ${selectedUser.staffId || selectedUser.studentId || selectedUser.id}`}
          role={selectedUser.role}
          secondaryRoles={selectedUser.secondaryRoles}
          avatarFilename={selectedUser.avatar}
          avatarText={selectedUser.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedUser); }}
          onResetPassword={() => handleResetPassword(selectedUser)}
          sections={[
            {
              title: "Institutional Overview",
              fields: [
                { label: "Primary Authorization", value: selectedUser.role },
                { label: "Institutional Department", value: selectedUser.dept?.name || 'Central Administration' },
                { label: "Authorized Email", value: selectedUser.email },
                { label: "Verified Contact", value: selectedUser.phone },
                { label: "Registry Status", value: selectedUser.isLocked ? 'Restricted' : 'Authorized' }
              ]
            },
            ...(selectedUser.role === 'SUPPLIER' && selectedUser.metadata ? [
              {
                title: "Entity Infrastructure",
                fields: [
                  { label: "Legal Entity Name", value: selectedUser.metadata.companyName },
                  { label: "BP / Registration Token", value: selectedUser.metadata.regNo },
                  { label: "Incorp Audit Year", value: selectedUser.metadata.incorpYear },
                  { label: "Registry Classification", value: selectedUser.metadata.category },
                  { label: "Authorized Headquarters", value: selectedUser.metadata.address },
                ]
              },
              {
                title: "Primary Liaison Audit",
                fields: [
                  { label: "Liaison Name", value: selectedUser.metadata.contactName },
                  { label: "Authorized Designation", value: selectedUser.metadata.designation },
                  { label: "Alternate Communication", value: selectedUser.metadata.email || selectedUser.email },
                ]
              },
              {
                title: "Compliance Registry",
                fields: [
                    { label: "PRAZ Authorization", value: selectedUser.metadata.prazNo },
                    { label: "Tax Compliance Expiry", value: selectedUser.metadata.taxExpiry },
                    { label: "PRAZ Audit Expiry", value: selectedUser.metadata.prazExpiry },
                    { label: "NSSA Compliance Expiry", value: selectedUser.metadata.nssaExpiry },
                    { label: "Institutional Vendor ID", value: selectedUser.metadata.vendorNo },
                ]
              },
              {
                title: "Cryptographic Compliance Documents",
                fields: [
                  { label: "Tax Compliance Token", value: selectedUser.metadata.docs?.taxClearance, type: 'image' as const },
                  { label: "PRAZ Authorized Cert", value: selectedUser.metadata.docs?.prazCert, type: 'image' as const },
                  { label: "Entity Incorp Token", value: selectedUser.metadata.docs?.certIncorp, type: 'image' as const },
                  { label: "NSSA Audit Clearance", value: selectedUser.metadata.docs?.nssaClearance, type: 'image' as const },
                ].filter(f => !!f.value)
              }
            ] : [
              {
                title: "Secondary Authorizations",
                fields: (selectedUser.secondaryRoles || []).map((r: string, i: number) => ({ label: `Authorized Role ${i+1}`, value: r }))
              },
              {
                title: "Institutional Metadata Registry",
                fields: Object.entries(selectedUser.metadata || {})
                  .filter(([k]) => k !== 'docs')
                  .map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1'), value: String(v) }))
              },
              ...(selectedUser.employeeProfile ? [
                {
                  title: "HR & Professional Details",
                  fields: [
                    { label: "Designation", value: selectedUser.employeeProfile.designation },
                    { label: "Blood Group", value: selectedUser.employeeProfile.bloodGroup },
                    { label: "Date Assumed Post", value: selectedUser.employeeProfile.dateAssumedPost ? new Date(selectedUser.employeeProfile.dateAssumedPost).toLocaleDateString() : '—' },
                    { label: "Date of Leaving", value: selectedUser.employeeProfile.dateOfLeaving ? new Date(selectedUser.employeeProfile.dateOfLeaving).toLocaleDateString() : '—' }
                  ]
                },
                {
                  title: "Banking & Payroll Details",
                  fields: [
                    { label: "💵 Bank Name (USD)", value: selectedUser.employeeProfile.bankName },
                    { label: "Bank Branch (USD)", value: selectedUser.employeeProfile.bankBranch },
                    { label: "Account Number (USD)", value: selectedUser.employeeProfile.accountNumber },
                    { label: "Account Holder (USD)", value: selectedUser.employeeProfile.accountHolderName },
                    ...(selectedUser.employeeProfile.bankNameZig ? [
                      { label: "🪙 Bank Name (ZiG)", value: selectedUser.employeeProfile.bankNameZig },
                      { label: "Bank Branch (ZiG)", value: selectedUser.employeeProfile.bankBranchZig },
                      { label: "Account Number (ZiG)", value: selectedUser.employeeProfile.accountNumberZig },
                      { label: "Account Holder (ZiG)", value: selectedUser.employeeProfile.accountHolderNameZig }
                    ] : [])
                  ]
                },
                {
                  title: "Social Media Links",
                  fields: [
                    { label: "Facebook", value: selectedUser.employeeProfile.facebookLink },
                    { label: "LinkedIn", value: selectedUser.employeeProfile.linkedinLink },
                    { label: "Twitter", value: selectedUser.employeeProfile.twitterLink }
                  ]
                }
              ] : [])
            ])
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
          onSuccess={fetchUsers}
        />
      )}

      {/* Create User Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
