import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { getAvatarUrl } from '../../../utils/formatters';
import { SearchInput, ExportButton, SkeletonLoader, PaginatedTable } from '../../../components/shared';

interface StudentData {
  id: string;
  studentId: string;
  name?: string;
  gender?: string;
  classId?: string;
  teacherAssignmentType?: string;
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  class?: {
    id: string;
    name: string;
  } | null;
  parent?: {
    user?: {
      name: string;
      phone?: string;
    };
  } | null;
}

interface ClassOption {
  id: string;
  name: string;
  role?: string;
  _count?: {
    students: number;
  };
}

export default function TeacherStudents() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/teachers/my-classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/teachers/my-students${selectedClassId ? `?classId=${selectedClassId}` : ''}`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
    return students.filter(s => {
      const name = (s.user?.name || s.name || '').toLowerCase();
      const id = (s.studentId || '').toLowerCase();
      const email = (s.user?.email || '').toLowerCase();
      const className = (s.class?.name || '').toLowerCase();
      return name.includes(q) || id.includes(q) || email.includes(q) || className.includes(q);
    });
  }, [students, searchTerm]);

  const totalBoys = filteredStudents.filter(s => (s.gender || '').toUpperCase() === 'MALE').length;
  const totalGirls = filteredStudents.filter(s => (s.gender || '').toUpperCase() === 'FEMALE').length;

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
            <i className="fas fa-user-graduate" /> Student Roster & Academic Directory
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            Classroom Student Directory
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: 620 }}>
            Manage student profiles, monitor academic attendance, review performance histories, and communicate with families.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/teacher/attendance')}
            className="portal-btn"
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none'
            }}
          >
            <i className="fas fa-clipboard-check" /> Roll Call
          </button>

          <button
            type="button"
            onClick={() => navigate('/teacher/grades')}
            className="portal-btn"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <i className="fas fa-chart-line" /> Grades Entry
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Enrolled</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-users" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{filteredStudents.length}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned Classes</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-chalkboard" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534', marginTop: 8 }}>{classes.length}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gender Ratio</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fdf4ff', color: '#a21caf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-venus-mars" />
            </div>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginTop: 14 }}>
            <span style={{ color: '#0284c7' }}>{totalBoys} Boys</span> • <span style={{ color: '#db2777' }}>{totalGirls} Girls</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Class Filter + View Mode + Export */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, student ID, or class..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="filter-class" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              Class:
            </label>
            <select
              id="filter-class"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All My Classes ({students.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.role ? `(${c.role})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Grid Cards View"
            >
              <i className="fas fa-th-large mr-1" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Table Register View"
            >
              <i className="fas fa-list mr-1" /> Table
            </button>
          </div>

          <ExportButton
            data={filteredStudents.map(s => ({
              studentId: s.studentId || '—',
              name: s.user?.name || s.name || 'Student',
              email: s.user?.email || '—',
              class: s.class?.name || 'Unassigned',
              gender: s.gender || '—'
            }))}
            columns={[
              { header: 'Student ID', key: 'studentId', width: 16 },
              { header: 'Full Name', key: 'name', width: 25 },
              { header: 'Class', key: 'class', width: 16 },
              { header: 'Email Address', key: 'email', width: 28 },
              { header: 'Gender', key: 'gender', width: 12 }
            ]}
            filename="my-students-directory"
            title="Classroom Student Directory"
            subtitle={`Total: ${filteredStudents.length} students`}
          />
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <SkeletonLoader type={viewMode === 'grid' ? 'card' : 'table'} count={6} rows={6} columns={6} />
      ) : filteredStudents.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.75rem', marginBottom: 14 }}>
            <i className="fas fa-user-graduate" />
          </div>
          <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, margin: '0 0 6px 0' }}>
            No Students Found
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
            {searchTerm ? 'No student records match your search criteria.' : 'There are currently no students registered in your assigned classes.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {filteredStudents.map(student => {
            const displayName = student.user?.name || student.name || 'Student';
            const displayId = student.studentId || student.id.substring(0, 8);
            const className = student.class?.name || 'Unassigned';

            return (
              <div
                key={student.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Top: Avatar + ID Chip */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ position: 'relative' }}>
                      <div 
                        style={{ 
                          width: 52, 
                          height: 52, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          overflow: 'hidden',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: '#0369a1',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        {student.user?.avatar ? (
                          <img 
                            src={getAvatarUrl(student.user.avatar, currentUser?.schoolCode) || ''} 
                            alt={displayName} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          displayName.charAt(0)
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {displayId}
                    </span>
                  </div>

                  {/* Student Details */}
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {displayName}
                  </h3>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                      <i className="fas fa-chalkboard mr-1" /> {className}
                    </span>

                    {student.teacherAssignmentType && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: student.teacherAssignmentType.includes('Class Teacher') ? '#dcfce7' : '#ede9fe',
                          color: student.teacherAssignmentType.includes('Class Teacher') ? '#166534' : '#5b21b6',
                          border: `1px solid ${student.teacherAssignmentType.includes('Class Teacher') ? '#bbf7d0' : '#ddd6fe'}`
                        }}
                      >
                        <i className={`fas ${student.teacherAssignmentType.includes('Class Teacher') ? 'fa-id-badge' : 'fa-book-open'} mr-1`} />
                        {student.teacherAssignmentType}
                      </span>
                    )}

                    {student.gender && (
                      <span style={{ fontSize: '0.75rem', background: '#f8fafc', color: '#64748b', padding: '3px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #e2e8f0' }}>
                        {student.gender}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, wordBreak: 'break-all' }}>
                    <i className="fas fa-envelope" style={{ color: '#94a3b8', width: 14 }} />
                    <span>{student.user?.email || 'No email registered'}</span>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/student-profile?id=${student.id}`)}
                    className="portal-btn"
                    style={{
                      flex: 1,
                      height: '36px',
                      minHeight: '36px',
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}
                  >
                    <i className="fas fa-user-circle" /> View Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/clinic`)}
                    title="Send to Sick Bay"
                    className="portal-btn"
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}
                  >
                    <i className="fas fa-ambulance" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE REGISTER VIEW */
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <PaginatedTable className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Student ID</th>
                  <th>Full Name</th>
                  <th style={{ width: '140px' }}>Class</th>
                  <th style={{ width: '220px' }}>Assignment Role</th>
                  <th>Email Address</th>
                  <th style={{ width: '90px' }}>Gender</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                      {s.studentId || s.id.substring(0, 8)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                          {s.user?.avatar ? (
                            <img src={getAvatarUrl(s.user.avatar, currentUser?.schoolCode) || ''} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            (s.user?.name || s.name || 'S').charAt(0)
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.user?.name || s.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {s.class?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: s.teacherAssignmentType?.includes('Class Teacher') ? '#dcfce7' : '#ede9fe',
                          color: s.teacherAssignmentType?.includes('Class Teacher') ? '#166534' : '#5b21b6',
                          border: `1px solid ${s.teacherAssignmentType?.includes('Class Teacher') ? '#bbf7d0' : '#ddd6fe'}`,
                          display: 'inline-block'
                        }}
                      >
                        {s.teacherAssignmentType || 'Assigned Student'}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                      {s.user?.email || '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.gender || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        type="button"
                        onClick={() => navigate(`/teacher/student-profile?id=${s.id}`)}
                        className="portal-btn"
                        style={{ 
                          height: '32px',
                          minHeight: '32px',
                          padding: '0 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0284c7',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </div>
      )}
    </div>
  );
}
