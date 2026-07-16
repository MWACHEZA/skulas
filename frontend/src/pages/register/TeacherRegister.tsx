import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary, #f8fafc)',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '12px', padding: '20px', marginBottom: '16px',
};
const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  fontSize: '14px', fontWeight: 700, color: 'var(--primary-color, #2563eb)',
  marginBottom: '16px', paddingBottom: '10px',
  borderBottom: '1px solid var(--border-color, #e2e8f0)',
};
const uploadBoxStyle: React.CSSProperties = {
  border: '2px dashed var(--border-color, #cbd5e1)',
  borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer',
};

export default function TeacherRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // States to track document filenames
  const [idDocName, setIdDocName] = useState('');
  const [residenceDocName, setResidenceDocName] = useState('');
  const [qualificationsDocName, setQualificationsDocName] = useState('');

  // Multi-select subjects state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    nationalId: '',
    religion: '',
    address: '',
    phone: '',
    email: '',
    qualification: '',
    department: '',
    departmentId: '',
    maritalStatus: '',
    spouseName: '',
    spousePhone: '',
    nokName: '',
    nokRelation: '',
    nokPhone: '',
    schoolCode: '',
    password: '',
    confirmPassword: '',
    // HR / Social - all optional
    bloodGroup: '',
    dateAssumedPost: '',
    dateOfLeaving: '',
    accountNumber: '',
    accountHolderName: '',
    bankName: '',
    bankBranch: '',
    branchCode: '',
    accountType: 'USD',
    accountNumberZig: '',
    accountHolderNameZig: '',
    bankNameZig: '',
    bankBranchZig: '',
    branchCodeZig: '',
    accountTypeZig: 'ZiG',
    facebookLink: '',
    linkedinLink: '',
    twitterLink: '',
  });

  const [docs, setDocs] = useState<any>({
    idDoc: null,
    residenceDoc: null,
    qualificationsDoc: null
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData((prev: any) => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);

      // Auto-verify silently (no toast to avoid double notification)
      setVerifying(true);
      api.get(`/api/public/schools/${codeUpper}/data`)
        .then(({ data }) => { setSchoolData(data); })
        .catch(() => { })
        .finally(() => setVerifying(false));
    }
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any, field: string = 'avatar') => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('File size exceeds 20MB limit.', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'avatar') {
          setAvatarPreview(reader.result as string);
        } else {
          setDocs((prev: any) => ({ ...prev, [field]: reader.result }));
          if (field === 'idDoc') {
            setIdDocName(file.name);
            showToast('National ID uploaded', 'success');
          } else if (field === 'residenceDoc') {
            setResidenceDocName(file.name);
            showToast('Proof of Residence uploaded', 'success');
          } else if (field === 'qualificationsDoc') {
            setQualificationsDocName(file.name);
            showToast('Qualifications Document uploaded', 'success');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const FileUploadCard = ({ label, type, file, fileName, icon, required: req }: {
    label: string; type: 'idDoc'|'residenceDoc'|'qualificationsDoc'; file: string|null; fileName: string; icon: string; required?: boolean;
  }) => (
    <div style={{ ...uploadBoxStyle, borderColor: file ? '#22c55e' : 'var(--border-color,#cbd5e1)', background: file ? '#f0fdf4' : 'var(--bg-secondary,#f8fafc)' }}>
      <label htmlFor={'file-'+type} style={{ cursor:'pointer', display:'block' }}>
        <div style={{ fontSize:'32px', marginBottom:'8px' }}>
          {file ? '✅' : <i className={'fas '+icon} style={{ color:'#94a3b8' }}></i>}
        </div>
        <div style={{ fontWeight:700, fontSize:'14px', color: file ? '#16a34a' : 'var(--text-primary,#1e293b)', marginBottom:'4px' }}>
          {label}{req && <span style={{ color:'#ef4444' }}> *</span>}
        </div>
        {file
          ? <div style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>{fileName} — <span style={{ textDecoration:'underline' }}>Change</span></div>
          : <div style={{ fontSize:'12px', color:'#94a3b8' }}>Click to upload PDF, JPG or PNG (max 20MB)</div>
        }
      </label>
      <input type="file" id={'file-'+type} accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={(e) => handleFileChange(e, type)} />
    </div>
  );

  const verifySchool = async () => {
    if (!formData.schoolCode) return showToast('Enter school code first', 'warning');
    setVerifying(true);
    try {
      const { data } = await api.get(`/api/public/schools/${formData.schoolCode.trim().toUpperCase()}/data`);
      setSchoolData(data);
      showToast(`Verified: ${data.schoolName}`, 'success');
    } catch {
      showToast('Invalid school code', 'error');
      setSchoolData(null);
    } finally {
      setVerifying(false);
    }
  };

  const toggleSubject = (subjectName: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectName)
        ? prev.filter(s => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const nextStep = () => {
    if (step === 1) {
      if (!schoolData) return showToast('Please verify your school access code first.', 'warning');
      if (!formData.firstName.trim() || !formData.lastName.trim()) return showToast('First and last name are required.', 'warning');
      if (!formData.email.trim()) return showToast('Email address is required.', 'warning');
      if (!formData.phone.trim()) return showToast('Phone number is required.', 'warning');
    }
    if (step === 2) {
      if (!formData.departmentId) return showToast('Please select a department.', 'warning');
      if (!formData.dateAssumedPost) return showToast('Date assumed post is required.', 'warning');
    }
    // Steps 3 (banking) and 4 (documents) are fully optional — just proceed
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      showToast('Password must be at least 8 characters including uppercase, lowercase, number & symbol.', 'error');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (!schoolData) {
      showToast('Please go back and verify your school code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        role: 'TEACHER',
        avatar: avatarPreview,
        subjects: selectedSubjects.join(', '),
        ...docs,
      };
      await api.post('/api/auth/register-user', payload);
      showToast('Teacher account created successfully! Welcome to the faculty.', 'success');
      navigate('/teacher/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed. Please check your details and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects: if department selected, show only that dept's subjects; otherwise show all
  const availableSubjects = schoolData?.subjects
    ? (formData.departmentId
      ? schoolData.subjects.filter((s: any) => !s.departmentId || s.departmentId === formData.departmentId)
      : schoolData.subjects)
    : [];

  const STEP_LABELS = ['Identity', 'Career', 'Banking', 'Documents', 'Account'];

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth: 760 }}>
        <div className="register-header">
          <i className="fas fa-chalkboard-teacher" style={{ fontSize: '2.5rem', marginBottom: 12, color: '#fff' }}></i>
          <h2>Teacher Registration</h2>
          <p>Create your faculty portal account</p>
        </div>

        <div className="steps-bar flex-wrap gap-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            return (
              <div
                key={stepNum}
                className={`step-item ${step === stepNum ? 'active' : ''} ${step > stepNum ? 'done' : ''}`}
                onClick={() => step > stepNum && setStep(stepNum)}
              >
                <div className="step-num">{stepNum}</div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Identity & School ── */}
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-id-card"></i> School & Identity</div>

                {/* School Code Verification — matching StudentRegister card design */}
                <div style={{ ...cardStyle, borderLeft: '4px solid #2563eb', background: '#eff6ff' }}>
                  <div style={sectionHeaderStyle}><i className="fas fa-school"></i> School Verification</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#1d4ed8', fontWeight: 700 }}>School Access Code *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="schoolCode"
                        placeholder="e.g. ABC123"
                        value={formData.schoolCode}
                        onChange={handleInputChange}
                        required
                        style={{ flex: 1, textTransform: 'uppercase' }}
                      />
                      <button type="button" className="portal-btn-primary" onClick={verifySchool} disabled={verifying}>
                        {verifying ? <><i className="fas fa-spinner fa-spin"></i> Verifying&hellip;</> : <><i className="fas fa-check-circle"></i> Verify</>}
                      </button>
                    </div>
                    {schoolData && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#dcfce7', borderRadius: '8px', color: '#16a34a', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-check-circle"></i> Verified: {schoolData.schoolName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="avatar-preview-wrap cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                    {avatarPreview ? <img src={avatarPreview} alt="Preview" /> : <i className="fas fa-camera fa-2x text-slate-300"></i>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block">Profile Photo (Max 20MB)</label>
                    <input type="file" id="avatar-input" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="text-xs" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Phone Number *</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date of Birth</label><input type="date" name="dob" value={formData.dob} onChange={handleInputChange} /></div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                      <option value="">Select...</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>National ID Number</label><input type="text" name="nationalId" value={formData.nationalId} onChange={handleInputChange} /></div>
                  <div className="form-group">
                    <label>Blood Group</label>
                    <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                      <option value="">Select...</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                      <option>O+</option><option>O-</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Physical Address</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} placeholder="Street / Area / City" style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Career & Department ── */}
            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-briefcase"></i> Employment & Career</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Department *</label>
                    {schoolData?.departments?.length > 0 ? (
                      <select name="departmentId" value={formData.departmentId} onChange={(e) => {
                        const dept = schoolData.departments.find((d: any) => d.id === e.target.value);
                        setFormData(prev => ({ ...prev, departmentId: e.target.value, department: dept ? dept.name : '' }));
                        setSelectedSubjects([]); // clear subjects on dept change
                      }} required>
                        <option value="">Select Department...</option>
                        {schoolData.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" name="department" value={formData.department} onChange={handleInputChange} placeholder="e.g. Sciences, Humanities" />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Highest Qualification</label>
                    <input type="text" name="qualification" placeholder="e.g. Masters in Education" value={formData.qualification} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date Assumed Post *</label><input type="date" name="dateAssumedPost" value={formData.dateAssumedPost} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Date of Leaving <small style={{ color: '#94a3b8' }}>(if applicable)</small></label><input type="date" name="dateOfLeaving" value={formData.dateOfLeaving} onChange={handleInputChange} /></div>
                </div>

                {/* Subjects — tag-style multi-select */}
                <div className="form-group">
                  <label>Subjects Taught <small style={{ color: '#94a3b8' }}>(click to select/deselect)</small></label>
                  {availableSubjects.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {availableSubjects.map((s: any) => {
                        const isSelected = selectedSubjects.includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSubject(s.name)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 20,
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--school-primary, #2563eb)' : '#e2e8f0',
                              background: isSelected ? 'var(--school-primary, #2563eb)' : '#f8fafc',
                              color: isSelected ? '#fff' : '#475569',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSelected && <i className="fas fa-check" style={{ marginRight: 5 }}></i>}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: '0.85rem' }}>
                      {schoolData
                        ? (formData.departmentId ? 'No subjects found for this department.' : 'Select a department above to see available subjects.')
                        : 'Verify school code on step 1 to load subjects.'}
                    </div>
                  )}
                  {selectedSubjects.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>
                      <i className="fas fa-check-circle mr-1"></i> Selected: {selectedSubjects.join(', ')}
                    </div>
                  )}
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Banking & Social (Optional) ── */}
            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-money-check-alt"></i> Banking & Social Links <small style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</small></div>
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem', color: '#1e40af' }}>
                  <i className="fas fa-info-circle mr-1"></i> Banking details are used for payroll. You can fill these in later if needed.
                </div>
                <div className="section-divider">Banking Details (For Payroll)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  {/* USD Account Card */}
                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '12px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                      <i className="fas fa-dollar-sign text-blue-600 mr-2"></i> USD Account Details
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Bank Name</label>
                      <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Branch Name</label>
                      <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }} className="mb-3">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold">Branch Code</label>
                        <input type="text" name="branchCode" value={formData.branchCode} onChange={handleInputChange} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold">Account Type</label>
                        <input type="text" name="accountType" value={formData.accountType} readOnly style={{ width: '100%', background: '#f1f5f9', cursor: 'not-allowed' }} />
                      </div>
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Account Number</label>
                      <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold">Account Holder Name</label>
                      <input type="text" name="accountHolderName" value={formData.accountHolderName} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* ZiG Account Card */}
                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '12px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                      <i className="fas fa-coins text-amber-600 mr-2"></i> ZiG Account Details
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Bank Name</label>
                      <input type="text" name="bankNameZig" value={formData.bankNameZig} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Branch Name</label>
                      <input type="text" name="bankBranchZig" value={formData.bankBranchZig} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }} className="mb-3">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold">Branch Code</label>
                        <input type="text" name="branchCodeZig" value={formData.branchCodeZig} onChange={handleInputChange} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold">Account Type</label>
                        <input type="text" name="accountTypeZig" value={formData.accountTypeZig} readOnly style={{ width: '100%', background: '#f1f5f9', cursor: 'not-allowed' }} />
                      </div>
                    </div>
                    <div className="form-group mb-3">
                      <label className="text-xs font-semibold">Account Number</label>
                      <input type="text" name="accountNumberZig" value={formData.accountNumberZig} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold">Account Holder Name</label>
                      <input type="text" name="accountHolderNameZig" value={formData.accountHolderNameZig} onChange={handleInputChange} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="section-divider">Next of Kin</div>
                <div className="form-row">
                  <div className="form-group"><label>NOK Full Name</label><input type="text" name="nokName" value={formData.nokName} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>NOK Phone</label><input type="tel" name="nokPhone" value={formData.nokPhone} onChange={handleInputChange} /></div>
                </div>

                <div className="section-divider">Social Media Profiles (Optional)</div>
                <div className="form-row">
                  <div className="form-group"><label><i className="fab fa-facebook"></i> Facebook</label><input type="url" name="facebookLink" value={formData.facebookLink} onChange={handleInputChange} placeholder="https://facebook.com/..." /></div>
                  <div className="form-group"><label><i className="fab fa-linkedin"></i> LinkedIn</label><input type="url" name="linkedinLink" value={formData.linkedinLink} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label><i className="fab fa-twitter"></i> Twitter / X</label><input type="url" name="twitterLink" value={formData.twitterLink} onChange={handleInputChange} placeholder="https://twitter.com/..." /></div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Documents (Optional) ── */}
            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-file-upload"></i> Supporting Documents <small style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</small></div>
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem', color: '#1e40af' }}>
                  <i className="fas fa-info-circle mr-1"></i> Upload your identification and qualification documents. Each file is stored separately. You can submit these later if needed.
                </div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-folder-open"></i> Staff Documents</div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Upload your documents individually. Each file is stored separately in your staff record.</p>
                  <div className="form-row" style={{ alignItems: 'stretch' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <FileUploadCard label="National ID / Passport" type="idDoc" file={docs.idDoc} fileName={idDocName} icon="fa-id-card" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <FileUploadCard label="Proof of Residence" type="residenceDoc" file={docs.residenceDoc} fileName={residenceDocName} icon="fa-home" />
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <FileUploadCard label="Professional Qualifications" type="qualificationsDoc" file={docs.qualificationsDoc} fileName={qualificationsDocName} icon="fa-graduation-cap" />
                  </div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Account Security ── */}
            {step === 5 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-lock"></i> Account Security</div>

                {/* Summary Card */}
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 20 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#15803d', marginBottom: 8 }}><i className="fas fa-user-check mr-2"></i> Registration Summary</p>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}><strong>Email:</strong> {formData.email}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}><strong>School:</strong> {schoolData?.schoolName || formData.schoolCode}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}><strong>Department:</strong> {formData.department || '—'}</p>
                  {selectedSubjects.length > 0 && (
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}><strong>Subjects:</strong> {selectedSubjects.join(', ')}</p>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" placeholder="Create a secure password" value={formData.password} onChange={handleInputChange} required />
                    <small style={{ fontSize: '0.7rem', color: '#718096' }}>Min 8 chars, uppercase, lowercase, number & symbol</small>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input type="password" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading
                      ? <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                      : <><i className="fas fa-user-plus"></i> Complete Registration</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="register-footer">
          Already have an account? <Link to="/teacher/login">Sign In</Link> &nbsp;|&nbsp;
          <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Home</Link>
        </div>
      </div>
    </div>
  );
}
