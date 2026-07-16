import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

const NATIONALITIES = [
  "Zimbabwean","South African","Malawian","Zambian","Mozambican","Botswanan","Namibian","Angolan","Lesotho","Swazi",
  "Afghan","Albanian","Algerian","American","Andorran","Antiguans","Argentinean","Armenian","Australian","Austrian",
  "Azerbaijani","Bahamian","Bahraini","Bangladeshi","Barbadian","Belarusian","Belgian","Belizean","Beninese","Bhutanese",
  "Bolivian","Bosnian","Brazilian","British","Bruneian","Bulgarian","Burkinabe","Burmese","Burundian","Cambodian",
  "Cameroonian","Canadian","Cape Verdean","Central African","Chadian","Chilean","Chinese","Colombian","Comoran",
  "Congolese","Costa Rican","Croatian","Cuban","Cypriot","Czech","Danish","Djiboutian","Dominican","Dutch",
  "East Timorese","Ecuadorian","Egyptian","Emirati","Equatorial Guinean","Eritrean","Estonian","Ethiopian","Fijian",
  "Filipino","Finnish","French","Gabonese","Gambian","Georgian","German","Ghanaian","Greek","Grenadian",
  "Guatemalan","Guinea-Bissauan","Guinean","Guyanese","Haitian","Honduran","Hungarian","Icelander","Indian",
  "Indonesian","Iranian","Iraqi","Irish","Israeli","Italian","Ivorian","Jamaican","Japanese","Jordanian",
  "Kazakhstani","Kenyan","Kuwaiti","Kyrgyz","Laotian","Latvian","Lebanese","Liberian","Libyan","Liechtensteiner",
  "Lithuanian","Luxembourger","Macedonian","Malagasy","Malaysian","Maldivian","Malian","Maltese","Marshallese",
  "Mauritanian","Mauritian","Mexican","Micronesian","Moldovan","Monacan","Mongolian","Moroccan","Nauruan",
  "Nepalese","New Zealander","Nicaraguan","Nigerian","Nigerien","North Korean","Norwegian","Omani","Pakistani",
  "Palauan","Panamanian","Papua New Guinean","Paraguayan","Peruvian","Polish","Portuguese","Qatari","Romanian",
  "Russian","Rwandan","Saint Lucian","Salvadoran","Samoan","Saudi","Senegalese","Serbian","Seychellois",
  "Sierra Leonean","Singaporean","Slovakian","Slovenian","Somali","South Korean","Spanish","Sri Lankan",
  "Sudanese","Surinamer","Swedish","Swiss","Syrian","Taiwanese","Tajik","Tanzanian","Thai","Togolese",
  "Tongan","Tunisian","Turkish","Ugandan","Ukrainian","Uruguayan","Uzbekistani","Venezuelan","Vietnamese","Yemenite"
];

const RELATIONS = ["Father","Mother","Sibling","Uncle","Aunt","Grandparent","Guardian","Other"];
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@\$!%*?&])[A-Za-z\d@\$!%*?&]{8,}$/;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const STUDENT_CATEGORIES = ["Day Scholar","Boarder","Weekly Boarder","Full Boarder","Semi-Boarder"];

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

