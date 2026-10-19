import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl } from '../../../utils/formatters';
import { SkeletonLoader } from '../../../components/shared';

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'guardian' | 'boarding' | 'health' | 'card' | 'security'>('details');

  // Password change state
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPass, setUpdatingPass] = useState(false);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/me');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      showToast('Failed to load student profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.put('/api/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Profile photo updated successfully!', 'success');
      await refreshUser();
      await fetchStudentProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return showToast('New passwords do not match', 'error');
    }
    if (passForm.newPassword.length < 6) {
      return showToast('Password must be at least 6 characters', 'error');
    }

    setUpdatingPass(true);
    try {
      await api.post('/api/users/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      showToast('Password changed successfully!', 'success');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setUpdatingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
        <SkeletonLoader type="profile" />
      </div>
    );
  }

  const student = profile?.student || {};
  const studentUser = profile || {};
  const avatarUrl = getAvatarUrl(studentUser.avatar, user?.schoolCode);
  const metadata = studentUser.metadata || {};

  return (
    <div className="portal-container" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Profile Identity Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Avatar with Upload Badge */}
          <div
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile picture"
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              backgroundColor: '#334155',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {uploadingPhoto ? (
              <span style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 800 }}>Saving...</span>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt={studentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#93c5fd' }}>
                {(studentUser.name || 'S').charAt(0)}
              </span>
            )}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#ffffff',
              fontSize: '8px',
              textAlign: 'center',
              padding: '2px 0'
            }}>
              📷 Change
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
                {studentUser.name || student.name}
              </h1>
              <span style={{
                fontSize: '0.75rem',
                background: '#2563eb',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 700
              }}>
                {student.class?.name || 'Class Enrolled'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.15)',
                color: '#e2e8f0',
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 700
              }}>
                {student.boardingStatus || 'Day Scholar'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Student ID: <strong style={{ color: '#ffffff' }}>{student.studentId || user?.staffId || 'STU-0001'}</strong>
              {student.gender && <> · Gender: <strong style={{ color: '#cbd5e1' }}>{student.gender}</strong></>}
              {studentUser.email && <> · Email: <strong style={{ color: '#cbd5e1' }}>{studentUser.email}</strong></>}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('card')}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}
        >
          <i className="fas fa-id-card"></i> View Digital ID Card
        </button>
      </div>

      {/* Tabs Row */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 10,
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        {[
          { id: 'details', label: 'Academic & Personal', icon: 'fa-user-graduate' },
          { id: 'guardian', label: 'Parent / Guardians', icon: 'fa-user-friends' },
          { id: 'boarding', label: 'Boarding & House', icon: 'fa-hotel' },
          { id: 'health', label: 'Health Profile', icon: 'fa-heartbeat' },
          { id: 'card', label: 'Printable ID Pass', icon: 'fa-qrcode' },
          { id: 'security', label: 'Security & Password', icon: 'fa-shield-alt' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 800 : 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? '#2563eb' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <i className={`fas ${tab.icon}`} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: ACADEMIC & PERSONAL */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="portal-card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-id-badge mr-2" style={{ color: '#2563eb' }}></i>Personal Record
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Full Name" value={studentUser.name || student.name} />
              <DetailRow label="Registration / Student ID" value={student.studentId || user?.staffId} />
              <DetailRow label="Gender" value={student.gender} />
              <DetailRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : 'Not recorded'} />
              <DetailRow label="Phone Contact" value={student.phone || studentUser.phone || 'None recorded'} />
              <DetailRow label="Residential Address" value={student.address || 'Day scholar / Institutional hostel'} />
            </div>
          </div>

          <div className="portal-card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-graduation-cap mr-2" style={{ color: '#16a34a' }}></i>Academic Stream
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Assigned Class" value={student.class?.name || 'Class Enrolled'} />
              <DetailRow label="Level / Form" value={student.class?.level || 'Secondary Level'} />
              <DetailRow label="Enrollment Status" value={student.status || 'Active / Enrolled'} />
              <DetailRow label="Academic Standing" value={student.standing || 'Good Standing'} />
              <DetailRow label="Term Session" value="2026 / 2027 Academic Year" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARENT / GUARDIANS */}
      {activeTab === 'guardian' && (
        <div className="portal-card" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-user-friends mr-2" style={{ color: '#dc2626' }}></i>Parent & Guardian Contacts
          </h3>
          {Array.isArray(student.parents) && student.parents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {student.parents.map((p: any, idx: number) => (
                <div key={idx} style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
                    {p.relation || 'Guardian'}
                  </span>
                  <h4 style={{ margin: '4px 0 12px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    {p.parent?.user?.name || 'Parent Name'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                    <div><i className="fas fa-phone mr-2" style={{ color: '#64748b' }}></i>{p.parent?.user?.phone || 'No phone'}</div>
                    <div><i className="fas fa-envelope mr-2" style={{ color: '#64748b' }}></i>{p.parent?.user?.email || 'No email'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10 }}>
              <i className="fas fa-user-shield fa-2x" style={{ opacity: 0.3, marginBottom: 8 }}></i>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                Primary parent or guardian contacts are linked through your admission record.
                Contact the administration office to update emergency telephone numbers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BOARDING & HOUSE */}
      {activeTab === 'boarding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="portal-card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-hotel mr-2" style={{ color: '#7c3aed' }}></i>Boarding Allocation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Residency Status" value={student.boardingStatus || 'Day Scholar'} />
              <DetailRow label="Assigned Hostel" value={student.hostel?.name || 'Not allocated'} />
              <DetailRow label="Dining Hall Allocation" value="Main Dining Hall" />
            </div>
          </div>

          <div className="portal-card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-shield-alt mr-2" style={{ color: '#f59e0b' }}></i>Student House & Sports
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="School House" value={student.house?.name || 'Unassigned House'} />
              <DetailRow label="Prefect / Leadership Status" value="Student Body" />
              <DetailRow label="Disciplinary Standing" value="Zero Infractions / In Good Standing" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HEALTH PROFILE */}
      {activeTab === 'health' && (
        <div className="portal-card" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-heartbeat mr-2" style={{ color: '#db2777' }}></i>Infirmary & Medical Records
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>BLOOD GROUP</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {metadata.bloodGroup || 'O+'}
              </div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>KNOWN ALLERGIES</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {metadata.allergies || 'None reported'}
              </div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>EMERGENCY TREATMENT CONSENT</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                <i className="fas fa-check-circle mr-1"></i> Authorized by Parent
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRINTABLE ID PASS */}
      {activeTab === 'card' && (
        <div className="portal-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textAlign: 'left' }}>
                Official Campus Student Identification
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b', textAlign: 'left' }}>
                Cryptographically signed gate access token. Present at campus checkpoints.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="portal-btn-primary"
              style={{ padding: '9px 16px', fontSize: '0.85rem', fontWeight: 800 }}
            >
              <i className="fas fa-print mr-2"></i>Print ID Card
            </button>
          </div>

          {/* Printable Card Frame */}
          <div style={{
            maxWidth: 420,
            margin: '0 auto',
            borderRadius: 14,
            border: '2px solid #0f172a',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'left'
          }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {user?.schoolName || 'Skulas Academy'}
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Student Identification Card
                </div>
              </div>
              <span style={{ fontSize: '18px' }}>🎓</span>
            </div>

            <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 90,
                height: 110,
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={studentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: '#94a3b8' }}>
                    👤
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {studentUser.name || student.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4 }}>
                  ID: <strong style={{ color: '#0f172a' }}>{student.studentId || user?.staffId || 'STU-0001'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                  Class: <strong style={{ color: '#0f172a' }}>{student.class?.name || 'Class Enrolled'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                  Status: <strong style={{ color: '#0284c7' }}>{student.boardingStatus || 'Day Scholar'}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(student.studentId || student.id || 'GATE-PASS')}`}
                  alt="Student Pass"
                  style={{ width: 75, height: 75, display: 'block', borderRadius: 4, border: '1px solid #e2e8f0', padding: 2 }}
                />
                <span style={{ fontSize: '7px', fontWeight: 800, color: '#64748b' }}>GATE PASS</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '6px 14px', borderTop: '1px solid #e2e8f0', fontSize: '9px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Valid Session 2026/2027</span>
              <span>Authorized Signature</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="portal-card" style={{ padding: 24, maxWidth: 500 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-lock mr-2" style={{ color: '#2563eb' }}></i>Change Account Password
          </h3>
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Current Password
              </label>
              <input
                type="password"
                required
                value={passForm.currentPassword}
                onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                New Password
              </label>
              <input
                type="password"
                required
                value={passForm.newPassword}
                onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passForm.confirmPassword}
                onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={updatingPass}
              className="portal-btn-primary"
              style={{ marginTop: 8, padding: '10px 16px', fontWeight: 800 }}
            >
              {updatingPass ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{label}:</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{value || '—'}</span>
    </div>
  );
}
