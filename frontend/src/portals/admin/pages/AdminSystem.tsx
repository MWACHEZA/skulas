import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl } from '../../../utils/formatters';
import '../../../styles/portal.css';

export default function AdminSystem() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Panels
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const { user: currentUser } = useAuth();
  const { showToast, toastConfirm } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      showToast('Failed to load school user directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!(await toastConfirm(`Authorize credential reset for ${user.name} to default credentials?`))) return;
    try {
      await api.post(`/api/users/${user.id}/reset-password`);
      showToast('Security credentials reset successfully', 'success');
    } catch (err) {
      showToast('Failed to reset credentials', 'error');
    }
  };

  const handleLockToggle = async (user: any) => {
    const action = user.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${user.id}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(`Failed to ${action} account`, 'error');
    }
  };

  const openEditModal = (u: any) => {
    setActiveUserForEdit(u);
    setIsEditModalOpen(true);
  };

  const openDetail = (u: any) => {
    setSelectedUser(u);
    setIsDetailOpen(true);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.staffId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' ||
      u.role === roleFilter ||
      (u.secondaryRoles && u.secondaryRoles.includes(roleFilter));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !u.isLocked) ||
      (statusFilter === 'LOCKED' && u.isLocked);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const roleCounts: Record<string, number> = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-users-cog" style={{ color: '#4f46e5' }}></i>
            System Users, Staff & Access Control
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Unified account directory for all school staff, teachers, bursars, librarians, parents, and students.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fas fa-user-plus"></i> Create User Account
          </button>
        </div>
      </div>

      {/* Role Summary Badges */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}
      >
        <button
          type="button"
          onClick={() => { setRoleFilter('ALL'); setCurrentPage(1); }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid #cbd5e1',
            background: roleFilter === 'ALL' ? '#4f46e5' : '#fff',
            color: roleFilter === 'ALL' ? '#fff' : '#475569',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All Accounts ({users.length})
        </button>

        {Object.entries(roleCounts).map(([role, count]) => (
          <button
            key={role}
            type="button"
            onClick={() => { setRoleFilter(role); setCurrentPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #cbd5e1',
              background: roleFilter === role ? '#4f46e5' : '#fff',
              color: roleFilter === role ? '#fff' : '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {role.replace('_', ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Search & Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          padding: '14px 18px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <i
            className="fas fa-search"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          ></i>
          <input
            type="text"
            placeholder="Search by name, email, or staff/student ID..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Role Filter:</span>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Roles</option>
            <option value="TEACHER">Teacher</option>
            <option value="BURSAR">Bursar / Finance</option>
            <option value="LIBRARIAN">Librarian</option>
            <option value="ANCILLARY">Ancillary Staff</option>
            <option value="CLINIC">Clinic Nurse</option>
            <option value="SCHOOL_ADMIN">School Administrator</option>
            <option value="PARENT">Parent</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="LOCKED">Locked / Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading directory...</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-users-slash fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No users found matching your criteria</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>User Profile</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Primary Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Secondary Roles / Titles</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Staff/Student ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={getAvatarUrl(u.avatar, u.name)}
                          alt={u.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          background:
                            u.role === 'SCHOOL_ADMIN'
                              ? '#fef3c7'
                              : u.role === 'TEACHER'
                              ? '#dbeafe'
                              : u.role === 'BURSAR'
                              ? '#dcfce7'
                              : '#f1f5f9',
                          color:
                            u.role === 'SCHOOL_ADMIN'
                              ? '#92400e'
                              : u.role === 'TEACHER'
                              ? '#1e40af'
                              : u.role === 'BURSAR'
                              ? '#166534'
                              : '#475569',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.secondaryRoles && u.secondaryRoles.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {u.secondaryRoles.map((sr: string) => (
                            <span key={sr} style={{ background: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 500 }}>
                              {sr}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>
                      {u.staffId || u.studentId || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.isLocked ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Locked
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Edit Roles & Profile"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#4f46e5',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          title="Reset Password"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#f59e0b',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLockToggle(u)}
                          title={u.isLocked ? "Unlock Account" : "Lock Account"}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: u.isLocked ? '#059669' : '#dc2626',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className={u.isLocked ? "fas fa-lock-open" : "fas fa-lock"}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Edit Modal */}
      {isEditModalOpen && activeUserForEdit && (
        <UserEditModal
          user={activeUserForEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setActiveUserForEdit(null);
          }}
          onSave={() => {
            setIsEditModalOpen(false);
            setActiveUserForEdit(null);
            fetchUsers();
          }}
        />
      )}

      {/* User Create Modal */}
      {isCreateModalOpen && (
        <AdminUserCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Detail Slide Panel */}
      {selectedUser && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedUser(null);
          }}
          title={selectedUser.name}
        >
          <div style={{ padding: '16px' }}>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Staff ID:</strong> {selectedUser.staffId || 'None'}</p>
          </div>
        </ManagementDetailPanel>
      )}
    </div>
  );
}
