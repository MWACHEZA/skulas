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
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    setCurrentPage(1); // Reset to page 1 on tab change
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

      if (editingAppId) {
        await api.put(`/api/hr/applications/${editingAppId}`, payload);
        alert('Applicant updated successfully!');
      } else {
        await api.post('/api/hr/applications', payload);
        alert('Applicant added successfully!');
      }
      
      fetchApplications(activeTab);
      setShowAddModal(false);
      setEditingAppId(null);
      
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
      setEditingAppId(null);
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
    if (!(await toastConfirm('Delete this application?'))) return;
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

  const filteredApplications = applications.filter(app => 
    app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.vacancy?.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Top Status Tabs */}
        <div style={{ width: '100%', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                background: activeTab === tab ? 'var(--school-primary, #0056b3)' : '#f1f5f9',
                color: activeTab === tab ? 'white' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Table Area */}
        <div className="portal-card" style={{ flex: 1, minWidth: '320px' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{t('applicants').toUpperCase()} ({activeTab})</h3>
              <p>Showing {t('applicants').toLowerCase()} who are currently in '{activeTab}' status</p>
            </div>
            <button 
              onClick={() => {
                setEditingAppId(null);
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
                setShowAddModal(true);
              }}
              className="portal-btn-primary"
              style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <i className="fas fa-plus-circle"></i> ADD {t('applicant').toUpperCase()}
            </button>
          </div>
          
          <div className="portal-card-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 10 }}>Search:</span>
                <input 
                  type="text" 
                  className="portal-input" 
                  style={{ width: 200, padding: '5px 10px' }} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Name, email, position..."
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Applicant Name</th>
                    <th>Position</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : paginatedApplications.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No applicants found.</td></tr>
                  ) : (
                    paginatedApplications.map(app => (
                      <tr key={app.id}>
                        <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{app.applicantName}</td>
                        <td>{app.vacancy?.jobTitle || app.vacancyId}</td>
                        <td>{app.email || '-'}</td>
                        <td>{app.phone || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${app.status.replace(/\s+/g, '').toLowerCase()}`}>{app.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => openDetailModal(app)}
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            {app.status === 'Applied' && (
                              <button onClick={() => updateStatus(app.id, 'Interviewed')} className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Invite to Interview</button>
                            )}
                            {app.status === 'Interviewed' && (
                              <button onClick={() => updateStatus(app.id, 'Hired')} className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#10b981', borderColor: '#10b981' }}>Hire</button>
                            )}
                            <button 
                              onClick={() => {
                                setEditingAppId(app.id);
                                setAddFormData({
                                  applicantName: app.applicantName || '',
                                  vacancyId: app.vacancyId || '',
                                  date: app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                  status: app.status || 'Applied',
                                  gender: app.gender || '',
                                  email: app.email || '',
                                  phone: app.phone || '',
                                  qualification: app.qualification || '',
                                  skills: app.skills || '',
                                  workExperience: app.workExperience || '',
                                  address: app.address || '',
                                  coverLetter: app.coverLetter || ''
                                });
                                setShowAddModal(true);
                              }}
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => deleteApplication(app.id)}
                              className="portal-btn-ghost" 
                              style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            </div>
            
            {!loading && (
              <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem' }}>
                <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length} entries</span>
                <div>
                  <button 
                    className="portal-btn-ghost" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }} 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button 
                    className="portal-btn-ghost" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }} 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Applicant Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingAppId ? `EDIT ${t('applicant').toUpperCase()}` : `ADD ${t('applicant').toUpperCase()}`}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{editingAppId ? `Update ${t('applicant').toLowerCase()} details` : `Register a new ${t('applicant').toLowerCase()} manually`}</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAppId(null);
                }}
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
                  <button type="button" onClick={() => {
                    setShowAddModal(false);
                    setEditingAppId(null);
                  }} className="portal-btn-neutral">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : (editingAppId ? <i className="fas fa-save"></i> : <i className="fas fa-plus"></i>)} {editingAppId ? 'Update' : 'Save'} {t('applicant').toLowerCase()}
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
