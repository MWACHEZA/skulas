import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/payroll/employees');
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to synchronize employee registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (emp: any) => {
    setEditingEmployee({
      userId: emp.id,
      firstName: emp.name.split(' ')[0] || '',
      lastName: emp.name.split(' ').slice(1).join(' ') || '',
      department: 'General',
      jobTitle: emp.employeeProfile?.jobTitle || 'Staff',
      basePay: emp.employeeProfile?.basePay || 0,
      payFrequency: emp.employeeProfile?.payFrequency || 'MONTHLY',
      contractType: emp.employeeProfile?.contractType || 'Permanent',
      status: emp.employeeProfile?.status || 'Active',
      hireDate: emp.employeeProfile?.hireDate 
        ? new Date(emp.employeeProfile.hireDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/api/payroll/employees/${editingEmployee.userId}`, {
        jobTitle: editingEmployee.jobTitle,
        basePay: Number(editingEmployee.basePay),
        payFrequency: editingEmployee.payFrequency,
        contractType: editingEmployee.contractType,
        status: editingEmployee.status,
        hireDate: editingEmployee.hireDate
      });
      showToast('Authorized employee profile updated successfully', 'success');
      setShowEditModal(false);
      fetchEmployees();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to authorize profile update', 'error');
    
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Pending Setup';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const filteredEmployees = (Array.isArray(employees) ? employees : []).filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeProfile?.jobTitle && emp.employeeProfile.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, entriesLimit);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Employee Registry</h1>
          <p>Manage institutional staff details, payroll profiles, and active employment status.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="status-badge" style={{ padding: '8px 24px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontWeight: 900 }}>
            <i className="fas fa-users-cog mr-2"></i>PERSONNEL AUDIT
          </div>
          <button className="portal-btn-primary" style={{ padding: '12px 32px', fontWeight: 900 }} onClick={() => alert('This feature is currently under development or disabled.')}>
            <i className="fas fa-user-plus mr-2"></i>Register New Employee
          </button>
        </div>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '32px', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>Show</span>
            <select 
              value={entriesLimit} 
              onChange={(e) => setEntriesLimit(Number(e.target.value))}
              className="portal-input"
              style={{ width: '100px', padding: '10px', fontWeight: 800 }}
            >
              <option value={10}>10 Entities</option>
              <option value={25}>25 Entities</option>
              <option value={50}>50 Entities</option>
            </select>
          </div>
          
          <div style={{ position: 'relative', width: '380px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}></i>
            <input 
              type="text" 
              placeholder="Search employee registry..." 
              className="portal-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '56px', fontWeight: 700, height: '52px', borderRadius: '14px' }}
            />
          </div>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ padding: '24px' }}>Employee Identity</th>
                <th>Strategic Job Title</th>
                <th>Institutional Hire Date</th>
                <th style={{ textAlign: 'center' }}>Active Status</th>
                <th style={{ textAlign: 'right', paddingRight: '40px' }}>Audit Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
                    <p style={{ fontWeight: 900, color: '#64748b' }}>Synchronizing employee registry...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '120px 24px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid #f1f5f9' }}>
                        <i className="fas fa-users-slash fa-3x" style={{ color: '#cbd5e1', opacity: 0.5 }}></i>
                    </div>
                    <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.25rem' }}>No Employee Records Identified</h3>
                    <p style={{ color: '#64748b', fontWeight: 700, maxWidth: '360px', margin: '12px auto 0' }}>No active staff members match your current audit filters. Ensure the search parameters are correct.</p>
                  </td>
                </tr>
              ) : (Array.isArray(filteredEmployees) ? filteredEmployees : []).map((emp) => (
                <tr key={emp.id}>
                  <td style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>
                            {emp.name?.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{emp.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STAFF REF: {emp.id.slice(-8).toUpperCase()}</div>
                        </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#475569' }}>{emp.employeeProfile?.jobTitle || 'Setup Pending'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>{formatDate(emp.employeeProfile?.hireDate)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-badge" style={{ 
                        fontWeight: 900, 
                        background: emp.employeeProfile?.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                        color: emp.employeeProfile?.status === 'Active' ? '#16a34a' : '#dc2626',
                        border: '1px solid',
                        borderColor: emp.employeeProfile?.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        fontSize: '0.75rem',
                        padding: '4px 14px'
                    }}>
                      {(emp.employeeProfile?.status || 'Active').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button className="portal-btn-ghost" onClick={() => handleEditClick(emp)} title="Modify Profile" style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#2563eb' }}><i className="fas fa-pencil-alt"></i></button>
                      <button className="portal-btn-ghost" title="Archive Entity" style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#dc2626' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-archive"></i></button>
                      <button className="portal-btn-ghost" title="Executive Audit" style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#475569' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-shield-alt"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.9rem', fontWeight: 800, background: '#f8fafc', borderRadius: '0 0 24px 24px' }}>
          Displaying Audit Entities 1 to {Math.min(filteredEmployees.length, entriesLimit)} of {employees.length} Institutional Staff Members
        </div>
      </div>

      {showEditModal && editingEmployee && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '680px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Authorize Profile Audit</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.95rem' }}>Modify authorized employee payroll and profile parameters.</p>
              </div>
              <button className="portal-btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleUpdateEmployee}>
              <div className="portal-modal-body" style={{ padding: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                  <div className="form-group">
                    <label className="portal-label">Given Name</label>
                    <input type="text" className="portal-input" value={editingEmployee.firstName} readOnly style={{ background: '#f8fafc', color: '#94a3b8', fontWeight: 800, height: '56px' }} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Surname</label>
                    <input type="text" className="portal-input" value={editingEmployee.lastName} readOnly style={{ background: '#f8fafc', color: '#94a3b8', fontWeight: 800, height: '56px' }} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Strategic Job Title</label>
                    <input type="text" className="portal-input" value={editingEmployee.jobTitle} onChange={e => setEditingEmployee({...editingEmployee, jobTitle: e.target.value})} style={{ fontWeight: 800, height: '56px' }} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Authorized Base Pay ($)</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 900, fontSize: '1.2rem' }}>$</span>
                        <input type="number" step="0.01" className="portal-input" value={editingEmployee.basePay} onChange={e => setEditingEmployee({...editingEmployee, basePay: e.target.value})} style={{ paddingLeft: '40px', fontWeight: 900, color: '#059669', height: '56px', fontSize: '1.1rem' }} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Audit Pay Frequency</label>
                    <select className="portal-input" value={editingEmployee.payFrequency} onChange={e => setEditingEmployee({...editingEmployee, payFrequency: e.target.value})} style={{ fontWeight: 800, height: '56px' }}>
                      <option value="DAILY">Daily Settlement</option>
                      <option value="WEEKLY">Weekly Settlement</option>
                      <option value="FORTNIGHTLY">Fortnightly Settlement</option>
                      <option value="MONTHLY">Monthly Authorized Settlement</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Authorized Hire Date</label>
                    <input type="date" className="portal-input" value={editingEmployee.hireDate} onChange={e => setEditingEmployee({...editingEmployee, hireDate: e.target.value})} style={{ fontWeight: 800, height: '56px' }} required />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '24px', height: '24px', accentColor: '#16a34a' }}
                      checked={editingEmployee.status === 'Active'} 
                      onChange={e => setEditingEmployee({...editingEmployee, status: e.target.checked ? 'Active' : 'Inactive'})}
                    />
                    <div>
                        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>Active Employment Authorization</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Enable this entity for payroll processing and system access.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: '14px 32px', fontWeight: 800 }}>Abort Audit</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '14px 40px', fontWeight: 900 }}>Authorize Profile Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
