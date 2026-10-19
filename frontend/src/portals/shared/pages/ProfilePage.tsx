import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api, { BASE_URL } from '../../../lib/api';
import { getAvatarUrl } from '../../../utils/formatters';
import ActiveSessions from '../../../components/shared/ActiveSessions';
import { SkeletonLoader } from '../../../components/shared';
import '../../../styles/portal.css';

export default function ProfilePage() {
  const { user, refreshUser, updateUser, activeEntity } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'payroll' | 'idcard' | 'history' | 'security'>('overview');

  // Avatar Upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Edit Modals
  const [editingSection, setEditingSection] = useState<'personal' | 'contact' | 'emergency' | 'payroll' | 'security' | null>(null);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Banking & HR Form
  const [hrForm, setHrForm] = useState({
    designation: '',
    jobTitle: '',
    contractType: 'Permanent',
    bloodGroup: '',
    bankName: '',
    bankBranch: '',
    branchCode: '',
    accountNumber: '',
    accountHolderName: '',
    accountType: 'Checking',
    bankNameZig: '',
    bankBranchZig: '',
    branchCodeZig: '',
    accountNumberZig: '',
    accountHolderNameZig: '',
    accountTypeZig: 'Checking',
    facebookLink: '',
    linkedinLink: '',
    twitterLink: ''
  });

  const isParent = user?.role === 'PARENT';
  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER';
  const isStaff = !isStudent && !isParent;

  const childLink = profileData?.parent?.students?.find(
    (ps: any) => ps.studentId === activeEntity?.id || ps.student?.id === activeEntity?.id
  ) || profileData?.parent?.students?.[0];

  const targetStudent = isParent ? (childLink?.student || (activeEntity ? {
    name: activeEntity.name,
    studentId: (activeEntity as any).studentId || (activeEntity as any).code || 'N/A',
    class: { name: (activeEntity as any).className || (activeEntity as any).class || 'Enrolled' },
    school: { name: activeEntity.schoolName }
  } : null)) : profileData?.student;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setFetchingProfile(true);
      const { data } = await api.get('/api/users/me');
      setProfileData(data);

      if (data?.employeeProfile) {
        setHrForm({
          designation: data.employeeProfile.designation || '',
          jobTitle: data.employeeProfile.jobTitle || '',
          contractType: data.employeeProfile.contractType || 'Permanent',
          bloodGroup: data.employeeProfile.bloodGroup || '',
          bankName: data.employeeProfile.bankName || '',
          bankBranch: data.employeeProfile.bankBranch || '',
          branchCode: data.employeeProfile.branchCode || '',
          accountNumber: data.employeeProfile.accountNumber || '',
          accountHolderName: data.employeeProfile.accountHolderName || '',
          accountType: data.employeeProfile.accountType || 'Checking',
          bankNameZig: data.employeeProfile.bankNameZig || '',
          bankBranchZig: data.employeeProfile.bankBranchZig || '',
          branchCodeZig: data.employeeProfile.branchCodeZig || '',
          accountNumberZig: data.employeeProfile.accountNumberZig || '',
          accountHolderNameZig: data.employeeProfile.accountHolderNameZig || '',
          accountTypeZig: data.employeeProfile.accountTypeZig || 'Checking',
          facebookLink: data.employeeProfile.facebookLink || '',
          linkedinLink: data.employeeProfile.linkedinLink || '',
          twitterLink: data.employeeProfile.twitterLink || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      showToast('Failed to load profile from database', 'error');
    } finally {
      setFetchingProfile(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async () => {
    if (!avatarFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await api.put('/api/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Profile photo updated successfully', 'success');
      setAvatarFile(null);
      setAvatarPreview(null);
      const updatedAvatar = res.data?.avatar;
      const updatedTimestamp = res.data?.updatedAt || new Date().toISOString();
      if (updatedAvatar) {
        updateUser({ avatar: updatedAvatar, updatedAt: updatedTimestamp });
        setProfileData((prev: any) => ({ ...prev, avatar: updatedAvatar, updatedAt: updatedTimestamp }));
      }
      await refreshUser();
      fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update photo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (sectionData: any) => {
    setLoading(true);
    try {
      await api.put('/api/users/me', sectionData);
      showToast('Profile updated successfully in database', 'success');
      await refreshUser();
      setAvatarPreview(null);
      setEditingSection(null);
      fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }
    if (passwordForm.newPassword.length < 8) {
      return showToast('Password must be at least 8 characters long', 'warning');
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('Password changed successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditingSection(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintIDCard = () => {
    window.print();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
      case 'ADMIN':
        return { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' };
      case 'TEACHER':
        return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'BURSAR':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'LIBRARIAN':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'ANCILLARY':
        return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
      case 'NURSE':
      case 'CLINIC':
        return { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' };
      case 'STUDENT':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const roleStyle = getRoleBadgeColor(profileData?.role || user?.role || '');

  // Sub-component for an information row with clean styling
  const InfoCardItem = ({ label, value, icon, subtext }: { label: string; value: any; icon?: string; subtext?: string }) => {
    let displayVal = '—';
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object') {
        displayVal = value.name || value.title || value.code || '—';
      } else {
        displayVal = String(value);
      }
    }
    return (
      <div 
        style={{
          padding: '16px 20px',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '84px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {icon && <i className={icon} style={{ color: '#0284c7' }}></i>}
          {label}
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-word', marginTop: '4px' }}>
          {displayVal}
        </div>
        {subtext && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{subtext}</div>}
      </div>
    );
  };

  if (fetchingProfile && !profileData) {
    return (
      <div className="portal-container" style={{ padding: '24px 0' }}>
        <SkeletonLoader type="profile" />
      </div>
    );
  }

  const pData = profileData || user;
  const staffId = pData?.staffId || (pData?.employeeProfile?.staffId) || targetStudent?.studentId || 'N/A';
  const departmentName = pData?.dept?.name || pData?.teacher?.department || (pData?.employeeProfile?.department) || 'Institutional Services';
  const jobTitle = pData?.employeeProfile?.jobTitle || pData?.employeeProfile?.designation || pData?.role;

  return (
    <div className="portal-container" style={{ paddingBottom: '60px' }}>
      {/* Print target style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-digital-pass, #printable-digital-pass * {
            visibility: visible;
          }
          #printable-digital-pass {
            position: absolute;
            left: 50%;
            top: 20%;
            transform: translate(-50%, -20%);
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
        }
      `}</style>

      {/* Hero Profile Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          color: '#ffffff',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar with Camera Trigger */}
            <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#2563eb',
                  border: '4px solid #ffffff',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#ffffff'
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (pData?.avatar || user?.avatar) ? (
                  <img 
                    src={getAvatarUrl(pData?.avatar || user?.avatar, user?.schoolCode, pData?.updatedAt || Date.now()) || ''} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  (pData?.name || 'User').substring(0, 2).toUpperCase()
                )}
              </div>

              {!isParent && (
                <label 
                  htmlFor="profile-avatar-upload" 
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#0284c7',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    border: '2px solid #ffffff'
                  }}
                  title="Upload New Photo"
                >
                  <i className="fas fa-camera"></i>
                  <input id="profile-avatar-upload" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            {/* Identity Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span 
                  style={{
                    background: roleStyle.bg,
                    color: roleStyle.color,
                    border: `1px solid ${roleStyle.border}`,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  {isParent ? 'Parent / Guardian' : pData?.role}
                </span>

                {staffId !== 'N/A' && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>
                    ID: {staffId}
                  </span>
                )}

                {pData?.employeeProfile?.contractType && (
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                    <i className="fas fa-check-circle mr-1"></i>{pData.employeeProfile.contractType}
                  </span>
                )}
              </div>

              <h1 style={{ margin: '0 0 4px 0', fontSize: '2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {isParent ? (activeEntity?.name || targetStudent?.name || pData?.name) : pData?.name}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.9rem' }}>
                <span><i className="fas fa-envelope mr-2"></i>{pData?.email}</span>
                {pData?.phone && <span><i className="fas fa-phone mr-2"></i>{pData?.phone}</span>}
                <span><i className="fas fa-building mr-2"></i>{departmentName}</span>
                <span><i className="fas fa-school mr-2"></i>{user?.schoolName || 'Main Campus'}</span>
              </div>

              {avatarPreview && (
                <button
                  onClick={handleSavePhoto}
                  disabled={loading}
                  style={{
                    marginTop: '12px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Saving Photo...' : 'Confirm & Save New Photo'}
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setEditingSection('personal')}
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-user-edit"></i>
              Edit Profile
            </button>

            <button
              onClick={() => setActiveTab('idcard')}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
              }}
            >
              <i className="fas fa-id-card"></i>
              Digital ID Pass
            </button>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'overview' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'overview' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-user-check"></i>
          Overview & Bio
        </button>

        {isStaff && (
          <button
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'assignments' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'assignments' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'assignments' ? 800 : 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px'
            }}
          >
            <i className="fas fa-briefcase"></i>
            {isTeacher ? 'Teaching Classes & Subjects' : 'Institutional Assignments'}
          </button>
        )}

        {isStaff && (
          <button
            onClick={() => setActiveTab('payroll')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'payroll' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'payroll' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'payroll' ? 800 : 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px'
            }}
          >
            <i className="fas fa-money-check-alt"></i>
            HR & Dual Banking (USD & ZiG)
          </button>
        )}

        <button
          onClick={() => setActiveTab('idcard')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'idcard' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'idcard' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'idcard' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-id-badge"></i>
          Digital Security ID Pass
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'history' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'history' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-award"></i>
          Awards & Gate Access
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'security' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'security' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-shield-alt"></i>
          Security & Password
        </button>
      </div>

      {/* TAB 1: OVERVIEW & BIO */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Personal Information Card */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-user-circle" style={{ color: '#0284c7' }}></i>
                Personal & Biographical Record
              </h3>
              <button 
                onClick={() => setEditingSection('personal')} 
                className="portal-btn-ghost"
                style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}
              >
                <i className="fas fa-edit mr-1"></i> Edit Info
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <InfoCardItem label="Legal Name" value={pData?.name} icon="fas fa-user" />
              <InfoCardItem label="Staff ID / Admission #" value={staffId} icon="fas fa-id-badge" />
              <InfoCardItem label="Gender" value={pData?.student?.gender || pData?.metadata?.gender || 'Not Specified'} icon="fas fa-venus-mars" />
              <InfoCardItem label="Date of Birth" value={formatDate(pData?.student?.dob || pData?.metadata?.dob)} icon="fas fa-birthday-cake" />
              <InfoCardItem label="National ID / Birth Cert" value={pData?.metadata?.nationalId || pData?.student?.nationalId} icon="fas fa-fingerprint" />
              <InfoCardItem label="Religion" value={pData?.religion || pData?.metadata?.religion} icon="fas fa-praying-hands" />
              <InfoCardItem label="Blood Group" value={pData?.employeeProfile?.bloodGroup || pData?.metadata?.bloodGroup} icon="fas fa-tint" />
              <InfoCardItem label="Member Since" value={formatDate(pData?.createdAt)} icon="fas fa-calendar-check" />
            </div>

            {pData?.metadata?.bio && (
              <div style={{ marginTop: '20px', padding: '16px 20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Professional Bio / Summary
                </div>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', lineHeight: 1.6 }}>
                  {pData.metadata.bio}
                </p>
              </div>
            )}
          </div>

          {/* Contact Details Card */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-address-book" style={{ color: '#059669' }}></i>
                Official Contact & Location
              </h3>
              <button 
                onClick={() => setEditingSection('contact')} 
                className="portal-btn-ghost"
                style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}
              >
                <i className="fas fa-edit mr-1"></i> Edit Contact
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <InfoCardItem label="Official Email" value={pData?.email} icon="fas fa-envelope" />
              <InfoCardItem label="Mobile Phone" value={pData?.phone} icon="fas fa-phone-alt" />
              <InfoCardItem label="Physical Residential Address" value={pData?.metadata?.address || pData?.student?.address} icon="fas fa-map-marker-alt" />
              <InfoCardItem label="Assigned Department" value={departmentName} icon="fas fa-building" />
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-ambulance" style={{ color: '#dc2626' }}></i>
                Emergency Contact & Next of Kin
              </h3>
              <button 
                onClick={() => setEditingSection('emergency')} 
                className="portal-btn-ghost"
                style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626' }}
              >
                <i className="fas fa-edit mr-1"></i> Update Emergency
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <InfoCardItem label="Emergency Contact Name" value={pData?.metadata?.emergencyName} icon="fas fa-user-shield" />
              <InfoCardItem label="Relationship" value={pData?.metadata?.emergencyRelation} icon="fas fa-heart" />
              <InfoCardItem label="Emergency Phone" value={pData?.metadata?.emergencyPhone} icon="fas fa-phone-square" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSTITUTIONAL ASSIGNMENTS (TEACHER / STAFF) */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Teacher Specific Subjects & Classes */}
          {isTeacher && (
            <>
              <div className="portal-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-book-reader" style={{ color: '#2563eb' }}></i>
                  Assigned Teaching Subjects ({pData?.teacher?.subjects?.length || 0})
                </h3>

                {pData?.teacher?.subjects?.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    {pData.teacher.subjects.map((s: any, idx: number) => (
                      <div key={idx} style={{ padding: '16px', background: '#eff6ff', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8' }}>SUBJECT #{idx + 1}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>
                          {s.subject?.name}
                        </div>
                        {s.subject?.code && (
                          <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {s.subject.code}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', margin: 0 }}>No specific teaching subjects assigned yet.</p>
                )}
              </div>

              <div className="portal-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-chalkboard-teacher" style={{ color: '#059669' }}></i>
                  Form Classes & Direct Student Supervision
                </h3>

                {pData?.teacher?.classes?.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    {pData.teacher.classes.map((cls: any, idx: number) => (
                      <div key={idx} style={{ padding: '16px', background: '#ecfdf5', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#047857' }}>CLASS TEACHER</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#064e3b', marginTop: '4px' }}>
                          {cls.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '2px' }}>
                          Level: {cls.level}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', margin: 0 }}>You are not currently designated as a primary Form Teacher.</p>
                )}
              </div>
            </>
          )}

          {/* General Staff / Institutional Role Overview */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 18px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-sitemap" style={{ color: '#7c3aed' }}></i>
              Institutional Scope & Authorities
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <InfoCardItem label="Primary Role" value={pData?.role} icon="fas fa-user-tag" />
              <InfoCardItem label="Job Designation" value={jobTitle} icon="fas fa-briefcase" />
              <InfoCardItem label="Primary Department" value={departmentName} icon="fas fa-building" />
              <InfoCardItem label="Secondary Authorities" value={pData?.secondaryRoles?.join(', ') || 'None'} icon="fas fa-shield-alt" />
              <InfoCardItem label="Contract Tenure" value={pData?.employeeProfile?.contractType || 'Permanent'} icon="fas fa-file-contract" />
              <InfoCardItem label="Qualifications" value={pData?.metadata?.qualification || pData?.teacher?.qualification || 'Verified on File'} icon="fas fa-graduation-cap" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HR & DUAL PAYROLL BANKING (USD & ZIG) */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div className="portal-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-university" style={{ color: '#0284c7' }}></i>
                  Dual Currency Payroll Accounts (USD & ZiG)
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  Banking particulars registered with school bursary and payroll processing.
                </p>
              </div>

              <button
                onClick={() => setEditingSection('payroll')}
                className="portal-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                <i className="fas fa-edit mr-2"></i>Update Banking Details
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* USD Account Card */}
              <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase' }}>
                    <i className="fas fa-dollar-sign mr-1"></i> USD Account
                  </span>
                  <span className="portal-badge info">Active</span>
                </div>

                <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Bank Name:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{pData?.employeeProfile?.bankName || 'Not Registered'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Account Number:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {pData?.employeeProfile?.accountNumber || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Account Holder:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{pData?.employeeProfile?.accountHolderName || pData?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Bank Branch:</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{pData?.employeeProfile?.bankBranch || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Branch Code:</span>
                    <span style={{ fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>{pData?.employeeProfile?.branchCode || '—'}</span>
                  </div>
                </div>
              </div>

              {/* ZiG Account Card */}
              <div style={{ padding: '20px', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>
                    <i className="fas fa-coins mr-1"></i> ZiG Local Account
                  </span>
                  <span className="portal-badge warning">Active</span>
                </div>

                <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Bank Name:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{pData?.employeeProfile?.bankNameZig || 'Not Registered'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Account Number:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {pData?.employeeProfile?.accountNumberZig || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Account Holder:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{pData?.employeeProfile?.accountHolderNameZig || pData?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Bank Branch:</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{pData?.employeeProfile?.bankBranchZig || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Branch Code:</span>
                    <span style={{ fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>{pData?.employeeProfile?.branchCodeZig || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links & Web Profiles */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-globe" style={{ color: '#059669' }}></i>
              Professional Links & Social Media
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <InfoCardItem label="LinkedIn" value={pData?.employeeProfile?.linkedinLink} icon="fab fa-linkedin" />
              <InfoCardItem label="Facebook" value={pData?.employeeProfile?.facebookLink} icon="fab fa-facebook" />
              <InfoCardItem label="Twitter / X" value={pData?.employeeProfile?.twitterLink} icon="fab fa-twitter" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIGITAL ID CARD & SECURITY PASS */}
      {activeTab === 'idcard' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div 
            id="printable-digital-pass"
            style={{
              width: '420px',
              maxWidth: '100%',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '24px',
              border: '2px solid #e2e8f0',
              boxShadow: '0 16px 36px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Top Color Banner */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '24px',
                textAlign: 'center',
                color: '#fff',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.12em', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px' }}>
                {user?.schoolName || 'CAMPUS SECURITY PASS'}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                OFFICIAL IDENTITY PASS
              </h2>
            </div>

            {/* Photo & Details */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div 
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  margin: '-50px auto 16px auto',
                  border: '5px solid #ffffff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#fff',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {(pData?.avatar || user?.avatar) ? (
                  <img 
                    src={getAvatarUrl(pData?.avatar || user?.avatar, user?.schoolCode, pData?.updatedAt || Date.now()) || ''} 
                    alt="Photo" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  (pData?.name || 'User').substring(0, 2).toUpperCase()
                )}
              </div>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                {pData?.name}
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>
                {jobTitle}
              </p>

              <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '20px' }}>
                <span 
                  style={{
                    background: roleStyle.bg,
                    color: roleStyle.color,
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}
                >
                  {pData?.role}
                </span>

                <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace' }}>
                  {staffId}
                </span>
              </div>

              {/* Barcode Strip */}
              <div style={{ margin: '16px auto', padding: '12px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                <svg width="240" height="40" viewBox="0 0 240 40">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <rect 
                      key={i} 
                      x={i * 5.6} 
                      y="0" 
                      width={(i % 3 === 0 ? 3.5 : i % 2 === 0 ? 2 : 1)} 
                      height="40" 
                      fill="#0f172a" 
                    />
                  ))}
                </svg>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', marginTop: '4px', letterSpacing: '0.15em' }}>
                  *{staffId}*
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                Verified Institutional Identity Pass • Non-Transferable
              </div>
            </div>
          </div>

          <button
            onClick={handlePrintIDCard}
            className="portal-btn-primary"
            style={{
              padding: '12px 28px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <i className="fas fa-print"></i>
            Print Physical ID Badge
          </button>
        </div>
      )}

      {/* TAB 5: AWARDS, CUSTODY ASSETS & GATE ACCESS LOGS */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Awards & Recognitions */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-medal" style={{ color: '#d97706' }}></i>
              Institutional Awards & Recognitions ({pData?.awards?.length || 0})
            </h3>

            {pData?.awards?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {pData.awards.map((award: any, idx: number) => (
                  <div key={idx} style={{ padding: '16px', background: '#fef3c7', borderRadius: '14px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309' }}>HONOR #{idx + 1}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#78350f', marginTop: '4px' }}>
                      {award.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '2px' }}>
                      {award.category} • Year {award.year || new Date(award.createdAt).getFullYear()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No official awards logged in your institutional file yet.</p>
            )}
          </div>

          {/* Assigned Equipment / Custody Assets */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-boxes" style={{ color: '#0284c7' }}></i>
              Equipment in Your Custody ({pData?.assignedAssets?.length || 0})
            </h3>

            {pData?.assignedAssets?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {pData.assignedAssets.map((asset: any, idx: number) => (
                  <div key={idx} style={{ padding: '16px', background: '#f0f9ff', borderRadius: '14px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>
                      {asset.assetTag || 'NO TAG'}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0c4a6e', marginTop: '4px' }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '2px' }}>
                      {asset.category} • {asset.location || 'Assigned'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No institutional assets currently allocated under your personal custody.</p>
            )}
          </div>

          {/* Recent Campus Gate Access */}
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-torii-gate" style={{ color: '#059669' }}></i>
              Recent Campus Turnstile / Gate Scans
            </h3>

            {pData?.gateLogs?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="portal-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Direction</th>
                      <th>Gate Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pData.gateLogs.map((log: any, idx: number) => (
                      <tr key={idx}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`portal-badge ${log.direction === 'IN' ? 'success' : 'info'}`}>
                            {log.direction === 'IN' ? 'CHECK-IN' : 'CHECK-OUT'}
                          </span>
                        </td>
                        <td>{log.gateName || 'Main Campus Gate'}</td>
                        <td>
                          <span className="portal-badge success">Approved</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No recent campus gate scans recorded for your account.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-key" style={{ color: '#7c3aed' }}></i>
              Change Account Password
            </h3>

            <form onSubmit={handleChangePassword} style={{ maxWidth: '480px', display: 'grid', gap: '16px' }}>
              <div>
                <label className="portal-label">Current Password *</label>
                <input
                  type="password"
                  className="portal-input"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="portal-label">New Password (at least 8 chars) *</label>
                <input
                  type="password"
                  className="portal-input"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="portal-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="portal-input"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ padding: '12px 24px', fontWeight: 800 }}
                disabled={loading}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="portal-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-desktop" style={{ color: '#0284c7' }}></i>
              Active Browser Sessions
            </h3>
            <ActiveSessions />
          </div>
        </div>
      )}

      {/* EDIT PERSONAL INFO MODAL */}
      {editingSection === 'personal' && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '640px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Personal Details</h2>
              <button className="portal-btn-ghost" onClick={() => setEditingSection(null)}>&times;</button>
            </div>

            <form onSubmit={(e: any) => {
              e.preventDefault();
              const f = new FormData(e.target);
              handleUpdateProfile({
                name: f.get('name'),
                dob: f.get('dob'),
                gender: f.get('gender'),
                religion: f.get('religion'),
                nationalId: f.get('nationalId'),
                bio: f.get('bio'),
                qualification: f.get('qualification')
              });
            }}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="portal-label">Full Legal Name *</label>
                    <input name="name" className="portal-input" defaultValue={pData?.name} required />
                  </div>

                  <div>
                    <label className="portal-label">Gender</label>
                    <select name="gender" className="portal-input" defaultValue={pData?.metadata?.gender || 'Male'}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="portal-label">Date of Birth</label>
                    <input name="dob" type="date" className="portal-input" defaultValue={pData?.student?.dob?.split('T')[0] || pData?.metadata?.dob?.split('T')[0]} />
                  </div>

                  <div>
                    <label className="portal-label">Religion</label>
                    <input name="religion" className="portal-input" defaultValue={pData?.religion || pData?.metadata?.religion} />
                  </div>
                </div>

                <div>
                  <label className="portal-label">National ID / Birth Certificate Number</label>
                  <input name="nationalId" className="portal-input" defaultValue={pData?.metadata?.nationalId || pData?.student?.nationalId} placeholder="e.g. 63-1234567-X-42" />
                </div>

                <div>
                  <label className="portal-label">Academic / Professional Qualifications</label>
                  <input name="qualification" className="portal-input" defaultValue={pData?.metadata?.qualification || pData?.teacher?.qualification} placeholder="e.g. B.Ed Mathematics, M.Sc Education" />
                </div>

                <div>
                  <label className="portal-label">Professional Bio / Summary</label>
                  <textarea name="bio" className="portal-input" rows={3} defaultValue={pData?.metadata?.bio} placeholder="Brief summary of experience, teaching philosophy, or role..." />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setEditingSection(null)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTACT MODAL */}
      {editingSection === 'contact' && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '540px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Contact Information</h2>
              <button className="portal-btn-ghost" onClick={() => setEditingSection(null)}>&times;</button>
            </div>

            <form onSubmit={(e: any) => {
              e.preventDefault();
              const f = new FormData(e.target);
              handleUpdateProfile({
                email: f.get('email'),
                phone: f.get('phone'),
                address: f.get('address')
              });
            }}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label className="portal-label">Email Address *</label>
                  <input name="email" type="email" className="portal-input" defaultValue={pData?.email} required />
                </div>

                <div>
                  <label className="portal-label">Mobile Phone Number</label>
                  <input name="phone" type="tel" className="portal-input" defaultValue={pData?.phone} />
                </div>

                <div>
                  <label className="portal-label">Physical Residential Address</label>
                  <textarea name="address" className="portal-input" rows={3} defaultValue={pData?.metadata?.address || pData?.student?.address} />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setEditingSection(null)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMERGENCY MODAL */}
      {editingSection === 'emergency' && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '540px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Update Emergency Contact</h2>
              <button className="portal-btn-ghost" onClick={() => setEditingSection(null)}>&times;</button>
            </div>

            <form onSubmit={(e: any) => {
              e.preventDefault();
              const f = new FormData(e.target);
              handleUpdateProfile({
                emergencyName: f.get('emergencyName'),
                emergencyRelation: f.get('emergencyRelation'),
                emergencyPhone: f.get('emergencyPhone')
              });
            }}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label className="portal-label">Next of Kin / Contact Name *</label>
                  <input name="emergencyName" className="portal-input" defaultValue={pData?.metadata?.emergencyName} required />
                </div>

                <div>
                  <label className="portal-label">Relationship (e.g. Spouse, Parent, Sibling)</label>
                  <input name="emergencyRelation" className="portal-input" defaultValue={pData?.metadata?.emergencyRelation} />
                </div>

                <div>
                  <label className="portal-label">Emergency Phone Number *</label>
                  <input name="emergencyPhone" type="tel" className="portal-input" defaultValue={pData?.metadata?.emergencyPhone} required />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setEditingSection(null)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Emergency Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HR & PAYROLL BANKING MODAL */}
      {editingSection === 'payroll' && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Update Payroll & Banking Details</h2>
              <button className="portal-btn-ghost" onClick={() => setEditingSection(null)}>&times;</button>
            </div>

            <form onSubmit={(e: any) => {
              e.preventDefault();
              handleUpdateProfile(hrForm);
            }}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '20px' }}>
                {/* Employment Fields */}
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    Employment Status & Blood Group
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="portal-label">Designation / Title</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.designation} 
                        onChange={e => setHrForm({ ...hrForm, designation: e.target.value, jobTitle: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Contract Type</label>
                      <select 
                        className="portal-input" 
                        value={hrForm.contractType} 
                        onChange={e => setHrForm({ ...hrForm, contractType: e.target.value })}
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Probationary">Probationary</option>
                        <option value="Part-Time">Part-Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="portal-label">Blood Group</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.bloodGroup} 
                        onChange={e => setHrForm({ ...hrForm, bloodGroup: e.target.value })} 
                        placeholder="e.g. O+, A+, B-" 
                      />
                    </div>
                  </div>
                </div>

                {/* USD Account Fields */}
                <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 900, color: '#0369a1' }}>
                    USD Banking Account
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="portal-label">Bank Name</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.bankName} 
                        onChange={e => setHrForm({ ...hrForm, bankName: e.target.value })} 
                        placeholder="e.g. Stanbic Bank, CBZ" 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Account Number</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.accountNumber} 
                        onChange={e => setHrForm({ ...hrForm, accountNumber: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Account Holder Name</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.accountHolderName} 
                        onChange={e => setHrForm({ ...hrForm, accountHolderName: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Bank Branch & Code</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.bankBranch} 
                        onChange={e => setHrForm({ ...hrForm, bankBranch: e.target.value })} 
                        placeholder="Branch Name" 
                      />
                    </div>
                  </div>
                </div>

                {/* ZiG Account Fields */}
                <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 900, color: '#b45309' }}>
                    ZiG Local Banking Account
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="portal-label">Bank Name (ZiG)</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.bankNameZig} 
                        onChange={e => setHrForm({ ...hrForm, bankNameZig: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Account Number (ZiG)</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.accountNumberZig} 
                        onChange={e => setHrForm({ ...hrForm, accountNumberZig: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Account Holder Name (ZiG)</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.accountHolderNameZig} 
                        onChange={e => setHrForm({ ...hrForm, accountHolderNameZig: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Bank Branch (ZiG)</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.bankBranchZig} 
                        onChange={e => setHrForm({ ...hrForm, bankBranchZig: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    Social & Professional Profiles
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="portal-label">LinkedIn Profile URL</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.linkedinLink} 
                        onChange={e => setHrForm({ ...hrForm, linkedinLink: e.target.value })} 
                        placeholder="https://linkedin.com/in/..." 
                      />
                    </div>
                    <div>
                      <label className="portal-label">Facebook Profile URL</label>
                      <input 
                        className="portal-input" 
                        value={hrForm.facebookLink} 
                        onChange={e => setHrForm({ ...hrForm, facebookLink: e.target.value })} 
                        placeholder="https://facebook.com/..." 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-neutral" onClick={() => setEditingSection(null)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Banking & HR Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
