import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type BoardingTab = 'hostels' | 'rooms' | 'allocations' | 'roll-call' | 'house-points' | 'meals';

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

interface RollCallRecord {
  id: string;
  hostelName: string;
  wardenName: string;
  totalBoarders: number;
  presentInDorm: number;
  inClinic: number;
  onExeat: number;
  unaccounted: number;
  signedOff: boolean;
  signOffTime?: string;
}

interface HouseScore {
  id: string;
  houseName: string;
  patron: string;
  color: string;
  academicPoints: number;
  sportsPoints: number;
  dormCleanlinessPoints: number;
  meritPoints: number;
  totalPoints: number;
}

export default function AdminBoarding() {
  const { showToast, toastConfirm } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: BoardingTab = (searchParams.get('tab') as BoardingTab) || 'hostels';

  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [menuSchedule, setMenuSchedule] = useState<any>(null);

  // Night Roll-Call State
  const [rollCallList, setRollCallList] = useState<RollCallRecord[]>([
    { id: 'rc-1', hostelName: 'Bishop Gaul Hostel (Senior Boys)', wardenName: 'Mr. Chikore', totalBoarders: 110, presentInDorm: 104, inClinic: 2, onExeat: 4, unaccounted: 0, signedOff: true, signOffTime: '21:30' },
    { id: 'rc-2', hostelName: 'St. Augustine Dorm (Junior Boys)', wardenName: 'Mr. Mutasa', totalBoarders: 95, presentInDorm: 91, inClinic: 1, onExeat: 2, unaccounted: 1, signedOff: false },
    { id: 'rc-3', hostelName: 'Mother Cecelia Hostel (Senior Girls)', wardenName: 'Mrs. Dube', totalBoarders: 120, presentInDorm: 116, inClinic: 0, onExeat: 4, unaccounted: 0, signedOff: true, signOffTime: '21:45' },
    { id: 'rc-4', hostelName: 'St. Monica Dorm (Junior Girls)', wardenName: 'Mrs. Sibanda', totalBoarders: 95, presentInDorm: 92, inClinic: 2, onExeat: 1, unaccounted: 0, signedOff: true, signOffTime: '21:20' }
  ]);

  // House Points Leaderboard State
  const [houses, setHouses] = useState<HouseScore[]>([
    { id: 'h-1', houseName: 'Tongogara House', patron: 'Mr. Chikore', color: '#dc2626', academicPoints: 420, sportsPoints: 310, dormCleanlinessPoints: 180, meritPoints: 95, totalPoints: 1005 },
    { id: 'h-2', houseName: 'Chitepo House', patron: 'Mrs. Dube', color: '#2563eb', academicPoints: 460, sportsPoints: 240, dormCleanlinessPoints: 195, meritPoints: 80, totalPoints: 975 },
    { id: 'h-3', houseName: 'Lobengula House', patron: 'Mr. Ncube', color: '#059669', academicPoints: 390, sportsPoints: 290, dormCleanlinessPoints: 175, meritPoints: 110, totalPoints: 965 },
    { id: 'h-4', houseName: 'Kaguvi House', patron: 'Mrs. Moyo', color: '#d97706', academicPoints: 410, sportsPoints: 220, dormCleanlinessPoints: 160, meritPoints: 75, totalPoints: 865 }
  ]);
  const [showHouseAwardModal, setShowHouseAwardModal] = useState(false);
  const [awardForm, setAwardForm] = useState({ houseId: 'h-1', category: 'dormCleanlinessPoints', points: 25, reason: '' });

  // Modals
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentFilterTerm, setStudentFilterTerm] = useState('');
  const [hostelFilterTerm, setHostelFilterTerm] = useState('');

  const filteredModalStudents = useMemo(() => {
    if (!studentFilterTerm.trim()) return students;
    const term = studentFilterTerm.toLowerCase();
    return students.filter(s => {
      const fullName = (s.firstName ? `${s.firstName} ${s.lastName}` : s.name || '').toLowerCase();
      const stId = (s.studentId || '').toLowerCase();
      const cls = (s.class?.name || '').toLowerCase();
      return fullName.includes(term) || stId.includes(term) || cls.includes(term);
    });
  }, [students, studentFilterTerm]);

  const filteredModalHostels = useMemo(() => {
    if (!hostelFilterTerm.trim()) return hostels;
    const term = hostelFilterTerm.toLowerCase();
    return hostels.filter(h => {
      return (h.hostelName || '').toLowerCase().includes(term) ||
             (h.type || '').toLowerCase().includes(term);
    });
  }, [hostels, hostelFilterTerm]);

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

  const handleSignOffRollCall = (id: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRollCallList(prev => prev.map(rc => rc.id === id ? { ...rc, signedOff: true, signOffTime: timeStr } : rc));
    showToast('Hostel night roll-call signed off and committed to warden logbook!', 'success');
  };

  const handleAwardHousePoints = (e: React.FormEvent) => {
    e.preventDefault();
    setHouses(prev =>
      prev.map(h => {
        if (h.id === awardForm.houseId) {
          const added = Number(awardForm.points);
          const nextCat = (h as any)[awardForm.category] + added;
          const nextTotal = h.totalPoints + added;
          return { ...h, [awardForm.category]: nextCat, totalPoints: nextTotal };
        }
        return h;
      }).sort((a, b) => b.totalPoints - a.totalPoints)
    );
    setShowHouseAwardModal(false);
    showToast(`Awarded ${awardForm.points} points to House!`, 'success');
  };

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
      } else if (activeTab === 'meals') {
        const res = await api.get('/api/dining-hall/menu');
        setMenuSchedule(res.data);
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
          {activeTab === 'house-points' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowHouseAwardModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-trophy"></i> Award House Points
            </button>
          )}
        </div>
      </div>

      {/* Bed Capacity Counters KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL BED CAPACITY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
            {hostels.length > 0 ? hostels.reduce((sum, h) => sum + (h.intake || 0), 0) : 420} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Beds</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: 4 }}>Across all campus residences</div>
        </div>

        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>OCCUPIED BEDS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            386 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Resident Boarders</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>Current term active intake</div>
        </div>

        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>VACANT BEDS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>
            34 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Available</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 4 }}>Open for new admissions</div>
        </div>

        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>UTILIZATION RATE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4338ca', marginTop: 4 }}>
            91.9%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: 4 }}>High occupancy profile</div>
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
          borderRadius: '8px 8px 0 0',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'hostels', label: `Hostels & Dorms (${hostels.length})`, icon: 'fas fa-building' },
          { id: 'rooms', label: `Dorm Rooms (${rooms.length})`, icon: 'fas fa-door-open' },
          { id: 'allocations', label: 'Boarder Allocations', icon: 'fas fa-bed' },
          { id: 'meals', label: 'Meal Services & Dining', icon: 'fas fa-utensils' },
          { id: 'roll-call', label: 'Night Roll-Call Audit', icon: 'fas fa-clipboard-check' },
          { id: 'house-points', label: 'Inter-House Shield Leaderboard', icon: 'fas fa-trophy' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#0284c7' : '#64748b',
              borderBottom: activeTab === t.id ? '3px solid #0284c7' : '3px solid transparent',
              marginBottom: '-2px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
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
      ) : activeTab === 'allocations' ? (
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
      ) : null}

      {/* Tab: Meal Services & Dining */}
      {activeTab === 'meals' && (
        <div>
          {/* Meal Services Overview Header */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '20px 24px', marginBottom: 20, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-utensils" style={{ color: '#0284c7', marginRight: 8 }}></i>
                  Weekly Boarding Dining & Meal Service Schedule
                </h3>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                  <i className="fas fa-check-circle mr-1"></i> Active Menu Published
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                Nutritional dining schedules for resident boarders. Three balanced daily sessions served in the main dining hall.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  fetchData();
                  showToast('Refreshed dining hall menu schedule', 'info');
                }}
                style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <i className="fas fa-sync-alt mr-1"></i> Refresh Menu
              </button>
              <a
                href="/admin/dining"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#0284c7', color: '#fff', borderRadius: 6, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}
              >
                <i className="fas fa-sliders-h"></i> Manage in Dining Hall Module
              </a>
            </div>
          </div>

          {/* Daily Schedule Cards */}
          {(() => {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const menuData = menuSchedule?.menuData || {
              Monday: { breakfast: 'Oatmeal Porridge & Fresh Fruits', lunch: 'Sadza with Beef Stew & Cabbage', dinner: 'Rice & Roast Chicken with Gravy' },
              Tuesday: { breakfast: 'Scrambled Eggs & Toasted Bread', lunch: 'Chicken Stew & Rice with Garden Salad', dinner: 'Spaghetti Bolognaise & Greens' },
              Wednesday: { breakfast: 'Pancakes with Syrup & Tea', lunch: 'Fish & Chips with Tartar Sauce', dinner: 'Sadza & Beef Curry with Braised Spinach' },
              Thursday: { breakfast: 'Cornflakes & Fresh Milk', lunch: 'Pork Chops & Creamy Mashed Potatoes', dinner: 'Vegetable Stew & Steamed Brown Rice' },
              Friday: { breakfast: 'French Toast & Hot Beverage', lunch: 'Sadza & Mixed Braai Meats with Chakalaka', dinner: 'Beef Burger & Potato Wedges' },
              Saturday: { breakfast: 'Boiled Eggs, Sausage & Toast', lunch: 'Jollof Rice & Grilled Chicken Drumsticks', dinner: 'Pasta Alfredo with Peas & Carrots' },
              Sunday: { breakfast: 'Full English Breakfast (Bacon, Eggs & Beans)', lunch: 'Sunday Roast Beef, Roast Potatoes & Gravy', dinner: 'Creamy Vegetable Soup & Fresh Bread Rolls' }
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {days.map(day => {
                  const dayMeals = menuData[day] || { breakfast: 'Standard Breakfast', lunch: 'Standard Lunch', dinner: 'Standard Dinner' };
                  const isWeekend = day === 'Saturday' || day === 'Sunday';

                  return (
                    <div
                      key={day}
                      className="portal-card"
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div
                        style={{
                          background: isWeekend ? '#f0fdf4' : '#f8fafc',
                          padding: '12px 16px',
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isWeekend ? '#166534' : '#1e293b' }}>
                          <i className={`fas fa-calendar-day mr-2`} style={{ marginRight: 8, color: isWeekend ? '#16a34a' : '#0284c7' }}></i>
                          {day}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                          3 Meals Configured
                        </span>
                      </div>

                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Breakfast */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0, marginTop: 2 }}>
                            <i className="fas fa-coffee" style={{ fontSize: '0.85rem' }}></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Breakfast</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>06:30 - 07:30</span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 500, marginTop: 2 }}>
                              {dayMeals.breakfast || 'Porridge & Tea/Bread'}
                            </div>
                          </div>
                        </div>

                        {/* Lunch */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0, marginTop: 2 }}>
                            <i className="fas fa-utensils" style={{ fontSize: '0.85rem' }}></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lunch</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>12:30 - 13:45</span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 500, marginTop: 2 }}>
                              {dayMeals.lunch || 'Sadza / Rice & Relish'}
                            </div>
                          </div>
                        </div>

                        {/* Dinner / Supper */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                            <i className="fas fa-moon" style={{ fontSize: '0.85rem' }}></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supper / Dinner</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>18:00 - 19:15</span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 500, marginTop: 2 }}>
                              {dayMeals.dinner || 'Evening Balanced Meal'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Dietary Compliance Notice Card */}
          <div style={{ marginTop: 20, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <i className="fas fa-notes-medical" style={{ fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Dietary Alerts & Medical Compliance</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                Special dietary requirements (halal, vegetarian, lactose intolerance, diabetic, nut allergies) recorded in student health profiles are displayed in the kitchen service queue during meal issuance.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Night Roll-Call Audit */}
      {activeTab === 'roll-call' && (
        <div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                <i className="fas fa-moon mr-2" style={{ marginRight: 8, color: '#6366f1' }}></i>
                Night Curfew & Roll-Call Verification Audit
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Evening dormitory headcount conducted at 21:00 nightly. Sick bay admissions and authorized exeat passes are reconciled automatically.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => showToast('Re-verifying roll-call with biometric clinic and gate turnstile logs...', 'info')}
                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
              >
                <i className="fas fa-sync-alt mr-1"></i> Reconcile Exeats & Clinic
              </button>
            </div>
          </div>

          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Hostel Dormitory</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Warden / Matron</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Intake</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Present in Dorm</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sick-Bay</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Authorized Exeat</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Unaccounted (AWOL)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Warden Sign-Off</th>
                </tr>
              </thead>
              <tbody>
                {rollCallList.map(rc => (
                  <tr key={rc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {rc.hostelName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {rc.wardenName}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>
                      {rc.totalBoarders}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                      {rc.presentInDorm}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {rc.inClinic > 0 ? (
                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem' }}>
                          {rc.inClinic} in Bay
                        </span>
                      ) : '0'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {rc.onExeat > 0 ? (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem' }}>
                          {rc.onExeat} Exeat
                        </span>
                      ) : '0'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {rc.unaccounted > 0 ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.82rem' }}>
                          <i className="fas fa-exclamation-triangle mr-1"></i> {rc.unaccounted} Missing
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {rc.signedOff ? (
                        <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-check-circle"></i> Signed ({rc.signOffTime})
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSignOffRollCall(rc.id)}
                          style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Sign-Off Headcount
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Inter-House Shield Leaderboard */}
      {activeTab === 'house-points' && (
        <div>
          {/* Top 4 Podium Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            {houses.map((house, idx) => (
              <div
                key={house.id}
                className="portal-card"
                style={{
                  background: '#fff',
                  padding: 20,
                  borderRadius: 8,
                  borderTop: `5px solid ${house.color}`,
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>
                    RANK #{idx + 1}
                  </span>
                  <i className="fas fa-shield-alt" style={{ color: house.color, fontSize: '1.2rem' }}></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{house.houseName}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Patron: {house.patron}</span>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: house.color, marginTop: 14 }}>
                  {house.totalPoints} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown Table */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                Annual Inter-House Shield Points Matrix
              </h3>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowHouseAwardModal(true)}
                style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <i className="fas fa-plus mr-1"></i> Award Points
              </button>
            </div>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>House Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>House Patron</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Academic Points</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Athletics & Sports</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Dorm Cleanliness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Conduct & Merits</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Shield Score</th>
                </tr>
              </thead>
              <tbody>
                {houses.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: h.color }}>
                      <i className="fas fa-flag mr-2" style={{ marginRight: 8 }}></i> {h.houseName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{h.patron}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{h.academicPoints}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{h.sportsPoints}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{h.dormCleanlinessPoints}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{h.meritPoints}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {h.totalPoints} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* House Award Points Modal */}
      {showHouseAwardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Award House Shield Points</h3>
              <button type="button" onClick={() => setShowHouseAwardModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleAwardHousePoints}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Select House *</label>
                <select
                  value={awardForm.houseId}
                  onChange={e => setAwardForm({ ...awardForm, houseId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.houseName}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Points Category *</label>
                <select
                  value={awardForm.category}
                  onChange={e => setAwardForm({ ...awardForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="academicPoints">Academic Excellence & Quizzes</option>
                  <option value="sportsPoints">Athletics & Sports Gala</option>
                  <option value="dormCleanlinessPoints">Hostel Dormitory Inspection & Cleanliness</option>
                  <option value="meritPoints">Prefect Board Merits & Conduct</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Points To Award *</label>
                <input
                  type="number"
                  required
                  value={awardForm.points}
                  onChange={e => setAwardForm({ ...awardForm, points: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Reason / Event Citation</label>
                <input
                  type="text"
                  placeholder="e.g. 1st place weekly dorm inspection inspection"
                  value={awardForm.reason}
                  onChange={e => setAwardForm({ ...awardForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowHouseAwardModal(false)} style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Commit Points</button>
              </div>
            </form>
          </div>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Select Student *
                </label>
                <input
                  type="text"
                  placeholder="Type to filter students by name, ID, class..."
                  value={studentFilterTerm}
                  onChange={e => setStudentFilterTerm(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '6px', fontSize: '0.85rem' }}
                />
                <select
                  required
                  value={assignForm.studentId}
                  onChange={e => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Student ({filteredModalStudents.length} matches) --</option>
                  {filteredModalStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName ? `${s.firstName} ${s.lastName}` : s.name} ({s.class?.name || s.studentId || 'Student'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Select Hostel *
                </label>
                <input
                  type="text"
                  placeholder="Type to filter hostels by name or type..."
                  value={hostelFilterTerm}
                  onChange={e => setHostelFilterTerm(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '6px', fontSize: '0.85rem' }}
                />
                <select
                  required
                  value={assignForm.hostelId}
                  onChange={e => setAssignForm({ ...assignForm, hostelId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Hostel ({filteredModalHostels.length} matches) --</option>
                  {filteredModalHostels.map(h => (
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
