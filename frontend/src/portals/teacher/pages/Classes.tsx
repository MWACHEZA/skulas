import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { SearchInput } from '../../../components/shared/SearchInput';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

interface ClassData {
  id: string;
  name: string;
  level: string;
  room: string;
  schedule: string;
  studentCount: number;
  role?: string;
}

interface ClubData {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  patron?: string | null;
  chairperson?: string | null;
  icon?: string | null;
  date?: string;
  _count?: {
    members?: number;
  };
}

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'classes' | 'clubs'>('classes');
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [clubCategoryFilter, setClubCategoryFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, clubsRes] = await Promise.all([
        api.get('/api/teachers/my-classes').catch(() => ({ data: [] })),
        api.get('/api/schools/clubs').catch(() => ({ data: [] }))
      ]);

      const classesData = (Array.isArray(classesRes.data) ? classesRes.data : []).map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level || 'Standard',
        room: c.room || 'Classroom Block',
        schedule: c.schedule || 'See Timetable',
        studentCount: c._count?.students || 0,
        role: c.role || 'Teacher'
      }));

      setClasses(classesData);
      setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);
    } catch (err) {
      console.error('Failed to load classes or clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    const q = searchTerm.toLowerCase().trim();
    return classes.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.level.toLowerCase().includes(q) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      c.room.toLowerCase().includes(q)
    );
  }, [classes, searchTerm]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const name = (c.name || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const patron = (c.patron || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || desc.includes(q) || patron.includes(q);
      
      if (!matchesSearch) return false;
      if (clubCategoryFilter !== 'ALL') {
        return (c.category || '').toLowerCase() === clubCategoryFilter.toLowerCase();
      }
      return true;
    });
  }, [clubs, searchTerm, clubCategoryFilter]);

  const clubCategories = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [clubs]);

  const totalStudentsTaught = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(56, 189, 248, 0.16)', color: '#7dd3fc', fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
            <i className="fas fa-chalkboard" /> Academic & Student Life Management
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            Clubs & Classes
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: 620 }}>
            Oversee your assigned subject teaching streams, homeroom registers, and student extracurricular societies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/teacher/attendance')}
            style={{
              background: '#0284c7',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 18px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-clipboard-check" /> Roll Call
          </button>
          <button
            type="button"
            onClick={() => navigate('/teacher/timetable')}
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 18px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-calendar-alt" /> Teaching Schedule
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned Classes</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{classes.length}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Students Taught</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-user-graduate" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534', marginTop: 8 }}>{totalStudentsTaught}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Clubs</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fdf4ff', color: '#a21caf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-users" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a21caf', marginTop: 8 }}>{clubs.length}</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div 
        style={{
          display: 'flex',
          gap: 10,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20,
          background: '#ffffff',
          padding: '10px 16px 0 16px',
          borderRadius: '10px 10px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'classes' ? 800 : 600,
            color: activeTab === 'classes' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'classes' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-chalkboard" />
          My Academic Classes ({classes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clubs')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'clubs' ? 800 : 600,
            color: activeTab === 'clubs' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'clubs' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-users" />
          Clubs & Societies ({clubs.length})
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '14px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <div style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={activeTab === 'classes' ? 'Search classes by name, level, or room...' : 'Search clubs by name, category, or patron...'}
          />
        </div>

        {activeTab === 'clubs' && clubCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setClubCategoryFilter('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: clubCategoryFilter === 'ALL' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                background: clubCategoryFilter === 'ALL' ? '#e0f2fe' : '#ffffff',
                color: clubCategoryFilter === 'ALL' ? '#0369a1' : '#64748b',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All
            </button>
            {clubCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setClubCategoryFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: clubCategoryFilter === cat ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  background: clubCategoryFilter === cat ? '#e0f2fe' : '#ffffff',
                  color: clubCategoryFilter === cat ? '#0369a1' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <SkeletonLoader type="card" count={6} />
      ) : activeTab === 'classes' ? (
        filteredClasses.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.75rem', marginBottom: 14 }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, margin: '0 0 6px 0' }}>
              No Classes Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
              {searchTerm ? 'No assigned classes matched your search query.' : 'You have not been assigned to any classes for the current academic session.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredClasses.map(c => (
              <div 
                key={c.id} 
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      <i className="fas fa-chalkboard-teacher" />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {c.level}
                      </span>
                      {c.role && (
                        <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          {c.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    {c.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', color: '#64748b', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#94a3b8', width: 16 }} />
                      <span>{c.room}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-clock" style={{ color: '#94a3b8', width: 16 }} />
                      <span>{c.schedule}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-user-graduate" style={{ color: '#94a3b8', width: 16 }} />
                      <span><strong>{c.studentCount}</strong> Enrolled Students</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <button 
                    type="button"
                    onClick={() => navigate(`/teacher/classes/${c.id}`)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <i className="fas fa-door-open" /> Class Details
                  </button>

                  <button 
                    type="button"
                    onClick={() => navigate(`/teacher/attendance?classId=${c.id}`)}
                    title="Take Attendance / Roll Call"
                    style={{
                      padding: '9px 14px',
                      background: '#f8fafc',
                      color: '#0284c7',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    <i className="fas fa-clipboard-check" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => navigate(`/teacher/grades?tab=marks-entry&classId=${c.id}`)}
                    title="Enter Marks"
                    style={{
                      padding: '9px 14px',
                      background: '#f8fafc',
                      color: '#059669',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    <i className="fas fa-pen-nib" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* CLUBS & SOCIETIES TAB */
        filteredClubs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.75rem', marginBottom: 14 }}>
              <i className="fas fa-users" />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, margin: '0 0 6px 0' }}>
              No Clubs Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
              {searchTerm ? 'No clubs matched your search criteria.' : 'There are currently no clubs or societies registered in the system.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredClubs.map(club => (
              <div 
                key={club.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: '#fdf4ff', color: '#c026d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      <i className="fas fa-users" />
                    </div>
                    {club.category && (
                      <span style={{ fontSize: '0.72rem', background: '#fdf4ff', color: '#a21caf', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {club.category}
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    {club.name}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                    {club.description || 'Active student society and extracurricular club.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: '#475569', marginBottom: 14 }}>
                    {club.patron && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-user-tie" style={{ color: '#94a3b8', width: 16 }} />
                        <span>Patron / Lead: <strong>{club.patron}</strong></span>
                      </div>
                    )}
                    {club.chairperson && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-crown" style={{ color: '#94a3b8', width: 16 }} />
                        <span>Chairperson: <strong>{club.chairperson}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    <i className="fas fa-calendar-day mr-1" /> Active Term
                  </span>
                  <span style={{ fontSize: '0.82rem', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
                    Sanctioned Club
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
