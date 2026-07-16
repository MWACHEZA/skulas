import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';

interface JobApplication {
  id: string;
  applicantName: string;
  gender: string;
  email: string;
  phone: string;
  qualification: string;
  status: string;
  skills: string;
  workExperience: string;
  address: string;
  vacancyId: string;
  vacancy: { jobTitle: string; requiredFields?: string };
  coverLetter: string;
  resumeUrl?: string;
  photoUrl?: string;
  createdAt: string;
}

const STATUS_TABS = ['Applied', 'On review', 'Interviewed', 'Offered', 'Hired', 'Declined'];

export default function JobApplications() {
  const { t } = useTerminology();
  const [activeTab, setActiveTab] = useState('Applied');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [vacancies, setVacancies] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Detail Modal States
  const [selectedAppForView, setSelectedAppForView] = useState<JobApplication | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);

  // Add Form States
  const [addFormData, setAddFormData] = useState({
    applicantName: '',
    vacancyId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Applied',
    gender: '',
    email: '',
    phone: '',
    qualification: '',
    skills: '',
    workExperience: '',
    address: '',
    coverLetter: ''
  });

  const [addFiles, setAddFiles] = useState<{
    photo: File | null;
    resume: File | null;
  }>({
    photo: null,
    resume: null
  });

  useEffect(() => {
    fetchApplications(activeTab);
    fetchVacancies();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (photoBlobUrl) {
        URL.revokeObjectURL(photoBlobUrl);
      }
    };
  }, [photoBlobUrl]);

  const fetchVacancies = async () => {
    try {
      const response = await api.get('/api/hr/vacancies');
      setVacancies(response.data);
    } catch (error) {
      console.error('Failed to fetch vacancies', error);
    
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'photo' | 'resume') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB.');
        return;
      }
      setAddFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const selectedVacancy = vacancies.find(v => v.id === addFormData.vacancyId);
      const reqFields = selectedVacancy?.requiredFields || '';

      if (reqFields.includes('Photo') && !addFiles.photo) {
        alert('Passport Photo is required for this position.');
        setSubmitting(false);
        return;
      }
      if (reqFields.includes('Resume') && !addFiles.resume) {
        alert('Resume/CV is required for this position.');
        setSubmitting(false);
        return;
      }

      let photoBase64 = null;
      let resumeBase64 = null;

      if (addFiles.photo) photoBase64 = await toBase64(addFiles.photo);
      if (addFiles.resume) resumeBase64 = await toBase64(addFiles.resume);

      const payload = {
        ...addFormData,
        photoUrl: photoBase64,
        resumeUrl: resumeBase64
      };

      await api.post('/api/hr/applications', payload);
      alert('Applicant added successfully!');
      fetchApplications(activeTab);
      setShowAddModal(false);
      
      // Reset form
      setAddFormData({
        applicantName: '',
        vacancyId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Applied',
        gender: '',
        email: '',
        phone: '',
        qualification: '',
        skills: '',
        workExperience: '',
        address: '',
        coverLetter: ''
      });
      setAddFiles({ photo: null, resume: null });
    } catch (error) {
      console.error('Failed to add applicant', error);
      alert('Failed to add applicant.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchApplications = async (status: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/hr/applications?status=${status}`);
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
    
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/api/hr/applications/${id}/status`, { status: newStatus });
      fetchApplications(activeTab);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  };

  const deleteApplication = async (id: string) => {
    if (!window.confirm('Delete this application?')) return;
    try {
      await api.delete(`/api/hr/applications/${id}`);
      setApplications(applications.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete application', error);
    
    }
  };

  const openDetailModal = async (app: JobApplication) => {
    setSelectedAppForView(app);
    if (photoBlobUrl) {
      URL.revokeObjectURL(photoBlobUrl);
      setPhotoBlobUrl(null);
    }
    if (app.photoUrl) {
      try {
        const response = await api.get(`/api/storage/file/${app.photoUrl}`, { responseType: 'blob' });
        const objUrl = URL.createObjectURL(response.data);
        setPhotoBlobUrl(objUrl);
      } catch (err) {
        console.error('Failed to fetch photo preview', err);
      
    }
    }
  };

  const closeDetailModal = () => {
    setSelectedAppForView(null);
    if (photoBlobUrl) {
      URL.revokeObjectURL(photoBlobUrl);
      setPhotoBlobUrl(null);
    }
  };

  const downloadProtectedFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await api.get(`/api/storage/file/${fileUrl}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to download file', error);
      alert('Failed to download file.');
    }
  };

  const selectedVacancy = vacancies.find(v => v.id === addFormData.vacancyId);
  const reqFields = selectedVacancy?.requiredFields || '';

  return (
    <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Sidebar Tabs */}
        <div className="portal-card" style={{ width: '260px', padding: '20px', flexShrink: 0 }}>
          <div className="portal-card-header" style={{ padding: '0 0 16px 0', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              <i className="fas fa-filter text-gray-500" style={{ marginRight: '8px' }}></i> STATUS FILTER
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="portal-tab-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  background: activeTab === tab ? 'rgba(0, 86, 179, 0.1)' : 'transparent',
                  color: activeTab === tab ? 'var(--portal-primary)' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
                {activeTab === tab && <i className="fas fa-check text-xs"></i>}
              </button>
            ))}
          </div>
        </div>

        {/* Main Table Area */}
        <div className="portal-card" style={{ flex: 1, minWidth: '320px' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{t('applicants').toUpperCase()} ({activeTab})</h3>
              <p>Showing {t('applicants').toLowerCase()} who are currently in '{activeTab}' status</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="portal-btn-primary"
              style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-plus-circle"></i> ADD {t('applicant').toUpperCase()}
            </button>
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Copy</button>
                <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>CSV</button>
                <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Excel</button>
                <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>PDF</button>
                <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Print</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Search:</span>
                <input type="text" className="portal-input" style={{ width: '200px', padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="management-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>GENDER</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>QUALIFICATION</th>
                    <th>STATUS</th>
                    <th>SKILLS</th>
                    <th>WORK EXP.</th>
                    <th>JOB POSITION</th>
                    <th>ADDRESS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading applications...</td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                          <span>No data available in table</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id}>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{app.applicantName}</td>
                        <td>{app.gender}</td>
                        <td style={{ color: 'var(--portal-primary)' }}>{app.email}</td>
                        <td>{app.phone}</td>
                        <td>{app.qualification}</td>
                        <td>
                          <select 
                            value={app.status} 
                            onChange={(e) => updateStatus(app.id, e.target.value)}
                            className="portal-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto', borderRadius: '6px' }}
                          >
                            {STATUS_TABS.map(tab => (
                              <option key={tab} value={tab}>{tab}</option>
                            ))}
                          </select>
                        </td>
                        <td className="truncate max-w-[120px]" title={app.skills}>{app.skills}</td>
                        <td className="truncate max-w-[120px]" title={app.workExperience}>{app.workExperience}</td>
                        <td style={{ fontWeight: 500 }}>{app.vacancy?.jobTitle}</td>
                        <td className="truncate max-w-[120px]" title={app.address}>{app.address}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => openDetailModal(app)}
                              className="portal-btn-ghost"
                              style={{ color: 'var(--school-primary, #3182ce)', padding: '6px', minWidth: 'auto' }}
                              title="View Profile Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              onClick={() => deleteApplication(app.id)}
                              className="portal-btn-ghost"
                              style={{ color: 'var(--portal-danger)', padding: '6px', minWidth: 'auto' }}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
                <span>Showing {applications.length > 0 ? 1 : 0} to {applications.length} of {applications.length} entries</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                  <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Applicant Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>ADD {t('applicant').toUpperCase()}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Register a new {t('applicant').toLowerCase()} manually</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
              <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <label className="portal-label">Applicant Name <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    name="applicantName" 
                    required 
                    type="text" 
                    value={addFormData.applicantName} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Position <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    name="vacancyId" 
                    required 
                    value={addFormData.vacancyId} 
                    onChange={handleInputChange} 
                    className="portal-input"
                  >
                    <option value="">Select a position</option>
                    {vacancies.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.jobTitle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="portal-label">Email Address *</label>
                  <input 
                    name="email" 
                    required 
                    type="email" 
                    value={addFormData.email} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Phone Number *</label>
                  <input 
                    name="phone" 
                    required 
                    type="tel" 
                    value={addFormData.phone} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Gender {reqFields.includes('Gender') && <span style={{ color: 'red' }}>*</span>}</label>
                  <select 
                    name="gender" 
                    required={reqFields.includes('Gender')} 
                    value={addFormData.gender} 
                    onChange={handleInputChange} 
                    className="portal-input"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="portal-label">Date</label>
                  <input 
                    name="date" 
                    type="date" 
                    value={addFormData.date} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    name="status" 
                    required 
                    value={addFormData.status} 
                    onChange={handleInputChange} 
                    className="portal-input"
                  >
                    <option value="Applied">Applied</option>
                    <option value="On review">On review</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Offered">Offered</option>
                    <option value="Hired">Hired</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Physical Address</label>
                  <textarea 
                    name="address" 
                    value={addFormData.address} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                    rows={2} 
                  />
                </div>
                <div>
                  <label className="portal-label">Academic Qualification</label>
                  <input 
                    name="qualification" 
                    type="text" 
                    value={addFormData.qualification} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Skills</label>
                  <input 
                    name="skills" 
                    type="text" 
                    value={addFormData.skills} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Work Experience</label>
                  <input 
                    name="workExperience" 
                    type="text" 
                    value={addFormData.workExperience} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Cover Letter</label>
                  <textarea 
                    name="coverLetter" 
                    value={addFormData.coverLetter} 
                    onChange={handleInputChange} 
                    className="portal-input" 
                    rows={3} 
                  />
                </div>
                <div>
                  <label className="portal-label">Passport Photo {reqFields.includes('Photo') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    required={reqFields.includes('Photo')} 
                    onChange={(e) => handleFileChange(e, 'photo')} 
                    className="portal-input" 
                  />
                </div>
                <div>
                  <label className="portal-label">Resume / CV (PDF) {reqFields.includes('Resume') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    required={reqFields.includes('Resume')} 
                    onChange={(e) => handleFileChange(e, 'resume')} 
                    className="portal-input" 
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-neutral">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Save {t('applicant').toLowerCase()}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAppForView && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="portal-modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Applicant Profile: {selectedAppForView.applicantName}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Vacancy: {selectedAppForView.vacancy?.jobTitle}</p>
              </div>
              <button 
                onClick={closeDetailModal}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* Photo & Identity details */}
                <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '150px', 
                    height: '150px', 
                    borderRadius: '12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {photoBlobUrl ? (
                      <img src={photoBlobUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fas fa-user fa-3x" style={{ color: '#cbd5e1' }}></i>
                    )}
                  </div>
                  <span className="portal-badge success" style={{ fontWeight: 800 }}>
                    {selectedAppForView.status.toUpperCase()}
                  </span>
                </div>

                {/* Profile Fields */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                  <div>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email Address</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.email || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Phone Number</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.phone || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Gender</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.gender || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Academic Qualification</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.qualification || '—'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Skills</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.skills || '—'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Work Experience</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.workExperience || '—'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Physical Address</strong>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedAppForView.address || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>Cover Letter / Pitch</strong>
                <p style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  borderLeft: '4px solid #3b82f6', 
                  fontSize: '0.9rem', 
                  lineHeight: '1.6', 
                  color: '#334155',
                  margin: 0,
                  whiteSpace: 'pre-line'
                }}>
                  {selectedAppForView.coverLetter || 'No cover letter provided.'}
                </p>
              </div>

              {/* Document Downloads */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '12px' }}>Uploaded Documents</strong>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {selectedAppForView.resumeUrl ? (
                    <button 
                      onClick={() => downloadProtectedFile(selectedAppForView.resumeUrl!, `Resume_${selectedAppForView.applicantName.replace(/\s+/g, '_')}.pdf`)} 
                      className="portal-btn-primary"
                      style={{ background: '#2563eb', borderColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                      <i className="fas fa-file-pdf"></i> Download CV / Resume (PDF)
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No Resume uploaded</span>
                  )}
                  
                  {selectedAppForView.photoUrl && (
                    <button 
                      onClick={() => downloadProtectedFile(selectedAppForView.photoUrl!, `Photo_${selectedAppForView.applicantName.replace(/\s+/g, '_')}.png`)} 
                      className="portal-btn-neutral"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                      <i className="fas fa-image"></i> Download Passport Photo
                    </button>
                  )}
                </div>
              </div>

            </div>
            <div className="portal-modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '15px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={closeDetailModal} className="portal-btn-neutral">Close Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
