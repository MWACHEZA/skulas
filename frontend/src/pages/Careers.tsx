// Public Careers Portal Component
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function Careers() {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const { showToast } = useToast();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    applicantName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    address: '',
    qualification: '',
    skills: '',
    workExperience: '',
    coverLetter: ''
  });

  const [files, setFiles] = useState<{
    photo: File | null;
    resume: File | null;
  }>({
    photo: null,
    resume: null
  });

  useEffect(() => {
    fetchVacancies();
  }, [schoolCode]);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/public/vacancies?schoolCode=${schoolCode}`);
      setVacancies(data);
    } catch (err) {
      console.error('Failed to fetch vacancies:', err);
      showToast('Failed to load active job postings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any, key: 'photo' | 'resume') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be under 10MB.', 'warning');
        return;
      }
      setFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const openApplyModal = (job: any) => {
    setSelectedJob(job);
    setFormData({
      applicantName: '',
      email: '',
      phone: '',
      gender: '',
      dob: '',
      address: '',
      qualification: '',
      skills: '',
      workExperience: '',
      coverLetter: ''
    });
    setFiles({ photo: null, resume: null });
    setSuccessData(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const reqFields = selectedJob.requiredFields || '';
      
      // Basic validations
      if (!formData.applicantName || !formData.email || !formData.phone) {
        showToast('Please fill in Name, Email, and Phone.', 'warning');
        setSubmitting(false);
        return;
      }

      // Dynamic validations
      if (reqFields.includes('Photo') && !files.photo) {
        showToast('Passport Photo is required for this position.', 'warning');
        setSubmitting(false);
        return;
      }
      if (reqFields.includes('Resume') && !files.resume) {
        showToast('Curriculum Vitae / Resume is required for this position.', 'warning');
        setSubmitting(false);
        return;
      }
      if (reqFields.includes('DOB') && !formData.dob) {
        showToast('Date of Birth is required for this position.', 'warning');
        setSubmitting(false);
        return;
      }

      let photoBase64 = null;
      let resumeBase64 = null;

      if (files.photo) {
        photoBase64 = await toBase64(files.photo);
      }
      if (files.resume) {
        resumeBase64 = await toBase64(files.resume);
      }

      const payload = {
        schoolCode,
        vacancyId: selectedJob.id,
        ...formData,
        photoUrl: photoBase64,
        resumeUrl: resumeBase64
      };

      const { data } = await api.post('/api/public/applications', payload);

      setSuccessData(data);
      showToast('Application submitted successfully!', 'success');
      fetchVacancies(); // Refresh list in case status changes
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    return today > end;
  };

  return (
    <div className="careers-page-container">
      <style>{`
        .careers-page-container {
          padding: 80px 24px 120px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .careers-hero {
          text-align: center;
          margin-bottom: 60px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 60px 24px;
          border-radius: 24px;
          color: white;
          box-shadow: 0 10px 30px -10px rgba(30, 58, 138, 0.3);
        }
        .careers-hero h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .careers-hero p {
          font-size: 1.1rem;
          opacity: 0.9;
          max-width: 600px;
          margin: 0 auto;
        }
        .job-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 24px;
        }
        .job-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
          position: relative;
          overflow: hidden;
        }
        .job-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
          border-color: #cbd5e1;
        }
        .job-tag {
          align-self: flex-start;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        .tag-active {
          background: #ecfdf5;
          color: #059669;
        }
        .tag-closed {
          background: #fef2f2;
          color: #dc2626;
        }
        .job-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .job-dept {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 20px;
        }
        .job-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .job-meta-item {
          font-size: 0.8rem;
          color: #475569;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .job-meta-item i {
          color: #3b82f6;
        }
        .job-desc {
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 24px;
          flex-grow: 1;
        }
        .btn-apply {
          width: 100%;
          background: #1e3a8a;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-apply:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .btn-apply:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }
        .no-jobs {
          text-align: center;
          padding: 80px 24px;
          border: 2px dashed #e2e8f0;
          border-radius: 24px;
          background: #f8fafc;
        }
        .no-jobs i {
          font-size: 3rem;
          color: #94a3b8;
          margin-bottom: 16px;
        }
        .no-jobs h3 {
          font-size: 1.25rem;
          color: #334155;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .no-jobs p {
          color: #64748b;
        }

        /* Modal Styles */
        .careers-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
        }
        .careers-modal {
          background: white;
          width: 100%;
          max-width: 650px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .careers-modal-header {
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .careers-modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .careers-modal-header p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .btn-close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #94a3b8;
        }
        .careers-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex-grow: 1;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-span-2 {
          grid-column: span 2;
        }
        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #334155;
        }
        .form-control {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-control:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .careers-modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
        }
        .btn-cancel {
          background: white;
          border: 1px solid #cbd5e1;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .success-box {
          text-align: center;
          padding: 32px 16px;
        }
        .success-box i {
          font-size: 3.5rem;
          color: #059669;
          margin-bottom: 16px;
        }
        .success-box h3 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .success-box p {
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .tracking-card {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 16px;
          border-radius: 12px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 1.15rem;
          font-weight: 700;
          color: #15803d;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="careers-hero">
        <h1>Join Our Academic Community</h1>
        <p>Explore rewarding career pathways and vacancy opportunities at our institution.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ fontWeight: 600, color: '#64748b' }}>Synchronizing vacancy database...</p>
        </div>
      ) : vacancies.length > 0 ? (
        <div className="job-grid">
          {vacancies.map(job => {
            const closed = isExpired(job.endDate);
            return (
              <div className="job-card animate-in fade-in slide-in-from-bottom-4 duration-300" key={job.id}>
                <span className={`job-tag ${closed ? 'tag-closed' : 'tag-active'}`}>
                  {closed ? 'Closed' : job.jobType || 'Active'}
                </span>
                <h3>{job.jobTitle}</h3>
                <div className="job-dept">{job.department?.name || 'Central Academics'}</div>
                
                <p className="job-desc">
                  {job.shortDescription || 'No description provided. Click Apply to see details.'}
                </p>

                <div className="job-meta-row">
                  <div className="job-meta-item">
                    <i className="fas fa-map-marker-alt"></i> {job.location || 'Main Campus'}
                  </div>
                  <div className="job-meta-item">
                    <i className="fas fa-briefcase"></i> {job.workExperience || 'Entry Level'}
                  </div>
                  {job.discloseSalary && (
                    <div className="job-meta-item">
                      <i className="fas fa-coins"></i> {job.currency || 'USD'} {job.rate}/{job.showPaymentMethodBy || 'Month'}
                    </div>
                  )}
                  <div className="job-meta-item">
                    <i className="fas fa-calendar-alt"></i> Ends {new Date(job.endDate).toLocaleDateString()}
                  </div>
                </div>

                <button 
                  className="btn-apply" 
                  onClick={() => openApplyModal(job)}
                  disabled={closed}
                >
                  {closed ? 'Applications Closed' : 'Apply Now'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-jobs animate-in fade-in duration-500">
          <i className="fas fa-briefcase"></i>
          <h3>No Active Openings</h3>
          <p>We don't have any vacancies right now, but we are always looking for amazing talent. Check back soon!</p>
        </div>
      )}

      {/* Application Form Modal */}
      {isModalOpen && selectedJob && (
        <div className="careers-modal-overlay">
          <div className="careers-modal">
            <div className="careers-modal-header">
              <div>
                <h2>Apply for {selectedJob.jobTitle}</h2>
                <p>{selectedJob.department?.name || 'Institution Recruitment'}</p>
              </div>
              <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <div className="careers-modal-body">
              {successData ? (
                <div className="success-box">
                  <i className="fas fa-check-circle"></i>
                  <h3>Application Submitted!</h3>
                  <p>
                    Thank you, <strong>{successData.applicantName}</strong>. Your profile has been registered in our recruitment system.
                  </p>
                  <p>Use the following Application ID to trace your status online:</p>
                  <div className="tracking-card">
                    {successData.applicationId}
                  </div>
                  <button 
                    className="btn-apply mt-4" 
                    onClick={() => {
                      setIsModalOpen(false);
                      window.location.href = `/check-status?school=${schoolCode}`;
                    }}
                  >
                    <i className="fas fa-search"></i> Track Application Status
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} id="publicJobApplicationForm">
                  <div className="form-grid">
                    
                    <div className="form-group form-span-2">
                      <label>Full Name *</label>
                      <input 
                        type="text" 
                        name="applicantName" 
                        value={formData.applicantName} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                        placeholder="John Doe" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address *</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                        placeholder="john@example.com" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                        placeholder="+263..." 
                      />
                    </div>

                    <div className="form-group">
                      <label>Gender</label>
                      <select 
                        name="gender" 
                        value={formData.gender} 
                        onChange={handleInputChange} 
                        className="form-control"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    {selectedJob.requiredFields?.includes('DOB') && (
                      <div className="form-group">
                        <label>Date of Birth *</label>
                        <input 
                          type="date" 
                          name="dob" 
                          value={formData.dob} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          required 
                        />
                      </div>
                    )}

                    <div className="form-group form-span-2">
                      <label>Physical Address</label>
                      <textarea 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        rows={2} 
                        placeholder="Enter physical address..." 
                      />
                    </div>

                    <div className="form-group form-span-2">
                      <label>Academic Qualification</label>
                      <input 
                        type="text" 
                        name="qualification" 
                        value={formData.qualification} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="e.g. Bachelor of Science in Education" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Key Skills / Expertise</label>
                      <input 
                        type="text" 
                        name="skills" 
                        value={formData.skills} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="e.g. Node.js, Cataloging, Excel" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Years of Work Experience</label>
                      <input 
                        type="text" 
                        name="workExperience" 
                        value={formData.workExperience} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="e.g. 3 years" 
                      />
                    </div>

                    <div className="form-group form-span-2">
                      <label>Cover Letter / Pitch</label>
                      <textarea 
                        name="coverLetter" 
                        value={formData.coverLetter} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        rows={4} 
                        placeholder="Briefly state why you're a great fit for this role..." 
                      />
                    </div>

                    {selectedJob.requiredFields?.includes('Photo') && (
                      <div className="form-group">
                        <label>Passport Photo *</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, 'photo')} 
                          className="form-control" 
                          required 
                        />
                        <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Image format (Max 10MB)</small>
                      </div>
                    )}

                    {selectedJob.requiredFields?.includes('Resume') && (
                      <div className="form-group">
                        <label>Resume / CV (PDF) *</label>
                        <input 
                          type="file" 
                          accept="application/pdf,.doc,.docx" 
                          onChange={(e) => handleFileChange(e, 'resume')} 
                          className="form-control" 
                          required 
                        />
                        <small style={{ color: '#64748b', fontSize: '0.75rem' }}>PDF or Doc formats (Max 10MB)</small>
                      </div>
                    )}

                  </div>
                </form>
              )}
            </div>

            {!successData && (
              <div className="careers-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button 
                  type="submit" 
                  form="publicJobApplicationForm" 
                  className="btn-apply" 
                  style={{ width: 'auto', background: '#059669' }} 
                  disabled={submitting}
                >
                  {submitting ? <i className="fas fa-spinner fa-spin"></i> : 'Submit Application'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
