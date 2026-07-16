import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface ShiftAssignment {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  task?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    dept?: {
      id: string;
      name: string;
    };
  };
}

export default function AncillarySchedules() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false); // Admin or HOD

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '16:00',
    location: '',
    task: ''
  });

  // Styles & Branding
  const primaryColor = user?.schoolBranding?.primaryColor || '#1e3a8a';
  const accentColor = user?.schoolBranding?.accentColor || '#f59e0b';

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      // 1. Attempt to fetch all staff schedules (succeeds only for Admins & HODs)
      try {
        const staffRes = await api.get('/api/schedules/staff');
        setShifts(staffRes.data);
        setIsManager(true);
        // Also fetch employee registry for the assignment dropdown
        const empRes = await api.get('/api/payroll/employees');
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      } catch (err: any) {
        if (err.response?.status === 403) {
          // If 403, user is a regular staff member, only fetch their own schedules
          const myRes = await api.get('/api/schedules/my');
          setShifts(myRes.data);
          setIsManager(false);
        
    } else {
          showToast('Failed to load schedules', 'error');
        }
      }
    } catch (error) {
      showToast('Error syncing schedules', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.startTime || !formData.endTime || !formData.task) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      await api.post('/api/schedules', formData);
      showToast('Shift assigned successfully', 'success');
      setShowAssignModal(false);
      setFormData({
        userId: '',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
        location: '',
        task: ''
      });
      fetchSchedules();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to assign shift', 'error');
    
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!window.confirm('Delete this shift assignment?')) return;
    try {
      await api.delete(`/api/schedules/${id}`);
      showToast('Shift assignment removed', 'success');
      fetchSchedules();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to remove shift', 'error');
    
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="schedules-container" style={{ padding: '24px' }}>
      {/* Printable Area Wrapper */}
      <div className="print:p-10 print:bg-white print:text-black">
        {/* Header */}
        <div className="portal-page-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `2px solid ${primaryColor}22`,
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <div>
            <h1 style={{ color: primaryColor, margin: 0, fontWeight: 900 }}>Work Schedules</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
              {isManager 
                ? 'Assign and coordinate duty rosters and tasks for department personnel.' 
                : 'View your assigned shifts, duty rotations, and upcoming tasks.'}
            </p>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleExportPDF} 
              className="portal-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 700 }}
            >
              <i className="fas fa-print"></i> Export as PDF / Print
            </button>
            {isManager && (
              <button 
                onClick={() => setShowAssignModal(true)}
                className="portal-btn-primary"
                style={{ background: primaryColor, border: 'none', padding: '10px 20px', borderRadius: '12px', color: 'white', fontWeight: 700, boxShadow: `0 4px 12px ${primaryColor}33` }}
              >
                <i className="fas fa-plus mr-2"></i> Assign Shift
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: primaryColor }}></i>
            <p style={{ color: '#64748b', marginTop: '15px' }}>Loading schedule data...</p>
          </div>
        ) : (
          <div className="portal-card" style={{ 
            background: 'white', 
            borderRadius: '24px', 
            border: '1px solid #cbd5e130', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
            overflow: 'hidden'
          }}>
            {/* MANAGER VIEW */}
            {isManager ? (
              <div className="table-responsive">
                <table className="portal-table">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Day</th>
                      <th>Working Hours</th>
                      <th>Location</th>
                      <th>Primary Task</th>
                      <th className="no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No work schedules assigned yet.</td>
                      </tr>
                    ) : (
                      shifts.map(shift => (
                        <tr key={shift.id}>
                          <td style={{ fontWeight: 800, color: '#1e293b' }}>{shift.user?.name}</td>
                          <td>
                            <span className="status-badge" style={{ background: `${primaryColor}15`, color: primaryColor }}>
                              {shift.user?.dept?.name || 'General'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{daysOfWeek[shift.dayOfWeek]}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{shift.startTime} - {shift.endTime}</td>
                          <td style={{ color: '#475569', fontWeight: 600 }}>{shift.location || '-'}</td>
                          <td style={{ color: '#475569' }}>{shift.task}</td>
                          <td className="no-print">
                            <button 
                              onClick={() => handleDeleteShift(shift.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--portal-danger)', cursor: 'pointer', fontSize: '1rem' }}
                              title="Delete shift assignment"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* INDIVIDUAL VIEW */
              <div className="table-responsive">
                <table className="portal-table">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Day</th>
                      <th>Working Hours</th>
                      <th>Location</th>
                      <th>Assigned Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>You have no shifts assigned for this cycle.</td>
                      </tr>
                    ) : (
                      shifts.map(shift => (
                        <tr key={shift.id}>
                          <td style={{ fontWeight: 800, color: '#1e293b' }}>{daysOfWeek[shift.dayOfWeek]}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: primaryColor }}>{shift.startTime} - {shift.endTime}</td>
                          <td style={{ color: '#475569', fontWeight: 600 }}>{shift.location || 'Main Campus'}</td>
                          <td style={{ color: '#475569' }}>{shift.task}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPUP MODAL FOR ASSIGNING SHIFT */}
      {showAssignModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '95%', maxWidth: '500px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Assign Work Schedule</h3>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAssignShift}>
              <div className="space-y-4">
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Staff Member</label>
                  <select 
                    className="portal-select w-full" required
                    value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeProfile?.jobTitle || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Day of Week</label>
                  <select 
                    className="portal-select w-full"
                    value={formData.dayOfWeek} onChange={e => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={0}>Sunday</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Start Time</label>
                    <input 
                      type="text" className="portal-input w-full" required placeholder="e.g. 06:00"
                      value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>End Time</label>
                    <input 
                      type="text" className="portal-input w-full" required placeholder="e.g. 14:00"
                      value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Location</label>
                  <input 
                    type="text" className="portal-input w-full" placeholder="e.g. Gate 1, Hostel B"
                    value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Primary Task</label>
                  <input 
                    type="text" className="portal-input w-full" required placeholder="e.g. Monitoring gate access"
                    value={formData.task} onChange={e => setFormData({ ...formData, task: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Assign Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
