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

  const [activeSystemTab, setActiveSystemTab] = useState<'USERS' | 'LEADERSHIP' | 'ALLOWED_SUPPLIES'>('USERS');

  // Leadership state
  const [leadershipAssignments, setLeadershipAssignments] = useState<any[]>([]);
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    leadershipRole: 'HOSTEL_PREFECT',
    hostelId: '',
    term: 'Term 1',
    academicYear: new Date().getFullYear().toString()
  });
  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);
  const [hostelsList, setHostelsList] = useState<any[]>([]);
  const [assigningWardenHostelId, setAssigningWardenHostelId] = useState<string | null>(null);
  const [selectedWardenUserId, setSelectedWardenUserId] = useState<string>('');

  // Allowed supplies state
  const [allowedSupplies, setAllowedSupplies] = useState<any[]>([]);
  const [allowedSuppliesLoading, setAllowedSuppliesLoading] = useState(false);
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('cleaning');

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

  const fetchLeadershipData = async () => {
    setLeadershipLoading(true);
    try {
      const [assignRes, studRes, hostelRes] = await Promise.all([
        api.get('/api/admin/leadership/assignments'),
        api.get('/api/students?limit=200'),
        api.get('/api/ancillary/hostels').catch(() => ({ data: [] }))
      ]);
      setLeadershipAssignments(assignRes.data || []);
      setSchoolStudents(studRes.data?.students || []);
      setHostelsList(hostelRes.data || []);
    } catch (err) {
      showToast('Failed to load leadership assignments', 'error');
    } finally {
      setLeadershipLoading(false);
    }
  };

  const handleAssignLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.studentId) {
      showToast('Please select a student', 'error');
      return;
    }
    if (assignForm.leadershipRole === 'HOSTEL_PREFECT' && !assignForm.hostelId) {
      showToast('Hostel is required for Hostel Prefects', 'error');
      return;
    }

    try {
      await api.post('/api/admin/leadership/assignments', assignForm);
      showToast('Leadership role assigned successfully!', 'success');
      setIsAssignModalOpen(false);
      setAssignForm({
        studentId: '',
        leadershipRole: 'HOSTEL_PREFECT',
        hostelId: '',
        term: 'Term 1',
        academicYear: new Date().getFullYear().toString()
      });
      fetchLeadershipData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to assign leadership', 'error');
    }
  };

  const handleDeactivateAssignment = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to end this student leadership assignment early?'))) return;
    try {
      await api.patch(`/api/admin/leadership/assignments/${id}/deactivate`);
      showToast('Leadership assignment deactivated', 'success');
      fetchLeadershipData();
    } catch (err) {
      showToast('Failed to deactivate assignment', 'error');
    }
  };

  const handleAssignWarden = async (hostelId: string) => {
    try {
      await api.patch(`/api/admin/leadership/hostels/${hostelId}/assign-warden`, {
        wardenUserId: selectedWardenUserId || null
      });
      showToast('Hostel warden updated successfully', 'success');
      setAssigningWardenHostelId(null);
      setSelectedWardenUserId('');
      fetchLeadershipData();
    } catch (err) {
      showToast('Failed to assign warden', 'error');
    }
  };

  const fetchAllowedSupplies = async () => {
    setAllowedSuppliesLoading(true);
    try {
      const { data } = await api.get('/api/admin/leadership/allowed-items');
      setAllowedSupplies(data || []);
    } catch (err) {
      showToast('Failed to load allowed items', 'error');
    } finally {
      setAllowedSuppliesLoading(false);
    }
  };

  const handleToggleItem = async (id: string) => {
    try {
      await api.patch(`/api/admin/leadership/allowed-items/${id}/toggle`);
      showToast('Item status updated', 'success');
      fetchAllowedSupplies();
    } catch (err) {
      showToast('Failed to toggle item status', 'error');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await api.post('/api/admin/leadership/allowed-items/seed-defaults');
      showToast('Default 7 cleaning supplies seeded successfully!', 'success');
      fetchAllowedSupplies();
    } catch (err) {
      showToast('Failed to seed defaults', 'error');
    }
  };

  const handleCreateAllowedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemSku || !newItemName) {
      showToast('SKU and name are required', 'error');
      return;
    }

    try {
      await api.post('/api/admin/leadership/allowed-items', {
        itemSku: newItemSku,
        itemName: newItemName,
        category: newItemCategory
      });
      showToast(`Added ${newItemName} to allowed supplies catalog`, 'success');
      setNewItemSku('');
      setNewItemName('');
      fetchAllowedSupplies();
    } catch (err) {
      showToast('Failed to add allowed supply item', 'error');
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
          {activeSystemTab === 'USERS' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-user-plus"></i> Create User Account
            </button>
          )}
          {activeSystemTab === 'LEADERSHIP' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAssignModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus-circle"></i> Assign Student Leader
            </button>
          )}
          {activeSystemTab === 'ALLOWED_SUPPLIES' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSeedDefaults}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#38a169', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-magic"></i> Seed Default 7 Supplies
            </button>
          )}
        </div>
      </div>

      {/* Top Level Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveSystemTab('USERS')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeSystemTab === 'USERS' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeSystemTab === 'USERS' ? '#4f46e5' : '#64748b',
            fontWeight: activeSystemTab === 'USERS' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-users mr-2" style={{ marginRight: 8 }}></i> User Accounts & Roles
        </button>
        <button
          type="button"
          onClick={() => { setActiveSystemTab('LEADERSHIP'); fetchLeadershipData(); }}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeSystemTab === 'LEADERSHIP' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeSystemTab === 'LEADERSHIP' ? '#4f46e5' : '#64748b',
            fontWeight: activeSystemTab === 'LEADERSHIP' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-user-shield mr-2" style={{ marginRight: 8 }}></i> Student Leadership
        </button>
        <button
          type="button"
          onClick={() => { setActiveSystemTab('ALLOWED_SUPPLIES'); fetchAllowedSupplies(); }}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeSystemTab === 'ALLOWED_SUPPLIES' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeSystemTab === 'ALLOWED_SUPPLIES' ? '#4f46e5' : '#64748b',
            fontWeight: activeSystemTab === 'ALLOWED_SUPPLIES' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-soap mr-2" style={{ marginRight: 8 }}></i> Allowed Cleaning Supplies
        </button>
      </div>

      {activeSystemTab === 'USERS' && (
        <>

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
      </>
      )}

      {/* TAB 2: STUDENT LEADERSHIP */}
      {activeSystemTab === 'LEADERSHIP' && (
        <div>
          {/* Active Assignments Card */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Active Student Leadership Assignments</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Term-scoped leader roles governing hostel supplies and student governance.</p>
              </div>
              <button
                type="button"
                className="portal-btn-primary"
                onClick={() => setIsAssignModalOpen(true)}
              >
                <i className="fas fa-plus-circle mr-1"></i> Assign New Leader
              </button>
            </div>
            <div className="portal-card-body p-0">
              {leadershipLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin fa-2x"></i>
                  <p style={{ marginTop: 8 }}>Loading assignments...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="portal-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px' }}>Student</th>
                        <th style={{ padding: '12px 16px' }}>Leadership Role</th>
                        <th style={{ padding: '12px 16px' }}>Designated Hostel</th>
                        <th style={{ padding: '12px 16px' }}>Term & Year</th>
                        <th style={{ padding: '12px 16px' }}>Assigned By</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadershipAssignments.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong>{a.student?.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.student?.studentId} {a.student?.class?.name ? `(${a.student.class.name})` : ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="badge bg-primary" style={{ padding: '4px 8px', borderRadius: '4px', background: '#3182ce', color: '#fff', fontSize: '0.8rem' }}>
                              {a.leadershipRole.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {a.hostel?.name ? (
                              <span><i className="fas fa-hotel mr-1 text-primary"></i> {a.hostel.name}</span>
                            ) : (
                              <span className="text-muted">None (Campus-wide)</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>{a.term} ({a.academicYear})</td>
                          <td style={{ padding: '12px 16px' }}>{a.assignedBy?.name || 'Admin'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`status-badge ${a.isActive ? 'status-active' : 'status-inactive'}`}>
                              {a.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {a.isActive ? (
                              <button
                                type="button"
                                className="portal-btn-danger btn-sm"
                                onClick={() => handleDeactivateAssignment(a.id)}
                              >
                                End Term Early
                              </button>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Ended</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {leadershipAssignments.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            No student leadership assignments active. Click "Assign New Leader" to appoint prefects.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Hostel Warden / Matron Assignment Card */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Hostel Matron / Boarding Warden Alignment</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Link residential hostels to their designated Matron or Boarding Master for automatic request routing.
              </p>
            </div>
            <div className="portal-card-body p-0">
              <table className="portal-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px' }}>Hostel</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Matron / Warden</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Assign / Change</th>
                  </tr>
                </thead>
                <tbody>
                  {hostelsList.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}><strong>{h.name}</strong></td>
                      <td style={{ padding: '12px 16px' }}>{h.type}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {h.warden ? (
                          <span style={{ color: '#2b6cb0', fontWeight: 600 }}>
                            <i className="fas fa-user-check mr-1"></i> {h.warden.name} ({h.warden.email})
                          </span>
                        ) : (
                          <span className="text-warning" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-exclamation-circle mr-1"></i> No Matron Assigned (Falling back to Boarding Dept)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {assigningWardenHostelId === h.id ? (
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <select
                              className="portal-input"
                              style={{ width: '220px', padding: '4px 8px', fontSize: '0.85rem' }}
                              value={selectedWardenUserId}
                              onChange={e => setSelectedWardenUserId(e.target.value)}
                            >
                              <option value="">-- Remove / None --</option>
                              {users.filter(u => u.role === 'ANCILLARY' || u.role === 'SCHOOL_ADMIN' || u.role === 'TEACHER').map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                              ))}
                            </select>
                            <button className="portal-btn-primary btn-sm" onClick={() => handleAssignWarden(h.id)}>Save</button>
                            <button className="portal-btn-secondary btn-sm" onClick={() => setAssigningWardenHostelId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="portal-btn-secondary btn-sm"
                            onClick={() => {
                              setAssigningWardenHostelId(h.id);
                              setSelectedWardenUserId(h.wardenUserId || '');
                            }}
                          >
                            <i className="fas fa-edit mr-1"></i> Assign Staff
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {hostelsList.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No hostels recorded in this school. Add hostels under Ancillary / Boarding.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALLOWED CLEANING SUPPLIES */}
      {activeSystemTab === 'ALLOWED_SUPPLIES' && (
        <div>
          {/* Add Supply Item Card */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Approved Cleaning & Sanitation Catalog</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Only active items in this tenant list can be requisitioned by student leaders. Non-allowed items are rejected at API level.
              </p>
            </div>
            <div className="portal-card-body" style={{ padding: '20px' }}>
              <form onSubmit={handleCreateAllowedItem} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Item SKU / Code</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. mop_bucket"
                    value={newItemSku}
                    onChange={e => setNewItemSku(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: '2 1 240px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Item Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Heavy Duty Floor Mop"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category</label>
                  <select
                    className="portal-input"
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value)}
                  >
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="sanitation">Sanitation</option>
                  </select>
                </div>
                <div>
                  <button type="submit" className="portal-btn-primary" style={{ height: '42px', padding: '0 20px' }}>
                    <i className="fas fa-plus mr-1"></i> Add Supply Item
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Tenant Allowed Items List</h2>
              <button type="button" className="portal-btn-secondary btn-sm" onClick={handleSeedDefaults}>
                <i className="fas fa-sync mr-1"></i> Re-seed Standard Defaults
              </button>
            </div>
            <div className="portal-card-body p-0">
              {allowedSuppliesLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin fa-2x"></i>
                  <p style={{ marginTop: 8 }}>Loading catalog...</p>
                </div>
              ) : (
                <table className="portal-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px' }}>SKU</th>
                      <th style={{ padding: '12px 16px' }}>Item Name</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>Availability</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedSupplies.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{item.itemSku}</td>
                        <td style={{ padding: '12px 16px' }}><strong>{item.itemName}</strong></td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge bg-light text-dark border">{item.category}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`status-badge ${item.isActive ? 'status-active' : 'status-inactive'}`}>
                            {item.isActive ? 'Enabled for Students' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className={`portal-btn-${item.isActive ? 'danger' : 'success'} btn-sm`}
                            onClick={() => handleToggleItem(item.id)}
                          >
                            {item.isActive ? 'Disable Item' : 'Enable Item'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allowedSupplies.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No cleaning supplies configured for this school. Click "Seed Default 7 Supplies" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Leadership Modal */}
      {isAssignModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Assign Student Leadership</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleAssignLeadership} style={{ padding: 20 }}>
              <div className="form-group mb-3">
                <label className="form-label" style={{ fontWeight: 600 }}>Student</label>
                <select
                  className="portal-input"
                  required
                  value={assignForm.studentId}
                  onChange={e => setAssignForm({ ...assignForm, studentId: e.target.value })}
                >
                  <option value="">-- Select Student --</option>
                  {schoolStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.studentId}) {s.class?.name ? `- ${s.class.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontWeight: 600 }}>Leadership Role</label>
                <select
                  className="portal-input"
                  value={assignForm.leadershipRole}
                  onChange={e => setAssignForm({ ...assignForm, leadershipRole: e.target.value })}
                >
                  <option value="HOSTEL_PREFECT">Hostel Prefect</option>
                  <option value="HEAD_BOY">Head Boy</option>
                  <option value="HEAD_GIRL">Head Girl</option>
                  <option value="DINING_PREFECT">Dining Prefect</option>
                  <option value="SRC_PRESIDENT">SRC President</option>
                  <option value="SRC_MEMBER">SRC Member</option>
                </select>
              </div>

              {assignForm.leadershipRole === 'HOSTEL_PREFECT' && (
                <div className="form-group mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Designated Hostel <span className="text-danger">*</span>
                  </label>
                  <select
                    className="portal-input"
                    required
                    value={assignForm.hostelId}
                    onChange={e => setAssignForm({ ...assignForm, hostelId: e.target.value })}
                  >
                    <option value="">-- Choose Assigned Hostel --</option>
                    {hostelsList.map(h => (
                      <option key={h.id} value={h.id}>{h.name} ({h.type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>Term</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={assignForm.term}
                    onChange={e => setAssignForm({ ...assignForm, term: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>Academic Year</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={assignForm.academicYear}
                    onChange={e => setAssignForm({ ...assignForm, academicYear: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Save Assignment</button>
              </div>
            </form>
          </div>
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
