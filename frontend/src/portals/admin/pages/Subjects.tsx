import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { generateShortCode } from '../../../lib/utils';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';
import '../../../styles/portal.css';

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  deptCode?: string;
}

export interface ActiveTeacherItem {
  id: string;
  name: string;
  email?: string;
  classes?: string[];
}

export interface CreatorItem {
  id: string;
  name: string;
  role?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  department?: string;
  departmentId?: string;
  credits?: number | string;
  isIndustrial?: boolean;
  isProject?: boolean;
  isSubsidiary?: boolean;
  caWeight?: number | string;
  examWeight?: number | string;
  dept?: DepartmentItem | null;
  creator?: CreatorItem | null;
  activeTeachers?: ActiveTeacherItem[];
  canEdit?: boolean;
  isAssignedToCaller?: boolean;
  _count?: {
    teachers?: number;
  };
}

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  // Filters & View
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    department: '', 
    departmentId: '', 
    credits: '0',
    isIndustrial: false,
    isProject: false,
    isSubsidiary: false,
    caWeight: '30',
    examWeight: '70'
  });
  
  const { showToast, toastConfirm } = useToast();
  const { t, isUniversity, subjectLabel } = useAcademicConfig();

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, deptsRes] = await Promise.all([
        api.get('/api/subjects'),
        api.get('/api/departments')
      ]);
      setSubjects(Array.isArray(subsRes.data) ? subsRes.data : []);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
    } catch (err) {
      console.error('Failed to load subjects data:', err);
      showToast('Failed to load curriculum subjects', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (sub: SubjectItem | null = null) => {
    if (sub) {
      setEditingSubject(sub);
      setFormData({ 
        name: sub.name, 
        code: sub.code || '', 
        department: sub.department || '',
        departmentId: sub.departmentId || '',
        credits: sub.credits?.toString() || '0',
        isIndustrial: !!sub.isIndustrial,
        isProject: !!sub.isProject,
        isSubsidiary: !!sub.isSubsidiary,
        caWeight: sub.caWeight?.toString() || '30',
        examWeight: sub.examWeight?.toString() || '70'
      });
    } else {
      setEditingSubject(null);
      setFormData({ 
        name: '', 
        code: '', 
        department: '', 
        departmentId: '', 
        credits: '0',
        isIndustrial: false,
        isProject: false,
        isSubsidiary: false,
        caWeight: '30',
        examWeight: '70'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}`, formData);
        showToast('Subject updated successfully', 'success');
      } else {
        await api.post('/api/subjects', formData);
        showToast('Subject created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save subject:', err);
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (toastConfirm) {
      const confirmed = await toastConfirm(`Are you sure you want to delete "${name}"? This removes the subject from all curriculums.`);
      if (!confirmed) return;
    }
    try {
      await api.delete(`/api/subjects/${id}`);
      showToast('Subject removed successfully', 'success');
      fetchData();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      showToast('Failed to delete subject', 'error');
    }
  };

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchesSearch = !searchTerm.trim() || 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = selectedDept === 'ALL' || 
        s.departmentId === selectedDept || 
        s.dept?.id === selectedDept ||
        s.department === selectedDept;

      const hasTeachers = s.activeTeachers && s.activeTeachers.length > 0;
      const matchesAssignment = assignmentFilter === 'ALL' ||
        (assignmentFilter === 'ASSIGNED' && hasTeachers) ||
        (assignmentFilter === 'UNASSIGNED' && !hasTeachers);

      return matchesSearch && matchesDept && matchesAssignment;
    });
  }, [subjects, searchTerm, selectedDept, assignmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = subjects.length;
    const assigned = subjects.filter(s => s.activeTeachers && s.activeTeachers.length > 0).length;
    const unassigned = total - assigned;
    const deptCount = new Set(subjects.map(s => s.departmentId || s.department).filter(Boolean)).size;
    return { total, assigned, unassigned, deptCount };
  }, [subjects]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-book-open" style={{ color: '#0284c7' }} />
            {subjectLabel || 'Subjects'} Catalogue
          </h1>
          <p>Define, configure, and monitor curriculum subjects, department linkages, and teaching staff assignments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleOpenModal()}
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
          >
            <i className="fas fa-plus" /> Add Subject
          </button>
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
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Subjects</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{stats.total}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '1.2rem' }}>
              <i className="fas fa-books" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Departments</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>{stats.deptCount}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '1.2rem' }}>
              <i className="fas fa-building" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Assigned Teachers</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{stats.assigned}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '1.2rem' }}>
              <i className="fas fa-chalkboard-teacher" />
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Unassigned</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.unassigned > 0 ? '#ea580c' : '#64748b', marginTop: 4 }}>{stats.unassigned}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontSize: '1.2rem' }}>
              <i className="fas fa-user-clock" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
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
              placeholder={`Search ${subjectLabel || 'subjects'} by name or code...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="portal-input"
              style={{ width: '100%', paddingLeft: 34, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="portal-select"
            style={{ minWidth: 180, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} {d.deptCode ? `(${d.deptCode})` : ''}</option>
            ))}
          </select>

          {/* Allocation Filter */}
          <select
            value={assignmentFilter}
            onChange={e => setAssignmentFilter(e.target.value as any)}
            className="portal-select"
            style={{ minWidth: 160, height: 40, borderRadius: 8, fontSize: '0.88rem' }}
          >
            <option value="ALL">All Staff Status</option>
            <option value="ASSIGNED">Assigned Only</option>
            <option value="UNASSIGNED">Unassigned Only</option>
          </select>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#1e293b' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <i className="fas fa-list" /> Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'cards' ? '#ffffff' : 'transparent',
              color: viewMode === 'cards' ? '#1e293b' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <i className="fas fa-th-large" /> Grid
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="portal-card" style={{ padding: 24, borderRadius: 12 }}>
          <SkeletonLoader type="table" rows={6} columns={6} />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <i className="fas fa-book-open fa-3x" style={{ color: '#cbd5e1', marginBottom: 16 }} />
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>No Subjects Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 6 }}>
            {searchTerm || selectedDept !== 'ALL' || assignmentFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'Start by creating your institution’s first curriculum subject.'}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="portal-btn-primary"
            style={{ height: 42, padding: '0 20px', borderRadius: 10, marginTop: 12 }}
          >
            <i className="fas fa-plus" /> Add Subject
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="portal-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table className="portal-table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '14px 20px' }}>{subjectLabel || 'Subject'} Name</th>
                <th style={{ padding: '14px 20px' }}>Code</th>
                {isUniversity && <th style={{ padding: '14px 20px' }}>Credits</th>}
                <th style={{ padding: '14px 20px' }}>Department</th>
                <th style={{ padding: '14px 20px' }}>Active Teachers</th>
                <th style={{ padding: '14px 20px' }}>Origin / Created</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(s => {
                const deptName = s.dept?.name || s.department || 'General';
                const deptCode = s.dept?.deptCode || (s.dept?.code ? s.dept.code.substring(0, 3) : null);

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 800 }}>
                          <i className="fas fa-book" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>{s.name}</div>
                          {s.caWeight && s.examWeight && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Weight: {s.caWeight}% CA / {s.examWeight}% Exam
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span 
                        style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          background: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          padding: '3px 8px', 
                          borderRadius: 6,
                          fontSize: '0.82rem',
                          color: '#334155'
                        }}
                      >
                        {s.code || 'N/A'}
                      </span>
                    </td>
                    {isUniversity && (
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0284c7' }}>
                        {s.credits || 0} Units
                      </td>
                    )}
                    <td style={{ padding: '14px 20px' }}>
                      <span 
                        style={{ 
                          background: '#e0f2fe', 
                          color: '#0369a1', 
                          padding: '4px 10px', 
                          borderRadius: 6, 
                          fontSize: '0.78rem', 
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <i className="fas fa-building" style={{ fontSize: '0.7rem' }} />
                        {deptName} {deptCode ? `[${deptCode}]` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {s.activeTeachers && s.activeTeachers.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {s.activeTeachers.map(at => (
                            <span 
                              key={at.id}
                              style={{
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title={at.classes && at.classes.length > 0 ? `Classes: ${at.classes.join(', ')}` : 'Assigned Teacher'}
                            >
                              <i className="fas fa-chalkboard-teacher" style={{ fontSize: '0.7rem' }} />
                              {at.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        <span style={{ fontWeight: 600 }}>{s.creator?.name || 'School Admin'}</span>
                        {s.creator?.role && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.creator.role.replace('_', ' ')}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => s.canEdit !== false && handleOpenModal(s)}
                          disabled={s.canEdit === false}
                          title={s.canEdit === false ? "Cannot edit" : "Edit Subject"}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: s.canEdit === false ? '#cbd5e1' : '#0284c7',
                            cursor: s.canEdit === false ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className="fas fa-pen" style={{ fontSize: '0.85rem' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          title="Delete Subject"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border: '1px solid #fee2e2',
                            background: '#fff5f5',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className="fas fa-trash-alt" style={{ fontSize: '0.85rem' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredSubjects.map(s => {
            const deptName = s.dept?.name || s.department || 'General';
            const deptCode = s.dept?.deptCode || (s.dept?.code ? s.dept.code.substring(0, 3) : null);

            return (
              <div 
                key={s.id}
                className="portal-card"
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        background: '#f1f5f9', 
                        border: '1px solid #cbd5e1', 
                        padding: '3px 8px', 
                        borderRadius: 6,
                        fontSize: '0.82rem',
                        color: '#1e293b'
                      }}
                    >
                      {s.code || 'N/A'}
                    </span>
                    <span 
                      style={{ 
                        background: '#e0f2fe', 
                        color: '#0369a1', 
                        padding: '3px 8px', 
                        borderRadius: 6, 
                        fontSize: '0.75rem', 
                        fontWeight: 600
                      }}
                    >
                      {deptName} {deptCode ? `[${deptCode}]` : ''}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                    {s.name}
                  </h3>

                  {s.caWeight && s.examWeight && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
                      Weight: {s.caWeight}% CA / {s.examWeight}% Exam
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Assigned Teachers:
                    </div>
                    {s.activeTeachers && s.activeTeachers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {s.activeTeachers.map(at => (
                          <span 
                            key={at.id}
                            style={{
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {at.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No teacher currently assigned
                      </span>
                    )}
                  </div>
                </div>

                <div 
                  style={{ 
                    borderTop: '1px solid #f1f5f9', 
                    paddingTop: 12, 
                    marginTop: 16, 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    gap: 8
                  }}
                >
                  <button
                    onClick={() => s.canEdit !== false && handleOpenModal(s)}
                    disabled={s.canEdit === false}
                    className="portal-btn-ghost"
                    style={{ height: 36, padding: '0 12px', borderRadius: 8, fontSize: '0.82rem' }}
                  >
                    <i className="fas fa-edit mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="portal-btn-ghost"
                    style={{ height: 36, padding: '0 12px', borderRadius: 8, fontSize: '0.82rem', color: '#dc2626' }}
                  >
                    <i className="fas fa-trash-alt mr-1" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 540, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="close-modal">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="portal-label">Subject Name *</label>
                  <input 
                    className="portal-input" 
                    value={formData.name} 
                    required
                    placeholder="e.g. Mathematics or Computer Science"
                    style={{ height: 42, borderRadius: 8 }}
                    onChange={e => {
                      const name = e.target.value;
                      setFormData({
                        ...formData, 
                        name,
                        code: editingSubject ? formData.code : generateShortCode(name)
                      });
                    }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isUniversity ? '1fr 1fr' : '1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">Subject Code *</label>
                    <input 
                      className="portal-input" 
                      value={formData.code} 
                      placeholder="e.g. MATH101"
                      style={{ height: 42, borderRadius: 8, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {isUniversity && (
                    <div>
                      <label className="portal-label">Course Credits (Units)</label>
                      <input 
                        type="number"
                        className="portal-input" 
                        value={formData.credits} 
                        onChange={e => setFormData({ ...formData, credits: e.target.value })}
                        step="0.5"
                        min="0"
                        style={{ height: 42, borderRadius: 8 }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="portal-label">Department</label>
                  <select 
                    className="portal-select" 
                    value={formData.departmentId}
                    style={{ height: 42, borderRadius: 8 }}
                    onChange={e => {
                      const dept = departments.find(d => d.id === e.target.value);
                      setFormData({
                        ...formData, 
                        departmentId: e.target.value,
                        department: dept ? dept.name : ''
                      });
                    }}
                  >
                    <option value="">No Department (General / Universal)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} {d.deptCode ? `(${d.deptCode})` : ''}</option>
                    ))}
                  </select>
                </div>

                {isUniversity && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <input type="checkbox" checked={formData.isIndustrial} onChange={e => setFormData({...formData, isIndustrial: e.target.checked})} />
                        Industrial
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <input type="checkbox" checked={formData.isProject} onChange={e => setFormData({...formData, isProject: e.target.checked})} />
                        Project
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <input type="checkbox" checked={formData.isSubsidiary} onChange={e => setFormData({...formData, isSubsidiary: e.target.checked})} />
                        Subsidiary
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="portal-label">CA Weight (%)</label>
                        <input 
                          type="number" 
                          className="portal-input" 
                          value={formData.caWeight} 
                          style={{ height: 42, borderRadius: 8 }}
                          onChange={e => {
                            const ca = e.target.value;
                            setFormData({ ...formData, caWeight: ca, examWeight: (100 - parseInt(ca || '0')).toString() });
                          }}
                        />
                      </div>
                      <div>
                        <label className="portal-label">Exam Weight (%)</label>
                        <input 
                          type="number" 
                          className="portal-input" 
                          value={formData.examWeight} 
                          readOnly
                          style={{ height: 42, borderRadius: 8, background: '#f8fafc', color: '#64748b' }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="portal-btn-ghost"
                  style={{ height: 42, padding: '0 20px', borderRadius: 10 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="portal-btn-primary"
                  style={{ height: 42, padding: '0 24px', borderRadius: 10, fontWeight: 700 }}
                >
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
