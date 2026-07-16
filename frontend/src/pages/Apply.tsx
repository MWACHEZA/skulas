import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useTerminology } from '../hooks/useTerminology';
import '../styles/registration.css';

const APPROVED_O_LEVEL_SUBJECTS = [
  'Accounting', 'Accounts', 'Ancient History', 'Applied Mechanics', 'Applied Statistics', 'Art', 
  'Art and Crafts', 'Bible Knowledge', 'Biology', 'Bookkeeping and Accounting', 'Botany', 'Building Studies', 
  'Business Management', 'Business Studies', 'Chemistry', 'Commerce', 'Computer Studies', 'Computing Studies', 
  'Divinity', 'Drama and Theatre Arts', 'Economic and Public Affairs', 'Economic History', 'Economic Principles', 
  'Economics', 'Electricity & Electronics', 'Elementary Physiology', 'Elements of Sociology', 'Engineering Drawing', 
  'Engineering Science', 'English Language', 'English Literature', 'Environmental Biology', 'Environmental Studies', 
  'Fashion and Fabrics', 'Food and Nutrition', 'French', 'French Literature', 'French Studies', 'General Mathematics', 
  'General Paper', 'General Principles of English Law', 'General Science', 'Geography', 'Geology', 'Government Economics and Commerce', 
  'Health Science', 'History', 'History & Appreciation of Music', 'Home Economics', 'Human Biology', 'Law', 'Mathematics', 
  'Music', 'Ndebele', 'Physical Science', 'Physics', 'Physics with Chemistry', 'Political Studies', 'Portuguese', 
  'Principles of Economics', 'Psychology', 'Religious Studies', 'Rural Biology', 'Shona', 'Social Science', 'Sociology', 
  'Statistics', 'Technical Drawing', 'Technical Graphics', 'Zoology'
];

const APPROVED_A_LEVEL_SUBJECTS = [
  'Accounting', 'Accounts', 'Accounts, Principles of', 'Ancient History', 'Ancient History and Literature', 
  'Applied Mechanics', 'Art', 'Art and Crafts', 'Bible Knowledge', 'Biology', 'Botany', 'Business Management', 
  'Business Studies', 'Chemistry', 'Computer Studies', 'Computing Science', 'Divinity', 'Economic & Political Studies', 
  'Economic and Social History', 'Economic Geography', 'Economic History', 'Economics', 'Electronic Systems', 
  'Engineering Drawing', 'Engineering Science', 'English Literature', 'Environmental Studies', 'Fashion and Fabrics', 
  'Food and Nutrition', 'French', 'General Principles of English Law', 'Geography', 'Geology', 'Government & Political Studies', 
  'Health Science', 'History', 'History, Ancient', 'Human Biology', 'Law', 'Mathematics', 'Mathematics, Applied', 
  'Mathematics, Pure', 'Music', 'Ndebele', 'Physical Science', 'Physics', 'Political Studies', 'Portuguese', 
  'Psychology', 'Religious Studies', 'Shona', 'Social Science', 'Sociology', 'Statistics', 'Technical Drawing', 'Zoology'
];

