import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type BoardingTab = 'hostels' | 'rooms' | 'allocations';

interface Hostel {
  id: string;
  hostelName: string;
  type: string; // Boys, Girls, Mixed
  address?: string;
  intake: number;
  description?: string;
}

interface HostelRoom {
  id: string;
  roomNo: string;
  hostel?: { hostelName: string };
  roomType?: { roomType: string };
  noOfBeds: number;
  costPerBed: number;
}

export default function AdminBoarding() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: BoardingTab = (searchParams.get('tab') as BoardingTab) || 'hostels';

  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Modals
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [hostelForm, setHostelForm] = useState({
    hostelName: '',
    type: 'Boys',
    intake: 60,
    address: '',
    description: ''
  });

  const [assignForm, setAssignForm] = useState({
    studentId: '',
    hostelId: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'hostels') {
        const res = await api.get('/api/ancillary/hostels');
        setHostels(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'rooms') {
        const res = await api.get('/api/ancillary/hostel-rooms');
        setRooms(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'allocations') {
        const [sRes, hRes] = await Promise.all([
          api.get('/api/students'),
          api.get('/api/ancillary/hostels')
        ]);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
        setHostels(Array.isArray(hRes.data) ? hRes.data : []);
      }
    } catch (err) {
      console.error('Boarding data load error:', err);
      showToast('Failed to load boarding records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: BoardingTab) => {
    setSearchParams({ tab });
  };

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/ancillary/hostels', {
        ...hostelForm,
        intake: Number(hostelForm.intake)
      });
      showToast('Hostel registered successfully', 'success');
      setShowHostelModal(false);
      setHostelForm({ hostelName: '', type: 'Boys', intake: 60, address: '', description: '' });
      setHostels(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to create hostel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/ancillary/hostels/assign', assignForm);
      showToast('Student allocated to boarding hostel', 'success');
      setShowAssignModal(false);
      setAssignForm({ studentId: '', hostelId: '' });
      fetchData();
    } catch (err) {
      showToast('Failed to allocate student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-hotel" style={{ color: '#0284c7' }}></i>
            Boarding & Hostel Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Hostel dormitories, room capacity allocations, and boarder student residential records.
          </p>
        </div>
        <div>
          {activeTab === 'hostels' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowHostelModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus"></i> Add Hostel
            </button>
          )}
          {activeTab === 'allocations' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAssignModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-user-plus"></i> Allocate Student
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('hostels')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'hostels' ? 700 : 500,
            color: activeTab === 'hostels' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'hostels' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-building"></i>
          Hostels & Dormitories ({hostels.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('rooms')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'rooms' ? 700 : 500,
            color: activeTab === 'rooms' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'rooms' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-door-open"></i>
          Dorm Rooms ({rooms.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('allocations')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'allocations' ? 700 : 500,
            color: activeTab === 'allocations' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'allocations' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-bed"></i>
          Boarder Allocations
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading boarding records...</p>
        </div>
      ) : activeTab === 'hostels' ? (
        /* Hostels Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {hostels.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-hotel fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No hostels recorded</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Add school boarding houses above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Hostel Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Bed Capacity / Intake</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Location</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className="fas fa-building" style={{ color: '#0284c7', marginRight: 8 }}></i>
                      {h.hostelName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {h.type} Hostel
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {h.intake} Beds
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>
                      {h.address || 'Campus Quad'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {h.description || 'Residential boarding facility'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'rooms' ? (
        /* Rooms Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {rooms.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-door-open fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No dorm rooms recorded</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Configure rooms within your hostels.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Room No.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Hostel</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Room Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Bed Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      Room {r.roomNo}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {r.hostel?.hostelName || 'Main Hostel'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {r.roomType?.roomType || 'Standard Quad'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {r.noOfBeds || 4} Beds
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Allocations Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {students.filter(s => s.boardingStatus === 'Boarder').length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-user-friends fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No boarders allocated yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Click "Allocate Student" to assign a student to a hostel.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Class</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Assigned Hostel</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.filter(s => s.boardingStatus === 'Boarder').map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {s.firstName ? `${s.firstName} ${s.lastName}` : s.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>
                      {s.class?.name || s.studentId || 'Grade'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                      {s.hostel?.hostelName || 'Assigned House'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        Boarder Resident
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Hostel Modal */}
      {showHostelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Add Boarding Hostel</h3>
              <button type="button" onClick={() => setShowHostelModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleCreateHostel}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Hostel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandela House"
                  value={hostelForm.hostelName}
                  onChange={e => setHostelForm({ ...hostelForm, hostelName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gender / Type</label>
                  <select
                    value={hostelForm.type}
                    onChange={e => setHostelForm({ ...hostelForm, type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Boys">Boys Hostel</option>
                    <option value="Girls">Girls Hostel</option>
                    <option value="Mixed">Mixed Dormitory</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Intake Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={hostelForm.intake}
                    onChange={e => setHostelForm({ ...hostelForm, intake: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowHostelModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Register Hostel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Student Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Allocate Student to Boarding</h3>
              <button type="button" onClick={() => setShowAssignModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleAssignStudent}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Student *</label>
                <select
                  required
                  value={assignForm.studentId}
                  onChange={e => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName ? `${s.firstName} ${s.lastName}` : s.name} ({s.class?.name || s.studentId || 'Student'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Hostel *</label>
                <select
                  required
                  value={assignForm.hostelId}
                  onChange={e => setAssignForm({ ...assignForm, hostelId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.hostelName} ({h.type} - {h.intake} beds)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
