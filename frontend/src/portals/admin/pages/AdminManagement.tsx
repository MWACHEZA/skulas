import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data } = await api.get('/api/users?role=SCHOOL_ADMIN');
      setAdmins(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      showToast('Failed to synchronize administrator registry', 'error');
    
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
      fetchAdmins();
    } catch (err) {
      showToast(`Failed to authorize account ${action
    }`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedAdmin(s);
    setIsDetailOpen(true);
  };

  const openEdit = (admin: any) => {
    setActiveUserForEdit(admin);
    setIsEditModalOpen(true);
  };

  const filteredAdmins = (Array.isArray(admins) ? admins : []).filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.staffId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Institutional Governance</h1>
          <p>Global oversight of administrative accounts, security authorizations, and institutional permissions.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 900 }}>
           <i className="fas fa-shield-alt mr-2"></i>GOVERNANCE AUDIT
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <input 
            type="text" 
            placeholder="Search administration roster..." 
            className="portal-input"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '48px', fontWeight: 700, height: '52px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          />
          <i className="fas fa-search" style={{ position: 'absolute', left: 18, top: 18, color: '#94a3b8', fontSize: '1rem' }}></i>
        </div>
        <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ background: '#dc2626', border: '1px solid #b91c1c', padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-user-shield"></i>Authorize Administrator
        </button>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '120px 24px' }}>
            <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
            <p style={{ fontWeight: 900, color: '#64748b', fontSize: '1.2rem' }}>Synchronizing governance registry...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Admin Trace</th>
                  <th style={{ width: '30%' }}>Identity & Status</th>
                  <th style={{ width: '15%' }}>Core Entity</th>
                  <th style={{ width: '15%' }}>Institutional Email</th>
                  <th style={{ textAlign: 'center', width: '10%' }}>Account</th>
                  <th style={{ textAlign: 'right', width: '15%' }}>Audit Controls</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredAdmins.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filteredAdmins.length > 0) setCurrentPage(1);
                  return filteredAdmins.length > 0 ? currentItems.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ color: '#4338ca', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                        {s.staffId || s.id.substring(0, 8).toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '16px', 
                            background: '#fef2f2', border: '1px solid #fee2e2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: 900, color: '#dc2626',
                            overflow: 'hidden'
                        }}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{s.name}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span className="status-badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontSize: '0.65rem', fontWeight: 900, padding: '2px 10px' }}>GOVERNANCE</span>
                            {(Array.isArray(s.secondaryRoles) ? s.secondaryRoles : []).map((r: string, idx: number) => (
                              <span key={idx} className="status-badge" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px' }}>{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                        <div style={{ fontWeight: 800, color: '#475569' }}>{s.dept?.name || 'Central Governance'}</div>
                    </td>
                    <td>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{s.email || 'Registry N/A'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${s.isLocked ? 'status-inactive' : 'status-active'}`} style={{ fontWeight: 900, fontSize: '0.7rem' }}>
                        {s.isLocked ? 'LOCKED' : 'AUTHORIZED'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Audit Details" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modify Account" onClick={() => openEdit(s)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: s.isLocked ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={s.isLocked ? "Restore Access" : "Restrict Access"} onClick={() => handleLockToggle(s)}>
                          <i className={`fas fa-${s.isLocked ? 'unlock' : 'user-lock'}`}></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Revoke Identity" onClick={async () => {
                          if (await toastConfirm(`Permanently revoke and delete institutional identity for ${s.name}?`)) {
                            api.delete(`/api/users/${s.id}`).then(() => {
                                showToast('Identity revoked permanently', 'success');
                                fetchAdmins();
                            });
                          }
                        }}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px' }}>
                        <i className="fas fa-users-slash" style={{ fontSize: '3rem', color: '#f1f5f9', marginBottom: '24px', display: 'block' }}></i>
                        <h3 style={{ color: '#94a3b8', fontWeight: 900 }}>No administrators identified in registry</h3>
                    </td>
                  </tr>
                );
                })()}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredAdmins.length > 0 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAdmins.length)} of {filteredAdmins.length} entries
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAdmins.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredAdmins.length / itemsPerPage) || filteredAdmins.length === 0}
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
      {selectedAdmin && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedAdmin.name}
          subTitle={`Admin Trace: ${selectedAdmin.staffId || selectedAdmin.id.substring(0, 8).toUpperCase()}`}
          role="Administrator"
          secondaryRoles={selectedAdmin.secondaryRoles}
          avatarFilename={selectedAdmin.avatar}
          avatarText={selectedAdmin.name.charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedAdmin); }}
          onResetPassword={() => handleResetPassword(selectedAdmin)}
          sections={[
            {
              title: "System Authorization",
              fields: [
                { label: "Governance Role", value: selectedAdmin.role },
                { label: "Institutional Status", value: selectedAdmin.isLocked ? 'Restricted' : 'Authorized' },
                { label: "Core Department", value: selectedAdmin.dept?.name || 'Central Governance' },
                { label: "Authorized Duty Station", value: selectedAdmin.metadata?.dutyStation || 'HQ / Administration' }
              ]
            },
            {
              title: "Institutional Communication",
              fields: [
                { label: "Authorized Email", value: selectedAdmin.email },
                { label: "Secure Contact", value: selectedAdmin.phone },
                { label: "Audit Station", value: selectedAdmin.metadata?.officeRoom || 'Executive Wing' }
              ]
            },
            {
              title: "Residency & Kinship Registry",
              fields: [
                { label: "Verified Address", value: selectedAdmin.metadata?.address },
                { label: "Emergency Liaison", value: selectedAdmin.metadata?.nokName },
                { label: "Liaison Contact", value: selectedAdmin.metadata?.nokPhone }
              ]
            },
            ...(selectedAdmin.employeeProfile ? [
              {
                title: "HR & Professional Details",
                fields: [
                  { label: "Designation", value: selectedAdmin.employeeProfile.designation },
                  { label: "Blood Group", value: selectedAdmin.employeeProfile.bloodGroup },
                  { label: "Date Assumed Post", value: selectedAdmin.employeeProfile.dateAssumedPost ? new Date(selectedAdmin.employeeProfile.dateAssumedPost).toLocaleDateString() : '—' },
                  { label: "Date of Leaving", value: selectedAdmin.employeeProfile.dateOfLeaving ? new Date(selectedAdmin.employeeProfile.dateOfLeaving).toLocaleDateString() : '—' }
                ]
              },
              {
                title: "Banking & Payroll Details",
                fields: [
                  { label: "💵 Bank Name (USD)", value: selectedAdmin.employeeProfile.bankName },
                  { label: "Bank Branch (USD)", value: selectedAdmin.employeeProfile.bankBranch },
                  { label: "Account Number (USD)", value: selectedAdmin.employeeProfile.accountNumber },
                  { label: "Account Holder (USD)", value: selectedAdmin.employeeProfile.accountHolderName },
                  ...(selectedAdmin.employeeProfile.bankNameZig ? [
                    { label: "🪙 Bank Name (ZiG)", value: selectedAdmin.employeeProfile.bankNameZig },
                    { label: "Bank Branch (ZiG)", value: selectedAdmin.employeeProfile.bankBranchZig },
                    { label: "Account Number (ZiG)", value: selectedAdmin.employeeProfile.accountNumberZig },
                    { label: "Account Holder (ZiG)", value: selectedAdmin.employeeProfile.accountHolderNameZig }
                  ] : [])
                ]
              },
              {
                title: "Social Media Links",
                fields: [
                  { label: "Facebook", value: selectedAdmin.employeeProfile.facebookLink },
                  { label: "LinkedIn", value: selectedAdmin.employeeProfile.linkedinLink },
                  { label: "Twitter", value: selectedAdmin.employeeProfile.twitterLink }
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
          onSuccess={fetchAdmins}
        />
      )}

      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchAdmins}
        defaultRole="SCHOOL_ADMIN"
      />
    </div>
  );
}
