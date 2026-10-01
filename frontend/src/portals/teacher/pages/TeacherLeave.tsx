import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import TabbedPage from '../../../components/shared/TabbedPage';
import ExportButton from '../../../components/shared/ExportButton';
import SearchInput from '../../../components/shared/SearchInput';
import { toast } from '../../../components/shared/ToastContext';

export default function TeacherLeave() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [deptLeaves, setDeptLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  const isHod = user?.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD'].includes(r.toUpperCase())) || user?.role === 'SCHOOL_ADMIN';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchMyData();
    if (isHod) fetchDeptLeaves();
    if (isAdmin) fetchAllLeaves();
  }, []);

  const fetchMyData = async () => {
    try {
      const [balRes, leavesRes] = await Promise.all([
        api.get('/api/leave/balance'),
        api.get('/api/leave/my')
      ]);
      setBalance(balRes.data);
      setMyLeaves(leavesRes.data);
    } catch (e) {
      toast.error('Failed to load your leave data');
    }
  };

  const fetchDeptLeaves = async () => {
    try {
      const res = await api.get('/api/leave/department');
      setDeptLeaves(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await api.get('/api/leave/all');
      setAllLeaves(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const approveLeave = async (id: string, level: 'hod' | 'admin') => {
    try {
      await api.patch(`/api/leave/${id}/${level === 'hod' ? 'hod-approve' : 'approve'}`);
      toast.success('Leave approved');
      if (level === 'hod') fetchDeptLeaves();
      if (level === 'admin') fetchAllLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Approval failed');
    }
  };

  const rejectLeave = async (id: string, level: 'hod' | 'admin') => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.patch(`/api/leave/${id}/${level === 'hod' ? 'hod-reject' : 'reject'}`, { reason });
      toast.success('Leave rejected');
      if (level === 'hod') fetchDeptLeaves();
      if (level === 'admin') fetchAllLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Rejection failed');
    }
  };

  const MyLeaveTab = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {['annual', 'sick', 'compassionate', 'maternity', 'study', 'unpaid'].map(type => (
          <div key={type} className="portal-stat-card" style={{ padding: '16px' }}>
            <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            {balance ? (
              <p>{(balance[`${type}Total`] || 0) - (balance[`${type}Used`] || 0)} days left</p>
            ) : <p>...</p>}
          </div>
        ))}
      </div>
      <table className="portal-table">
        <thead>
          <tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr>
        </thead>
        <tbody>
          {myLeaves.map(l => (
            <tr key={l.id}>
              <td>{l.leaveType}</td>
              <td>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
              <td>{l.days}</td>
              <td><span className={`portal-badge ${l.status.includes('approve') ? 'success' : l.status.includes('reject') ? 'error' : 'warning'}`}>{l.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const DeptTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <ExportButton data={deptLeaves} filename="dept_leaves" visibleFormats={isAdmin ? ['excel', 'pdf', 'csv'] : ['excel', 'pdf']} />
      </div>
      <table className="portal-table">
        <thead>
          <tr><th>Teacher</th><th>Type</th><th>Dates</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {deptLeaves.map(l => (
            <tr key={l.id}>
              <td>{l.userId}</td>
              <td>{l.leaveType}</td>
              <td>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
              <td>
                <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'hod')} style={{ marginRight: '8px' }}>Approve</button>
                <button className="portal-btn-secondary" onClick={() => rejectLeave(l.id, 'hod')} style={{ color: 'red' }}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const AdminTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SearchInput onSearch={() => {}} placeholder="Search leaves..." />
        <ExportButton data={allLeaves} filename="all_leaves" visibleFormats={['excel', 'pdf', 'csv']} />
      </div>
      <table className="portal-table">
        <thead>
          <tr><th>User</th><th>Type</th><th>Dates</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {allLeaves.map(l => (
            <tr key={l.id}>
              <td>{l.userId}</td>
              <td>{l.leaveType}</td>
              <td>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
              <td>{l.status}</td>
              <td>
                {l.status === 'pending_head' && (
                  <>
                    <button className="portal-btn-primary" onClick={() => approveLeave(l.id, 'admin')} style={{ marginRight: '8px' }}>Approve</button>
                    <button className="portal-btn-secondary" onClick={() => rejectLeave(l.id, 'admin')} style={{ color: 'red' }}>Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tabs = [
    { id: 'my', label: 'My Leave', content: <MyLeaveTab /> },
    ...(isHod ? [{ id: 'dept', label: 'Department', content: <DeptTab /> }] : []),
    ...(isAdmin ? [{ id: 'all', label: 'All Leaves', content: <AdminTab /> }] : [])
  ];

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1>Leave Management</h1>
      </div>
      <TabbedPage tabs={tabs} defaultTab="my" />
    </div>
  );
}
