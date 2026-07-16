import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import ProcurementUI from '../../../components/portals/shared/ProcurementUI';
import '../../../styles/portal.css';

interface SportsEvent {
  id: string;
  title: string;
  date: string;
  opponent: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  rosterCount: number;
}

interface SportsCoach {
  userId: string;
  name: string;
  ageGroup?: string;
}

const COMMON_AGE_GROUPS = [
  "Under 13",
  "Under 14",
  "Under 15",
  "Under 16",
  "Under 17",
  "Under 18",
  "Under 20",
  "Open"
];

export default function SportsManagement() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SCHOOL_ADMIN';

  const [activeTab, setActiveTab] = useState<'teams' | 'inventory' | 'requisitions' | 'houses'>('teams');

  // --- Roster States ---
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // --- Sports States ---
  const [sports, setSports] = useState<any[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [showSportModal, setShowSportModal] = useState(false);
  const [savingSport, setSavingSport] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  // Sport Form State
  const [sportForm, setSportForm] = useState({
    name: '',
    description: '',
    category: 'Team Sport',
    sportMasterId: '',
    customAgeGroups: ''
  });
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedCaptains, setSelectedCaptains] = useState<string[]>([]); // array of student user IDs
  const [sportCoaches, setSportCoaches] = useState<SportsCoach[]>([]); // array of coaches
  const [sportLogoFile, setSportLogoFile] = useState<File | null>(null);
  const [sportLogoPreview, setSportLogoPreview] = useState<string | null>(null);

  // --- Houses States ---
  const [houses, setHouses] = useState<any[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [savingHouse, setSavingHouse] = useState(false);
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);

  // House Form State
  const [houseForm, setHouseForm] = useState({
    name: '',
    description: '',
    houseMasterId: '',
    houseCaptainId: ''
  });
  const [houseLogoFile, setHouseLogoFile] = useState<File | null>(null);
  const [houseLogoPreview, setHouseLogoPreview] = useState<string | null>(null);

  // --- Equipment States ---
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);

  // Equipment Form State
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    sportId: '',
    quantity: 0,
    condition: 'GOOD',
    custodianId: ''
  });

  // Load All initial data
  useEffect(() => {
    fetchSports();
    fetchHouses();
    fetchEquipments();
    if (isAdmin) {
      fetchRosters();
    }
  }, [isAdmin]);

  // --- Rosters API ---
  const fetchRosters = async () => {
    try {
      setLoadingRoster(true);
      const [tRes, sRes] = await Promise.all([
        api.get('/api/teachers'),
        api.get('/api/students?limit=1000')
      ]);
      setTeachers(tRes.data.teachers || []);
      setStudents(sRes.data.students || []);
    } catch (err) {
      console.error('Failed to load roster listings:', err);
    
    } finally {
      setLoadingRoster(false);
    }
  };

  // --- Sports APIs ---
  const fetchSports = async () => {
    try {
      setLoadingSports(true);
      const res = await api.get('/api/schools/sports-list');
      setSports(res.data);
    } catch (err) {
      showToast('Failed to load sports list', 'error');
    
    } finally {
      setLoadingSports(false);
    }
  };

  const handleOpenAddSportModal = () => {
    setSportForm({
      name: '',
      description: '',
      category: 'Team Sport',
      sportMasterId: '',
      customAgeGroups: ''
    });
    setSelectedAgeGroups([]);
    setSelectedCaptains([]);
    setSportCoaches([]);
    setEditingSportId(null);
    setSportLogoFile(null);
    setSportLogoPreview(null);
    setShowSportModal(true);
  };

  const handleOpenEditSportModal = (sport: any) => {
    const predefined = COMMON_AGE_GROUPS.filter(g => sport.ageGroups?.includes(g));
    const custom = (sport.ageGroups || []).filter((g: string) => !predefined.includes(g)).join(', ');

    setSportForm({
      name: sport.name,
      description: sport.description || '',
      category: sport.category || 'Team Sport',
      sportMasterId: sport.sportMasterId || '',
      customAgeGroups: custom
    });
    setSelectedAgeGroups(predefined);
    setSelectedCaptains(sport.captains || []);
    setSportCoaches(sport.coaches || []);
    setEditingSportId(sport.id);
    setSportLogoFile(null);
    setSportLogoPreview(sport.icon ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${sport.icon}` : null);
    setShowSportModal(true);
  };

  const handleSportLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSportLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSportLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAgeGroupToggle = (group: string) => {
    setSelectedAgeGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const handleCaptainToggle = (studentUserId: string) => {
    setSelectedCaptains(prev =>
      prev.includes(studentUserId) ? prev.filter(id => id !== studentUserId) : [...prev, studentUserId]
    );
  };

  const handleAddCoachRow = () => {
    setSportCoaches(prev => [...prev, { userId: '', name: '', ageGroup: '' }]);
  };

  const handleRemoveCoachRow = (index: number) => {
    setSportCoaches(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCoachRowChange = (index: number, field: keyof SportsCoach, val: string) => {
    setSportCoaches(prev => prev.map((coach, idx) => {
      if (idx !== index) return coach;
      if (field === 'userId') {
        const foundTeacher = teachers.find(t => t.userId === val || t.id === val);
        const name = foundTeacher ? `${foundTeacher.title || ''} ${foundTeacher.user?.name || ''}`.trim() : '';
        return { ...coach, userId: val, name };
      }
      return { ...coach, [field]: val };
    }));
  };

  const handleSportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportForm.name) {
      showToast('Sport Name is required', 'warning');
      return;
    }
    setSavingSport(true);

    const customAgeGroupsArray = sportForm.customAgeGroups
      ? sportForm.customAgeGroups.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const allAgeGroups = [...selectedAgeGroups, ...customAgeGroupsArray];

    // Compute names for legacy compatibility
    const foundMaster = teachers.find(t => t.userId === sportForm.sportMasterId || t.id === sportForm.sportMasterId);
    const sportMasterName = foundMaster ? `${foundMaster.title || ''} ${foundMaster.user?.name || ''}`.trim() : '';

    const captainNames = selectedCaptains.map(id => {
      const student = students.find(s => s.userId === id || s.id === id);
      return student ? student.name : '';
    }).filter(Boolean);

    const coachNames = sportCoaches.map(c => c.name + (c.ageGroup ? ` (${c.ageGroup})` : '')).filter(Boolean);

    const submitData = new FormData();
    submitData.append('name', sportForm.name);
    submitData.append('description', sportForm.description);
    submitData.append('category', sportForm.category);
    submitData.append('sportMasterId', sportForm.sportMasterId);
    submitData.append('sportMaster', sportMasterName);
    submitData.append('captains', JSON.stringify(selectedCaptains));
    submitData.append('captain', captainNames.join(', '));
    submitData.append('coaches', JSON.stringify(sportCoaches.filter(c => c.userId)));
    submitData.append('coach', coachNames.join(', '));
    submitData.append('ageGroups', JSON.stringify(allAgeGroups));
    if (sportLogoFile) {
      submitData.append('logo', sportLogoFile);
    }

    try {
      if (editingSportId) {
        await api.patch(`/api/schools/sports-list/${editingSportId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Sport updated successfully', 'success');
      } else {
        await api.post('/api/schools/sports-list', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Sport registered successfully', 'success');
      }
      setShowSportModal(false);
      fetchSports();
      fetchEquipments(); // refresh custodian sync lists
    } catch (err) {
      showToast('Failed to save sport', 'error');
    
    } finally {
      setSavingSport(false);
    }
  };

  const handleSportDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sport?')) return;
    try {
      await api.delete(`/api/schools/sports-list/${id}`);
      showToast('Sport deleted', 'success');
      fetchSports();
    } catch (err) {
      showToast('Failed to delete sport', 'error');
    
    }
  };


  // --- Houses APIs ---
  const fetchHouses = async () => {
    try {
      setLoadingHouses(true);
      const res = await api.get('/api/schools/houses');
      setHouses(res.data);
    } catch (err) {
      showToast(`Failed to load ${t('houses').toLowerCase()
    }`, 'error');
    } finally {
      setLoadingHouses(false);
    }
  };

  const handleOpenAddHouseModal = () => {
    setHouseForm({ name: '', description: '', houseMasterId: '', houseCaptainId: '' });
    setEditingHouseId(null);
    setHouseLogoFile(null);
    setHouseLogoPreview(null);
    setShowHouseModal(true);
  };

  const handleOpenEditHouseModal = (house: any) => {
    setHouseForm({
      name: house.name,
      description: house.description || '',
      houseMasterId: house.houseMasterId || '',
      houseCaptainId: house.houseCaptainId || ''
    });
    setEditingHouseId(house.id);
    setHouseLogoFile(null);
    setHouseLogoPreview(house.logo ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${house.logo}` : null);
    setShowHouseModal(true);
  };

  const handleHouseLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHouseLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHouseLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseForm.name) return;
    setSavingHouse(true);

    const submitData = new FormData();
    submitData.append('name', houseForm.name);
    submitData.append('description', houseForm.description);
    submitData.append('houseMasterId', houseForm.houseMasterId);
    submitData.append('houseCaptainId', houseForm.houseCaptainId);
    if (houseLogoFile) {
      submitData.append('logo', houseLogoFile);
    }

    try {
      if (editingHouseId) {
        await api.patch(`/api/schools/houses/${editingHouseId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('house')} updated successfully`, 'success');
      } else {
        await api.post('/api/schools/houses', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(`${t('house')} created successfully`, 'success');
      }
      setShowHouseModal(false);
      fetchHouses();
    } catch (err) {
      showToast(`Failed to save ${t('house').toLowerCase()
    }`, 'error');
    } finally {
      setSavingHouse(false);
    }
  };

  const handleHouseDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${t('house').toLowerCase()}?`)) return;
    try {
      await api.delete(`/api/schools/houses/${id}`);
      showToast(`${t('house')} deleted`, 'success');
      fetchHouses();
    } catch (err) {
      showToast(`Failed to delete ${t('house').toLowerCase()
    }`, 'error');
    }
  };


  // --- Sporting Equipment APIs ---
  const fetchEquipments = async () => {
    try {
      setLoadingEquipments(true);
      const res = await api.get('/api/schools/sports-equipment');
      setEquipments(res.data);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    
    } finally {
      setLoadingEquipments(false);
    }
  };

  const handleOpenAddEquipmentModal = () => {
    setEquipmentForm({
      name: '',
      sportId: '',
      quantity: 0,
      condition: 'GOOD',
      custodianId: ''
    });
    setEditingEquipmentId(null);
    setShowEquipmentModal(true);
  };

  const handleOpenEditEquipmentModal = (item: any) => {
    setEquipmentForm({
      name: item.name,
      sportId: item.sportId || '',
      quantity: item.quantity,
      condition: item.condition,
      custodianId: item.custodianId || ''
    });
    setEditingEquipmentId(item.id);
    setShowEquipmentModal(true);
  };

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForm.name) {
      showToast('Item Name is required', 'warning');
      return;
    }
    setSavingEquipment(true);
    try {
      if (editingEquipmentId) {
        await api.patch(`/api/schools/sports-equipment/${editingEquipmentId}`, equipmentForm);
        showToast('Equipment updated successfully', 'success');
      } else {
        await api.post('/api/schools/sports-equipment', equipmentForm);
        showToast('Equipment registered successfully', 'success');
      }
      setShowEquipmentModal(false);
      fetchEquipments();
    } catch (err) {
      showToast('Failed to save equipment', 'error');
    
    } finally {
      setSavingEquipment(false);
    }
  };

  const handleEquipmentDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await api.delete(`/api/schools/sports-equipment/${id}`);
      showToast('Equipment deleted', 'success');
      fetchEquipments();
    } catch (err) {
      showToast('Failed to delete equipment', 'error');
    
    }
  };

  // Helper: Get list of custodians synced with the selected sport's roster
  const getEligibleCustodians = () => {
    if (!equipmentForm.sportId) return [];
    const sport = sports.find(s => s.id === equipmentForm.sportId);
    if (!sport) return [];

    const list: Array<{ userId: string; name: string; role: string }> = [];

    // 1. Sport Master
    if (sport.sportMasterId) {
      const teacher = teachers.find(t => t.userId === sport.sportMasterId || t.id === sport.sportMasterId);
      list.push({
        userId: sport.sportMasterId,
        name: teacher ? `${teacher.title || ''} ${teacher.user?.name || ''}`.trim() : sport.sportMaster,
        role: 'Sport Master'
      });
    }

    // 2. Captains
    if (sport.captains && sport.captains.length > 0) {
      sport.captains.forEach((capId: string) => {
        const student = students.find(s => s.userId === capId || s.id === capId);
        list.push({
          userId: capId,
          name: student ? student.name : `Captain (ID: ${capId})`,
          role: 'Captain'
        });
      });
    }

    // 3. Coaches
    if (sport.coaches && sport.coaches.length > 0) {
      sport.coaches.forEach((coach: SportsCoach) => {
        if (coach.userId) {
          list.push({
            userId: coach.userId,
            name: coach.name,
            role: `Coach${coach.ageGroup ? ` (${coach.ageGroup})` : ''}`
          });
        }
      });
    }

    return list;
  };

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-running mr-2"></i> Sports &amp; Athletics Hub</h1>
          <p>Coordinate school teams, assign masters, manage captains, and register sports.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '2rem', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
        <button
          className={activeTab === 'teams' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          onClick={() => setActiveTab('teams')}
          style={{ minWidth: '160px' }}
        >
          <i className="fas fa-users mr-2"></i> Sports Teams
        </button>
        <button
          className={activeTab === 'houses' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          onClick={() => setActiveTab('houses')}
          style={{ minWidth: '160px' }}
        >
          <i className="fas fa-home mr-2"></i> Houses
        </button>
        <button
          className={activeTab === 'inventory' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          onClick={() => setActiveTab('inventory')}
          style={{ minWidth: '160px' }}
        >
          <i className="fas fa-boxes mr-2"></i> Equipment
        </button>
        <button
          className={activeTab === 'requisitions' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          onClick={() => setActiveTab('requisitions')}
          style={{ minWidth: '160px' }}
        >
          <i className="fas fa-file-invoice mr-2"></i> Requisitions
        </button>
      </div>

      {/* ── TAB 1: SPORTS TEAMS ── */}
      {activeTab === 'teams' && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div className="portal-card animate-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><i className="fas fa-list mr-2"></i> Registered School Sports</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="portal-badge" style={{ background: 'var(--portal-primary)', color: 'white' }}>{sports.length} Active</div>
                {isAdmin && (
                  <button
                    className="portal-btn-primary"
                    onClick={handleOpenAddSportModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-plus"></i> Register Sport
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {loadingSports ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading school sports...
                </div>
              ) : sports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No sports registered yet. {isAdmin && "Click 'Register Sport' to add one."}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {sports.map(sport => {
                    const logoUrl = sport.icon ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${sport.icon}` : null;
                    return (
                      <div key={sport.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                        <div style={{ padding: '20px', flex: 1 }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{
                              width: '56px', height: '56px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1'
                            }}>
                              {logoUrl ? (
                                <img src={logoUrl} alt={sport.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <i className="fas fa-running" style={{ color: '#94a3b8', fontSize: '1.5rem' }}></i>
                              )}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--portal-primary)' }}>{sport.name}</h4>
                              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{sport.category || 'Other'}</span>
                            </div>
                          </div>

                          {sport.description && (
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                              {sport.description}
                            </p>
                          )}

                          <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#94a3b8' }}><i className="fas fa-user-shield mr-2"></i>Sport Master</span>
                              <strong style={{ color: '#1e293b' }}>{sport.sportMaster || 'Not Assigned'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#94a3b8' }}><i className="fas fa-user mr-2"></i>Captains</span>
                              <strong style={{ color: '#1e293b', textAlign: 'right' }}>{sport.captain || 'Not Assigned'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#94a3b8' }}><i className="fas fa-user-astronaut mr-2"></i>Coaches</span>
                              <strong style={{ color: '#1e293b', textAlign: 'right' }}>{sport.coach || 'Not Assigned'}</strong>
                            </div>
                          </div>

                          {sport.ageGroups && sport.ageGroups.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>Age Divisions</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {sport.ageGroups.map((group: string, idx: number) => (
                                  <span key={idx} style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                    {group}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {isAdmin && (
                          <div style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                            <button onClick={() => handleOpenEditSportModal(sport)} className="portal-btn-action edit" title="Edit Sport">
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button onClick={() => handleSportDelete(sport.id)} className="portal-btn-action delete" title="Delete Sport">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SCHOOL HOUSES (Merged CRUD) ── */}
      {activeTab === 'houses' && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div className="portal-card animate-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><i className="fas fa-home mr-2"></i> Registered School Houses</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="portal-badge" style={{ background: 'var(--portal-primary)', color: 'white' }}>{houses.length} Total</div>
                {isAdmin && (
                  <button
                    className="portal-btn-primary"
                    onClick={handleOpenAddHouseModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-plus"></i> Add House
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {loadingHouses ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading houses...
                </div>
              ) : houses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No school houses registered yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {houses.map(house => {
                    const logoUrl = house.logo ? `${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${house.logo}` : null;
                    return (
                      <div key={house.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                        <div style={{ padding: '20px', flex: 1 }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{
                              width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1'
                            }}>
                              {logoUrl ? (
                                <img src={logoUrl} alt={house.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <i className="fas fa-home" style={{ color: '#94a3b8', fontSize: '1.5rem' }}></i>
                              )}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--portal-primary)' }}>{house.name}</h4>
                            </div>
                          </div>

                          {house.description && (
                            <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
                              "{house.description}"
                            </p>
                          )}

                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px' }}>
                              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', width: '90px', textAlign: 'center' }}>House Master</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                {house.houseMaster ? `${house.houseMaster.title || ''} ${house.houseMaster.user?.name || ''}`.trim() : 'Unassigned'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px' }}>
                              <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', width: '90px', textAlign: 'center' }}>Captain</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                {house.houseCaptain ? house.houseCaptain.name : 'Unassigned'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isAdmin && (
                          <div style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                            <button onClick={() => handleOpenEditHouseModal(house)} className="portal-btn-action edit" title="Edit House">
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button onClick={() => handleHouseDelete(house.id)} className="portal-btn-action delete" title="Delete House">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SPORTING EQUIPMENT (CRUD & Synced Custodians) ── */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div className="portal-card animate-in">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}><i className="fas fa-boxes mr-2"></i>Sporting Assets &amp; Kit Log</h3>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="portal-btn-primary" onClick={handleOpenAddEquipmentModal}><i className="fas fa-plus mr-2"></i> Add Equipment</button>
                </div>
              )}
            </div>

            <div className="management-table-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9' }}>
              <div className="table-responsive">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category/Sport</th>
                      <th>Quantity</th>
                      <th>Condition</th>
                      <th>Custodian</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingEquipments ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><i className="fas fa-spinner fa-spin mr-2"></i>Loading inventory...</td></tr>
                    ) : equipments.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No equipment registered yet.</td></tr>
                    ) : (
                      equipments.map(item => (
                        <tr key={item.id}>
                          <td><div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div></td>
                          <td><span style={{ fontWeight: 700, color: '#64748b' }}>{item.sport ? item.sport.name : 'General'}</span></td>
                          <td><span style={{ fontWeight: 800, color: '#1e293b' }}>{item.quantity}</span></td>
                          <td>
                            <span className="status-badge" style={{
                              background: item.condition === 'EXCELLENT' ? '#ecfdf5' : item.condition === 'GOOD' ? '#eff6ff' : '#fff7ed',
                              color: item.condition === 'EXCELLENT' ? '#059669' : item.condition === 'GOOD' ? '#2563eb' : '#ea580c'
                            }}>
                              {item.condition}
                            </span>
                          </td>
                          <td>
                            {item.custodian ? (
                              <div style={{ fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.custodian.name}</span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '8px' }}>
                                  {item.custodian.role}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleOpenEditEquipmentModal(item)} className="portal-btn-action edit" title="Edit Item">
                                  <i className="fas fa-pencil-alt"></i>
                                </button>
                                <button onClick={() => handleEquipmentDelete(item.id)} className="portal-btn-action delete" title="Delete Item">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REQUISITIONS (Core Procurements UI) ── */}
      {activeTab === 'requisitions' && (
        <div className="animate-in">
          <ProcurementUI mode="FULL" />
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Sport Modal */}
      {showSportModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingSportId ? 'Edit' : 'Register New'} Sport</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure school sport profile, masters, captains, and age groups.</p>
              </div>
              <button onClick={() => setShowSportModal(false)} className="portal-btn-ghost" style={{ padding: '6px', minWidth: 'auto' }}>
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <form onSubmit={handleSportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '12px', background: '#f8fafc', border: '2px dashed #cbd5e1',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {sportLogoPreview ? (
                      <img src={sportLogoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: '1.5rem' }}></i>
                    )}
                  </div>
                  <div className="portal-form-group" style={{ flex: 1 }}>
                    <label className="portal-label">Sport Icon / Logo</label>
                    <input type="file" accept="image/*" onChange={handleSportLogoChange} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="portal-form-group">
                    <label className="portal-label">Sport Name *</label>
                    <input
                      type="text"
                      className="portal-input"
                      placeholder="e.g. Soccer, Cricket, Rugby"
                      value={sportForm.name}
                      onChange={e => setSportForm({ ...sportForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Category</label>
                    <select
                      className="portal-input"
                      value={sportForm.category}
                      onChange={e => setSportForm({ ...sportForm, category: e.target.value })}
                    >
                      <option value="Team Sport">Team Sport</option>
                      <option value="Individual Sport">Individual Sport</option>
                      <option value="Track & Field">Track &amp; Field</option>
                      <option value="Water Sports">Water Sports</option>
                      <option value="Combat Sports">Combat Sports</option>
                      <option value="Indoor Sport">Indoor Sport</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Description</label>
                  <textarea
                    className="portal-input"
                    style={{ minHeight: '60px' }}
                    placeholder="Brief details about this sport at the school..."
                    value={sportForm.description}
                    onChange={e => setSportForm({ ...sportForm, description: e.target.value })}
                  ></textarea>
                </div>

                {/* Sport Master Selection */}
                <div className="portal-form-group">
                  <label className="portal-label">Sport Master</label>
                  <select
                    className="portal-input"
                    value={sportForm.sportMasterId}
                    onChange={e => setSportForm({ ...sportForm, sportMasterId: e.target.value })}
                    style={{ fontWeight: 700 }}
                  >
                    <option value="">-- Select Registered Master --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.userId || t.id}>
                        {t.title || 'Mr/Mrs.'} {t.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multiple Captains Selection */}
                <div className="portal-form-group">
                  <label className="portal-label">Captains (Select Multiple Students)</label>
                  <div style={{
                    maxHeight: '120px', overflowY: 'auto', border: '1px solid #cbd5e1',
                    borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc'
                  }}>
                    {students.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedCaptains.includes(s.userId || s.id)}
                          onChange={() => handleCaptainToggle(s.userId || s.id)}
                        />
                        {s.name} ({s.studentId})
                      </label>
                    ))}
                  </div>
                </div>

                {/* Multiple Coaches and Age Group assignment */}
                <div className="portal-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="portal-label" style={{ marginBottom: 0 }}>Coaches / Instructors &amp; Age Group Targets</label>
                    <button type="button" className="portal-btn-ghost" onClick={handleAddCoachRow} style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'auto', minWidth: 'auto' }}>
                      <i className="fas fa-plus mr-1"></i> Add Coach
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sportCoaches.map((coach, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '10px', alignItems: 'center', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <select
                          className="portal-input"
                          value={coach.userId}
                          onChange={e => handleCoachRowChange(index, 'userId', e.target.value)}
                          required
                        >
                          <option value="">-- Select Coach --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.userId || t.id}>
                              {t.title || 'Mr/Mrs.'} {t.user?.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="portal-input"
                          placeholder="e.g. Under 15, Open"
                          value={coach.ageGroup || ''}
                          onChange={e => handleCoachRowChange(index, 'ageGroup', e.target.value)}
                        />
                        <button type="button" onClick={() => handleRemoveCoachRow(index)} className="portal-btn-action delete" style={{ margin: 0, padding: '8px' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Age Groups Divisions */}
                <div className="portal-form-group">
                  <label className="portal-label">Age Groups / Divisions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '5px' }}>
                    {COMMON_AGE_GROUPS.map((group, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={selectedAgeGroups.includes(group)}
                          onChange={() => handleAgeGroupToggle(group)}
                        />
                        {group}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label className="portal-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>Custom Age Groups (comma separated)</label>
                    <input
                      type="text"
                      className="portal-input"
                      placeholder="e.g. Under 11, Under 12"
                      value={sportForm.customAgeGroups}
                      onChange={e => setSportForm({ ...sportForm, customAgeGroups: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowSportModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={savingSport}>
                    {savingSport ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    {editingSportId ? 'Update' : 'Save'} Sport
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* House Modal */}
      {showHouseModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingHouseId ? 'Edit' : 'Add New'} {t('house')}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure residential profile, caretakers, and student leaders.</p>
              </div>
              <button onClick={() => setShowHouseModal(false)} className="portal-btn-ghost" style={{ padding: '6px', minWidth: 'auto' }}>
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleHouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%', background: '#f8fafc', border: '2px dashed #cbd5e1',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {houseLogoPreview ? (
                      <img src={houseLogoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: '1.5rem' }}></i>
                    )}
                  </div>
                  <div className="portal-form-group" style={{ flex: 1 }}>
                    <label className="portal-label">House Logo / Banner</label>
                    <input type="file" accept="image/*" onChange={handleHouseLogoChange} />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">{t('house')} Name *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder={`e.g. Green ${t('house')}, Red ${t('house')}`}
                    value={houseForm.name}
                    onChange={e => setHouseForm({ ...houseForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-grid-2" style={{ gap: '15px' }}>
                  <div className="portal-form-group">
                    <label className="portal-label">House Master / Patron</label>
                    <select
                      className="portal-input"
                      value={houseForm.houseMasterId}
                      onChange={e => setHouseForm({ ...houseForm, houseMasterId: e.target.value })}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="">-- Select Instructor --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title || 'Mr/Mrs.'} {t.user?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">House Captain</label>
                    <select
                      className="portal-input"
                      value={houseForm.houseCaptainId}
                      onChange={e => setHouseForm({ ...houseForm, houseCaptainId: e.target.value })}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="">-- Select Student --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Description</label>
                  <textarea
                    className="portal-input"
                    style={{ minHeight: '80px' }}
                    placeholder={`Briefly describe this ${t('house').toLowerCase()}...`}
                    value={houseForm.description}
                    onChange={e => setHouseForm({ ...houseForm, description: e.target.value })}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowHouseModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={savingHouse}>
                    {savingHouse ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    {editingHouseId ? 'Update' : 'Save'} {t('house')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sporting Equipment Modal */}
      {showEquipmentModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingEquipmentId ? 'Edit' : 'Add'} Sporting Equipment</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Log equipment and allocate custodian from sport roster.</p>
              </div>
              <button onClick={() => setShowEquipmentModal(false)} className="portal-btn-ghost" style={{ padding: '6px', minWidth: 'auto' }}>
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleEquipmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Item Name *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Size 5 Match Soccer Balls"
                    value={equipmentForm.name}
                    onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Category / Sport *</label>
                  <select
                    className="portal-input"
                    value={equipmentForm.sportId}
                    onChange={e => setEquipmentForm({ ...equipmentForm, sportId: e.target.value, custodianId: '' })}
                    required
                  >
                    <option value="">-- Select Sport --</option>
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="portal-grid-2" style={{ gap: '15px' }}>
                  <div className="portal-form-group">
                    <label className="portal-label">Quantity</label>
                    <input
                      type="number"
                      className="portal-input"
                      value={equipmentForm.quantity}
                      onChange={e => setEquipmentForm({ ...equipmentForm, quantity: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Condition</label>
                    <select
                      className="portal-input"
                      value={equipmentForm.condition}
                      onChange={e => setEquipmentForm({ ...equipmentForm, condition: e.target.value })}
                    >
                      <option value="EXCELLENT">EXCELLENT</option>
                      <option value="GOOD">GOOD</option>
                      <option value="WORN">WORN</option>
                      <option value="DAMAGED">DAMAGED</option>
                    </select>
                  </div>
                </div>

                {/* Custodian Selection - Dynamically Synced */}
                <div className="portal-form-group">
                  <label className="portal-label">Custodian (Allocated from Sport Roster)</label>
                  <select
                    className="portal-input"
                    value={equipmentForm.custodianId}
                    onChange={e => setEquipmentForm({ ...equipmentForm, custodianId: e.target.value })}
                    disabled={!equipmentForm.sportId}
                  >
                    <option value="">{equipmentForm.sportId ? '-- Select Custodian --' : 'Please select a sport first'}</option>
                    {getEligibleCustodians().map(cust => (
                      <option key={cust.userId} value={cust.userId}>
                        {cust.name} ({cust.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowEquipmentModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" disabled={savingEquipment}>
                    {savingEquipment ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    {editingEquipmentId ? 'Update' : 'Save'} Equipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
