import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

export default function ApplicantRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [formData, setFormData] = useState({
    schoolCode: '',
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
    // Transfer fields
    prevSchool: '',
    reasonForTransfer: '',
    lastGradeAchieved: '',
    // Academic History
    academicHistory: [] as { subject: string, grade: string }[],
    // Documents (Base64)
    documents: [] as { name: string, data: string }[]
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData(prev => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
    }
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: any, docName: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData(prev => {
        const filtered = prev.documents.filter(d => d.name !== docName);
        return {
          ...prev,
          documents: [...filtered, { name: docName, data: base64 }]
        };
      });
      showToast(`${docName} ready for upload`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => {
    if (step === 1 && !formData.appType) { 
        showToast('Please select an admission type', 'warning'); 
        return; 
    }
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

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
      setStep(6); // Success step
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 6) {
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

          <button className="btn-next" style={{ width: '100%' }} onClick={() => navigate(`/check-status${formData.schoolCode ? `?school=${formData.schoolCode.trim().toUpperCase()}` : ''}`)}>Track Status Now</button>
          <div style={{ marginTop: 20 }}>
             <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"} style={{ color: '#718096', fontSize: '0.9rem' }}>Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const getDocStatusIcon = (name: string) => {
    return formData.documents.some(d => d.name === name) 
      ? <i className="fas fa-check-circle" style={{ color: '#38a169', marginLeft: 8 }}></i>
      : null;
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container">
        <div className="register-header" style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)' }}>
          <i className="fas fa-file-signature" style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
          <h2>Entrance Application</h2>
          <p>Join our academic community for the upcoming intake</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}><div className="step-num">1</div><span>Type</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}><div className="step-num">2</div><span>Personal</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}><div className="step-num">3</div><span>Academic</span></div>
          <div className={`step-item ${step === 4 ? 'active' : ''} ${step > 4 ? 'done' : ''}`}><div className="step-num">4</div><span>Docs</span></div>
          <div className={`step-item ${step === 5 ? 'active' : ''}`}><div className="step-num">5</div><span>Review</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-school"></i> School & Admission</div>
                <div className="form-group">
                  <label>School Access Code *</label>
                  <input type="text" name="schoolCode" placeholder="Enter school's portal code" value={formData.schoolCode} onChange={handleInputChange} required />
                </div>
                <div className="section-divider">Select Admission Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 15 }}>
                  <button type="button" className={`btn-prev ${formData.appType === 'Form 1' ? 'active' : ''}`} 
                    style={{ background: formData.appType === 'Form 1' ? '#eff6ff' : 'white', borderColor: formData.appType === 'Form 1' ? 'var(--school-primary)' : '#c0d0ea' }}
                    onClick={() => setFormData(p => ({ ...p, appType: 'Form 1' }))}>
                    <i className="fas fa-child"></i> Form 1 Entry
                  </button>
                  <button type="button" className={`btn-prev ${formData.appType === 'A-Level' ? 'active' : ''}`}
                    style={{ background: formData.appType === 'A-Level' ? '#eff6ff' : 'white', borderColor: formData.appType === 'A-Level' ? 'var(--school-primary)' : '#c0d0ea' }}
                    onClick={() => setFormData(p => ({ ...p, appType: 'A-Level' }))}>
                    <i className="fas fa-user-graduate"></i> A-Level Entry
                  </button>
                  <button type="button" className={`btn-prev ${formData.appType === 'Transfer' ? 'active' : ''}`}
                    style={{ background: formData.appType === 'Transfer' ? '#eff6ff' : 'white', borderColor: formData.appType === 'Transfer' ? 'var(--school-primary)' : '#c0d0ea', gridColumn: 'span 2' }}
                    onClick={() => setFormData(p => ({ ...p, appType: 'Transfer' }))}>
                    <i className="fas fa-exchange-alt"></i> Transfer Admission
                  </button>
                </div>
                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Continue</button></div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-user"></i> Applicant Details</div>
                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" name="email" placeholder="For status notifications" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date of Birth *</label><input type="date" name="dob" value={formData.dob} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Gender *</label><select name="gender" value={formData.gender} onChange={handleInputChange} required><option value="">Select...</option><option>Male</option><option>Female</option></select></div>
                </div>
                <div className="form-group">
                  <label>Physical Address *</label>
                  <textarea name="address" rows={2} placeholder="Home address for registration" value={formData.address} onChange={handleInputChange} required></textarea>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-book"></i> Academic History & Background</div>
                
                {formData.appType === 'Transfer' && (
                  <>
                    <div className="form-group">
                      <label>Previous School Attended *</label>
                      <input type="text" name="prevSchool" value={formData.prevSchool} onChange={handleInputChange} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Last Grade/Form Achieved</label><input type="text" name="lastGradeAchieved" value={formData.lastGradeAchieved} onChange={handleInputChange} /></div>
                      <div className="form-group"><label>Reason for Transfer</label><input type="text" name="reasonForTransfer" value={formData.reasonForTransfer} onChange={handleInputChange} /></div>
                    </div>
                    <div className="section-divider">Academic Performance</div>
                  </>
                )}

                <div className="form-group">
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 10 }}>List your core subjects and latest grades/units attained.</p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                     <input type="text" id="temp-subject" className="portal-input" style={{ flex: 2 }} placeholder="Subject (e.g. Maths)" />
                     <input type="text" id="temp-grade" className="portal-input" style={{ flex: 1 }} placeholder="Grade/Unit" />
                     <button type="button" className="portal-btn-primary" onClick={() => {
                        const s = (document.getElementById('temp-subject') as HTMLInputElement).value;
                        const g = (document.getElementById('temp-grade') as HTMLInputElement).value;
                        if (s && g) {
                           setFormData(p => ({ ...p, academicHistory: [...p.academicHistory, { subject: s, grade: g }] }));
                           (document.getElementById('temp-subject') as HTMLInputElement).value = '';
                           (document.getElementById('temp-grade') as HTMLInputElement).value = '';
                        }
                     }}><i className="fas fa-plus"></i></button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                     {formData.academicHistory.map((item, i) => (
                        <div key={i} style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                           <strong>{item.subject}:</strong> {item.grade}
                           <i className="fas fa-times" style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => setFormData(p => ({ ...p, academicHistory: p.academicHistory.filter((_, idx) => idx !== i) }))}></i>
                        </div>
                     ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 20 }}>
                  <label>Additional Honors / Extracurricular Notes</label>
                  <textarea name="notes" rows={3} placeholder="e.g. Captain of Debate Team, National Athletics..." value={formData.notes} onChange={handleInputChange}></textarea>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Document Upload</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-cloud-upload-alt"></i> Required Documentation</div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>Please upload scanned copies (Images/PDFs) of the following documents for verification.</p>
                
                <div className="form-group" style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600 }}>Applicant Photo (Max 20MB) * {getDocStatusIcon('Applicant Photo')}</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'Applicant Photo')} style={{ marginTop: 5 }} />
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600 }}>Birth Certificate * {getDocStatusIcon('Birth Certificate')}</label>
                  <input type="file" onChange={(e) => handleFileUpload(e, 'Birth Certificate')} style={{ marginTop: 5 }} />
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600 }}>National ID / Passport {getDocStatusIcon('National ID')}</label>
                  <input type="file" onChange={(e) => handleFileUpload(e, 'National ID')} style={{ marginTop: 5 }} />
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontWeight: 600 }}>Academic Scans / Certificates {getDocStatusIcon('Academic Certificates')}</label>
                  <input type="file" onChange={(e) => handleFileUpload(e, 'Academic Certificates')} style={{ marginTop: 5 }} />
                </div>

                <div className="btn-row" style={{ marginTop: 25 }}>
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Review Application</button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-clipboard-check"></i> Final Review</div>
                <div style={{ background: '#f1f5f9', padding: 20, borderRadius: 12, border: '1px solid #cbd5e0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div>
                      <small style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>Applicant</small>
                      <p style={{ fontWeight: 600 }}>{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <small style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>Type</small>
                      <p style={{ fontWeight: 600 }}>{formData.appType}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <small style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>Email Address</small>
                      <p style={{ fontWeight: 600 }}>{formData.email}</p>
                    </div>
                    <div>
                      <small style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>Documents</small>
                      <p style={{ fontWeight: 600 }}>{formData.documents.length} Attached</p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <label style={{ display: 'flex', gap: 10, fontSize: '0.85rem', background: '#fffaf0', padding: 10, border: '1px solid #feebc8', borderRadius: 8 }}>
                    <input type="checkbox" required />
                    <span>I certify that the information and documents provided are true and accurate.</span>
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: 20 }}>
                  <label>Create Portal Password *</label>
                  <input type="password" name="password" placeholder="Min 6 characters" value={formData.password} onChange={handleInputChange} required />
                  <p style={{ fontSize: '0.75rem', color: '#718096', marginTop: 5 }}>You will use this password to track your admission status.</p>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