export default function StudentRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [birthCertificate, setBirthCertificate] = useState<string | null>(null);
  const [transferCertificate, setTransferCertificate] = useState<string | null>(null);
  const [birthCertName, setBirthCertName] = useState('');
  const [transferCertName, setTransferCertName] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    firstName:'',lastName:'',dob:'',gender:'',age:'',
    nationality:'',motherTongue:'',isPhysicallyHandicapped:'false',handicapDetails:'',
    address:'',city:'',state:'',religion:'',email:'',phone:'',
    password:'',confirmPassword:'',schoolCode:'',grade:'',
    studentHouseId:'',clubId:'',section:'',hostelId:'',roomId:'',
    category:'',dateAdmitted:'',
    prevSchoolName:'',prevSchoolClass:'',prevSchoolAddress:'',purposeForLeaving:'',
    hasTransferCertificate:'false',
    fatherName:'',fatherPhone:'',fatherEmail:'',
    motherName:'',motherPhone:'',motherEmail:'',
    emergencyName:'',emergencyRelation:'',emergencyPhone:'',emergencyAddress:'',
    maritalStatus:'',spouseName:'',spousePhone:'',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlCode) {
      const code = urlCode.trim().toUpperCase();
      setFormData((p: any) => ({ ...p, schoolCode: code }));
      localStorage.setItem('last_school_code', code);
      setVerifying(true);
      api.get('/api/public/schools/' + code + '/data')
        .then(({ data }) => { setSchoolData(data); })
        .catch(() => {}).finally(() => setVerifying(false));
    }
  }, []);

  useEffect(() => {
    if (formData.dob) {
      const b = new Date(formData.dob), t = new Date();
      let age = t.getFullYear() - b.getFullYear();
      const m = t.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
      if (age >= 0) setFormData((p: any) => ({ ...p, age: age.toString() }));
    }
  }, [formData.dob]);

  useEffect(() => {
    if (formData.hostelId && schoolData?.hostels) {
      const h = schoolData.hostels.find((x: any) => x.id === formData.hostelId);
      setAvailableRooms(h?.rooms || []);
      setFormData((p: any) => ({ ...p, roomId: '' }));
    } else { setAvailableRooms([]); }
  }, [formData.hostelId, schoolData]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') localStorage.setItem('last_school_code', value.toUpperCase());
    setFormData((p: any) => ({ ...p, [name]: value }));
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => resolve(r.result as string); r.onerror = reject;
  });

  const handleFileChange = async (e: any, type: 'avatar'|'birth'|'transfer') => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > MAX_FILE_SIZE) { showToast('File exceeds 20MB limit.', 'error'); e.target.value = ''; return; }
    const b64 = await toBase64(file);
    if (type === 'avatar') setAvatarPreview(b64);
    else if (type === 'birth') { setBirthCertificate(b64); setBirthCertName(file.name); showToast('Birth Certificate uploaded', 'success'); }
    else { setTransferCertificate(b64); setTransferCertName(file.name); showToast('Transfer Certificate uploaded', 'success'); }
  };

  const verifySchool = async () => {
    if (!formData.schoolCode) return showToast('Enter school code first', 'warning');
    setVerifying(true);
    try {
      const { data } = await api.get('/api/public/schools/' + formData.schoolCode + '/data');
      setSchoolData(data); showToast('Verified: ' + data.schoolName, 'success');
    } catch { showToast('Invalid school code', 'error'); setSchoolData(null); }
    finally { setVerifying(false); }
  };

  const nextStep = () => {
    const required: Record<number, string[]> = {
      1:['schoolCode','firstName','lastName','dob','gender'],
      2:['address','city','email'],3:['grade'],4:[],5:[],6:['password','confirmPassword']
    };
    for (const f of required[step]) {
      if (!formData[f]) { showToast('Please fill in all required fields.', 'warning'); return; }
    }
    if (step === 1 && !schoolData) { showToast('Please verify your school code first.', 'warning'); return; }
    if (step === 6) {
      if (!STRONG_PASSWORD_REGEX.test(formData.password)) { showToast('Password is too weak.', 'error'); return; }
      if (formData.password !== formData.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) { showToast('Password is too weak.', 'error'); return; }
    if (formData.password !== formData.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/register-user', {
        ...formData,
        name: formData.firstName + ' ' + formData.lastName,
        role: 'STUDENT', avatar: avatarPreview,
        birthCertificate, transferCertificate,
        hasTransferCertificate: formData.hasTransferCertificate === 'true',
        isPhysicallyHandicapped: formData.isPhysicallyHandicapped === 'true',
        age: formData.age ? parseInt(formData.age) : null,
        metadata: {
          religion: formData.religion,
          father: { name: formData.fatherName, phone: formData.fatherPhone, email: formData.fatherEmail },
          mother: { name: formData.motherName, phone: formData.motherPhone, email: formData.motherEmail },
          emergency: { name: formData.emergencyName, relation: formData.emergencyRelation, phone: formData.emergencyPhone, address: formData.emergencyAddress },
          maritalStatus: formData.maritalStatus,
          spouse: formData.maritalStatus === 'Married' ? { name: formData.spouseName, phone: formData.spousePhone } : null
        }
      });
      showToast('Registration successful!', 'success');
      navigate('/student/login');
    } catch (err: any) { showToast(err.response?.data?.error || 'Registration failed', 'error'); }
    finally { setLoading(false); }
  };

  const FileUploadCard = ({ label, type, file, fileName, icon, required: req }: {
    label: string; type: 'birth'|'transfer'; file: string|null; fileName: string; icon: string; required?: boolean;
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

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth:'900px' }}>
        <div className="register-header">
          <img src="/images/logo.png" alt="School Logo" />
          <h2>Student Registration</h2>
          <p>Institutional Enrollment Portal</p>
        </div>

        <div className="steps-bar flex-wrap gap-2">
          {[1,2,3,4,5,6].map(s => (
            <div key={s} className={'step-item '+(step===s?'active ':'')+(step>s?'done':'')} onClick={() => step>s && setStep(s)}>
              <div className="step-num">{s}</div>
              <span className="hidden sm:inline">
                {s===1?'Identity':s===2?'Location':s===3?'Academic':s===4?'History':s===5?'Family':'Account'}
              </span>
            </div>
          ))}
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>

            {/* STEP 1: Identity */}
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-id-card"></i> Identity &amp; Verification</div>

                <div style={{ ...cardStyle, borderLeft:'4px solid #2563eb', background:'#eff6ff' }}>
                  <div style={sectionHeaderStyle}><i className="fas fa-school"></i> School Verification</div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label style={{ color:'#1d4ed8', fontWeight:700 }}>School Access Code *</label>
                    <div className="flex gap-2">
                      <input type="text" name="schoolCode" placeholder="e.g. ABC123" value={formData.schoolCode} onChange={handleInputChange} required style={{ flex:1, textTransform:'uppercase' }} />
                      <button type="button" className="portal-btn-primary" onClick={verifySchool} disabled={verifying}>
                        {verifying ? <><i className="fas fa-spinner fa-spin"></i> Verifying&hellip;</> : <><i className="fas fa-check-circle"></i> Verify</>}
                      </button>
                    </div>
                    {schoolData && (
                      <div style={{ marginTop:'8px', padding:'8px 12px', background:'#dcfce7', borderRadius:'8px', color:'#16a34a', fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}>
                        <i className="fas fa-check-circle"></i> Verified: {schoolData.schoolName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="avatar-preview-wrap cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                    {avatarPreview ? <img src={avatarPreview} alt="Preview" /> : <i className="fas fa-camera fa-2x text-slate-300"></i>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block">Profile Photo (Max 20MB)</label>
                    <input type="file" id="avatar-input" accept="image/*" onChange={(e) => handleFileChange(e,'avatar')} className="text-xs" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date of Birth *</label><input type="date" name="dob" value={formData.dob} onChange={handleInputChange} required /></div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                      <option value="">Select&hellip;</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Age (auto-calculated)</label>
                    <input type="number" name="age" value={formData.age} readOnly placeholder="From DOB" style={{ background:'#f1f5f9', color:'#64748b', cursor:'default' }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nationality</label>
                    <select name="nationality" value={formData.nationality} onChange={handleInputChange}>
                      <option value="">Select nationality&hellip;</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Mother Tongue</label><input name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} placeholder="e.g. Shona" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Physical Handicap?</label>
                    <select name="isPhysicallyHandicapped" value={formData.isPhysicallyHandicapped} onChange={handleInputChange}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </div>
                  {formData.isPhysicallyHandicapped === 'true' && (
                    <div className="form-group flex-1"><label>Handicap Details</label><input name="handicapDetails" value={formData.handicapDetails} onChange={handleInputChange} /></div>
                  )}
                </div>
                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button></div>
              </div>
            )}

            {/* STEP 2: Location */}
            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-map-marker-alt"></i> Location &amp; Contact</div>
                <div className="form-row">
                  <div className="form-group"><label>City *</label><input name="city" value={formData.city} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>State / Province</label><input name="state" value={formData.state} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group"><label>Residential Address *</label><textarea name="address" rows={2} value={formData.address} onChange={handleInputChange} required></textarea></div>
                <div className="form-row">
                  <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group">
                  <label>Religion</label>
                  <select name="religion" value={formData.religion} onChange={handleInputChange}>
                    <option value="">Select&hellip;</option>
                    <option>Christianity</option><option>Islam</option><option>Hinduism</option>
                    <option>Judaism</option><option>Buddhism</option><option>None</option><option>Other</option>
                  </select>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* STEP 3: Academic */}
            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-graduation-cap"></i> Academic Assignment</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Form / Class *</label>
                    <select name="grade" value={formData.grade} onChange={handleInputChange} required>
                      <option value="">Select class&hellip;</option>
                      {schoolData?.classes?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Section</label>
                    <select name="section" value={formData.section} onChange={handleInputChange}>
                      <option value="">Select section&hellip;</option>
                      {schoolData?.sections?.length > 0
                        ? schoolData.sections.map((s: any, i: number) => <option key={i} value={s.name}>{s.name}</option>)
                        : ['A','B','C','D','E'].map(s => <option key={s} value={s}>Section {s}</option>)
                      }
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Student House</label>
                    <select name="studentHouseId" value={formData.studentHouseId} onChange={handleInputChange}>
                      <option value="">Select house&hellip;</option>
                      {schoolData?.houses?.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Student Club</label>
                    <select name="clubId" value={formData.clubId} onChange={handleInputChange}>
                      <option value="">Select club&hellip;</option>
                      {schoolData?.clubs?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange}>
                      <option value="">Select category&hellip;</option>
                      {STUDENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Date Admitted</label><input type="date" name="dateAdmitted" value={formData.dateAdmitted} onChange={handleInputChange} /></div>
                </div>

                <div style={{ ...cardStyle, borderLeft:'4px solid #7c3aed' }}>
                  <div style={{ ...sectionHeaderStyle, color:'#7c3aed' }}><i className="fas fa-bed"></i> Dormitory &amp; Room</div>
                  <div className="form-row" style={{ marginBottom:0 }}>
                    <div className="form-group">
                      <label>Dormitory / Hostel</label>
                      <select name="hostelId" value={formData.hostelId} onChange={handleInputChange}>
                        <option value="">Select dormitory&hellip;</option>
                        {schoolData?.hostels?.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Room</label>
                      <select name="roomId" value={formData.roomId} onChange={handleInputChange} disabled={!formData.hostelId}>
                        <option value="">{formData.hostelId ? 'Select room\u2026' : '\u2014 Select dormitory first \u2014'}</option>
                        {availableRooms.map((r: any) => <option key={r.id} value={r.id}>{r.name || r.roomNumber}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* STEP 4: History */}
            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-history"></i> Previous Academic History</div>
                <div className="form-row">
                  <div className="form-group"><label>Previous School Name</label><input name="prevSchoolName" value={formData.prevSchoolName} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Previous Class</label><input name="prevSchoolClass" value={formData.prevSchoolClass} onChange={handleInputChange} /></div>
                </div>
                <div className="form-group"><label>Previous School Address</label><input name="prevSchoolAddress" value={formData.prevSchoolAddress} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Purpose for Leaving</label><textarea name="purposeForLeaving" rows={2} value={formData.purposeForLeaving} onChange={handleInputChange}></textarea></div>
                <div className="form-group">
                  <label>Has Transfer Certificate?</label>
                  <select name="hasTransferCertificate" value={formData.hasTransferCertificate} onChange={handleInputChange}>
                    <option value="false">No</option><option value="true">Yes</option>
                  </select>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* STEP 5: Family */}
            {step === 5 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-users"></i> Family &amp; Emergency Contacts</div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-male"></i> Father / Guardian 1</div>
                  <div className="form-row">
                    <div className="form-group"><label>Full Name</label><input name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder="Father's full name" /></div>
                    <div className="form-group"><label>Phone Number</label><input type="tel" name="fatherPhone" value={formData.fatherPhone} onChange={handleInputChange} placeholder="+263 7xx xxx xxx" /></div>
                  </div>
                  <div className="form-group"><label>Email Address</label><input type="email" name="fatherEmail" value={formData.fatherEmail} onChange={handleInputChange} placeholder="father@email.com" /></div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-female"></i> Mother / Guardian 2</div>
                  <div className="form-row">
                    <div className="form-group"><label>Full Name</label><input name="motherName" value={formData.motherName} onChange={handleInputChange} placeholder="Mother's full name" /></div>
                    <div className="form-group"><label>Phone Number</label><input type="tel" name="motherPhone" value={formData.motherPhone} onChange={handleInputChange} placeholder="+263 7xx xxx xxx" /></div>
                  </div>
                  <div className="form-group"><label>Email Address</label><input type="email" name="motherEmail" value={formData.motherEmail} onChange={handleInputChange} placeholder="mother@email.com" /></div>
                </div>

                <div style={{ ...cardStyle, borderLeft:'4px solid #ef4444', background:'var(--bg-danger-light,#fff5f5)' }}>
                  <div style={{ ...sectionHeaderStyle, color:'#dc2626' }}><i className="fas fa-phone-alt"></i> Emergency Contact *</div>
                  <div className="form-row">
                    <div className="form-group"><label>Contact Name *</label><input name="emergencyName" value={formData.emergencyName} onChange={handleInputChange} required placeholder="Full name" /></div>
                    <div className="form-group">
                      <label>Relationship *</label>
                      <select name="emergencyRelation" value={formData.emergencyRelation} onChange={handleInputChange} required>
                        <option value="">Select relationship&hellip;</option>
                        {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Phone Number *</label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleInputChange} required placeholder="+263 7xx xxx xxx" /></div>
                    <div className="form-group"><label>Address</label><input name="emergencyAddress" value={formData.emergencyAddress} onChange={handleInputChange} placeholder="Emergency contact address" /></div>
                  </div>
                </div>

                <div className="btn-row mt-4">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* STEP 6: Docs & Account */}
            {step === 6 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-file-alt"></i> Documents &amp; Account</div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-folder-open"></i> Student Documents</div>
                  <p style={{ fontSize:'13px', color:'#64748b', marginBottom:'16px' }}>
                    Upload your documents individually. Each file is stored separately in your student record.
                  </p>
                  <div className="form-row" style={{ alignItems:'stretch' }}>
                    <div className="form-group" style={{ flex:1 }}>
                      <FileUploadCard label="Birth Certificate" type="birth" file={birthCertificate} fileName={birthCertName} icon="fa-certificate" required />
                    </div>
                    <div className="form-group" style={{ flex:1 }}>
                      <FileUploadCard label="Transfer Certificate" type="transfer" file={transferCertificate} fileName={transferCertName} icon="fa-file-import" />
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-lock"></i> Account Credentials</div>
                  <p style={{ fontSize:'13px', color:'#64748b', marginBottom:'16px' }}>
                    Set a strong password to secure your account. You will log in with your email address.
                  </p>
                  <div className="form-row">
                    <div className="form-group"><label>Password *</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="Min 8 chars, upper, lower, number, symbol" /></div>
                    <div className="form-group"><label>Confirm Password *</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required placeholder="Re-enter password" /></div>
                  </div>
                  {formData.password && !STRONG_PASSWORD_REGEX.test(formData.password) && (
                    <div style={{ fontSize:'12px', color:'#dc2626', marginTop:'4px', padding:'8px 12px', background:'#fef2f2', borderRadius:'6px' }}>
                      <i className="fas fa-exclamation-triangle"></i> Must be 8+ chars with uppercase, lowercase, number &amp; symbol.
                    </div>
                  )}
                  {formData.password && STRONG_PASSWORD_REGEX.test(formData.password) && (
                    <div style={{ fontSize:'12px', color:'#16a34a', marginTop:'4px', padding:'8px 12px', background:'#f0fdf4', borderRadius:'6px' }}>
                      <i className="fas fa-check-circle"></i> Strong password — good to go!
                    </div>
                  )}
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Processing&hellip;</> : <><i className="fas fa-user-plus"></i> Complete Enrollment</>}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        <div className="register-footer">
          Already have an account? <Link to="/student/login">Sign In</Link> &nbsp;|&nbsp;
          <Link to={formData.schoolCode ? '/school/'+formData.schoolCode.trim().toUpperCase() : '/'}><i className="fas fa-home"></i> Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