export default function Apply() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const [formData, setFormData] = useState({
    schoolCode: schoolCode || '',
    appType: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    notes: '',
    password: '',
    classId: '',
    entryCategory: '', // For University: Normal, Special, Mature
    academicData: {
      oLevels: [] as any[], // { subject, grade }
      aLevels: [] as any[],
      specialQualifications: ''
    }
  });

  const { isUniversity } = useTerminology();
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    if (schoolCode) {
      const autoValidate = async () => {
        setValidating(true);
        try {
          const [dataRes, schoolRes] = await Promise.all([
            api.get(`/api/public/schools/${schoolCode}/data`),
            api.get(`/api/schools/${schoolCode.toUpperCase()}`)
          ]);
          setAvailableClasses(dataRes.data.classes || []);
          setSchoolSettings(schoolRes.data.websiteSettings);
          setIsValidated(true);
        } catch (err) {
          console.error('Auto-validation failed', err);
        } finally {
          setValidating(false);
        }
      };
      autoValidate();
    }
  }, [schoolCode]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateSchool = async () => {
    if (!formData.schoolCode) return showToast('Please enter a school code', 'warning');
    setValidating(true);
    try {
      const [dataRes, schoolRes] = await Promise.all([
        api.get(`/api/public/schools/${formData.schoolCode}/data`),
        api.get(`/api/schools/${formData.schoolCode.toUpperCase()}`)
      ]);
      setAvailableClasses(dataRes.data.classes || []);
      setSchoolSettings(schoolRes.data.websiteSettings);
      setIsValidated(true);
      showToast(`Connected to ${dataRes.data.schoolName}`, 'success');
    } catch (err) {
      showToast('Invalid school code or connection failed', 'error');
      setAvailableClasses([]);
      setIsValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register-application', {
        ...formData,
        applicantName: `${formData.firstName} ${formData.lastName}`
      });
      setApplicationId(data.applicationId);
      showToast('Application submitted successfully!', 'success');
      setStep(5); // Success step
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 5) {
    return (
      <div className="register-page-wrapper">
        <div className="register-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ color: '#28a745', fontSize: '4rem', marginBottom: 20 }}><i className="fas fa-check-circle"></i></div>
          <h2 style={{ marginBottom: 10 }}>Application Submitted!</h2>
          <p style={{ color: '#666' }}>Your entrance application has been received successfully.</p>
          
          <div style={{ background: '#f8fafc', border: '2px dashed var(--school-primary)', padding: 25, borderRadius: 12, margin: '30px 0' }}>
            <p style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Application Tracking ID</p>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--school-primary)', margin: '5px 0' }}>{applicationId}</h3>
            <p style={{ fontSize: '0.9rem', marginTop: 10 }}>Keep this ID to track your admission status.</p>
          </div>

          <button className="btn-next" style={{ width: '100%' }} onClick={() => navigate('/check-status')}>Track Status Now</button>
          <div style={{ marginTop: 20 }}>
             <Link to="/" style={{ color: '#718096', fontSize: '0.9rem' }}>Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page-wrapper">
      <div className="register-container">
        <div className="register-header">
          <img src="/images/logo.png" alt="Logo" />
          <h2>Entrance Application</h2>
          <p>2026 Academic Year Intake - Enrollment Portal</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}><div className="step-num">1</div><span>School</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}><div className="step-num">2</div><span>Personal</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}><div className="step-num">3</div><span>Academic</span></div>
          <div className={`step-item ${step === 4 ? 'active' : ''}`}><div className="step-num">4</div><span>Finalize</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-school"></i> School & Admission</div>
                <div className="form-group">
                  <label>School Access Code *</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="text" 
                      name="schoolCode" 
                      placeholder="Enter school access code" 
                      value={formData.schoolCode} 
                      onChange={handleInputChange} 
                      required 
                      disabled={isValidated}
                    />
                    {!isValidated ? (
                      <button type="button" className="btn-next" style={{ width: 'auto', padding: '0 25px' }} onClick={validateSchool} disabled={validating}>
                        {validating ? <i className="fas fa-spinner fa-spin"></i> : 'Validate'}
                      </button>
                    ) : (
                      <button type="button" className="btn-prev" style={{ width: 'auto', padding: '0 15px' }} onClick={() => setIsValidated(false)}>
                        <i className="fas fa-edit"></i>
                      </button>
                    )}
                  </div>
                </div>

                {schoolSettings?.admissionProcedure && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px', margin: '20px 0', fontSize: '0.875rem', color: '#0369a1', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
                      <i className="fas fa-info-circle text-[#0284c7]"></i> Admissions Guide & Procedure
                    </h4>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{schoolSettings.admissionProcedure}</p>
                  </div>
                )}
                <div className="section-divider">{isUniversity ? 'University Entry Category' : 'Admission Type'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 15 }}>
                  {(isUniversity ? ['Normal', 'Special', 'Mature'] : ['Form 1', 'A-Level', 'Transfer']).map(type => (
                    <button key={type} type="button" 
                      className={`btn-prev ${(isUniversity ? formData.entryCategory : formData.appType) === type ? 'active' : ''}`} 
                      style={{ 
                        padding: '12px 5px',
                        fontSize: '0.85rem',
                        background: (isUniversity ? formData.entryCategory : formData.appType) === type ? '#eff6ff' : 'white', 
                        borderColor: (isUniversity ? formData.entryCategory : formData.appType) === type ? 'var(--school-primary)' : '#c0d0ea' 
                      }}
                      onClick={() => {
                        if (isUniversity) {
                          setFormData(p => ({ ...p, entryCategory: type, appType: 'University' }));
                        } else {
                          setFormData(p => ({ ...p, appType: type }));
                        }
                      }}>
                      <i className={`fas ${
                        type === 'Form 1' || type === 'Normal' ? 'fa-user-graduate' : 
                        type === 'A-Level' || type === 'Special' ? 'fa-certificate' : 
                        'fa-user-clock'
                      }`}></i> 
                      <span style={{ display: 'block', marginTop: 5 }}>{type}</span>
                    </button>
                  ))}
                </div>

                {availableClasses.length > 0 && (
                  <div className="form-group" style={{ marginTop: 25 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-list-ul" style={{ color: 'var(--school-primary)' }}></i>
                      Select Specific Form / Class *
                    </label>
                    <select 
                      name="classId" 
                      className="portal-input" 
                      value={formData.classId} 
                      onChange={handleInputChange}
                      required
                      style={{ height: 48, marginTop: 5, borderRadius: 10 }}
                    >
                      <option value="">-- Choose Class --</option>
                      {availableClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="btn-row" style={{ marginTop: 30 }}>
                  <button 
                    type="button" 
                    className="btn-next" 
                    onClick={() => {
                      if (isUniversity && !formData.entryCategory) return showToast('Please select an entry category', 'warning');
                      if (!isUniversity && !formData.appType) return showToast('Please select admission type', 'warning');
                      if (availableClasses.length > 0 && !formData.classId) return showToast('Please select a faculty/program', 'warning');
                      setStep(2);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-user"></i> Personal Details</div>
                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date of Birth</label><input type="date" name="dob" value={formData.dob} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} required><option value="">Select...</option><option>Male</option><option>Female</option></select></div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={() => setStep(1)}>Back</button>
                  <button type="button" className="btn-next" onClick={() => {
                    if (isUniversity && formData.entryCategory === 'Mature' && formData.dob) {
                      const age = new Date().getFullYear() - new Date(formData.dob).getFullYear();
                      if (age < 25) return showToast('Mature entry candidates must be at least 25 years old.', 'error');
                    }
                    setStep(3);
                  }}>Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-book"></i> Academic History</div>
                
                {isUniversity && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                     <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 15, fontWeight: 600 }}>University Academic History</p>
                     
                     {/* O-Level Selection */}
                     <div className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--school-primary)', fontWeight: 600, borderBottom: '1px solid #cbd5e0', paddingBottom: 5, marginBottom: 15 }}>O-Level Subjects (Min 5)</div>
                     {[0,1,2,3,4].map(idx => (
                       <div key={`o-level-${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                         <select 
                           className="portal-input" 
                           style={{ height: 40, fontSize: '0.85rem' }}
                           onChange={(e) => {
                             const oLevels = [...formData.academicData.oLevels];
                             oLevels[idx] = { ...oLevels[idx], subject: e.target.value };
                             setFormData(p => ({ ...p, academicData: { ...p.academicData, oLevels } }));
                           }}
                         >
                           <option value="">Select Subject {idx + 1}</option>
                           {APPROVED_O_LEVEL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                         <select 
                           className="portal-input" 
                           style={{ height: 40, fontSize: '0.85rem' }}
                           onChange={(e) => {
                             const oLevels = [...formData.academicData.oLevels];
                             oLevels[idx] = { ...oLevels[idx], grade: e.target.value };
                             setFormData(p => ({ ...p, academicData: { ...p.academicData, oLevels } }));
                           }}
                         >
                           <option value="">Grade</option>
                           {['A', 'B', 'C', 'D', 'E', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
                         </select>
                       </div>
                     ))}

                     {/* A-Level Selection for Normal Entry */}
                     {formData.entryCategory === 'Normal' && (
                       <>
                        <div className="section-subtitle" style={{ fontSize: '0.8rem', color: 'var(--school-primary)', fontWeight: 600, borderBottom: '1px solid #cbd5e0', paddingBottom: 5, marginBottom: 15, marginTop: 25 }}>A-Level Subjects (Min 2)</div>
                        {[0,1,2].map(idx => (
                          <div key={`a-level-${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                            <select 
                              className="portal-input" 
                              style={{ height: 40, fontSize: '0.85rem' }}
                              onChange={(e) => {
                                const aLevels = [...formData.academicData.aLevels];
                                aLevels[idx] = { ...aLevels[idx], subject: e.target.value };
                                setFormData(p => ({ ...p, academicData: { ...p.academicData, aLevels } }));
                              }}
                            >
                              <option value="">Select Subject {idx + 1}</option>
                              {APPROVED_A_LEVEL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select 
                              className="portal-input" 
                              style={{ height: 40, fontSize: '0.85rem' }}
                              onChange={(e) => {
                                const aLevels = [...formData.academicData.aLevels];
                                aLevels[idx] = { ...aLevels[idx], grade: e.target.value };
                                setFormData(p => ({ ...p, academicData: { ...p.academicData, aLevels } }));
                              }}
                            >
                              <option value="">Grade</option>
                              {['A', 'B', 'C', 'D', 'E', 'O', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        ))}
                       </>
                     )}

                     {/* Special Qualifications */}
                     {formData.entryCategory === 'Special' && (
                        <div className="form-group" style={{ marginTop: 20 }}>
                          <label>Prior Degrees / Qualifications</label>
                          <textarea 
                            rows={3} 
                            placeholder="Detail your previous degree, institution and GPA..."
                            onChange={(e) => setFormData(p => ({ ...p, academicData: { ...p.academicData, specialQualifications: e.target.value } }))}
                          ></textarea>
                        </div>
                     )}
                  </div>
                )}

                {!isUniversity && formData.appType === 'Form 1' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 15, fontWeight: 600 }}>Grade 7 Final Results (Units)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                      {[
                        { label: 'Mathematics', name: 'maths' },
                        { label: 'English', name: 'english' },
                        { label: 'General Paper', name: 'general' },
                        { label: 'Language (Shona/Ndebele)', name: 'language' }
                      ].map(s => (
                        <div key={s.name} className="form-group">
                          <label style={{ fontSize: '0.8rem' }}>{s.label}</label>
                          <input 
                            type="number" 
                            min="1" max="9" 
                            placeholder="Unit"
                            className="portal-input"
                            style={{ height: 40 }}
                            onChange={(e) => {
                              const hist = (formData as any).academicHistory || {};
                              setFormData(p => ({ ...p, academicHistory: { ...hist, [s.name]: e.target.value } }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.appType === 'A-Level' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 15, fontWeight: 600 }}>O-Level Academic History</p>
                    <div className="form-group">
                        <label>Previous School</label>
                        <input type="text" name="prevSchool" value={(formData as any).prevSchool || ''} onChange={handleInputChange} placeholder="Name of school" />
                    </div>
                    <div className="form-group">
                        <label>Top O-Level Results</label>
                        <textarea 
                          rows={3} 
                          placeholder="e.g. Maths: A, Science: B, English: A..." 
                          style={{ height: 80 }}
                          onChange={(e) => {
                            setFormData(p => ({ ...p, academicHistory: e.target.value }));
                          }}
                        ></textarea>
                    </div>
                  </div>
                )}

                {formData.appType === 'Transfer' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 15, fontWeight: 600 }}>Transfer Information</p>
                    <div className="form-group">
                        <label>Current/Last School</label>
                        <input type="text" name="prevSchool" value={(formData as any).prevSchool || ''} onChange={handleInputChange} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Last Grade</label>
                        <input type="text" name="lastGradeAchieved" value={(formData as any).lastGradeAchieved || ''} onChange={handleInputChange} placeholder="e.g. Form 3" required />
                      </div>
                      <div className="form-group">
                        <label>Reason for Transfer</label>
                        <input type="text" name="reasonForTransfer" value={(formData as any).reasonForTransfer || ''} onChange={handleInputChange} required />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                   <label>Self-reported Honors / Experience / Notes</label>
                   <textarea name="notes" rows={3} placeholder="e.g. Head Boy, Science Club Captain..." value={formData.notes} onChange={handleInputChange}></textarea>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={() => setStep(2)}>Back</button>
                  <button type="button" className="btn-next" onClick={() => setStep(4)}>Review</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-lock"></i> Finalize Account</div>
                <div className="form-group">
                  <label>Create Portal password (for tracking) *</label>
                  <input type="password" name="password" placeholder="Choose a password" value={formData.password} onChange={handleInputChange} required />
                </div>
                <div style={{ marginTop: 20 }}>
                  <label style={{ display: 'flex', gap: 10, fontSize: '0.85rem' }}>
                    <input type="checkbox" required />
                    I certify that the information provided is true and accurate.
                  </label>
                </div>
                <div className="btn-row" style={{ marginTop: 20 }}>
                  <button type="button" className="btn-prev" onClick={() => setStep(3)}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
                </div>
              </div>
            )}
          </form>
        </div>
        
        <div className="register-footer">
            Already applied? <Link to="/check-status">Track Application</Link> &nbsp;|&nbsp; <Link to="/">Home</Link>
        </div>
      </div>
    </div>
  );
}
