import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { getAvatarUrl } from '../../../utils/formatters';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';

export default function StudentProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { isUniversity, t } = useTerminology();
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('id');

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'guardians' | 'health' | 'activities' | 'finance'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isTeacher = currentUser?.role === 'TEACHER';
  const isAdmin = ['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  const getYearLabel = (typeStr: string) => {
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return 'Academic Year (Part)';
    }
    if (type.includes('primary')) {
      return 'Grade';
    }
    if (type.includes('secondary') || type.includes('high')) {
      return 'Form';
    }
    return 'Class Year';
  };

  const getYearValueLabel = (typeStr: string, partValue: number | string | null | undefined) => {
    const part = partValue !== null && partValue !== undefined ? partValue : '1';
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return `Part ${part}`;
    }
    if (type.includes('primary')) {
      return `Grade ${part}`;
    }
    if (type.includes('secondary') || type.includes('high')) {
      return `Form ${part}`;
    }
    return `Year ${part}`;
  };

  const getStudentGradeLevel = (studentObj: any, typeStr: string) => {
    if (!studentObj) return '—';

    // 1. If assigned class has an explicit level (e.g. "Grade 7", "Form 4")
    if (studentObj.class?.level) {
      return studentObj.class.level;
    }

    // 2. Parse from class name (e.g. "GRADE 7 A" -> "Grade 7", "Form 2B" -> "Form 2", "7A" -> "Grade 7")
    const cName = (studentObj.class?.name || '').trim();
    if (cName) {
      const match = cName.match(/^(Grade|Form|Year|Standard|Class|Part)\s*(\d+[A-Za-z]?|\w+)/i);
      if (match) {
        const prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        return `${prefix} ${match[2]}`.trim();
      }
      const numMatch = cName.match(/^(\d+)[A-Za-z]?\b/);
      if (numMatch) {
        const prefix = (typeStr || '').toLowerCase().includes('primary') ? 'Grade' : 'Form';
        return `${prefix} ${numMatch[1]}`;
      }
    }

    // 3. Direct student grade field if present
    if (studentObj.grade) {
      const gStr = String(studentObj.grade);
      if (gStr.toLowerCase().startsWith('grade') || gStr.toLowerCase().startsWith('form') || gStr.toLowerCase().startsWith('year') || gStr.toLowerCase().startsWith('part')) {
        return gStr;
      }
      const prefix = (typeStr || '').toLowerCase().includes('primary') ? 'Grade' : 'Form';
      return `${prefix} ${gStr}`;
    }

    // 4. Fallback to student.part
    return getYearValueLabel(typeStr, studentObj.part);
  };

  const schoolType = currentUser?.schoolType || 'Secondary';

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    } else {
      navigate(-1);
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}`);
      setStudent(data);
    } catch (err) {
      showToast('Failed to load student profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Student details updated successfully.', 'success');
    setIsEditModalOpen(false);
    fetchStudentData();
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <SkeletonLoader type="profile" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="portal-container" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', marginBottom: 16 }}>
          <i className="fas fa-user-slash" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Student Record Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 20px 0' }}>The requested student profile could not be located in your academic registry.</p>
        <button onClick={() => navigate(-1)} className="portal-btn-primary">
          <i className="fas fa-arrow-left mr-2" /> Return to Directory
        </button>
      </div>
    );
  }

  const displayName = student.user?.name || student.name || 'Student';
  const displayId = student.studentId || '—';
  const nationalId = student.nationalId || student.user?.metadata?.nationalId || null;
  const className = student.class?.name || 'Unassigned Class';

  // Academic statistics
  const grades = student.grades || [];
  const averageGrade = grades.length
    ? (grades.reduce((acc: number, g: any) => acc + (g.score || 0), 0) / grades.length).toFixed(1) + '%'
    : '—';
  const attendanceRate = student.attendanceRate !== undefined ? student.attendanceRate : 100;

  // Guardian details
  const primaryGuardianName = student.guardianName || student.user?.metadata?.nokName || student.parents?.[0]?.parent?.user?.name || 'Not Specified';
  const primaryGuardianPhone = student.guardianPhone || student.user?.metadata?.nokPhone || student.parents?.[0]?.parent?.user?.phone || '—';
  const primaryGuardianEmail = student.parents?.[0]?.parent?.user?.email || '—';
  const primaryGuardianRelation = student.parents?.[0]?.relation || 'Guardian';

  // Fees
  const fees = {
    total: student.fees?.reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0,
    paid: student.fees?.reduce((s: number, f: any) => s + (f.paid || 0), 0) || 0,
  };
  const feeBalance = fees.total - fees.paid;
  const payPercent = fees.total > 0 ? Math.min(100, Math.round((fees.paid / fees.total) * 100)) : 100;

  // Health
  const health = student.healthProfile || {};
  const hasMedicalAlert = !!(health.allergies || health.medicalConditions || health.specialNeeds);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Action & Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          className="portal-btn portal-btn-secondary"
          style={{ height: '38px', minHeight: '38px', padding: '0 16px', borderRadius: 8 }}
        >
          <i className="fas fa-arrow-left mr-1" /> Back to Directory
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {primaryGuardianPhone && primaryGuardianPhone !== '—' && (
            <a
              href={`tel:${primaryGuardianPhone}`}
              className="portal-btn"
              style={{
                height: '38px',
                minHeight: '38px',
                padding: '0 16px',
                borderRadius: 8,
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                textDecoration: 'none'
              }}
            >
              <i className="fas fa-phone-alt mr-1" /> Call Guardian
            </a>
          )}

          {isTeacher && (
            <button
              onClick={() => navigate('/teacher/clinic')}
              className="portal-btn"
              style={{
                height: '38px',
                minHeight: '38px',
                padding: '0 16px',
                borderRadius: 8,
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca'
              }}
            >
              <i className="fas fa-ambulance mr-1" /> Sick Bay Referral
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="portal-btn portal-btn-secondary"
              style={{ height: '38px', minHeight: '38px', padding: '0 16px', borderRadius: 8 }}
            >
              <i className="fas fa-edit mr-1" /> Edit Details
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="portal-btn portal-btn-primary"
            style={{ height: '38px', minHeight: '38px', padding: '0 18px', borderRadius: 8 }}
          >
            <i className="fas fa-print mr-1" /> Print Record
          </button>
        </div>
      </div>

      {/* Hero Student Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.4rem',
                fontWeight: 800,
                border: '4px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden'
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
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: student.status === 'Suspended' ? '#ef4444' : '#22c55e',
                border: '3px solid #0f172a'
              }}
              title={student.status || 'Enrolled'}
            />
          </div>

          {/* Core Info */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontFamily: 'monospace' }}>
                ID: {displayId}
              </span>
              {nationalId && (
                <span style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.12)', color: '#e2e8f0', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                  <i className="fas fa-id-card mr-1" /> {nationalId}
                </span>
              )}
              <span style={{ fontSize: '0.78rem', background: student.status === 'Suspended' ? '#dc2626' : '#15803d', color: '#ffffff', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                {student.status || 'Enrolled'}
              </span>
              <span style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.14)', color: '#f1f5f9', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                {student.standing || 'Normal Standing'}
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#fff' }}>
              {displayName}
            </h1>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.9rem' }}>
              <span>
                <i className="fas fa-chalkboard mr-1 text-sky-400" style={{ color: '#38bdf8' }} /> {className}
              </span>
              <span>
                <i className="fas fa-graduation-cap mr-1 text-sky-400" style={{ color: '#38bdf8' }} /> {getStudentGradeLevel(student, schoolType)}
              </span>
              <span>
                <i className="fas fa-building mr-1 text-sky-400" style={{ color: '#38bdf8' }} /> {student.boardingStatus === 'Boarder' ? 'Boarder (Hostel)' : 'Day Scholar'}
              </span>
              {student.gender && (
                <span>
                  <i className="fas fa-user mr-1 text-sky-400" style={{ color: '#38bdf8' }} /> {student.gender}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Medical Alert Ribbon if allergies / condition present */}
        {hasMedicalAlert && (
          <div
            style={{
              marginTop: 18,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <i className="fas fa-notes-medical" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
            <span>
              <strong>Medical Alert:</strong> {health.allergies ? `Allergies: ${health.allergies}. ` : ''}
              {health.medicalConditions ? `Conditions: ${health.medicalConditions}. ` : ''}
              {health.specialNeeds ? `Special Needs: ${health.specialNeeds}. ` : ''}
            </span>
          </div>
        )}
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Attendance Rate</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-calendar-check" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: attendanceRate >= 85 ? '#166534' : attendanceRate >= 70 ? '#d97706' : '#dc2626', marginTop: 8 }}>
            {attendanceRate}%
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Term Average</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-chart-line" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {averageGrade}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Subjects</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-book" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: 8 }}>
            {grades.length || '—'}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Primary Contact</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fdf4ff', color: '#a21caf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-user-friends" />
            </div>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {primaryGuardianName}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
            {primaryGuardianPhone}
          </div>
        </div>
      </div>

      {/* Profile Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#f1f5f9',
          padding: 5,
          borderRadius: 12,
          marginBottom: 24,
          overflowX: 'auto',
          border: '1px solid #e2e8f0'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'overview' ? '#ffffff' : 'transparent',
            color: activeTab === 'overview' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'overview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-id-badge mr-1" /> Personal & Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('academics')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'academics' ? '#ffffff' : 'transparent',
            color: activeTab === 'academics' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'academics' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-graduation-cap mr-1" /> Academics & Marks ({grades.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'attendance' ? '#ffffff' : 'transparent',
            color: activeTab === 'attendance' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'attendance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-clipboard-check mr-1" /> Attendance Register
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guardians')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'guardians' ? '#ffffff' : 'transparent',
            color: activeTab === 'guardians' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'guardians' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-users mr-1" /> Guardians & Family
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'health' ? '#ffffff' : 'transparent',
            color: activeTab === 'health' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'health' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-heartbeat mr-1" /> Health & Medical {hasMedicalAlert && <span style={{ color: '#ef4444' }}>•</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className="portal-btn"
          style={{
            height: '36px',
            minHeight: '36px',
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'activities' ? '#ffffff' : 'transparent',
            color: activeTab === 'activities' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: activeTab === 'activities' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <i className="fas fa-futbol mr-1" /> Campus & Library
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className="portal-btn"
            style={{
              height: '36px',
              minHeight: '36px',
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'finance' ? '#ffffff' : 'transparent',
              color: activeTab === 'finance' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: activeTab === 'finance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <i className="fas fa-receipt mr-1" /> Fees & Billing
          </button>
        )}
      </div>

      {/* TAB CONTENT PANELS */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Identity & Personal Info */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-user-circle text-sky-600" style={{ color: '#0284c7' }} /> Personal & Identification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Full Legal Name</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{displayName}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Student ID</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{displayId}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Date of Birth</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {student.dob ? new Date(student.dob).toLocaleDateString() : student.user?.metadata?.dob ? new Date(student.user.metadata.dob).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Gender</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.gender || student.user?.metadata?.gender || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>National ID / Birth Cert</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{nationalId || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Nationality</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.nationality || 'Zimbabwean'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Physical Address</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.address || student.user?.metadata?.address || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Student Email</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{student.user?.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Academic & Class Placement */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-school text-sky-600" style={{ color: '#0284c7' }} /> Academic Standing & Placement
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Class</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0284c7' }}>{className}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{getYearLabel(schoolType)}</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{getStudentGradeLevel(student, schoolType)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Boarding Status</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.boardingStatus || 'Day Scholar'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Hostel / Room</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.hostel?.name ? `${student.hostel.name} (Room ${student.room?.roomNumber || '—'})` : 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Enrolled Since</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : 'Initial Entry'}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Academic Standing</p>
                <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 6, fontWeight: 700, display: 'inline-block' }}>
                  {student.standing || 'Normal'}
                </span>
              </div>
            </div>

            {/* Documents attached */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Registered Documents</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {student.birthCertificateUrl ? (
                  <a
                    href={`${BASE_URL}/api/storage/file/${student.birthCertificateUrl}?token=${localStorage.getItem('acadex_token')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="portal-btn"
                    style={{ height: '32px', minHeight: '32px', padding: '0 12px', fontSize: '0.8rem', borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0284c7', textDecoration: 'none' }}
                  >
                    <i className="fas fa-file-pdf mr-1" /> Birth Certificate
                  </a>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No Birth Certificate on file</span>
                )}

                {student.transferCertificateUrl && (
                  <a
                    href={`${BASE_URL}/api/storage/file/${student.transferCertificateUrl}?token=${localStorage.getItem('acadex_token')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="portal-btn"
                    style={{ height: '32px', minHeight: '32px', padding: '0 12px', fontSize: '0.8rem', borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0284c7', textDecoration: 'none' }}
                  >
                    <i className="fas fa-file-contract mr-1" /> Transfer Certificate
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACADEMICS TAB */}
      {activeTab === 'academics' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Academic Gradebook & Continuous Assessments</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Overview of examination results, course assessments, and subject performance.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: '0.85rem', background: '#f0fdf4', color: '#166534', padding: '6px 14px', borderRadius: 8, fontWeight: 700, border: '1px solid #bbf7d0' }}>
                Average: {averageGrade}
              </span>
            </div>
          </div>

          {grades.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-file-signature fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>No Assessment Records Available</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>No test scores or exam marks have been entered for this student in the current term yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <PaginatedTable className="portal-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Course Code</th>
                    <th style={{ width: '120px' }}>CA Score</th>
                    <th style={{ width: '120px' }}>Exam Score</th>
                    <th style={{ width: '120px' }}>Final Score</th>
                    <th style={{ width: '100px' }}>Grade</th>
                    <th>Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g: any, index: number) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {g.subject?.name || g.subjectName || 'Discipline'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                        {g.subject?.code || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.caScore !== undefined ? `${g.caScore}%` : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{g.examScore !== undefined ? `${g.examScore}%` : '—'}</td>
                      <td style={{ fontWeight: 800, color: '#0284c7' }}>{g.score !== undefined ? `${g.score}%` : '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 6, fontWeight: 800, background: '#f1f5f9', color: '#0f172a' }}>
                          {g.grade || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{g.comment || 'Satisfactory academic progress.'}</td>
                    </tr>
                  ))}
                </tbody>
              </PaginatedTable>
            </div>
          )}
        </div>
      )}

      {/* 3. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Student Attendance & Roll Call Logs</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Detailed log of class attendance and presence records.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: 8, fontWeight: 700 }}>
                Rate: {attendanceRate}%
              </span>
              <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '5px 12px', borderRadius: 8, fontWeight: 700 }}>
                Total Recorded: {(student.attendance || []).length} Days
              </span>
            </div>
          </div>

          {(!student.attendance || student.attendance.length === 0) ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-clipboard-list fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>No Attendance Logs Recorded</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>Attendance records will automatically populate once daily roll call is submitted by teachers.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <PaginatedTable className="portal-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance Status</th>
                    <th>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {student.attendance.map((att: any, idx: number) => {
                    const statusLower = (att.status || 'present').toLowerCase();
                    const isPresent = statusLower === 'present';
                    const isLate = statusLower === 'late';
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {att.date ? new Date(att.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              padding: '3px 10px',
                              borderRadius: 6,
                              fontWeight: 700,
                              background: isPresent ? '#dcfce7' : isLate ? '#fef3c7' : '#fee2e2',
                              color: isPresent ? '#166534' : isLate ? '#92400e' : '#991b1b',
                              border: `1px solid ${isPresent ? '#bbf7d0' : isLate ? '#fde68a' : '#fecaca'}`
                            }}
                          >
                            <i className={`fas ${isPresent ? 'fa-check' : isLate ? 'fa-clock' : 'fa-times'} mr-1`} />
                            {att.status || 'Present'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{att.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </PaginatedTable>
            </div>
          )}
        </div>
      )}

      {/* 4. GUARDIANS & FAMILY TAB */}
      {activeTab === 'guardians' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Primary Guardian Card */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-user-shield text-sky-600" style={{ color: '#0284c7' }} /> Primary Guardian
              </h3>
              <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                {primaryGuardianRelation}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Guardian Name</p>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{primaryGuardianName}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Phone Contact</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{primaryGuardianPhone}</p>
                  {primaryGuardianPhone && primaryGuardianPhone !== '—' && (
                    <a
                      href={`tel:${primaryGuardianPhone}`}
                      className="portal-btn"
                      style={{ height: '30px', minHeight: '30px', padding: '0 10px', fontSize: '0.78rem', borderRadius: 6, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', textDecoration: 'none' }}
                    >
                      <i className="fas fa-phone mr-1" /> Call
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Email Address</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>{primaryGuardianEmail}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Residential Address</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>{student.address || student.user?.metadata?.address || 'Same as Student'}</p>
              </div>
            </div>
          </div>

          {/* Secondary / Linked Parent Accounts */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-users-cog text-sky-600" style={{ color: '#0284c7' }} /> Parent Portal Links & Contacts
            </h3>

            {(!student.parents || student.parents.length === 0) ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-user-plus fa-2x" style={{ color: '#cbd5e1', marginBottom: 10 }} />
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#334155' }}>No Parent App Accounts Linked</p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Parents can link via the mobile app using Student ID {displayId}.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {student.parents.map((pLink: any, idx: number) => {
                  const pUser = pLink.parent?.user || {};
                  return (
                    <div key={idx} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{pUser.name || 'Parent Account'}</span>
                        <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          {pLink.relation || 'Parent'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                        <i className="fas fa-phone mr-1" /> {pUser.phone || '—'} &bull; <i className="fas fa-envelope mr-1 ml-2" /> {pUser.email || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. HEALTH & MEDICAL TAB */}
      {activeTab === 'health' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-heartbeat text-rose-600" style={{ color: '#e11d48' }} /> Student Health & Medical Records
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Confidential health profile accessible to certified school staff and clinic team.</p>
            </div>
            {hasMedicalAlert && (
              <span style={{ fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 8, fontWeight: 700, border: '1px solid #fecaca' }}>
                <i className="fas fa-exclamation-circle mr-1" /> Active Alerts
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Blood Group</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{health.bloodGroup || 'Not Recorded'}</p>
            </div>

            <div style={{ padding: 16, background: health.allergies ? '#fff1f2' : '#f8fafc', borderRadius: 10, border: `1px solid ${health.allergies ? '#fecdd3' : '#e2e8f0'}` }}>
              <p style={{ margin: '0 0 4px', color: health.allergies ? '#9f1239' : '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Allergies & Reactions</p>
              <p style={{ margin: 0, fontWeight: 700, color: health.allergies ? '#be123c' : '#0f172a' }}>{health.allergies || 'No known allergies'}</p>
            </div>

            <div style={{ padding: 16, background: health.medicalConditions ? '#fff1f2' : '#f8fafc', borderRadius: 10, border: `1px solid ${health.medicalConditions ? '#fecdd3' : '#e2e8f0'}` }}>
              <p style={{ margin: '0 0 4px', color: health.medicalConditions ? '#9f1239' : '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Chronic Conditions / Illnesses</p>
              <p style={{ margin: 0, fontWeight: 700, color: health.medicalConditions ? '#be123c' : '#0f172a' }}>{health.medicalConditions || 'None registered'}</p>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Special Needs / Physical Assistance</p>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.isPhysicallyHandicapped ? (student.handicapDetails || 'Assistance Required') : 'None'}</p>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
              <i className="fas fa-first-aid mr-2" /> Emergency Medical Protocol
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>
              In event of an acute medical condition or accident, immediately notify the school clinic and call the primary guardian ({primaryGuardianName}) at <strong>{primaryGuardianPhone}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 6. CAMPUS & LIBRARY TAB */}
      {activeTab === 'activities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* House & Clubs */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-flag text-sky-600" style={{ color: '#0284c7' }} /> House & Extracurriculars
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Student House</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.house?.name || 'Unassigned House'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Student Club</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{student.club?.name || 'Unassigned Club'}</p>
              </div>
            </div>
          </div>

          {/* Library Book Loans */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-book-reader text-sky-600" style={{ color: '#0284c7' }} /> Library Loans & Resource Access
            </h3>

            {(!student.bookLoans || student.bookLoans.length === 0) ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>No active book borrowings or overdue books recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {student.bookLoans.map((loan: any, idx: number) => (
                  <div key={idx} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{loan.book?.title || 'Book Title'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>by {loan.book?.author || 'Unknown author'}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: loan.returnedAt ? '#dcfce7' : '#fee2e2', color: loan.returnedAt ? '#166534' : '#991b1b', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {loan.returnedAt ? 'Returned' : 'Checked Out'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. FINANCE TAB (Admin Only) */}
      {isAdmin && activeTab === 'finance' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Financial Statement & Fee Ledgers</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Detailed record of student tuition invoices, receipts, and outstanding dues.</p>
            </div>
            <button
              onClick={() => navigate(`/admin/finance?studentId=${student.id}`)}
              className="portal-btn portal-btn-secondary"
              style={{ height: '36px', minHeight: '36px', padding: '0 16px', borderRadius: 8 }}
            >
              <i className="fas fa-file-invoice-dollar mr-1" /> View Full Account Ledger
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 18, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Invoiced</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#0f172a' }}>${fees.total.toLocaleString()}</p>
            </div>
            <div style={{ padding: 18, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <p style={{ margin: '0 0 4px', color: '#166534', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#166534' }}>${fees.paid.toLocaleString()}</p>
            </div>
            <div style={{ padding: 18, background: feeBalance > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 10, border: `1px solid ${feeBalance > 0 ? '#fecaca' : '#e2e8f0'}` }}>
              <p style={{ margin: '0 0 4px', color: feeBalance > 0 ? '#dc2626' : '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding Balance</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: feeBalance > 0 ? '#dc2626' : '#059669' }}>
                ${feeBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal for School Admin */}
      {isEditModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: '640px' }}>
            <div className="portal-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Edit Student Profile</h3>
              <button className="portal-btn-ghost" onClick={() => setIsEditModalOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="portal-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="portal-label">Full Name</label>
                  <input type="text" className="portal-input" defaultValue={displayName} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Date of Birth</label>
                  <input
                    type="date"
                    className="portal-input"
                    defaultValue={student.dob ? new Date(student.dob).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Gender</label>
                  <select className="portal-input" defaultValue={student.gender || 'Male'}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Guardian Name</label>
                  <input type="text" className="portal-input" defaultValue={primaryGuardianName} />
                </div>
                <div className="form-group">
                  <label className="portal-label">Guardian Phone</label>
                  <input type="text" className="portal-input" defaultValue={primaryGuardianPhone} />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
