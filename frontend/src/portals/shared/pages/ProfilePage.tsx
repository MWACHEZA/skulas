import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api, { BASE_URL } from '../../../lib/api';
import ActiveSessions from '../../../components/shared/ActiveSessions';
import EmptyState from '../../../components/shared/EmptyState';
import '../../../styles/portal.css';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/users/me');
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (sectionData: any) => {
    setLoading(true);
    try {
      await api.put('/api/users/me', sectionData);
      showToast('Profile updated successfully', 'success');
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

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  const InfoRow = ({ label, value, icon }: { label: string, value: string, icon?: string }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '16px 0' }}>
      <div style={{ width: 160, color: '#64748b', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
        {icon && <i className={icon} style={{ marginRight: 10, width: 16, color: '#94a3b8' }}></i>}
        {label}
      </div>
      <div style={{ flex: 1, fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>My Profile</h1>
          <p>Manage your identity, security settings, and institutional credentials.</p>
        </div>
      </div>

      <div className="portal-grid-1-2">
        {/* Left Column: Avatar & Basic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="portal-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
             <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
                <div style={{ 
                    width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', 
                    background: '#2563eb', color: 'white', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: '4rem', fontWeight: 800,
                    border: '6px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                }}>
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : user?.avatar ? (
                        <img src={`${BASE_URL}/api/storage/media/${user.schoolCode}/${user.avatar}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        getInitials(user?.name || '')
                    )}
                </div>
                <label htmlFor="avatar-upload" className="portal-btn-icon" style={{ 
                    position: 'absolute', bottom: '8px', right: '8px', background: '#fff', 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)', width: '44px', height: '44px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', color: '#2563eb', border: '1px solid #f1f5f9'
                }}>
                    <i className="fas fa-camera"></i>
                    <input id="avatar-upload" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </label>
             </div>
             <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>{user?.name}</h2>
             <p style={{ color: '#64748b', margin: '0 0 24px', fontWeight: 600 }}>{user?.email}</p>
             <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <span className="status-badge status-active" style={{ padding: '8px 20px', fontWeight: 900 }}>{user?.role}</span>
                {user?.staffId && <span className="status-badge" style={{ padding: '8px 20px', fontWeight: 900, background: '#f1f5f9', color: '#475569' }}>{user.staffId}</span>}
             </div>
             {avatarPreview && (
               <button className="portal-btn-primary" style={{ marginTop: 20 }} onClick={() => handleUpdateProfile({ avatar: avatarPreview })}>
                 Save Photo
               </button>
             )}
          </div>

          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}><i className="fas fa-shield-alt mr-3" style={{ color: '#059669' }}></i>Security</h3>
                <button className="portal-btn-ghost" onClick={() => setEditingSection('security')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>Update Security</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <InfoRow label="Member Since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} icon="fas fa-calendar-check" />
                <InfoRow label="School" value={user?.schoolName || '—'} icon="fas fa-school" />
                <InfoRow label="Plan" value="Professional Edition" icon="fas fa-crown" />
            </div>
          </div>
          
          <div className="portal-card" style={{ padding: '24px' }}>
             <ActiveSessions />
          </div>
        </div>

        {/* Right Column: Detailed Sections */}
        <div style={{ 
          display: user?.role === 'STUDENT' ? 'grid' : 'flex', 
          gridTemplateColumns: user?.role === 'STUDENT' ? 'repeat(2, 1fr)' : undefined,
          flexDirection: user?.role === 'STUDENT' ? undefined : 'column',
          gap: '32px' 
        }}>
          {/* Section 1: Personal Information */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  <i className="fas fa-user-circle mr-3" style={{ color: '#2563eb' }}></i>
                  Personal Information
                </h3>
                <button className="portal-btn-ghost" onClick={() => setEditingSection('personal')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  <i className="fas fa-edit mr-2"></i>Edit
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                <InfoRow label="Legal Name" value={profileData?.name} />
                {profileData?.student?.class && (
                    <InfoRow label="Class / Form" value={`${profileData.student.class.name} (${profileData.student.class.level || ''})`} icon="fas fa-chalkboard" />
                )}
                <InfoRow label="Gender" value={profileData?.student?.gender || profileData?.metadata?.gender} />
                <InfoRow label="Date of Birth" value={profileData?.student?.dob ? new Date(profileData.student.dob).toLocaleDateString() : profileData?.metadata?.dob} />
                <InfoRow label="Religion" value={profileData?.metadata?.religion} />
                {profileData?.student && <InfoRow label="Student ID" value={profileData.student.studentId} />}
                {profileData?.student?.hexcoId && <InfoRow label="HEXCO ID" value={profileData.student.hexcoId} icon="fas fa-id-card-alt" />}
                {profileData?.staffId && <InfoRow label="Staff ID" value={profileData.staffId} />}
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  <i className="fas fa-address-book mr-3" style={{ color: '#059669' }}></i>
                  Contact Information
                </h3>
                <button className="portal-btn-ghost" onClick={() => setEditingSection('contact')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  <i className="fas fa-edit mr-2"></i>Edit
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <InfoRow label="Email Address" value={profileData?.email} />
                <InfoRow label="Phone Number" value={profileData?.phone} />
                <InfoRow label="Physical Address" value={profileData?.student?.address || profileData?.metadata?.address} />
            </div>
          </div>

          {/* Section 2.5: Academic Background */}
          {profileData?.student && (
            <div className="portal-card">
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    <i className="fas fa-graduation-cap mr-3" style={{ color: '#2563eb' }}></i>
                    Academic Background
                  </h3>
                  <button className="portal-btn-ghost" onClick={() => setEditingSection('academic')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                    <i className="fas fa-edit mr-2"></i>Edit
                  </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                  <InfoRow label="Previous School" value={profileData.student.prevSchool} />
                  <InfoRow label="Last Grade" value={profileData.student.lastGradeAchieved} />
                  <InfoRow label="Transfer Reason" value={profileData.student.reasonForTransfer} />
                  <InfoRow label="Admissions Note" value={profileData.student.admissionsNotes} />
              </div>
              {profileData.student.academicHistory && (
                <div style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Academic History / Results</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                        {Object.entries(profileData.student.academicHistory).map(([key, val]: [string, any]) => (
                            <div key={key} style={{ fontSize: '0.95rem', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontWeight: 700, textTransform: 'capitalize' }}>{key}:</span> 
                                <span style={{ fontWeight: 800, marginLeft: '8px', color: '#1e293b' }}>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
              )}
              {(profileData.student.birthCertificateUrl || profileData.student.transferCertificateUrl) && (
                <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>Uploaded Documents</h5>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {profileData.student.birthCertificateUrl && (
                      <a href={`${BASE_URL}/api/storage/file/${profileData.student.birthCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} target="_blank" rel="noopener noreferrer" 
                         className="portal-btn-ghost" style={{ fontSize: '0.75rem', background: '#fff', border: '1px solid #e2e8f0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        <i className="fas fa-file-alt mr-2" style={{ color: '#2563eb' }}></i>
                        Birth Certificate
                      </a>
                    )}
                    {profileData.student.transferCertificateUrl && (
                      <a href={`${BASE_URL}/api/storage/file/${profileData.student.transferCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} target="_blank" rel="noopener noreferrer" 
                         className="portal-btn-ghost" style={{ fontSize: '0.75rem', background: '#fff', border: '1px solid #e2e8f0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        <i className="fas fa-file-alt mr-2" style={{ color: '#2563eb' }}></i>
                        Transfer Certificate
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Parent/Guardian / Next of Kin */}
          {profileData?.role === 'STUDENT' && (
            <div className="portal-card" style={{ gridColumn: 'span 2' }}>
                <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                      <i className="fas fa-user-friends mr-3" style={{ color: '#dc2626' }}></i>
                      Parent / Guardian Information
                    </h3>
                    {Array.isArray(profileData?.student?.parents) && profileData.student.parents.length > 0 && (
                      <button className="portal-btn-ghost" onClick={() => setEditingSection('parents')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        <i className="fas fa-edit mr-2"></i>Edit
                      </button>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {Array.isArray(profileData?.student?.parents) && profileData.student.parents.length > 0 ? (
                        profileData.student.parents.map((p: any, idx: number) => (
                            <div key={idx} style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>{p.relation} Contact</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                                    <InfoRow label="Name" value={p.parent?.user?.name} />
                                    <InfoRow label="Phone" value={p.parent?.user?.phone} />
                                    <InfoRow label="Email" value={p.parent?.user?.email} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '24px' }}>
                          <EmptyState 
                            icon="fas fa-users-slash"
                            title="No Linked Guardians"
                            description="No guardians are linked to this student yet. Ask an admin to connect a parent's contact record."
                          />
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* Section 4: Emergency Contact */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  <i className="fas fa-ambulance mr-3" style={{ color: '#db2777' }}></i>
                  Emergency Contact
                </h3>
                <button className="portal-btn-ghost" onClick={() => setEditingSection('emergency')} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  <i className="fas fa-edit mr-2"></i>Edit
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                <InfoRow label="Contact Name" value={profileData?.metadata?.emergencyName} />
                <InfoRow label="Relationship" value={profileData?.metadata?.emergencyRelation} />
                <InfoRow label="Phone" value={profileData?.metadata?.emergencyPhone} />
            </div>
          </div>

          {/* Section 5: HR & Professional Details (For Staff) */}
          {['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'].includes(profileData?.role) && profileData?.employeeProfile && (
            <div className="portal-card">
              <div className="portal-card-header" style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    <i className="fas fa-id-badge mr-3" style={{ color: '#7c3aed' }}></i>
                    HR & Professional Details
                  </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                  <InfoRow label="Designation" value={profileData.employeeProfile.designation} />
                  <InfoRow label="Blood Group" value={profileData.employeeProfile.bloodGroup} />
                  <InfoRow label="Date Assumed Post" value={profileData.employeeProfile.dateAssumedPost ? new Date(profileData.employeeProfile.dateAssumedPost).toLocaleDateString() : '—'} />
                  <InfoRow label="Date of Leaving" value={profileData.employeeProfile.dateOfLeaving ? new Date(profileData.employeeProfile.dateOfLeaving).toLocaleDateString() : '—'} />
              </div>
              
              <div className="section-divider" style={{ margin: '24px 0', height: '1px', background: '#f1f5f9' }}></div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b', marginBottom: '16px' }}>BANKING INFORMATION</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase' }}><i className="fas fa-dollar-sign mr-1"></i> USD Account</div>
                  <InfoRow label="Bank Name" value={profileData.employeeProfile.bankName} />
                  <InfoRow label="Bank Branch" value={profileData.employeeProfile.bankBranch} />
                  <InfoRow label="Account Number" value={profileData.employeeProfile.accountNumber} />
                  <InfoRow label="Account Holder" value={profileData.employeeProfile.accountHolderName} />
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#d97706', marginBottom: '10px', textTransform: 'uppercase' }}><i className="fas fa-coins mr-1"></i> ZiG Account</div>
                  <InfoRow label="Bank Name" value={profileData.employeeProfile.bankNameZig} />
                  <InfoRow label="Bank Branch" value={profileData.employeeProfile.bankBranchZig} />
                  <InfoRow label="Account Number" value={profileData.employeeProfile.accountNumberZig} />
                  <InfoRow label="Account Holder" value={profileData.employeeProfile.accountHolderNameZig} />
                </div>
              </div>

              <div className="section-divider" style={{ margin: '24px 0', height: '1px', background: '#f1f5f9' }}></div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b', marginBottom: '16px' }}>SOCIAL & DOCUMENTS</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                  <InfoRow label="Facebook" value={profileData.employeeProfile.facebookLink} icon="fab fa-facebook" />
                  <InfoRow label="LinkedIn" value={profileData.employeeProfile.linkedinLink} icon="fab fa-linkedin" />
                  <InfoRow label="Twitter" value={profileData.employeeProfile.twitterLink} icon="fab fa-twitter" />
              </div>

              {profileData.employeeProfile.staffDocuments && (
                <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>Verified Documents</h5>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {Object.entries(profileData.employeeProfile.staffDocuments).map(([key, path]: [string, any]) => (
                      <a key={key} href={`${BASE_URL}/api/storage/media/${user?.schoolCode}/staff/${user?.id}/documents/${path.split('/').pop()}`} target="_blank" rel="noopener noreferrer" 
                         className="portal-btn-ghost" style={{ fontSize: '0.75rem', background: '#fff', border: '1px solid #e2e8f0' }}>
                        <i className="fas fa-file-alt mr-2" style={{ color: '#2563eb' }}></i>
                        {key.toUpperCase().replace('DOC', '')} Document
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Personal Modal */}
      {editingSection === 'personal' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '650px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Personal Details</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleUpdateProfile({
                        name: formData.get('name'),
                        dob: formData.get('dob'),
                        gender: formData.get('gender'),
                        hexcoId: formData.get('hexcoId'),
                        metadata: { ...profileData.metadata, religion: formData.get('religion') }
                    });
                }}>
                    <div className="portal-modal-body" style={{ padding: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                                <label className="portal-label">Full Name</label>
                                <input name="name" className="portal-input" defaultValue={profileData?.name} required />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Gender</label>
                                <select name="gender" className="portal-input" defaultValue={profileData?.student?.gender || profileData?.metadata?.gender}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Date of Birth</label>
                                <input name="dob" type="date" className="portal-input" defaultValue={profileData?.student?.dob?.split('T')[0]} />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Religion</label>
                                <input name="religion" className="portal-input" defaultValue={profileData?.metadata?.religion} />
                            </div>
                            {profileData?.role === 'STUDENT' && (
                                <div className="form-group">
                                    <label className="portal-label">HEXCO Student ID</label>
                                    <input name="hexcoId" className="portal-input" defaultValue={profileData?.student?.hexcoId} placeholder="e.g., 2024-H-1234" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                          Save Changes
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingSection === 'contact' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Contact Information</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleUpdateProfile({
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        address: formData.get('address')
                    });
                }}>
                    <div className="portal-modal-body" style={{ padding: '32px' }}>
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div className="form-group">
                                <label className="portal-label">Email Address</label>
                                <input name="email" type="email" className="portal-input" defaultValue={profileData?.email} required />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Phone Number</label>
                                <input name="phone" className="portal-input" defaultValue={profileData?.phone} />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Physical Address</label>
                                <textarea name="address" className="portal-input" rows={3} defaultValue={profileData?.student?.address || profileData?.metadata?.address} style={{ resize: 'none' }}></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                          Save Changes
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}

      {/* Edit Emergency Modal */}
      {editingSection === 'emergency' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Emergency Contact</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleUpdateProfile({
                        metadata: { 
                            ...profileData.metadata, 
                            emergencyName: formData.get('emergencyName'),
                            emergencyRelation: formData.get('emergencyRelation'),
                            emergencyPhone: formData.get('emergencyPhone')
                        }
                    });
                }}>
                    <div className="portal-modal-body" style={{ padding: '32px' }}>
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div className="form-group">
                                <label className="portal-label">Contact Name</label>
                                <input name="emergencyName" className="portal-input" defaultValue={profileData?.metadata?.emergencyName} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="portal-label">Relationship</label>
                                    <input name="emergencyRelation" className="portal-input" defaultValue={profileData?.metadata?.emergencyRelation} />
                                </div>
                                <div className="form-group">
                                    <label className="portal-label">Phone</label>
                                    <input name="emergencyPhone" className="portal-input" defaultValue={profileData?.metadata?.emergencyPhone} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                          Save Changes
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}

      {/* Edit Academic Modal */}
      {editingSection === 'academic' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Academic Background</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleUpdateProfile({
                        prevSchool: formData.get('prevSchool'),
                        lastGradeAchieved: formData.get('lastGradeAchieved'),
                        reasonForTransfer: formData.get('reasonForTransfer'),
                        admissionsNotes: formData.get('admissionsNotes')
                    });
                }}>
                    <div className="portal-modal-body" style={{ padding: '32px' }}>
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div className="form-group">
                                <label className="portal-label">Previous School</label>
                                <input name="prevSchool" className="portal-input" defaultValue={profileData?.student?.prevSchool} />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Last Grade / Level Achieved</label>
                                <input name="lastGradeAchieved" className="portal-input" defaultValue={profileData?.student?.lastGradeAchieved} />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Reason for Transfer</label>
                                <input name="reasonForTransfer" className="portal-input" defaultValue={profileData?.student?.reasonForTransfer} />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Admissions Note</label>
                                <textarea name="admissionsNotes" className="portal-input" rows={3} defaultValue={profileData?.student?.admissionsNotes} style={{ resize: 'none' }}></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                          Save Changes
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}

      {/* Edit Parents Modal */}
      {editingSection === 'parents' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Parent / Guardian Details</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const updatedParents = profileData.student.parents.map((p: any, idx: number) => ({
                        parentId: p.parentId,
                        name: e.target[`parent_name_${idx}`].value,
                        phone: e.target[`parent_phone_${idx}`].value,
                        email: e.target[`parent_email_${idx}`].value
                    }));
                    handleUpdateProfile({
                        parents: updatedParents
                    });
                }}>
                    <div className="portal-modal-body" style={{ padding: '32px', maxHeight: '400px', overflowY: 'auto' }}>
                        {profileData.student.parents.map((p: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: idx < profileData.student.parents.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>{p.relation} Contact</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label className="portal-label">Name</label>
                                        <input name={`parent_name_${idx}`} className="portal-input" defaultValue={p.parent?.user?.name} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="portal-label">Email</label>
                                        <input name={`parent_email_${idx}`} type="email" className="portal-input" defaultValue={p.parent?.user?.email} required />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="portal-label">Phone</label>
                                        <input name={`parent_phone_${idx}`} className="portal-input" defaultValue={p.parent?.user?.phone} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                          Save Changes
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}

      {/* Security Modal */}
      {editingSection === 'security' && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
                <div className="portal-modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Security Settings</h2>
                    <button className="portal-btn-ghost" onClick={() => setEditingSection(null)} style={{ width: '40px', height: '40px', padding: 0 }}>&times;</button>
                </div>
                <form onSubmit={handleChangePassword}>
                    <div className="portal-modal-body" style={{ padding: '32px' }}>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', fontWeight: 600, lineHeight: 1.6 }}>
                            To update your institutional account password, please verify your current credentials below.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label className="portal-label">Current Password</label>
                                <input 
                                    type="password" 
                                    className="portal-input" 
                                    value={passwordForm.currentPassword}
                                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">New Password</label>
                                <input 
                                    type="password" 
                                    className="portal-input"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="portal-label">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    className="portal-input"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div className="portal-modal-footer" style={{ background: '#f8fafc', padding: '24px 32px' }}>
                        <button type="button" className="portal-btn-ghost" onClick={() => setEditingSection(null)}>Cancel</button>
                        <button type="submit" className="portal-btn-primary" disabled={loading} style={{ minWidth: '160px', background: '#dc2626' }}>
                          {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-shield-check mr-2"></i>}
                          Update Password
                        </button>
                    </div>
                </form>
           </div>
        </div>
      )}
    </div>
  );
}
