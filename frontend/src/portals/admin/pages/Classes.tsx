import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

export interface ClassSection {
  id: string;
  name: string;
}

export interface ClassStudent {
  id: string;
  studentId: string;
  name: string;
  gender?: string;
}

export interface ClassSubjectTeacher {
  id: string;
  subject?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    user?: {
      name: string;
    };
  };
}

export interface SchoolClass {
  id: string;
  name: string;
  level: string;
  capacity?: number | string;
  teacherId?: string;
  sectionId?: string;
  section?: ClassSection | null;
  students?: ClassStudent[];
  subjectTeachers?: ClassSubjectTeacher[];
  _count?: {
    students?: number;
  };
}

export interface TeacherUser {
  id: string;
  user?: {
    name: string;
  };
}

export interface SubjectItem {
  id: string;
  name: string;
}

export default function AdminClasses() {
  const { user } = useAuth();

  const getLevelsForSchool = () => {
    const type = (user?.schoolType || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college')) {
      return [
        'Year 1 Semester 1', 'Year 1 Semester 2',
        'Year 2 Semester 1', 'Year 2 Semester 2',
        'Year 3 Semester 1', 'Year 3 Semester 2',
        'Year 4 Semester 1', 'Year 4 Semester 2',
        'Postgraduate Semester 1', 'Postgraduate Semester 2'
      ];
    }
    if (type.includes('nursing') || type.includes('medical')) {
      return ['First Year', 'Second Year', 'Third Year'];
    }
    if (type.includes('primary')) {
      return ['ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];
    }
    return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Lower Six', 'Upper Six'];
  };

  const defaultLevel = getLevelsForSchool()[0] || 'Form 1';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [formData, setFormData] = useState({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
  
  const [assignData, setAssignData] = useState({ subjectId: '', teacherId: '' });
  const [assigning, setAssigning] = useState(false);

  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [migratingClass, setMigratingClass] = useState<SchoolClass | null>(null);
  const [migrateData, setMigrateData] = useState({ targetClassId: '', targetPart: '1' });
  const [isMigrating, setIsMigrating] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  const { showToast, toastConfirm } = useToast();
  const { t } = useTerminology();

  const fetchData = useCallback(async () => {
    try {
      const [clsRes, teaRes, subRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/teachers'),
        api.get('/api/subjects')
      ]);
      setClasses(Array.isArray(clsRes.data) ? clsRes.data : []);
      setTeachers(Array.isArray(teaRes.data.teachers) ? teaRes.data.teachers : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch (err) {
      console.error('Failed to load classes data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchSections = useCallback(async () => {
    try {
      const res = await api.get('/api/classes/sections');
      setSections(res.data);
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  }, []);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName) return;
    setIsAddingSection(true);
    try {
      await api.post('/api/classes/sections', { name: newSectionName });
      showToast('Section created!', 'success');
      setNewSectionName('');
      fetchSections();
    } catch (err) {
      console.error('Failed to create section:', err);
      showToast('Failed to create section', 'error');
    } finally {
      setIsAddingSection(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSections();
  }, [fetchData, fetchSections]);

  const calculateGenderStats = (students: ClassStudent[]) => {
    const total = students.length;
    if (total === 0) return { boys: 0, girls: 0, na: 0 };
    
    const boys = students.filter(s => {
      const g = s.gender?.toLowerCase();
      return g === 'male' || g === 'boy' || g === 'm';
    }).length;
    const girls = students.filter(s => {
      const g = s.gender?.toLowerCase();
      return g === 'female' || g === 'girl' || g === 'f';
    }).length;
    const na = total - (boys + girls);
    
    return {
      boys: Math.round((boys / total) * 100),
      girls: Math.round((girls / total) * 100),
      na: Math.round((na / total) * 100),
      counts: { boys, girls, na }
    };
  };

  const handleOpenModal = (cls: SchoolClass | null = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({ 
        name: cls.name, 
        level: cls.level, 
        teacherId: cls.teacherId || '', 
        capacity: cls.capacity ? String(cls.capacity) : '',
        sectionId: cls.sectionId || ''
      });
    } else {
      setEditingClass(null);
      setFormData({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
    }
    setAssignData({ subjectId: '', teacherId: '' });
    setIsModalOpen(true);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fData = new FormData();
    fData.append('file', file);

    setUploading(true);
    try {
      await api.post('/api/classes/bulk-upload', fData);
      showToast('Classes uploaded successfully', 'success');
      fetchData();
    } catch (err) {
      console.error('Bulk upload failed:', err);
      showToast('Bulk upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenMigrateModal = (cls: SchoolClass) => {
    setMigratingClass(cls);
    setMigrateData({ targetClassId: '', targetPart: '1' });
    setIsMigrateModalOpen(true);
  };

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migratingClass) return showToast('No class selected for migration', 'warning');
    if (!migrateData.targetClassId) return showToast('Please select a target class', 'warning');
    
    setIsMigrating(true);
    try {
      const { data: students } = await api.get(`/api/students/by-class/${migratingClass.id}`);
      const studentIds = students.map((s: ClassStudent) => s.id);
      
      if (studentIds.length === 0) {
        setIsMigrating(false);
        return showToast('No students in this class to migrate.', 'warning');
      }

      await api.post('/api/students/migrate', {
        studentIds,
        targetClassId: migrateData.targetClassId,
        targetPart: migrateData.targetPart
      });

      showToast(`Successfully migrated ${studentIds.length} students to the new class!`, 'success');
      setIsMigrateModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      console.error('Migration failed:', err);
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast(apiError || 'Migration failed', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.put(`/api/classes/${editingClass.id}`, formData);
        showToast('Class updated!', 'success');
      } else {
        await api.post('/api/classes', formData);
        showToast('Class created!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
      setFormData({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
    } catch (err) {
      console.error('Action failed:', err);
      showToast('Action failed', 'error');
    }
  };

  const filteredClasses = useMemo(() => {
    return (Array.isArray(classes) ? classes : []).filter(c => {
      const matchesSearch = !searchTerm.trim() || c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === 'ALL' || c.level === levelFilter;
      const matchesSection = sectionFilter === 'ALL' || c.sectionId === sectionFilter;
      return matchesSearch && matchesLevel && matchesSection;
    });
  }, [classes, searchTerm, levelFilter, sectionFilter]);

  const classStats = useMemo(() => {
    const list = Array.isArray(classes) ? classes : [];
    const totalClasses = list.length;
    const totalStudents = list.reduce((sum, c) => sum + (c._count?.students || c.students?.length || 0), 0);
    const avgSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
    const withTeacher = list.filter(c => c.teacherId).length;
    return { totalClasses, totalStudents, avgSize, withTeacher };
  }, [classes]);

  const schoolLevels = getLevelsForSchool();

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-chalkboard" style={{ color: '#4f46e5' }} />
            Classes &amp; Cohorts
          </h1>
          <p>Organize your institution into structured grade levels, class streams, and assigned class tutors.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="portal-btn-primary" 
            style={{ 
              height: 42, 
              padding: '0 20px', 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 700, 
              fontSize: '0.9rem' 
            }} 
            onClick={() => handleOpenModal()}
          >
            <i className="fas fa-plus" /> Add Class
          </button>
          <button 
            className="portal-btn-ghost" 
            style={{ 
              height: 42, 
              padding: '0 16px', 
              borderRadius: 10, 
              border: '1px solid #cbd5e1', 
              background: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 600, 
              fontSize: '0.9rem' 
            }} 
            onClick={() => setIsSectionModalOpen(true)}
          >
            <i className="fas fa-layer-group" style={{ color: '#6366f1' }} /> Manage Sections
          </button>
          <label 
            className="portal-btn-ghost" 
            style={{ 
              height: 42, 
              padding: '0 16px', 
              borderRadius: 10, 
              border: '1px solid #cbd5e1', 
              background: '#ffffff',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 600, 
              fontSize: '0.9rem' 
            }}
          >
            <i className="fas fa-file-excel" style={{ color: '#16a34a' }} /> {uploading ? 'Uploading...' : 'Bulk Upload'}
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleBulkUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 16, 
          marginBottom: 20 
        }}
      >
        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Classes</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{classStats.totalClasses}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: '1.2rem' }}>
              <i className="fas fa-chalkboard" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Students</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>{classStats.totalStudents}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '1.2rem' }}>
              <i className="fas fa-user-graduate" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Average Class Size</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{classStats.avgSize}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '1.2rem' }}>
              <i className="fas fa-users" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Assigned Tutors</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: classStats.withTeacher === classStats.totalClasses ? '#16a34a' : '#d97706', marginTop: 4 }}>
                {classStats.withTeacher} / {classStats.totalClasses}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', fontSize: '1.2rem' }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="portal-card" 
        style={{ 
          padding: '14px 20px', 
          borderRadius: 12, 
          border: '1px solid #e2e8f0', 
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search classes by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="portal-input"
              style={{ width: '100%', paddingLeft: 34, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="portal-select"
            style={{ minWidth: 160, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
          >
            <option value="ALL">All Levels / Grades</option>
            {schoolLevels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>

          {/* Section Filter */}
          {sections.length > 0 && (
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="portal-select"
              style={{ minWidth: 160, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
            >
              <option value="ALL">All Sessions / Sections</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid of Class Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 20,
          marginBottom: 32
        }}
      >
        {loading ? (
          <div style={{ gridColumn: '1/-1' }}>
            <SkeletonLoader type="card" count={6} />
          </div>
        ) : (
          <>
            {filteredClasses.map(c => {
              const stats = calculateGenderStats(c.students || []);
              const studentCount = c._count?.students || c.students?.length || 0;
              const capNum = c.capacity ? Number(c.capacity) : 0;
              const percentFilled = capNum > 0 ? Math.min(100, Math.round((studentCount / capNum) * 100)) : null;

              return (
                <div 
                  key={c.id} 
                  className="portal-card animate-in" 
                  style={{
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    background: '#ffffff'
                  }}
                >
                  <div>
                    {/* Card Top: Name, Level, Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
                          {c.name}
                        </h3>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span 
                            style={{ 
                              background: '#eff6ff', 
                              color: '#2563eb', 
                              padding: '2px 10px', 
                              borderRadius: 12, 
                              fontSize: '0.75rem', 
                              fontWeight: 700 
                            }}
                          >
                            {c.level}
                          </span>
                          {c.section && (
                            <span 
                              style={{ 
                                background: '#f8fafc', 
                                color: '#475569', 
                                border: '1px solid #e2e8f0', 
                                padding: '2px 8px', 
                                borderRadius: 12, 
                                fontSize: '0.72rem', 
                                fontWeight: 600 
                              }}
                            >
                              <i className="fas fa-clock mr-1" /> {c.section.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ width: 32, height: 32, padding: 0, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #d1fae5', background: '#ecfdf5' }} 
                          onClick={() => handleOpenMigrateModal(c)} 
                          title="Migrate Cohort Students"
                        >
                          <i className="fas fa-random" style={{ fontSize: '0.8rem' }} />
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ width: 32, height: 32, padding: 0, color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #e0f2fe', background: '#f0f9ff' }} 
                          onClick={() => handleOpenModal(c)} 
                          title="Edit Class Details"
                        >
                          <i className="fas fa-edit" style={{ fontSize: '0.8rem' }} />
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ width: 32, height: 32, padding: 0, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2' }} 
                          title="Delete Class" 
                          onClick={async () => {
                            if (toastConfirm && await toastConfirm(`Delete class "${c.name}"?`)) {
                              try {
                                await api.delete(`/api/classes/${c.id}`);
                                showToast('Class deleted successfully', 'success');
                                fetchData();
                              } catch (err) {
                                console.error('Failed to delete class:', err);
                                showToast('Failed to delete class', 'error');
                              }
                            }
                          }}
                        >
                          <i className="fas fa-trash" style={{ fontSize: '0.8rem' }} />
                        </button>
                      </div>
                    </div>

                    {/* Capacity & Count Bar */}
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                          Enrollment
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                          {studentCount} <span style={{ color: '#94a3b8', fontWeight: 500 }}>/ {c.capacity || '∞'} Seats</span>
                        </span>
                      </div>
                      {percentFilled !== null && (
                        <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${percentFilled}%`, 
                              height: '100%', 
                              background: percentFilled > 90 ? '#ef4444' : percentFilled > 70 ? '#f59e0b' : '#3b82f6',
                              borderRadius: 99 
                            }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Class Teacher Allocation */}
                    <div style={{ marginBottom: 14, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-user-tie" style={{ color: c.teacherId ? '#4f46e5' : '#94a3b8' }} />
                      <span style={{ color: '#64748b' }}>Class Tutor:</span>
                      {(() => {
                        const tObj = teachers.find(t => t.id === c.teacherId);
                        return tObj?.user?.name ? (
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{tObj.user.name}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                        );
                      })()}
                    </div>

                    {/* Gender Breakdown Pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ textAlign: 'center', background: '#f0f9ff', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>Boys</div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0284c7' }}>{stats.counts?.boys || 0} ({stats.boys}%)</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#fdf2f8', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#be185d', fontWeight: 600 }}>Girls</div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ec4899' }}>{stats.counts?.girls || 0} ({stats.girls}%)</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Other</div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#475569' }}>{stats.counts?.na || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Class Tile */}
            <div 
              className="portal-card animate-in" 
              onClick={() => handleOpenModal()} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: 240,
                border: '2px dashed #cbd5e1',
                background: '#fafbfc',
                cursor: 'pointer', 
                boxShadow: 'none',
                padding: '24px',
                borderRadius: 14,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <i className="fas fa-plus" style={{ fontSize: '1.2rem', color: '#4f46e5' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>Add New Class</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0', textAlign: 'center' }}>Configure a new academic stream</p>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: editingClass ? '900px' : '500px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>{editingClass ? `Edit Class: ${editingClass.name}` : 'Initialize New Class'}</h2>
                <span>{editingClass ? 'Manage students and faculty assignments' : 'Set up a new academic cohort'}</span>
              </div>
              <button className="portal-modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className="portal-modal-body" style={{ 
              display: 'grid', 
              gridTemplateColumns: editingClass ? '1fr 1.2fr' : '1fr', 
              gap: '40px',
              padding: '32px'
            }}>
              <section>
                <div className="form-section-header" style={{ marginBottom: '24px' }}>General Information</div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Class Name</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Form 1A" 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Academic Level</label>
                    <select 
                      className="portal-input"
                      value={formData.level} 
                      onChange={e => setFormData({...formData, level: e.target.value})}
                    >
                      {getLevelsForSchool().map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Class Teacher (HOD)</label>
                    <select 
                      className="portal-input"
                      value={formData.teacherId} 
                      onChange={e => setFormData({...formData, teacherId: e.target.value})}
                    >
                      <option value="">No Teacher Assigned</option>
                      {(Array.isArray(teachers) ? teachers : []).map(t => (
                        <option key={t.id} value={t.id}>{t.user?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="portal-label">Class Capacity</label>
                      <input 
                        type="number" className="portal-input"
                        value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})}
                        placeholder="e.g. 40"
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">School Section / Session</label>
                      <select 
                        className="portal-input"
                        value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})}
                      >
                        <option value="">No Section</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ width: '100%' }}>
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Update Basic Details
                  </button>
                </form>

                {editingClass && (
                  <div style={{ marginTop: '32px' }}>
                    <div className="form-section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      Students Enrolled
                      <span className="portal-badge info">{editingClass.students?.length || 0}</span>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <PaginatedTable className="portal-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Sex</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editingClass.students || []).map((s: ClassStudent) => (
                            <tr key={s.id}>
                              <td style={{ fontFamily: 'monospace' }}>{s.studentId}</td>
                              <td style={{ fontWeight: 600 }}>{s.name}</td>
                              <td>{s.gender?.charAt(0).toUpperCase()}</td>
                            </tr>
                          ))}
                          {(editingClass.students || []).length === 0 && (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>No students in this class.</td>
                            </tr>
                          )}
                        </tbody>
                      </PaginatedTable>
                    </div>
                  </div>
                )}
              </section>

              {/* Right Column: Subject Assignments (Only for existing classes) */}
              {editingClass && (
                <section style={{ borderLeft: '1px solid var(--portal-border)', paddingLeft: '32px' }}>
                  <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--portal-primary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Subject Faculty Assignments
                  </h3>
                  
                  {/* Quick Assign Form */}
                  <div className="quick-assign-box" style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px dashed var(--portal-border)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.8rem' }}
                        value={assignData.subjectId}
                        onChange={e => setAssignData({...assignData, subjectId: e.target.value})}
                      >
                        <option value="">Select Subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.8rem' }}
                        value={assignData.teacherId}
                        onChange={e => setAssignData({...assignData, teacherId: e.target.value})}
                      >
                        <option value="">Select Teacher...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
                      </select>
                    </div>
                    <button 
                      className="portal-btn-ghost" 
                      style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                      disabled={!assignData.subjectId || !assignData.teacherId || assigning}
                      onClick={async () => {
                        setAssigning(true);
                        try {
                          await api.post(`/api/classes/${editingClass.id}/subject-teachers`, assignData);
                          showToast('Faculty assigned successfully', 'success');
                          setAssignData({ subjectId: '', teacherId: '' });
                          fetchData();
                        } catch (err) {
                          console.error('Assignment failed:', err);
                          showToast('Assignment failed', 'error');
                        } finally {
                          setAssigning(false);
                        }
                      }}
                    >
                      {assigning ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-link"></i>} Assign Faculty
                    </button>
                  </div>

                  <div className="assignment-list" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                    {(editingClass.subjectTeachers || []).length > 0 ? (
                      (editingClass.subjectTeachers || []).map((st: ClassSubjectTeacher) => (
                        <div key={st.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '12px', 
                          marginBottom: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{st.subject?.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{st.teacher?.user?.name}</div>
                          </div>
                          <button 
                            className="btn-icon btn-delete" 
                            style={{ padding: '6px', fontSize: '0.7rem' }}
                            onClick={async () => {
                              if (await toastConfirm('Remove this assignment?')) {
                                try {
                                  await api.delete(`/api/classes/${editingClass.id}/subject-teachers/${st.id}`);
                                  showToast('Assignment removed', 'success');
                                  fetchData();
                                } catch {
                                  showToast('Failed to remove assignment', 'error');
                                }
                              }
                            }}
                          >
                            <i className="fas fa-unlink"></i>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '0.8rem' }}>
                        <i className="fas fa-info-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px' }}></i>
                        No subjects assigned yet
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {isMigrateModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>{t('migration')}</h2>
                <span>Move all students from {migratingClass?.name} to a new class</span>
              </div>
              <button className="portal-modal-close" onClick={() => setIsMigrateModalOpen(false)}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ padding: '32px' }}>
              <form onSubmit={handleMigrate}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Target Class</label>
                  <select 
                    className="portal-input"
                    value={migrateData.targetClassId} 
                    onChange={e => setMigrateData({...migrateData, targetClassId: e.target.value})}
                    required
                  >
                    <option value="">-- Select Target Class --</option>
                    {classes.filter(c => c.id !== migratingClass?.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Academic Part/Term (Optional)</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    value={migrateData.targetPart} 
                    onChange={e => setMigrateData({...migrateData, targetPart: e.target.value})} 
                    placeholder="e.g. 1" 
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="portal-btn-ghost" style={{ flex: 1 }} onClick={() => setIsMigrateModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, background: '#10b981' }} disabled={isMigrating}>
                    {isMigrating ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Migrating...</> : <><i className="fas fa-random" style={{ marginRight: '8px' }}></i> {t('migration')}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isSectionModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '450px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>Manage School Sections</h2>
                <span>Create sessions like Morning, Afternoon, or A/B</span>
              </div>
              <button className="portal-modal-close" onClick={() => setIsSectionModalOpen(false)}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleAddSection} style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
                <input 
                  type="text" className="portal-input" placeholder="New Section Name..." 
                  value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                />
                <button type="submit" className="portal-btn-primary" disabled={isAddingSection}>
                  {isAddingSection ? <i className="fas fa-spinner fa-spin"></i> : 'Add'}
                </button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {sections.map(s => (
                  <div key={s.id} className="portal-badge" style={{ background: 'var(--portal-bg)', color: 'var(--portal-primary)', padding: '8px 15px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {s.name}
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--portal-danger)', cursor: 'pointer' }}
                      onClick={async () => {
                        if (await toastConfirm(`Delete section ${s.name}?`)) {
                          try {
                            await api.delete(`/api/classes/sections/${s.id}`);
                            fetchSections();
                          } catch (err) {
                            console.error('Failed to delete section:', err);
                            showToast('Failed to delete section', 'error');
                          }
                        }
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                {sections.length === 0 && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No sections created yet.</p>}
              </div>
            </div>
            <div className="portal-modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsSectionModalOpen(false)}>Close</button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .stat-circle {
          width: 60px;
          height: 60px;
          border: 4px solid;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          margin: 0 auto 10px;
        }
        .stat-label { font-size: 0.7rem; color: var(--gray-400); text-transform: uppercase; font-weight: 700; }
        .stat-count { font-size: 0.8rem; font-weight: 800; }
        .add-new-card:hover { transform: translateY(-5px); border-color: var(--blue); }
      `}</style>
    </div>
  );
}
