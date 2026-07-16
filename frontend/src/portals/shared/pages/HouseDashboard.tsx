import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface House {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  motto: string | null;
  points: number;
  houseMaster: { id: string; title: string; user: { name: string } } | null;
  houseCaptain: { id: string; name: string; studentId: string } | null;
}

interface Member {
  id: string;
  name: string;
  studentId: string;
  class: { name: string } | null;
}

export default function HouseDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  const canAssign = user?.role === 'SCHOOL_ADMIN' || 
                    user?.secondaryRoles?.includes('Sports Master') || 
                    user?.secondaryRoles?.includes('Sports Captain');

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/schools/houses');
      setHouses(res.data);
      if (res.data.length > 0) {
        // Decide default house
        let defaultHouse = res.data[0];
        if (user?.role === 'STUDENT' && user.student?.houseId) {
          const match = res.data.find((h: any) => h.id === user.student?.houseId);
          if (match) defaultHouse = match;
        } else if (user?.role === 'TEACHER') {
          const match = res.data.find((h: any) => h.houseMasterId === user.teacher?.id);
          if (match) defaultHouse = match;
        }
        setSelectedHouse(defaultHouse);
        fetchMembers(defaultHouse.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      showToast('Failed to load houses roster', 'error');
      setLoading(false);
    
    }
  };

  const fetchMembers = async (houseId: string) => {
    try {
      const res = await api.get(`/api/schools/houses/${houseId}/members`);
      setMembers(res.data);
    } catch (err) {
      showToast('Failed to load house members roster', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleHouseChange = (houseId: string) => {
    const house = houses.find(h => h.id === houseId);
    if (house) {
      setSelectedHouse(house);
      setLoading(true);
      fetchMembers(house.id);
    }
  };

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const res = await api.get('/api/students?limit=1000');
      setAllStudents(res.data.students || []);
    } catch (err) {
      showToast('Failed to load student roster', 'error');
    
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!selectedHouse) return;
    setAssigning(true);
    try {
      await api.post('/api/schools/houses/assign-student', {
        studentId,
        houseId: selectedHouse.id
      });
      showToast('Student assigned successfully!', 'success');
      // Reload member roster
      fetchMembers(selectedHouse.id);
      // Update local allStudents list
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, houseId: selectedHouse.id } : s));
    } catch (err) {
      showToast('Failed to assign student to house', 'error');
    
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    if (!selectedHouse) return;
    if (!(await toastConfirm('Are you sure you want to remove this student from the house?'))) return;
    setAssigning(true);
    try {
      await api.post('/api/schools/houses/assign-student', {
        studentId,
        houseId: null
      });
      showToast('Student removed from house.', 'success');
      fetchMembers(selectedHouse.id);
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, houseId: null } : s));
    } catch (err) {
      showToast('Failed to remove student from house', 'error');
    
    } finally {
      setAssigning(false);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const nameMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || idMatch;
  });

  const primaryColor = 'var(--school-primary, #0056b3)';
  const houseColor = selectedHouse?.color || '#475569';

  if (loading && houses.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '12px', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
        <span>Loading House Management...</span>
      </div>
    );
  }

  if (houses.length === 0) {
    return (
      <div className="portal-alert warning" style={{ margin: '30px' }}>
        <i className="fas fa-info-circle"></i> No houses are registered in the system yet. Admins can create them on the House Management side.
      </div>
    );
  }

  const logoUrl = selectedHouse?.logo ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${selectedHouse.logo}` : null;

  return (
    <div className="house-portal-wrapper" style={{ padding: '30px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Selector and Header */}
      <div className="portal-page-header" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ 
            width: 70, height: 70, borderRadius: '16px', 
            background: houseColor, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
            boxShadow: `0 10px 20px ${houseColor}33`, overflow: 'hidden'
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt={selectedHouse?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <i className="fas fa-home"></i>
            )}
          </div>
          <div>
            <h1 style={{ color: '#1e293b', fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
              {selectedHouse?.name} Command
            </h1>
            {selectedHouse?.motto && (
              <p style={{ color: houseColor, fontSize: '1.05rem', fontWeight: 600, margin: '4px 0 0 0' }}>
                "{selectedHouse.motto}"
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>Select House:</label>
          <select 
            className="portal-input"
            style={{ width: '200px', fontWeight: 700, color: '#1e293b' }}
            value={selectedHouse?.id || ''}
            onChange={e => handleHouseChange(e.target.value)}
          >
            {houses.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {[
          { label: 'Total Members', value: members.length, icon: 'fa-users', color: houseColor },
          { label: 'House Master', value: selectedHouse?.houseMaster ? `${selectedHouse.houseMaster.title} ${selectedHouse.houseMaster.user?.name}` : 'Not Assigned', icon: 'fa-user-tie', color: '#475569' },
          { label: 'House Captain', value: selectedHouse?.houseCaptain ? selectedHouse.houseCaptain.name : 'Not Assigned', icon: 'fa-user-graduate', color: '#475569' },
          { label: 'Points', value: `${selectedHouse?.points || 0} pts`, icon: 'fa-star', color: '#eab308' }
        ].map((stat, i) => (
          <div key={i} className="portal-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{stat.label}</span>
              <i className={`fas ${stat.icon}`} style={{ color: stat.color, fontSize: '1.2rem', opacity: 0.8 }}></i>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Roster & Members Table */}
      <div className="portal-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '24px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
            <i className="fas fa-list mr-2" style={{ color: houseColor }}></i> House Roster
          </h2>
          {canAssign && (
            <button 
              onClick={handleOpenAssignModal}
              className="portal-btn-primary"
              style={{ background: primaryColor, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-user-plus"></i> Assign Student
            </button>
          )}
        </div>
        
        <div style={{ padding: '20px' }}>
          <table className="portal-table">
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Grade / Class</th>
                <th>House Role</th>
                {canAssign && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canAssign ? 5 : 4} style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Loading roster...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={canAssign ? 5 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                    No students currently assigned to this house.
                  </td>
                </tr>
              ) : (
                members.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{member.name}</td>
                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{member.studentId}</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{member.class?.name || 'Unassigned'}</td>
                    <td>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        background: member.id === selectedHouse?.houseCaptain?.id ? '#fef3c7' : '#f1f5f9',
                        color: member.id === selectedHouse?.houseCaptain?.id ? '#d97706' : '#475569'
                      }}>
                        {member.id === selectedHouse?.houseCaptain?.id ? 'House Captain' : 'Member'}
                      </span>
                    </td>
                    {canAssign && (
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleUnassignStudent(member.id)}
                          className="portal-btn-action delete"
                          title="Remove from House"
                        >
                          <i className="fas fa-user-minus"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px' }}>
            <div className="portal-modal-header">
              <h3><i className="fas fa-user-plus mr-2" style={{ color: primaryColor }}></i> Assign Student to {selectedHouse?.name}</h3>
              <button onClick={() => setShowAssignModal(false)} className="portal-btn-ghost" style={{ padding: 6, minWidth: 'auto' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 15 }}>
                <input 
                  type="text" 
                  className="portal-input"
                  placeholder="Search students by name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <table className="portal-table">
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Current House</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        No students match search query.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const currentHouse = houses.find(h => h.id === student.houseId);
                      const isSelfHouse = student.houseId === selectedHouse?.id;
                      return (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 600 }}>{student.name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{student.studentId}</td>
                          <td>
                            {currentHouse ? (
                              <span style={{ color: currentHouse.color || '#475569', fontWeight: 600 }}>{currentHouse.name}</span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>None</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isSelfHouse ? (
                              <button className="portal-btn-neutral" disabled style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                                Assigned
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAssignStudent(student.id)}
                                className="portal-btn-primary"
                                style={{ background: primaryColor, padding: '4px 10px', fontSize: '0.8rem' }}
                                disabled={assigning}
                              >
                                Assign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
